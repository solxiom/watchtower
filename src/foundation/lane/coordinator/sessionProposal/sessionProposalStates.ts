/**
 * The §15.1 session-proposal lifecycle, and only that
 * (`docs/spec/operator-session.md` §15.1):
 *
 * ```text
 * PROPOSED
 *   → OPERATOR_CONFIRMED
 *   → REVALIDATED
 *       ├── REJECTED_STALE_OR_ILLEGAL
 *       └── EFFECT_PREPARED
 *             → EFFECT_VERIFIED | EFFECT_UNCERTAIN
 *
 * PROPOSED → OPERATOR_REJECTED | EXPIRED
 * ```
 *
 * Pure: no clock, no storage, no proposal semantics. The state names are
 * CA-16R's accepted `SESSION_PROPOSAL_STATES`; this module owns the edges
 * between them and nothing else.
 */
import {SESSION_PROPOSAL_STATES, type SessionProposalState} from '../../../../contracts/index.js';

const TRANSITIONS: Readonly<Record<SessionProposalState, readonly SessionProposalState[]>> = Object.freeze({
    proposed: Object.freeze(['operator-confirmed', 'operator-rejected', 'expired'] as const),
    'operator-confirmed': Object.freeze(['revalidated', 'rejected-stale-or-illegal', 'expired'] as const),
    revalidated: Object.freeze(['effect-prepared', 'rejected-stale-or-illegal'] as const),
    'effect-prepared': Object.freeze(['effect-verified', 'effect-uncertain'] as const),
    'effect-verified': Object.freeze([] as const),
    'effect-uncertain': Object.freeze([] as const),
    'operator-rejected': Object.freeze([] as const),
    expired: Object.freeze([] as const),
    'rejected-stale-or-illegal': Object.freeze([] as const)
});

/** A state with no outgoing edge: the proposal is finished and a new one is required. */
export function isTerminalState(state: SessionProposalState): boolean {
    return TRANSITIONS[state].length === 0;
}

export function canTransition(from: SessionProposalState, to: SessionProposalState): boolean {
    return TRANSITIONS[from].includes(to);
}

export function nextStates(from: SessionProposalState): readonly SessionProposalState[] {
    return TRANSITIONS[from];
}

/**
 * `apply` reaches the executor from exactly one state. `revalidated` and
 * `effect-prepared` are reached inside a single apply call and are never a
 * durable resting point a later call may resume from, so a record found in
 * either of them is an interrupted attempt whose real outcome lives in the
 * effect journal — the executor's own replay fence, not a second lifecycle
 * guess, resolves it.
 */
export const APPLY_ENTRY_STATE: SessionProposalState = 'operator-confirmed';

/** Every state has exactly one edge list — proved once at module load, never at a call site. */
function assertCompleteLifecycle(): void {
    for (const state of SESSION_PROPOSAL_STATES) {
        if (!(state in TRANSITIONS)) throw new Error(`sessionProposalStates: missing edges for "${state}"`);
    }
}
assertCompleteLifecycle();
