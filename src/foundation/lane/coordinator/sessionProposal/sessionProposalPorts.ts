/**
 * The injected collaborators of the session-proposal bridge (CA-26).
 *
 * Each port is deliberately the *narrowest* view of an already-accepted owner,
 * never a reimplementation and never a wider handle than this capability
 * needs:
 *
 * - `SessionProposalValidatorPort` is satisfied by CA-09's `ProposalValidator`
 *   — the sole validation authority. This capability never decides legality.
 * - `SessionProposalEffectPort` is satisfied by CA-10's `EffectExecutor` — the
 *   sole lane effect authority. This capability never mutates lane state and
 *   never opens a second effect path.
 * - `SessionProposalJournalPort` is satisfied by CA-15's `SessionStore`, and
 *   exposes only `appendEvent`: this bridge publishes proposal events and has
 *   no business creating sessions or acquiring turns.
 * - `SessionProposalStatePort` is the caller's freshly read current-state
 *   projection. Reading it twice — once at confirmation, once at apply — is
 *   what makes "current-state validation" mean current.
 */
import type {EffectOutcome, EffectPlan, ProposalValidationResult} from '../../../../contracts/index.js';
import type {SessionJournalEntry, SessionMetadataEventType, SessionMetadataPayload} from '../../../../contracts/operatorSession.js';
import type {EffectRequest} from '../../../effect/index.js';
import type {ValidationContext} from '../../../proposal/index.js';

export interface SessionProposalValidatorPort {
    validateProposal(proposal: unknown, currentState: ValidationContext): ProposalValidationResult;
}

export interface SessionProposalEffectPort {
    /** Side-effect-free preview; the exact plan a later apply commits. */
    plan(request: EffectRequest): EffectPlan;
    apply(request: EffectRequest): Promise<EffectOutcome>;
}

export interface SessionProposalJournalPort {
    appendEvent(sessionId: string, type: SessionMetadataEventType, payload: SessionMetadataPayload): SessionJournalEntry;
}

export interface SessionProposalStatePort {
    /** One freshly read current-state projection for this lane. */
    read(): ValidationContext;
}

/** The only clock this capability sees; RFC 3339 text, matching every durable timestamp in the lane. */
export interface SessionProposalClock {
    now(): string;
}
