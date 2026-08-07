/**
 * Finite session budget grants (`docs/spec/operator-session.md` §13.2,
 * `docs/spec/v1-contracts.md` §5 `grant-session-budget` / §7). A grant is a
 * separately confirmed, finite allowance for an explicit number of turns or
 * one bounded usage dimension. This module evaluates and accounts for one; it
 * never journals, confirms, or applies anything, because proposal confirmation
 * is CA-26 and the sole mutation authority is CA-10's effect executor.
 * Drawing against an allowance lives in `sessionGrantConsumption.ts`.
 *
 * The five things §13.2 says a grant must not do are structural here:
 *
 * - it never rewrites the session profile — `SessionBudgetLimits` is an input
 *   and no function returns a modified copy of it;
 * - it never raises the lane-wide hard limit — `effectiveSessionCeilings`
 *   returns per-session ceilings only, and every lane check in the ledger
 *   reads `limits.laneOperatorSessionTotalTokens` directly;
 * - it never replenishes allocation capacity — nothing here lowers a usage
 *   counter;
 * - it never consumes protected escalation/recovery reserves — the allowance
 *   is checked against `grantableTokens`, which excludes them; and
 * - it never transfers accounting from another session *or budget segment* —
 *   `assertLedgerBinding` refuses a foreign ledger before any grant inside it
 *   is read, and every recorded and replayed grant is re-checked against the
 *   current session and segment.
 *
 * Finiteness has two distinct quantities, and conflating them is what made the
 * first correction pass self-inconsistent:
 *
 * - `ceilingAllowance` is what the grant *authorizes*. Spent capacity is already
 *   recorded in the session's monotonic usage counters, so an exhausted grant
 *   must keep contributing its granted amount — withdrawing it would make
 *   legitimately authorized spend retroactively illegal.
 * - `remainingAllowance` is what is still *drawable*. It falls to zero once the
 *   grant is fully consumed, which is what makes the grant one-time: the
 *   allowance can be drawn exactly once and never again.
 *
 * An expired grant contributes only what it already drew (`consumed`) to the
 * ceiling and nothing drawable, so expiry stops new headroom without
 * retroactively invalidating spend that was authorized while it was live.
 */
import type {
    SessionBudgetLimits, SessionBudgetState, SessionGrant, SessionGrantAllowance,
    SessionGrantLedger, SessionGrantRequest
} from '../../../../contracts/index.js';
import {computeReserveSplit} from './sessionReserves.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';
import {assertGrantBinding, assertLedgerBinding, type SessionGrantContext} from './sessionGrantBinding.js';
import {validateGrantRequest} from './sessionGrantValidation.js';

/**
 * Evaluates one grant request against lane capacity and the protected reserve.
 * Replay of the identical request returns the recorded grant unchanged; a
 * different request reusing a recorded `grantId` is refused. The ledger binding
 * is checked before the replay lookup, so a foreign segment's grant is never
 * returned.
 */
export function evaluateSessionGrant(
    request: SessionGrantRequest, state: SessionBudgetState, limits: SessionBudgetLimits, context: SessionGrantContext
): SessionGrant {
    validateGrantRequest(request, state);
    assertLedgerBinding(state, context.ledger);
    const split = computeReserveSplit(state, limits);
    const existing = context.ledger.grants.find(grant => grant.grantId === request.grantId);
    if (existing !== undefined) return replayed(existing, request, state);
    if (request.expiresAtMs !== null && request.expiresAtMs <= context.nowMs) {
        sessionRoutingFailure('SESSION_GRANT_EXPIRED', request.grantId, 'the requested grant has already expired');
    }
    const cost = grantTokenCost(request.allowance, limits);
    if (cost > split.laneRemainingTokens) {
        sessionRoutingFailure('SESSION_GRANT_EXCEEDS_LANE_CEILING', request.grantId,
            `the grant needs ${cost} tokens but only ${split.laneRemainingTokens} remain in the lane ceiling`);
    }
    if (cost > split.grantableTokens) {
        sessionRoutingFailure('SESSION_GRANT_RESERVE_PROTECTED', request.grantId,
            `the grant needs ${cost} tokens but only ${split.grantableTokens} are outside the protected escalation/recovery reserve`);
    }
    return Object.freeze({
        grantId: request.grantId, operatorSessionId: request.operatorSessionId, budgetSegmentId: request.budgetSegmentId,
        allowance: request.allowance, reason: request.reason, grantedAtMs: request.requestedAtMs,
        expiresAtMs: request.expiresAtMs, reserveSplit: split, consumed: 0
    });
}

/** Appends an evaluated grant to its own session's ledger. Re-recording the identical grant is a no-op, so replay is safe. */
export function recordSessionGrant(
    state: SessionBudgetState, context: SessionGrantContext, grant: SessionGrant
): SessionGrantLedger {
    const ledger = assertLedgerBinding(state, context.ledger);
    assertGrantBinding(state, grant);
    const existing = ledger.grants.find(item => item.grantId === grant.grantId);
    if (existing !== undefined) {
        if (existing.grantedAtMs !== grant.grantedAtMs || existing.reason !== grant.reason
            || !sameAllowance(existing.allowance, grant.allowance)) {
            sessionRoutingFailure('SESSION_GRANT_DUPLICATE_REPLAY', grant.grantId, 'a different grant is already recorded under this grant id');
        }
        return ledger;
    }
    return Object.freeze({...ledger, grants: Object.freeze([...ledger.grants, grant])});
}

/** A turns grant still costs lane capacity: its worst case is `turns × (per-turn input + output)`. */
function grantTokenCost(allowance: SessionGrantAllowance, limits: SessionBudgetLimits): number {
    if (allowance.kind === 'turns') return allowance.turns * (limits.perTurnInputTokens + limits.perTurnOutputTokens);
    return allowance.dimension === 'sessionCumulativeTokens' ? allowance.value : 0;
}

function replayed(existing: SessionGrant, request: SessionGrantRequest, state: SessionBudgetState): SessionGrant {
    assertGrantBinding(state, existing);
    const identical = existing.operatorSessionId === request.operatorSessionId
        && existing.budgetSegmentId === request.budgetSegmentId && existing.reason === request.reason
        && existing.grantedAtMs === request.requestedAtMs && existing.expiresAtMs === request.expiresAtMs
        && sameAllowance(existing.allowance, request.allowance);
    if (!identical) {
        sessionRoutingFailure('SESSION_GRANT_DUPLICATE_REPLAY', request.grantId, 'a different grant is already recorded under this grant id');
    }
    return existing;
}

function sameAllowance(left: SessionGrantAllowance, right: SessionGrantAllowance): boolean {
    if (left.kind === 'turns' && right.kind === 'turns') return left.turns === right.turns;
    if (left.kind === 'usage' && right.kind === 'usage') return left.dimension === right.dimension && left.value === right.value;
    return false;
}
