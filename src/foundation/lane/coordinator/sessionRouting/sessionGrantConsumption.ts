/**
 * Drawing against a finite grant allowance (`docs/spec/operator-session.md`
 * §13.2). Split from `sessionBudgetGrants.ts` so that module owns evaluation
 * and ceilings while this one owns the single question "how much of this grant
 * has actually been spent".
 *
 * A grant is finite only if it can be exhausted. Both allowance kinds are
 * therefore consumable through one debit path: a `turns` grant draws one turn,
 * a `usage` grant draws granted units of its own dimension. Once `consumed`
 * reaches the granted amount the grant stops contributing to
 * `effectiveSessionCeilings`, which is what prevents an allowance from behaving
 * like a permanent session-profile rewrite.
 *
 * Every debit is idempotent under an explicit `consumptionId` recorded on the
 * ledger, so a replayed or concurrently retried application is a no-op rather
 * than a second draw. Over-drawing is refused rather than clamped: silently
 * capping would let a caller believe it had spent capacity that policy never
 * granted. Like the rest of the capsule this is a pure ledger transition — the
 * caller persists the returned ledger through its own accepted owner.
 */
import type {
    SessionBudgetState, SessionGrant, SessionGrantDimension, SessionGrantLedger, SessionGrantUsageConsumption
} from '../../../../contracts/index.js';
import {activeGrants, remainingAllowance} from './sessionGrantAllowance.js';
import {assertLedgerBinding, type SessionGrantContext} from './sessionGrantBinding.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';

/** One dimension's shortfall that must be covered by grant headroom. */
export interface GrantDraw {
    readonly kind: 'turns' | 'usage';
    readonly dimension?: SessionGrantDimension;
    readonly amount: number;
}

/** Draws one turn from the oldest active turns grant; a usage grant is untouched. */
export function consumeGrantTurn(
    state: SessionBudgetState, context: SessionGrantContext, consumptionId: string
): SessionGrantLedger {
    requireConsumptionId(consumptionId);
    const ledger = assertLedgerBinding(state, context.ledger);
    if (ledger.appliedConsumptionIds.includes(consumptionId)) return ledger;
    const target = activeGrants(state, context).find(grant => grant.allowance.kind === 'turns');
    if (target === undefined) {
        sessionRoutingFailure('SESSION_GRANT_ALLOWANCE_EXHAUSTED', consumptionId,
            'no active turns grant has allowance remaining for this draw');
    }
    return applyDraws(ledger, consumptionId, new Map([[target.grantId, 1]]));
}

/**
 * Draws `amount` units of one bounded dimension across the active usage grants
 * for that dimension, oldest first. A draw larger than the total remaining
 * allowance is refused whole; no grant is partially debited.
 */
export function consumeGrantUsage(
    state: SessionBudgetState, context: SessionGrantContext, consumption: SessionGrantUsageConsumption
): SessionGrantLedger {
    requireConsumptionId(consumption.consumptionId);
    requireAmount(consumption);
    const ledger = assertLedgerBinding(state, context.ledger);
    if (ledger.appliedConsumptionIds.includes(consumption.consumptionId)) return ledger;
    const targets = activeGrants(state, context).filter(grant =>
        grant.allowance.kind === 'usage' && grant.allowance.dimension === consumption.dimension);
    const available = targets.reduce((total, grant) => total + remainingAllowance(grant, context.nowMs), 0);
    if (consumption.amount > available) {
        sessionRoutingFailure('SESSION_GRANT_ALLOWANCE_EXHAUSTED', consumption.consumptionId,
            `the draw of ${consumption.amount} exceeds the ${available} units remaining on ${consumption.dimension} grants`);
    }
    return applyDraws(ledger, consumption.consumptionId, planDraws(targets, consumption.amount, context.nowMs));
}

/** Oldest grant first, so an expiring allowance is spent before a later one. */
function planDraws(targets: readonly SessionGrant[], amount: number, nowMs: number): ReadonlyMap<string, number> {
    const draws = new Map<string, number>();
    let outstanding = amount;
    for (const grant of targets) {
        if (outstanding === 0) break;
        const draw = Math.min(outstanding, remainingAllowance(grant, nowMs));
        if (draw > 0) {
            draws.set(grant.grantId, draw);
            outstanding -= draw;
        }
    }
    return draws;
}

function applyDraws(
    ledger: SessionGrantLedger, consumptionId: string, draws: ReadonlyMap<string, number>
): SessionGrantLedger {
    return Object.freeze({
        ...ledger,
        grants: Object.freeze(ledger.grants.map(grant => {
            const draw = draws.get(grant.grantId);
            return draw === undefined ? grant : Object.freeze({...grant, consumed: grant.consumed + draw});
        })),
        appliedConsumptionIds: Object.freeze([...ledger.appliedConsumptionIds, consumptionId])
    });
}

function requireConsumptionId(consumptionId: string): void {
    if (typeof consumptionId !== 'string' || consumptionId.trim() === '') {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', 'consumptionId',
            'a grant draw requires a non-empty idempotency key');
    }
}

function requireAmount(consumption: SessionGrantUsageConsumption): void {
    if (!Number.isSafeInteger(consumption.amount) || consumption.amount < 1) {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', consumption.consumptionId,
            'a grant draw amount must be a positive safe integer');
    }
}

/**
 * Draws every shortfall of one debit in a single indivisible ledger
 * transition. Either all draws succeed and the returned ledger records them
 * under `consumptionId`, or nothing is debited at all — a partially covered
 * debit would leave granted capacity spent without the grant recording it.
 * This is the function that makes spending and consuming atomic: the ledger
 * owner calls it from inside `debitSessionBudget`, so no caller can reach the
 * one without the other.
 */
export function drawGrantAllowances(
    state: SessionBudgetState, context: SessionGrantContext, consumptionId: string, draws: readonly GrantDraw[]
): SessionGrantLedger {
    requireConsumptionId(consumptionId);
    const ledger = assertLedgerBinding(state, context.ledger);
    if (draws.length === 0) return ledger;
    if (ledger.appliedConsumptionIds.includes(consumptionId)) return ledger;
    const planned = new Map<string, number>();
    for (const draw of draws) {
        const targets = matching(activeGrants(state, context), draw);
        const available = targets.reduce((total, grant) => total + remainingAllowance(grant, context.nowMs), 0);
        if (draw.amount > available) {
            sessionRoutingFailure('SESSION_GRANT_ALLOWANCE_EXHAUSTED', consumptionId,
                `the debit needs ${draw.amount} more ${draw.dimension ?? 'turns'} than the base ceiling allows, but only ${available} granted units remain`);
        }
        for (const [grantId, units] of planDraws(targets, draw.amount, context.nowMs)) {
            planned.set(grantId, (planned.get(grantId) ?? 0) + units);
        }
    }
    return applyDraws(ledger, consumptionId, planned);
}

function matching(grants: readonly SessionGrant[], draw: GrantDraw): readonly SessionGrant[] {
    return grants.filter(grant => draw.kind === 'turns'
        ? grant.allowance.kind === 'turns'
        : grant.allowance.kind === 'usage' && grant.allowance.dimension === draw.dimension);
}
