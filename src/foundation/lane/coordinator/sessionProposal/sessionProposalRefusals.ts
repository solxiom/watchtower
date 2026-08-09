/**
 * The one place a foreign refusal becomes a session-proposal refusal.
 *
 * CA-09 answers in `ProposalReason` and CA-10 in `EffectReason`; the operator
 * session speaks `operator-session.md` §23. Translating in one owner is what
 * keeps `OPERATOR_SESSION_PROPOSAL_STALE` ("no longer matches current state")
 * and `OPERATOR_SESSION_PROPOSAL_ILLEGAL` ("exceeds operator/policy authority")
 * from drifting apart at each call site, and it never invents a verdict — the
 * originating reason is carried through on the refusal for evidence.
 */
import type {
    EffectReason, ProposalReason, ProposalValidationResult, SessionProposalReason, SessionProposalRefused
} from '../../../../contracts/index.js';

/** Validator reasons that mean "the world moved", not "you may not do this". */
const STALE_PROPOSAL_REASONS: ReadonlySet<ProposalReason> = new Set<ProposalReason>([
    'PROPOSAL_STALE_SNAPSHOT', 'PROPOSAL_EXPIRED', 'PROPOSAL_DUPLICATE', 'PROPOSAL_PRECONDITION_FAILED',
    'PROPOSAL_CLAIM_CONFLICT', 'PROPOSAL_EVIDENCE_DRIFT', 'PROPOSAL_SEAL_INVALID'
]);

/** Executor reasons that mean the revalidated world changed under the lock. */
const STALE_EFFECT_REASONS: ReadonlySet<EffectReason> = new Set<EffectReason>([
    'EFFECT_STATE_CHANGED', 'EFFECT_PACK_SEAL_DRIFT', 'EFFECT_REVISION_NOT_ADMITTED',
    'EFFECT_RESUME_IDENTITY_MISMATCH', 'EFFECT_WORKTREE_STALE'
]);

/**
 * Executor reasons that leave the effect provably un-run and are retryable
 * once the named condition clears. These must **not** move the durable record
 * to its terminal rejected state, or a transient lock conflict would burn a
 * legitimately confirmed proposal.
 */
const RETRYABLE_EFFECT_REASONS: ReadonlySet<EffectReason> = new Set<EffectReason>([
    'COORDINATOR_EFFECT_CONFLICT', 'EFFECT_ENVELOPE_WRITE_FAILED', 'EFFECT_ENVELOPE_ORPHANED',
    'EFFECT_JOURNAL_UNREADABLE', 'EFFECT_JOURNAL_WRITE_FAILED', 'EFFECT_CANCELLED', 'EFFECT_RUNNER_FAILED'
]);

/** One narrowing for every `X | SessionProposalRefused` return in this capsule. */
export function isSessionProposalRefusal<T extends object>(value: T | SessionProposalRefused): value is SessionProposalRefused {
    return 'status' in value && (value as {readonly status?: unknown}).status === 'refused';
}

export function refuse(
    reason: SessionProposalReason, subject: string, message: string, recordRejected = false
): SessionProposalRefused {
    return Object.freeze({status: 'refused', reason, subject, message, recordRejected});
}

/** Translate the sole validator's first stable reason; the full verdict rides along as evidence. */
export function refuseFromValidation(revalidation: ProposalValidationResult, recordRejected: boolean): SessionProposalRefused {
    const first = revalidation.errors[0];
    if (first === undefined) {
        return Object.freeze({
            status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_ILLEGAL', subject: 'revalidation',
            message: 'The validator reported an invalid proposal without a reason; no effect may be applied.',
            revalidation, recordRejected
        });
    }
    return Object.freeze({
        status: 'refused', reason: sessionReasonFor(first.code), subject: first.subject,
        message: first.message, revalidation, recordRejected
    });
}

export function sessionReasonFor(code: ProposalReason): SessionProposalReason {
    if (code === 'PROPOSAL_CONFIRMATION_REQUIRED') return 'OPERATOR_SESSION_CONFIRMATION_REQUIRED';
    return STALE_PROPOSAL_REASONS.has(code) ? 'OPERATOR_SESSION_PROPOSAL_STALE' : 'OPERATOR_SESSION_PROPOSAL_ILLEGAL';
}

export function isRetryableEffectReason(reason: EffectReason): boolean {
    return RETRYABLE_EFFECT_REASONS.has(reason);
}

/** Translate one executor refusal, preserving its exact `EffectReason` as evidence. */
export function refuseFromEffect(reason: EffectReason, subject: string, message: string): SessionProposalRefused {
    const sessionReason: SessionProposalReason = STALE_EFFECT_REASONS.has(reason)
        ? 'OPERATOR_SESSION_PROPOSAL_STALE'
        : 'OPERATOR_SESSION_PROPOSAL_ILLEGAL';
    return Object.freeze({
        status: 'refused', reason: sessionReason, subject, message,
        effectReason: reason, recordRejected: !isRetryableEffectReason(reason)
    });
}
