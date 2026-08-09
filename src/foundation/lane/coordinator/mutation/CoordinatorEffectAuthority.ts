/**
 * The one bridge from a mutating coordinator command to the accepted validator
 * and the sole effect authority (CA-25 over CA-09/CA-10).
 *
 * It owns no algorithm. Shape validation is `validateProposalShape`, proposal
 * legality is `ProposalValidator`, effect planning and the idempotency key are
 * `planEffect`, and every write is `EffectExecutor.apply`. The dry-run preview
 * is deliberately `EffectExecutor.plan` — the same pure value the apply path
 * commits — so a preview and the effect it previews cannot drift.
 *
 * `preview` never touches `apply`'s path and `apply` never accepts a dry run:
 * the two entry points are separate so "dry-run wrote nothing" is a property of
 * the code shape, not of a flag checked somewhere downstream.
 */
import {randomUUID} from 'node:crypto';
import {EffectExecutionError, type EffectOutcome, type EffectPlan} from '../../../../contracts/effects.js';
import type {
    CoordinatorAuthorization, CoordinatorMutationRequest, CoordinatorMutationResult, CoordinatorMutationResultData
} from '../../../../contracts/coordinatorMutation.js';
import type {DecisionProposal, ProposalValidationResult} from '../../../../contracts/proposals.js';
import type {JsonObject} from '../../../../contracts/types.js';
import type {PinnedTaskRuntimeTarget} from '../../../../contracts/taskRuntime.js';
import {
    EffectExecutor, nodeEffectFileSystem,
    type EffectActionResolver, type EffectClock, type EffectFileSystem, type EffectIdFactory, type EffectTaskRunner
} from '../../../effect/index.js';
import {ProposalValidator, validateProposalShape, type ValidationContext} from '../../../proposal/index.js';
import {checkMutationFences, isAdvisoryOperation} from './coordinatorMutationFences.js';
import {effectParametersFor} from './coordinatorEffectParameters.js';

export interface CoordinatorEffectAuthorityOptions {
    readonly runner: EffectTaskRunner;
    readonly actions: (request: CoordinatorMutationRequest) => EffectActionResolver;
    readonly target: (request: CoordinatorMutationRequest) => PinnedTaskRuntimeTarget;
    readonly files?: EffectFileSystem;
    readonly clock?: EffectClock;
    readonly ids?: EffectIdFactory;
    readonly validator?: ProposalValidator;
}

export interface CoordinatorEffectAuthority {
    preview(request: CoordinatorMutationRequest): CoordinatorMutationResult;
    apply(request: CoordinatorMutationRequest): Promise<CoordinatorMutationResult>;
}

interface AdmittedRequest {
    readonly proposal: DecisionProposal;
    readonly validation: ProposalValidationResult;
    readonly authorization: CoordinatorAuthorization;
    readonly parameters: JsonObject;
}

export class Ca10CoordinatorEffectAuthority implements CoordinatorEffectAuthority {
    private readonly validator: ProposalValidator;

    constructor(private readonly options: CoordinatorEffectAuthorityOptions) {
        this.validator = options.validator ?? new ProposalValidator();
    }

    /**
     * Side-effect-free. Reads no lane bytes of its own, acquires no lock, and
     * writes nothing: the capsule was already read, and everything below is a
     * pure function of it.
     */
    preview(request: CoordinatorMutationRequest): CoordinatorMutationResult {
        const admitted = this.admit(request);
        if ('ok' in admitted) return admitted;
        let plan: EffectPlan | null = null;
        let detail: string | null = null;
        if (isAdvisoryOperation(request.operation)) {
            return {ok: true, data: data(request, admitted, null, 'previewed',
                'the accepted advisory proposal maps to no effect; recording it is the operator session\'s own confirmed action.', false)};
        }
        try {
            plan = this.executor(request).plan(this.effectRequest(request, admitted));
        } catch (error) {
            if (!(error instanceof EffectExecutionError)) throw error;
            detail = `${error.reason}: ${error.message}`;
        }
        return {ok: true, data: data(request, admitted, plan, 'previewed', detail, false)};
    }

    async apply(request: CoordinatorMutationRequest): Promise<CoordinatorMutationResult> {
        if (request.dryRun) {
            return {ok: false, reason: 'COORDINATOR_MUTATION_INPUT_INVALID', target: request.subject,
                detail: 'a dry run is previewed, never applied.'};
        }
        if (isAdvisoryOperation(request.operation)) {
            return {ok: false, reason: 'COORDINATOR_MUTATION_EFFECT_UNSUPPORTED', target: request.subject,
                detail: 'a specification-resolution proposal is advisory only and maps to no effect.'};
        }
        const admitted = this.admit(request);
        if ('ok' in admitted) return admitted;
        const outcome = await this.executor(request).apply(this.effectRequest(request, admitted));
        return this.settle(request, admitted, outcome);
    }

    /** Shape, fence, validator, and parameter admission — every refusal pre-lock. */
    private admit(request: CoordinatorMutationRequest): AdmittedRequest | CoordinatorMutationResult {
        const authorization = request.authorization;
        if (authorization === undefined) {
            return {ok: false, reason: 'COORDINATOR_MUTATION_AUTHORIZATION_UNAVAILABLE', target: request.subject,
                detail: `the lane holds no durable "${request.operation}" authorization capsule; a command may not author one.`};
        }
        let proposal: DecisionProposal;
        try {
            proposal = validateProposalShape(authorization.proposal);
        } catch (error) {
            return {ok: false, reason: 'COORDINATOR_MUTATION_AUTHORIZATION_INVALID', target: request.subject,
                detail: error instanceof Error ? error.message : 'the authorized proposal has an invalid shape.'};
        }
        const fenced = checkMutationFences(request, proposal);
        if (fenced !== null) return fenced;
        const validation = this.validator.validateProposal(authorization.proposal, authorization.currentState);
        if (!validation.valid) {
            const first = validation.errors[0];
            return {ok: false, reason: 'COORDINATOR_MUTATION_PROPOSAL_REJECTED', target: proposal.proposalId,
                detail: first === undefined ? 'proposal validation failed.' : `${first.code}: ${first.message}`};
        }
        if (isAdvisoryOperation(request.operation)) return {proposal, validation, authorization, parameters: {}};
        const parameters = effectParametersFor({proposal, context: request.context, state: authorization.currentState});
        if (!parameters.ok) {
            return {ok: false, reason: 'COORDINATOR_MUTATION_EFFECT_UNSUPPORTED',
                target: parameters.effect ?? proposal.proposalId, detail: parameters.detail};
        }
        return {proposal, validation, authorization, parameters: parameters.parameters};
    }

    private executor(request: CoordinatorMutationRequest): EffectExecutor {
        return new EffectExecutor({
            files: this.options.files ?? nodeEffectFileSystem,
            clock: this.options.clock ?? {now: () => new Date()},
            ids: this.options.ids ?? {nextEventId: () => randomUUID()},
            runner: this.options.runner, actions: this.options.actions(request), target: this.options.target(request)
        });
    }

    private effectRequest(request: CoordinatorMutationRequest, admitted: AdmittedRequest) {
        const {proposal, validation, authorization, parameters} = admitted;
        return {
            laneDir: request.context.laneDir, cycleId: proposal.cycleId, proposal, validation,
            currentState: authorization.currentState, parameters, runtimeContext: request.context,
            revalidate: () => this.revalidate(authorization)
        };
    }

    /** CA-10 re-reads the capsule under the lane lock; a changed proposal refuses there. */
    private revalidate(authorization: CoordinatorAuthorization): {state: ValidationContext; result: ProposalValidationResult} {
        const next = authorization.revalidate();
        try {
            validateProposalShape(next.proposal);
        } catch {
            return {state: next.state, result: {valid: false, warnings: [],
                errors: [{code: 'PROPOSAL_SCHEMA_INVALID', subject: 'proposal', message: 'the re-read proposal has an invalid shape.'}]}};
        }
        return {state: next.state, result: this.validator.validateProposal(next.proposal, next.state)};
    }

    private settle(
        request: CoordinatorMutationRequest, admitted: AdmittedRequest, outcome: EffectOutcome
    ): CoordinatorMutationResult {
        if (outcome.status === 'applied' || outcome.status === 'replayed') {
            return {ok: true, data: data(request, admitted, outcome.plan, outcome.status, null, true)};
        }
        if (outcome.status === 'uncertain') {
            return {ok: false, reason: 'COORDINATOR_MUTATION_EFFECT_UNCERTAIN', target: outcome.plan.actionId,
                detail: outcome.message};
        }
        return {ok: false, reason: 'COORDINATOR_MUTATION_EFFECT_REFUSED', target: outcome.subject,
            detail: `${outcome.reason}: ${outcome.message}`};
    }
}

function data(
    request: CoordinatorMutationRequest, admitted: AdmittedRequest, plan: EffectPlan | null,
    status: string, detail: string | null, applied: boolean
): CoordinatorMutationResultData {
    return {
        schemaVersion: 1, operation: request.operation, subject: request.subject, dryRun: request.dryRun, applied,
        proposalId: admitted.proposal.proposalId, proposalType: admitted.proposal.type,
        effect: plan?.effect ?? null, actionId: plan?.actionId ?? null, idempotencyKey: plan?.idempotencyKey ?? null,
        parameters: admitted.parameters, status, detail
    };
}
