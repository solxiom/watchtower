/**
 * What a grant authorizes versus what is still drawable — the distinction that
 * makes a finite grant one-time without retroactively invalidating spend.
 *
 * - `grantedAllowance` is the grant's face value.
 * - `remainingAllowance` is what can still be drawn; it reaches zero once the
 *   grant is exhausted or expired, which is what stops reuse.
 * - `ceilingAllowance` is what the grant contributes to the effective ceiling:
 *   its full face value while live, and only what it already drew once expired.
 *   Session usage counters are monotonic, so withdrawing an exhausted grant's
 *   contribution would make legitimately authorized spend illegal after the
 *   fact — the defect the first correction pass introduced.
 */
import type {
    SessionBudgetLimits, SessionBudgetState, SessionGrant, SessionGrantDimension
} from '../../../../contracts/index.js';
import {assertLedgerBinding, type SessionGrantContext} from './sessionGrantBinding.js';
import {requireTimestamp} from './sessionGrantValidation.js';
import {validateSessionBudgetLimits} from './sessionRoutingValidation.js';

/** Per-session ceilings after grants. The lane ceiling is deliberately absent: a grant can never raise it. */
export interface SessionCeilings {
    readonly sessionCumulativeTokens: number;
    readonly sessionContextRequests: number;
    readonly sessionTurns: number;
}

/** The total units this grant authorizes. */
export function grantedAllowance(grant: SessionGrant): number {
    return grant.allowance.kind === 'turns' ? grant.allowance.turns : grant.allowance.value;
}

/** Units still drawable; zero once the grant is exhausted or expired. This is what makes a grant one-time. */
export function remainingAllowance(grant: SessionGrant, nowMs?: number): number {
    if (nowMs !== undefined && isExpired(grant, nowMs)) return 0;
    return Math.max(0, grantedAllowance(grant) - grant.consumed);
}

/** What the grant contributes to the ceiling: its full authorization, or just what it drew once expired. */
function ceilingAllowance(grant: SessionGrant, nowMs: number): number {
    return isExpired(grant, nowMs) ? grant.consumed : grantedAllowance(grant);
}

function isExpired(grant: SessionGrant, nowMs: number): boolean {
    return grant.expiresAtMs !== null && grant.expiresAtMs <= nowMs;
}

function isActive(grant: SessionGrant, nowMs: number): boolean {
    return remainingAllowance(grant, nowMs) > 0;
}

function usageAllowance(grants: readonly SessionGrant[], dimension: SessionGrantDimension, nowMs: number): number {
    return grants.reduce((total, grant) =>
        grant.allowance.kind === 'usage' && grant.allowance.dimension === dimension ? total + ceilingAllowance(grant, nowMs) : total, 0);
}

function turnAllowance(grants: readonly SessionGrant[], nowMs: number): number {
    return grants.reduce((total, grant) => grant.allowance.kind === 'turns' ? total + ceilingAllowance(grant, nowMs) : total, 0);
}


/** Grants that still apply: bound to this session and segment, unexpired, and with allowance remaining. */
export function activeGrants(state: SessionBudgetState, context: SessionGrantContext | undefined): readonly SessionGrant[] {
    if (context === undefined) return Object.freeze([]);
    requireTimestamp('nowMs', context.nowMs);
    assertLedgerBinding(state, context.ledger);
    return Object.freeze(context.ledger.grants.filter(grant => isActive(grant, context.nowMs)));
}

/**
 * Base limits plus what the bound grants authorize. Expired and exhausted
 * grants are included at what they already drew, so no ceiling ever falls below
 * capacity the session was legitimately authorized to spend.
 */
export function effectiveSessionCeilings(
    limits: SessionBudgetLimits, state: SessionBudgetState, context?: SessionGrantContext
): SessionCeilings {
    validateSessionBudgetLimits(limits);
    if (context === undefined) {
        return Object.freeze({
            sessionCumulativeTokens: limits.sessionCumulativeTokens,
            sessionContextRequests: limits.sessionContextRequests, sessionTurns: limits.sessionTurns
        });
    }
    requireTimestamp('nowMs', context.nowMs);
    const grants = assertLedgerBinding(state, context.ledger).grants;
    const nowMs = context.nowMs;
    return Object.freeze({
        sessionCumulativeTokens: limits.sessionCumulativeTokens + usageAllowance(grants, 'sessionCumulativeTokens', nowMs),
        sessionContextRequests: limits.sessionContextRequests + usageAllowance(grants, 'sessionContextRequests', nowMs),
        sessionTurns: limits.sessionTurns + turnAllowance(grants, nowMs)
    });
}

