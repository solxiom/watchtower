/**
 * Request assembly for the session-proposal bridge (CA-26): the candidate
 * durable document a `record` call proposes, and the `EffectRequest` handed to
 * CA-10's sole executor.
 *
 * Assembly only. No verdict is reached here: the candidate document is handed
 * to this capsule's own parser and the effect request to CA-10's executor, and
 * both own their answers. Keeping assembly out of the front door is what lets
 * the service read as a sequence of decisions rather than object literals.
 */
import type {
    ProposalValidationResult, SessionProposalDocument, SessionProposalRefused, SessionProposalType
} from '../../../../contracts/index.js';
import type {EffectRequest} from '../../../effect/index.js';
import type {ValidationContext} from '../../../proposal/index.js';
import {parseSessionProposalDocument, SessionProposalDocumentError} from './sessionProposalDocument.js';
import {confirmedContext, type ShapedProposal} from './sessionProposalGates.js';
import {refuse} from './sessionProposalRefusals.js';
import type {SessionProposalStatePort, SessionProposalValidatorPort} from './sessionProposalPorts.js';

export interface CandidateDocumentInput {
    readonly operatorSessionId: string;
    readonly sourceTurnId: string;
    readonly proposalType: SessionProposalType;
    readonly proposal: unknown;
    readonly laneId: string;
    readonly now: string;
}

/**
 * The `proposed`-state document a `record` call offers for validation.
 *
 * `proposalId` and `expiresAt` are read off the offered wire proposal rather
 * than accepted from the caller: the carried proposal is the only authority for
 * its own identity and expiry, and the parser then proves the projected copies
 * agree. An offering that is not even an object yields `undefined` members and
 * fails at the parser, which is exactly where a schema failure belongs.
 */
export function candidateDocument(input: CandidateDocumentInput): unknown {
    const proposal = input.proposal;
    const wire = typeof proposal === 'object' && proposal !== null ? proposal as Record<string, unknown> : {};
    return {
        schemaVersion: 1, proposalId: wire.proposalId, operatorSessionId: input.operatorSessionId,
        laneId: input.laneId, sourceTurnId: input.sourceTurnId, proposalType: input.proposalType,
        state: 'proposed', createdAt: input.now, expiresAt: wire.expiresAt, proposal,
        confirmation: null, effect: null, publication: null
    };
}

/** The candidate document, validated by this capsule's own parser, or the one schema refusal it produced. */
export function candidateFor(input: CandidateDocumentInput): SessionProposalDocument | SessionProposalRefused {
    try {
        return parseSessionProposalDocument(candidateDocument(input));
    } catch (error) {
        if (error instanceof SessionProposalDocumentError) return refuse('SESSION_PROPOSAL_SCHEMA_INVALID', error.subject, error.message);
        throw error;
    }
}

export interface EffectRequestInput {
    readonly laneDir: string;
    readonly cycleId: string;
    readonly shaped: ShapedProposal;
    readonly currentState: ValidationContext;
    readonly validation: ProposalValidationResult;
    readonly parameters: EffectRequest['parameters'];
    readonly runtimeContext: EffectRequest['runtimeContext'];
    readonly lockLevels?: EffectRequest['lockLevels'];
    readonly cancellation?: AbortSignal;
    readonly state: SessionProposalStatePort;
    readonly validator: SessionProposalValidatorPort;
}

/**
 * The executor's `revalidate` callback runs **under the lane lock** and is the
 * last current-state check before the commit point (§21). It re-reads state and
 * re-runs the sole validator rather than replaying the pre-lock verdict, so a
 * writer that moved the world between planning and locking is caught by the
 * executor's own fence.
 */
/**
 * The front door's one-line view of the same assembly: its injected deps plus
 * the caller's apply request. Keeping the optional-member spreading here rather
 * than in the service is what stops the front door from owning object shape.
 */
export function effectRequestFor(
    deps: {readonly laneDir: string; readonly state: SessionProposalStatePort; readonly validator: SessionProposalValidatorPort},
    request: ApplyRequestFields, shaped: ShapedProposal,
    currentState: ValidationContext, validation: ProposalValidationResult
): EffectRequest {
    return buildEffectRequest({
        laneDir: deps.laneDir, cycleId: request.cycleId, shaped, currentState, validation,
        parameters: request.parameters, runtimeContext: request.runtimeContext,
        state: deps.state, validator: deps.validator,
        ...(request.lockLevels === undefined ? {} : {lockLevels: request.lockLevels}),
        ...(request.cancellation === undefined ? {} : {cancellation: request.cancellation})
    });
}

/** The apply-request members this assembly reads — named here so the contracts module stays the caller's vocabulary. */
export interface ApplyRequestFields {
    readonly cycleId: string;
    readonly parameters: EffectRequest['parameters'];
    readonly runtimeContext: EffectRequest['runtimeContext'];
    readonly lockLevels?: EffectRequest['lockLevels'];
    readonly cancellation?: AbortSignal;
}

export function buildEffectRequest(input: EffectRequestInput): EffectRequest {
    return {
        laneDir: input.laneDir, cycleId: input.cycleId, proposal: input.shaped.proposal,
        validation: input.validation, currentState: input.currentState, parameters: input.parameters,
        runtimeContext: input.runtimeContext,
        revalidate: () => {
            const locked = input.state.read();
            return {
                state: locked,
                result: input.validator.validateProposal(input.shaped.document.proposal, confirmedContext(input.shaped, locked))
            };
        },
        ...(input.lockLevels === undefined ? {} : {lockLevels: input.lockLevels}),
        ...(input.cancellation === undefined ? {} : {cancellation: input.cancellation})
    };
}
