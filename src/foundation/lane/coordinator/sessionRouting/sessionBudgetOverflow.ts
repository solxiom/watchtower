/**
 * Deciding how much of one debit exceeds the *base* policy ceiling and must
 * therefore be covered by grant allowance.
 *
 * This is the piece that makes a grant genuinely one-time. The session's usage
 * counters are monotonic, so "how much granted headroom did this debit rely
 * on" is exactly the increase in the amount by which usage sits above the base
 * limit — computed per dimension, before and after the debit. A debit that
 * stays under the base ceiling plans no draw at all; a debit that crosses it
 * plans a draw for precisely the crossing amount, never more.
 *
 * Keeping this arithmetic out of `sessionBudgetLedger.ts` leaves that module
 * owning accounting state transitions only, and leaves this one with a single
 * cohesive question that can be tested in isolation.
 */
import type {
    SessionBudgetDebit, SessionBudgetLimits, SessionBudgetState, SessionGrant, SessionGrantLedger
} from '../../../../contracts/index.js';
import type {SessionGrantContext} from './sessionGrantBinding.js';
import {drawGrantAllowances, type GrantDraw} from './sessionGrantConsumption.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';

export function planGrantDrawsForDebit(
    before: SessionBudgetState, after: SessionBudgetState, limits: SessionBudgetLimits, debit: SessionBudgetDebit
): readonly GrantDraw[] {
    const draws: GrantDraw[] = [];
    addUsageDraw(draws, 'sessionCumulativeTokens',
        overflowDelta(before.sessionCumulativeTokens, after.sessionCumulativeTokens, limits.sessionCumulativeTokens));
    addUsageDraw(draws, 'sessionContextRequests',
        overflowDelta(before.sessionContextRequests, after.sessionContextRequests, limits.sessionContextRequests));
    const turns = debit.modelBackedTurn === true
        ? overflowDelta(before.sessionModelBackedTurns, after.sessionModelBackedTurns, limits.sessionTurns)
        : 0;
    if (turns > 0) draws.push(Object.freeze({kind: 'turns', amount: turns}));
    return Object.freeze(draws);
}

/** The increase in usage-above-base caused by this debit; zero while the debit stays under the base ceiling. */
function overflowDelta(before: number, after: number, baseCeiling: number): number {
    return Math.max(0, after - baseCeiling) - Math.max(0, before - baseCeiling);
}

function addUsageDraw(draws: GrantDraw[], dimension: GrantDraw['dimension'], amount: number): void {
    if (amount > 0) draws.push(Object.freeze({kind: 'usage', dimension, amount}));
}

/** Refuses a debit that needs granted headroom without an idempotency key or without a grant ledger. */
export function applyGrantDraws(
    state: SessionBudgetState, debit: SessionBudgetDebit, draws: readonly GrantDraw[], grants?: SessionGrantContext
): SessionGrantLedger | null {
    if (draws.length === 0) return null;
    if (grants === undefined) {
        sessionRoutingFailure('SESSION_BUDGET_HARD_LIMIT', state.operatorSessionId,
            'the debit exceeds the base ceiling and no grant ledger was supplied to draw from');
    }
    if (debit.debitId === undefined) {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', state.operatorSessionId,
            'a debit that draws grant allowance requires debitId as its idempotency key');
    }
    return drawGrantAllowances(state, grants, debit.debitId, draws);
}

/** The grants this debit actually drew from, for the caller's audit record. */
export function drawnGrantIds(before: readonly SessionGrant[], after: SessionGrantLedger | null): readonly string[] {
    if (after === null) return Object.freeze([]);
    return Object.freeze(after.grants.filter(grant => {
        const prior = before.find(item => item.grantId === grant.grantId);
        return prior !== undefined && prior.consumed !== grant.consumed;
    }).map(grant => grant.grantId));
}
