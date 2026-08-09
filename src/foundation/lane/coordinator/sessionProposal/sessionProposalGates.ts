/**
 * The ordered fences a session proposal must clear before the sole effect
 * executor may be reached (CA-26), in the exact failure order the batch
 * contract fixes: syntax/schema → canonical identity → authorization and
 * current-state → side-effect-free planning.
 *
 * Every function here is pure. Nothing reads a file, a clock, or a model;
 * nothing mutates its arguments; and no fence decides legality — that verdict
 * belongs to CA-09's `ProposalValidator`, which this module only *calls* and
 * never reproduces. `SessionProposalService` sequences these; keeping them here
 * stops the front door from becoming the algorithm owner.
 */
import type {
    DecisionProposal, ProposalValidationResult, SessionProposalDocument, SessionProposalPublicationIntent,
    SessionProposalRefused
} from '../../../../contracts/index.js';
import {validateProposalShape, type ValidationContext} from '../../../proposal/index.js';
// `ProposalShapeError` and `OperatorSessionState` are not on CA-09's barrel; they are
// imported from their owning modules rather than widened into that public surface.
import {ProposalShapeError} from '../../../proposal/proposalErrors.js';
import type {OperatorSessionState} from '../../../proposal/proposalValidatorContracts.js';
import {computeConfirmationBinding, confirmationFor} from './sessionProposalBinding.js';
import {isSessionConfirmableType, requiredCoordinatorType, withConfirmation, withState} from './sessionProposalDocument.js';
import type {SessionProposalValidatorPort} from './sessionProposalPorts.js';
import {isSessionProposalRefusal, refuse, refuseFromValidation} from './sessionProposalRefusals.js';
import {isBoundedText} from './sessionProposalValues.js';
import {canTransition} from './sessionProposalStates.js';

/** A document whose bytes, identity, and category all agree — nothing about the world yet. */
export interface ShapedProposal {
    readonly document: SessionProposalDocument;
    readonly proposal: DecisionProposal;
}

/** What `SessionProposalRecorder.transition`'s caller decides against freshly read, fenced bytes. */
export type SessionProposalTransitionDecision =
    | SessionProposalRefused
    | {readonly document: SessionProposalDocument; readonly intent: SessionProposalPublicationIntent | null};

/**
 * Schema then identity then category, stopping at the first failure. The
 * category check is what enforces §15.2: a proposal whose coordinator type is
 * not the one its session category maps to cannot be laundered through an
 * operator session into a different effect.
 */
export function shapeProposal(document: SessionProposalDocument, laneId: string): ShapedProposal | SessionProposalRefused {
    let proposal: DecisionProposal;
    try {
        proposal = validateProposalShape(document.proposal);
    } catch (error) {
        if (error instanceof ProposalShapeError) return refuse('SESSION_PROPOSAL_SCHEMA_INVALID', error.subject, error.message);
        throw error;
    }
    if (document.proposalId !== proposal.proposalId) {
        return refuse('SESSION_PROPOSAL_RECORD_INVALID', 'document.proposalId', 'the document identity does not match the carried proposal identity');
    }
    if (document.laneId !== laneId) {
        return refuse('SESSION_PROPOSAL_SESSION_MISMATCH', 'document.laneId', `the proposal belongs to lane "${document.laneId}", not the current lane "${laneId}"`);
    }
    const required = requiredCoordinatorType(document.proposalType);
    if (required === null) {
        return refuse('SESSION_PROPOSAL_CATEGORY_NOT_EFFECT_BEARING', 'document.proposalType',
            `session category "${document.proposalType}" has no effect in the closed v1 registry; it resolves through the session-lifecycle workflow, not the effect bridge`);
    }
    if (!isSessionConfirmableType(proposal.type)) {
        return refuse('SESSION_PROPOSAL_TYPE_NOT_PERMITTED', 'proposal.type',
            `"${proposal.type}" cannot be confirmed through an operator session; it must route to the authoritative workflow`);
    }
    if (proposal.type !== required) {
        return refuse('SESSION_PROPOSAL_TYPE_MISMATCH', 'document.proposalType',
            `session category "${document.proposalType}" must carry a "${required}" proposal, not "${proposal.type}"`);
    }
    return {document, proposal};
}

/** Expiry is read from the proposal itself; the document's projected copy is proved equal when parsed. */
export function isExpired(proposal: DecisionProposal, now: string): boolean {
    return Date.parse(proposal.expiresAt) <= Date.parse(now);
}

/**
 * The current-state fence for a durable confirmation.
 *
 * The operator session that confirmed must still be the session the current
 * state reports, and both binding halves must still reproduce: the stored
 * proposal bytes and the freshly read current state. The halves are checked
 * separately because they mean different things — changed bytes are tampering,
 * a changed world is the canonical staleness §23 names — and the combined
 * digest is checked last so a forged binding assembled from two valid halves
 * still fails.
 */
export function verifyConfirmation(shaped: ShapedProposal, currentState: ValidationContext): SessionProposalRefused | null {
    const confirmation = shaped.document.confirmation;
    if (confirmation === null) {
        return refuse('OPERATOR_SESSION_CONFIRMATION_REQUIRED', 'confirmation', 'this proposal carries no operator confirmation');
    }
    const session = currentState.operatorSession;
    if (session === undefined) {
        return refuse('OPERATOR_SESSION_NOT_FOUND', 'operatorSession', 'current state reports no operator session for this confirmation');
    }
    if (session.sessionId !== shaped.document.operatorSessionId || confirmation.confirmedBySessionId !== shaped.document.operatorSessionId) {
        return refuse('SESSION_PROPOSAL_SESSION_MISMATCH', 'operatorSession',
            'the confirming operator session is not the session that owns this proposal');
    }
    const expected = computeConfirmationBinding({
        operatorSessionId: shaped.document.operatorSessionId, proposalDocument: shaped.document.proposal,
        proposal: shaped.proposal, currentState
    });
    if (expected.proposalDigest !== confirmation.proposalDigest) {
        return refuse('SESSION_PROPOSAL_CONFIRMATION_BINDING_MISMATCH', 'confirmation.proposalDigest',
            'the stored proposal bytes are not the bytes this confirmation was bound to');
    }
    if (expected.currentStateDigest !== confirmation.currentStateDigest) {
        return refuse('OPERATOR_SESSION_PROPOSAL_STALE', 'confirmation.currentStateDigest',
            'current state changed after confirmation; the proposed effect no longer matches it', true);
    }
    if (expected.bindingDigest !== confirmation.bindingDigest) {
        return refuse('SESSION_PROPOSAL_CONFIRMATION_BINDING_MISMATCH', 'confirmation.bindingDigest',
            'the recorded confirmation binding does not reproduce from its own halves');
    }
    return null;
}

/**
 * The confirmed context handed to the sole validator: the caller's freshly read
 * state, with this proposal's ID added to the confirming session's confirmed
 * set. That set is CA-09's own confirmation input — this bridge supplies the
 * durable fact, it does not decide which types need confirming.
 */
export function confirmedContext(shaped: ShapedProposal, currentState: ValidationContext): ValidationContext {
    const session = currentState.operatorSession;
    if (session === undefined) throw new Error('confirmedContext requires an operator session; verifyConfirmation must run first');
    return Object.freeze({...currentState, operatorSession: withConfirmedId(session, shaped.proposal.proposalId)});
}

/**
 * The *provisional* context used only by `--dry-run` preview (§15.4): it
 * answers "if you confirmed this now, what would happen?" without writing a
 * byte. Apply never calls it — apply reads the durable confirmation through
 * `verifyConfirmation` — so this can never grant authority.
 */
export function provisionalContext(shaped: ShapedProposal, currentState: ValidationContext): ValidationContext {
    const session: OperatorSessionState = currentState.operatorSession
        ?? {sessionId: shaped.document.operatorSessionId, role: 'operator', confirmedProposalIds: new Set<string>()};
    return Object.freeze({...currentState, operatorSession: withConfirmedId(session, shaped.proposal.proposalId)});
}

/** Run the sole validator and translate a rejection once. */
export function revalidate(
    shaped: ShapedProposal, context: ValidationContext, validator: SessionProposalValidatorPort, recordRejected: boolean
): ProposalValidationResult | SessionProposalRefused {
    const result = validator.validateProposal(shaped.document.proposal, context);
    return result.valid && result.errors.length === 0 ? result : refuseFromValidation(result, recordRejected);
}

function withConfirmedId(session: OperatorSessionState, proposalId: string): OperatorSessionState {
    return Object.freeze({...session, confirmedProposalIds: new Set([...session.confirmedProposalIds, proposalId])});
}

/**
 * What `confirm` commits, decided against bytes read fresh inside
 * `SessionProposalRecorder.transition`'s held lane lock (review correction
 * CA26-R2-02). Pure: it only describes the write, never performs one.
 */
export function planConfirmation(
    fresh: ShapedProposal | SessionProposalRefused, confirmedBySessionId: string, currentState: ValidationContext, now: string
): SessionProposalTransitionDecision {
    if (isSessionProposalRefusal(fresh)) return fresh;
    if (!canTransition(fresh.document.state, 'operator-confirmed')) {
        return refuse('SESSION_PROPOSAL_STATE_INVALID', 'state', `a proposal in state "${fresh.document.state}" cannot be confirmed`);
    }
    if (confirmedBySessionId !== fresh.document.operatorSessionId) {
        return refuse('SESSION_PROPOSAL_SESSION_MISMATCH', 'confirmedBySessionId', 'only the owning operator session may confirm this proposal');
    }
    if (isExpired(fresh.proposal, now)) {
        return {
            document: withState(fresh.document, 'expired'),
            intent: {event: 'operator-session-proposal-rejected', rejectedBy: 'validator', reason: 'SESSION_PROPOSAL_EXPIRED', detail: 'the proposal expired before confirm'}
        };
    }
    return {
        document: withConfirmation(fresh.document, 'operator-confirmed', confirmationFor(fresh, currentState, confirmedBySessionId, now)),
        intent: {event: 'operator-session-proposal-confirmed', rejectedBy: null, reason: null, detail: null}
    };
}

/**
 * What `reject` commits, under the same locked-fresh-read shape as
 * `planConfirmation` (CA26-R2-02).
 *
 * The operator's rationale is validated **here**, before `transition` writes a
 * byte or publishes an event (CA26-R3-02). It is durable operator input that
 * this capsule's own reader holds to bounded text, so accepting a newline,
 * an empty string, or an overlong value would commit a document the next load
 * refuses — a proposal bricked by its own success path. Operator text is
 * refused rather than silently trimmed: rewriting what an operator wrote would
 * make this a second authority over their rationale.
 */
export function planRejection(fresh: ShapedProposal | SessionProposalRefused, reason: string): SessionProposalTransitionDecision {
    if (!isBoundedText(reason)) {
        return refuse('SESSION_PROPOSAL_SCHEMA_INVALID', 'reason',
            'the rejection rationale must be non-empty, at most 512 characters, and free of control characters');
    }
    if (isSessionProposalRefusal(fresh)) return fresh;
    if (!canTransition(fresh.document.state, 'operator-rejected')) {
        return refuse('SESSION_PROPOSAL_STATE_INVALID', 'state', `a proposal in state "${fresh.document.state}" cannot be rejected`);
    }
    return {
        document: withState(fresh.document, 'operator-rejected'),
        intent: {event: 'operator-session-proposal-rejected', rejectedBy: 'operator', reason: 'operator-rejected', detail: reason}
    };
}
