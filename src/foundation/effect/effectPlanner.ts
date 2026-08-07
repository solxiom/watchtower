/**
 * Side-effect-free effect planning (CA-10;
 * `docs/spec/coordinator-automation.md` §12.2 "The executor converts a valid
 * proposal into a previewable effect plan").
 *
 * Nothing in this module reads a file, starts a process, reads a clock, or
 * mutates its arguments. That purity is what makes the same function serve both
 * `cycle --dry-run` and the real apply path: a preview and the plan that is
 * actually committed cannot drift, because they are the same value.
 *
 * The idempotency key and target identities come from CA-09's accepted owners
 * (`proposalIdempotency.ts`, `proposalPreconditions.ts`); this capability never
 * reimplements either formula.
 */
import {EffectExecutionError, type EffectPlan} from '../../contracts/effects.js';
import type {DecisionProposal, ProposalValidationResult} from '../../contracts/proposals.js';
import type {JsonObject} from '../../contracts/types.js';
import type {LaneTaskBinding} from '../../contracts/taskRuntime.js';
import {computeIdempotencyKey} from '../proposal/proposalIdempotency.js';
import {extractTargetIds} from '../proposal/proposalPreconditions.js';
import type {ValidationContext} from '../proposal/proposalValidatorContracts.js';
import {semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';
import {resolveDeclaredAction} from './effectActionRegistry.js';
import type {EffectActionResolver} from './effectPorts.js';

export interface EffectPlanInput {
    readonly proposal: DecisionProposal;
    /** The sole validator's result. Planning refuses unless it says `valid`. */
    readonly validation: ProposalValidationResult;
    readonly currentState: ValidationContext;
    readonly cycleId: string;
    /** Normalized bounded parameters for the declared action's input schema. */
    readonly parameters: JsonObject;
    /** The catalog binding for the resolved action, supplied by the caller's resolver port. */
    readonly binding: LaneTaskBinding;
}

/**
 * Build the one plan for one validated proposal.
 *
 * A proposal carrying several requested effects is refused rather than split:
 * an all-or-nothing effect cannot be expressed as two independently
 * journalled, independently recoverable actions, and choosing one of them
 * would be the executor guessing agent intent.
 */
export function planEffect(input: EffectPlanInput): EffectPlan {
    const {proposal, validation, currentState, binding} = input;
    if (!validation.valid) {
        throw new EffectExecutionError('EFFECT_PROPOSAL_REJECTED', proposal.proposalId,
            `Proposal was rejected by the validator (${validation.errors[0]?.code ?? 'unknown'}); no effect may be planned.`);
    }
    if (validation.errors.length > 0) {
        throw new EffectExecutionError('EFFECT_PROPOSAL_UNVALIDATED', proposal.proposalId,
            'A validation result cannot be both valid and carry errors.');
    }
    const requested = onlyRequestedEffect(proposal);
    const declared = resolveDeclaredAction(requested);
    if (binding.actionId !== declared.actionId) {
        throw new EffectExecutionError('EFFECT_ACTION_BINDING_INVALID', declared.actionId,
            'The supplied catalog binding does not name the declared action for this effect.');
    }
    if (binding.mutationClass !== declared.mutationClass) {
        throw new EffectExecutionError('EFFECT_ACTION_BINDING_INVALID', declared.actionId,
            'The catalog binding declares a different mutation class than the effect registry.');
    }
    if (!binding.requiresInvocationEnvelope) {
        throw new EffectExecutionError('EFFECT_ACTION_BINDING_INVALID', declared.actionId,
            'A mutating effect action must require a single-use invocation envelope.');
    }
    const targetIds = extractTargetIds(proposal);
    return Object.freeze({
        schemaVersion: 1 as const,
        laneId: currentState.laneId,
        cycleId: input.cycleId,
        proposalId: proposal.proposalId,
        effect: requested,
        actionId: declared.actionId,
        taskId: binding.taskId,
        scope: declared.scope,
        targetIds: Object.freeze([...targetIds]),
        parameters: input.parameters,
        preconditionDigest: preconditionDigest(proposal, currentState),
        idempotencyKey: computeIdempotencyKey(
            currentState.laneId, proposal.proposalId, requested, targetIds,
            proposal.snapshotDigest, currentState.policyVersion
        ),
        snapshotDigest: proposal.snapshotDigest,
        policyVersion: currentState.policyVersion
    });
}

/**
 * The exact current-state facts that must still hold at the commit point
 * (§12.1: lane state, pack seal, envelope binding, endpoint pool, claims and
 * holds). Digesting them here means revalidation compares one value rather
 * than re-deriving a second, possibly divergent, checklist.
 */
export function preconditionDigest(proposal: DecisionProposal, state: ValidationContext): `sha256:${string}` {
    return semanticDigest({
        laneSnapshotDigest: state.laneState.snapshotDigest,
        packSealId: state.packIndex.packSealId,
        activeSeal: state.packIndex.activeSeal,
        manifestDigest: state.packIndex.manifestDigest,
        envelopePackSealId: state.envelope.packSealId,
        envelopeManifestDigest: state.envelope.manifestDigest,
        activeEndpointPool: [...state.routingPolicy.activeEndpointPool].sort(),
        activeClaimIds: state.activeClaims.map((claim) => claim.claimId).sort(),
        activeHoldIds: state.activeHolds.filter((hold) => hold.status === 'active').map((hold) => hold.holdId).sort(),
        policyVersion: state.policyVersion,
        proposalId: proposal.proposalId,
        proposalSnapshotDigest: proposal.snapshotDigest
    });
}

function onlyRequestedEffect(proposal: DecisionProposal) {
    const effects = proposal.requestedEffects;
    if (effects.length !== 1) {
        throw new EffectExecutionError('EFFECT_ACTION_AMBIGUOUS', proposal.proposalId,
            `An effect plan is built from exactly one requested effect; this proposal carries ${effects.length}.`);
    }
    return effects[0].effect;
}

/**
 * Resolve the one catalog binding a proposal's single requested effect maps to.
 *
 * This lives with planning rather than in the executor because a plan is not
 * expressible without it: the binding supplies the task ID, input schema, and
 * envelope requirement that `planEffect` validates against the declared action.
 */
export function resolveEffectBinding(proposal: DecisionProposal, actions: EffectActionResolver): LaneTaskBinding {
    const effect = onlyRequestedEffect(proposal);
    try {
        return actions.resolveAction(resolveDeclaredAction(effect).actionId);
    } catch (error) {
        if (error instanceof EffectExecutionError) throw error;
        throw new EffectExecutionError('EFFECT_ACTION_BINDING_INVALID', effect,
            `The catalog does not bind the declared action for this effect: ${(error as Error).message}`);
    }
}
