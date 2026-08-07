/**
 * CA-17 correction-01 finding **C01-02** — a grant must be finite. It is drawn
 * exactly once and cannot be drawn again, and spending granted headroom is
 * atomic with consuming the grant, so no ordering exists in which capacity is
 * spent without the grant recording it or a grant is consumed twice.
 */
import {
    activeGrants, admitModelBackedTurn, consumeGrantTurn, consumeGrantUsage, debitSessionBudget,
    effectiveSessionCeilings, emptySessionGrantLedger, evaluateSessionBudget, evaluateSessionGrant,
    recordSessionGrant, remainingAllowance, SessionRoutingError
} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import type {SessionGrantLedger, SessionRoutingReason} from '../../../src/contracts/index.js';
import type {SessionGrantContext} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import {budgetState, grantRequest, OPERATOR_STANDARD_LIMITS} from './support/sessionRoutingFixtures.js';

const NOW = 10_000;

function reasonOf(run: () => unknown): SessionRoutingReason {
    try {
        run();
    } catch (error) {
        if (error instanceof SessionRoutingError) return error.reason;
        throw error;
    }
    throw new Error('expected a SessionRoutingError');
}

function context(ledger: SessionGrantLedger, nowMs = NOW): SessionGrantContext {
    return {ledger, nowMs};
}

const EMPTY = emptySessionGrantLedger(budgetState());

function record(grant: ReturnType<typeof evaluateSessionGrant>, state = budgetState(), ledger = EMPTY): SessionGrantLedger {
    return recordSessionGrant(state, context(ledger), grant);
}

describe('CA-17 C01-02 — a usage grant is finite and exhausted exactly once', () => {
    const USAGE = {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 100} as const;

    function usageLedger(state = budgetState()): SessionGrantLedger {
        return record(evaluateSessionGrant(grantRequest({allowance: USAGE}), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)), state);
    }

    it('authorizes its full face value while the drawable allowance shrinks as it is drawn', () => {
        const state = budgetState();
        let ledger = usageLedger();
        expect(effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, state, context(ledger)).sessionCumulativeTokens).toBe(500_100);
        expect(remainingAllowance(ledger.grants[0])).toBe(100);
        ledger = consumeGrantUsage(state, context(ledger), {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 40});
        expect(remainingAllowance(ledger.grants[0])).toBe(60);
        // The ceiling deliberately does NOT fall: the drawn 40 is already recorded in the
        // session's monotonic usage, so withdrawing it would make authorized spend illegal.
        expect(effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, state, context(ledger)).sessionCumulativeTokens).toBe(500_100);
    });

    it('has no drawable allowance left once the whole allowance is consumed', () => {
        const state = budgetState();
        const ledger = consumeGrantUsage(state, context(usageLedger()),
            {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 100});
        expect(remainingAllowance(ledger.grants[0])).toBe(0);
        expect(activeGrants(state, context(ledger))).toEqual([]);
        expect(effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, state, context(ledger)).sessionCumulativeTokens).toBe(500_100);
    });

    it('cannot be reused after the allowance is consumed', () => {
        const state = budgetState();
        const ledger = consumeGrantUsage(state, context(usageLedger()),
            {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 100});
        expect(reasonOf(() => consumeGrantUsage(state, context(ledger),
            {consumptionId: 'draw-2', dimension: 'sessionCumulativeTokens', amount: 1}))).toBe('SESSION_GRANT_ALLOWANCE_EXHAUSTED');
    });

    it('proves the grant admits a turn the base limits refuse, and stops once its headroom is gone', () => {
        const atBase = budgetState({sessionCumulativeTokens: 500_000});
        expect(admitModelBackedTurn(atBase, OPERATOR_STANDARD_LIMITS).modelBackedTurnAdmitted).toBeFalse();
        const granted = usageLedger(atBase);
        expect(admitModelBackedTurn(atBase, OPERATOR_STANDARD_LIMITS, context(granted)).modelBackedTurnAdmitted).toBeTrue();
        const spent = debitSessionBudget(atBase, OPERATOR_STANDARD_LIMITS,
            {debitId: 'debit-1', inputTokens: 100}, context(granted));
        expect(admitModelBackedTurn(spent.state, OPERATOR_STANDARD_LIMITS, context(spent.ledger!)).modelBackedTurnAdmitted).toBeFalse();
    });

    it('refuses a draw larger than the remaining allowance and debits nothing', () => {
        const state = budgetState();
        const ledger = usageLedger();
        expect(reasonOf(() => consumeGrantUsage(state, context(ledger),
            {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 101}))).toBe('SESSION_GRANT_ALLOWANCE_EXHAUSTED');
        expect(ledger.grants[0].consumed).toBe(0);
    });

    it('never draws a usage grant of a different dimension', () => {
        const state = budgetState();
        expect(reasonOf(() => consumeGrantUsage(state, context(usageLedger()),
            {consumptionId: 'draw-1', dimension: 'sessionContextRequests', amount: 1}))).toBe('SESSION_GRANT_ALLOWANCE_EXHAUSTED');
    });

    it('is replay safe: re-applying a recorded consumption id never draws twice', () => {
        const state = budgetState();
        const first = consumeGrantUsage(state, context(usageLedger()),
            {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 60});
        const replayed = consumeGrantUsage(state, context(first),
            {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 60});
        expect(replayed).toBe(first);
        expect(replayed.grants[0].consumed).toBe(60);
    });

    it('is replay safe for turns draws under the same idempotency key', () => {
        const state = budgetState({sessionModelBackedTurns: 50});
        const ledger = record(evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)), state);
        const once = consumeGrantTurn(state, context(ledger), 'draw-1');
        expect(consumeGrantTurn(state, context(once), 'draw-1')).toBe(once);
        expect(once.grants[0].consumed).toBe(1);
    });

    it('refuses a turns draw once the turns allowance is exhausted', () => {
        const state = budgetState({sessionModelBackedTurns: 50});
        let ledger = record(evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)), state);
        ledger = consumeGrantTurn(state, context(ledger), 'draw-1');
        ledger = consumeGrantTurn(state, context(ledger), 'draw-2');
        expect(reasonOf(() => consumeGrantTurn(state, context(ledger), 'draw-3'))).toBe('SESSION_GRANT_ALLOWANCE_EXHAUSTED');
    });

    it('refuses a draw without an idempotency key or with a non-positive amount', () => {
        const state = budgetState();
        expect(reasonOf(() => consumeGrantUsage(state, context(usageLedger()),
            {consumptionId: '  ', dimension: 'sessionCumulativeTokens', amount: 1}))).toBe('SESSION_GRANT_REQUEST_INVALID');
        expect(reasonOf(() => consumeGrantUsage(state, context(usageLedger()),
            {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 0}))).toBe('SESSION_GRANT_REQUEST_INVALID');
        expect(reasonOf(() => consumeGrantUsage(state, context(usageLedger()),
            {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 1.5}))).toBe('SESSION_GRANT_REQUEST_INVALID');
    });

    it('spends the oldest allowance first when two usage grants are active', () => {
        const state = budgetState();
        let ledger = usageLedger();
        const second = evaluateSessionGrant(
            grantRequest({grantId: 'grant-2', allowance: {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 50}}),
            state, OPERATOR_STANDARD_LIMITS, context(ledger));
        ledger = recordSessionGrant(state, context(ledger), second);
        ledger = consumeGrantUsage(state, context(ledger), {consumptionId: 'draw-1', dimension: 'sessionCumulativeTokens', amount: 120});
        expect(ledger.grants[0].consumed).toBe(100);
        expect(ledger.grants[1].consumed).toBe(20);
        expect(remainingAllowance(ledger.grants[0])).toBe(0);
        expect(remainingAllowance(ledger.grants[1])).toBe(30);
    });
});

describe('CA-17 C01-02 — spending and consuming a grant are one atomic transition', () => {
    const USAGE = {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 100} as const;

    /** A session sitting exactly on its base ceiling, whose only headroom is a +100 usage grant. */
    function atBaseCeiling(): {state: ReturnType<typeof budgetState>; ledger: SessionGrantLedger} {
        const state = budgetState({sessionCumulativeTokens: 500_000});
        const empty = emptySessionGrantLedger(state);
        const grant = evaluateSessionGrant(grantRequest({allowance: USAGE}), state, OPERATOR_STANDARD_LIMITS, context(empty));
        return {state, ledger: recordSessionGrant(state, context(empty), grant)};
    }

    it('debiting into granted headroom consumes the grant in the same transition', () => {
        const {state, ledger} = atBaseCeiling();
        expect(remainingAllowance(ledger.grants[0])).toBe(100);
        const result = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {debitId: 'debit-1', inputTokens: 100}, context(ledger));
        expect(result.state.sessionCumulativeTokens).toBe(500_100);
        expect(result.ledger).not.toBeNull();
        expect(result.drawnGrantIds).toEqual(['grant-1']);
        expect(remainingAllowance(result.ledger!.grants[0])).toBe(0);
    });

    it('leaves the grant untouched when the debit stays under the base ceiling', () => {
        const state = budgetState({sessionCumulativeTokens: 400_000});
        const empty = emptySessionGrantLedger(state);
        const ledger = recordSessionGrant(state, context(empty),
            evaluateSessionGrant(grantRequest({allowance: USAGE}), state, OPERATOR_STANDARD_LIMITS, context(empty)));
        const result = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {inputTokens: 100}, context(ledger));
        expect(result.ledger).toBeNull();
        expect(result.drawnGrantIds).toEqual([]);
        expect(remainingAllowance(ledger.grants[0])).toBe(100);
    });

    it('draws only the amount that crosses the base ceiling, never the whole debit', () => {
        const state = budgetState({sessionCumulativeTokens: 499_960});
        const empty = emptySessionGrantLedger(state);
        const ledger = recordSessionGrant(state, context(empty),
            evaluateSessionGrant(grantRequest({allowance: USAGE}), state, OPERATOR_STANDARD_LIMITS, context(empty)));
        const result = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {debitId: 'debit-1', inputTokens: 100}, context(ledger));
        expect(result.state.sessionCumulativeTokens).toBe(500_060);
        expect(result.ledger!.grants[0].consumed).toBe(60);
        expect(remainingAllowance(result.ledger!.grants[0])).toBe(40);
    });

    it('refuses the debit once the granted allowance is exhausted, and the grant is not reusable', () => {
        const {state, ledger} = atBaseCeiling();
        const spent = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {debitId: 'debit-1', inputTokens: 100}, context(ledger));
        expect(reasonOf(() => debitSessionBudget(spent.state, OPERATOR_STANDARD_LIMITS,
            {debitId: 'debit-2', inputTokens: 1}, context(spent.ledger!)))).toBe('SESSION_GRANT_ALLOWANCE_EXHAUSTED');
    });

    it('is replay safe: repeating the same debitId never draws the allowance twice', () => {
        const {state, ledger} = atBaseCeiling();
        const first = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {debitId: 'debit-1', inputTokens: 100}, context(ledger));
        const replay = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {debitId: 'debit-1', inputTokens: 100}, context(first.ledger!));
        expect(replay.ledger!.grants[0].consumed).toBe(100);
        expect(replay.ledger!.appliedConsumptionIds).toEqual(['debit-1']);
    });

    it('never double-counts: the post-debit state is not driven hard by its own draw', () => {
        const {state, ledger} = atBaseCeiling();
        const result = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {debitId: 'debit-1', inputTokens: 100}, context(ledger));
        expect(result.check.level).not.toBe('hard');
        expect(evaluateSessionBudget(result.state, OPERATOR_STANDARD_LIMITS, context(result.ledger!)).level).not.toBe('hard');
    });

    it('refuses a debit needing granted headroom without an idempotency key', () => {
        const {state, ledger} = atBaseCeiling();
        expect(reasonOf(() => debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {inputTokens: 100}, context(ledger))))
            .toBe('SESSION_GRANT_REQUEST_INVALID');
    });

    it('refuses a debit past the base ceiling when no grant ledger is supplied at all', () => {
        const state = budgetState({sessionCumulativeTokens: 500_000});
        expect(reasonOf(() => debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {debitId: 'debit-1', inputTokens: 100})))
            .toBe('SESSION_BUDGET_HARD_LIMIT');
    });

    it('consumes a turns grant atomically when a model-backed turn crosses the base turn ceiling', () => {
        const state = budgetState({sessionModelBackedTurns: 50});
        const empty = emptySessionGrantLedger(state);
        const ledger = recordSessionGrant(state, context(empty),
            evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(empty)));
        const result = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS,
            {debitId: 'debit-1', inputTokens: 10, modelBackedTurn: true}, context(ledger));
        expect(result.state.sessionModelBackedTurns).toBe(51);
        expect(result.drawnGrantIds).toEqual(['grant-1']);
        expect(result.ledger!.grants[0].consumed).toBe(1);
    });

    it('an expired grant grants no new headroom but does not invalidate what it already drew', () => {
        const state = budgetState({sessionCumulativeTokens: 500_000});
        const empty = emptySessionGrantLedger(state);
        const ledger = recordSessionGrant(state, context(empty), evaluateSessionGrant(
            grantRequest({allowance: USAGE, expiresAtMs: 20_000}), state, OPERATOR_STANDARD_LIMITS, context(empty)));
        const spent = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS,
            {debitId: 'debit-1', inputTokens: 100}, context(ledger, 15_000));
        const afterExpiry = context(spent.ledger!, 25_000);
        expect(effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, spent.state, afterExpiry).sessionCumulativeTokens).toBe(500_100);
        expect(evaluateSessionBudget(spent.state, OPERATOR_STANDARD_LIMITS, afterExpiry).level).not.toBe('hard');
        expect(reasonOf(() => debitSessionBudget(spent.state, OPERATOR_STANDARD_LIMITS,
            {debitId: 'debit-2', inputTokens: 1}, afterExpiry))).toBe('SESSION_GRANT_ALLOWANCE_EXHAUSTED');
    });

    it('an unspent expired grant contributes no ceiling at all', () => {
        const state = budgetState({sessionCumulativeTokens: 500_000});
        const empty = emptySessionGrantLedger(state);
        const ledger = recordSessionGrant(state, context(empty), evaluateSessionGrant(
            grantRequest({allowance: USAGE, expiresAtMs: 20_000}), state, OPERATOR_STANDARD_LIMITS, context(empty)));
        expect(effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, state, context(ledger, 25_000)).sessionCumulativeTokens)
            .toBe(500_000);
    });
});

