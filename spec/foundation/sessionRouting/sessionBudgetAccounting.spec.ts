/**
 * CA-17 budget accounting proof: finite shipping limits, soft warning and hard
 * refusal behavior, per-turn versus cumulative dimensions, telemetry quality,
 * fork/compaction non-replenishment, and corrupt persisted state.
 */
import {
    admitModelBackedTurn, beginSessionTurn, computeReserveSplit, debitSessionBudget,
    evaluateSessionBudget, initialSessionBudgetState, SessionRoutingError
} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import type {SessionBudgetLimits, SessionBudgetState, SessionRoutingReason} from '../../../src/contracts/index.js';
import {budgetLimits, budgetState, OPERATOR_STANDARD_LIMITS} from './support/sessionRoutingFixtures.js';

function reasonOf(run: () => unknown): SessionRoutingReason {
    try {
        run();
    } catch (error) {
        if (error instanceof SessionRoutingError) return error.reason;
        throw error;
    }
    throw new Error('expected a SessionRoutingError');
}

describe('CA-17 session budget dimensions', () => {
    it('starts every dimension at zero and carries prior lane usage forward', () => {
        const state = initialSessionBudgetState({operatorSessionId: 'os-1', laneId: 'lane-1', budgetSegmentId: 'seg-1', priorLaneUsedTokens: 1_234});
        expect(state.sessionCumulativeTokens).toBe(0);
        expect(state.laneOperatorSessionUsedTokens).toBe(1_234);
    });

    it('debits input and output into per-turn, per-session, and lane dimensions at once', () => {
        const {state} = debitSessionBudget(budgetState(), OPERATOR_STANDARD_LIMITS, {inputTokens: 100, outputTokens: 20, modelBackedTurn: true});
        expect(state.turnInputTokens).toBe(100);
        expect(state.turnOutputTokens).toBe(20);
        expect(state.sessionCumulativeTokens).toBe(120);
        expect(state.laneOperatorSessionUsedTokens).toBe(120);
        expect(state.sessionModelBackedTurns).toBe(1);
    });

    it('never mutates the caller prior state', () => {
        const before = budgetState({sessionCumulativeTokens: 10});
        debitSessionBudget(before, OPERATOR_STANDARD_LIMITS, {inputTokens: 5});
        expect(before.sessionCumulativeTokens).toBe(10);
    });

    it('resets only per-turn counters when a new turn begins', () => {
        const state = budgetState({turnInputTokens: 900, turnOutputTokens: 30, sessionCumulativeTokens: 930, laneOperatorSessionUsedTokens: 930});
        const next = beginSessionTurn(state);
        expect(next.turnInputTokens).toBe(0);
        expect(next.turnOutputTokens).toBe(0);
        expect(next.sessionCumulativeTokens).toBe(930);
        expect(next.laneOperatorSessionUsedTokens).toBe(930);
    });

    it('refuses a debit that would breach a hard per-turn ceiling and leaves the prior state untouched', () => {
        const state = budgetState({turnInputTokens: 39_990});
        expect(reasonOf(() => debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {inputTokens: 100}))).toBe('SESSION_BUDGET_HARD_LIMIT');
        expect(state.turnInputTokens).toBe(39_990);
    });

    it('refuses a debit that would breach the lane-wide ceiling', () => {
        const state = budgetState({laneOperatorSessionUsedTokens: 1_999_999});
        expect(reasonOf(() => debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {inputTokens: 10}))).toBe('SESSION_BUDGET_HARD_LIMIT');
    });

    it('reports a soft level with the warned dimension before the hard ceiling', () => {
        const check = evaluateSessionBudget(budgetState({sessionCumulativeTokens: 450_000}), OPERATOR_STANDARD_LIMITS);
        expect(check.level).toBe('soft');
        expect(check.warnedDimensions).toContain('sessionCumulativeTokens');
        expect(check.exceededDimensions).toEqual([]);
    });

    it('keeps the level ok well below the warning threshold', () => {
        expect(evaluateSessionBudget(budgetState({sessionCumulativeTokens: 1_000}), OPERATOR_STANDARD_LIMITS).level).toBe('ok');
    });

    it('degrades telemetry quality monotonically toward unknown', () => {
        const {state} = debitSessionBudget(budgetState(), OPERATOR_STANDARD_LIMITS, {inputTokens: 1, telemetryQuality: 'estimated'});
        expect(state.telemetryQuality).toBe('estimated');
        const back = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {inputTokens: 1, telemetryQuality: 'reported'});
        expect(back.state.telemetryQuality).toBe('estimated');
    });
});

describe('CA-17 model-backed turn admission', () => {
    it('admits a fresh session', () => {
        const result = admitModelBackedTurn(budgetState(), OPERATOR_STANDARD_LIMITS);
        expect(result.modelBackedTurnAdmitted).toBeTrue();
        expect(result.check.level).toBe('ok');
        expect(result.recommendation).toBeNull();
    });

    it('refuses a new model-backed turn once the session turn ceiling is reached', () => {
        const result = admitModelBackedTurn(budgetState({sessionModelBackedTurns: 50}), OPERATOR_STANDARD_LIMITS);
        expect(result.modelBackedTurnAdmitted).toBeFalse();
        expect(result.check.exceededDimensions).toContain('sessionModelBackedTurns');
    });

    it('refuses a new model-backed turn once lane capacity is fully consumed', () => {
        const result = admitModelBackedTurn(budgetState({laneOperatorSessionUsedTokens: 2_000_000}), OPERATOR_STANDARD_LIMITS);
        expect(result.modelBackedTurnAdmitted).toBeFalse();
        expect(result.check.exceededDimensions).toContain('laneOperatorSessionUsedTokens');
    });

    it('refuses unknown provider telemetry unless policy explicitly permits it', () => {
        const state = budgetState({telemetryQuality: 'unknown'});
        expect(admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS).modelBackedTurnAdmitted).toBeFalse();
        expect(admitModelBackedTurn(state, budgetLimits({allowUnknownTelemetry: true})).modelBackedTurnAdmitted).toBeTrue();
    });

    it('never recommends opening a new session as a budget bypass', () => {
        const states: readonly SessionBudgetState[] = [
            budgetState({sessionCumulativeTokens: 450_000}), budgetState({sessionModelBackedTurns: 50}),
            budgetState({laneOperatorSessionUsedTokens: 2_000_000}), budgetState({turnInputTokens: 39_000}),
            budgetState({telemetryQuality: 'unknown'})
        ];
        for (const state of states) {
            const recommendation = admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS).recommendation;
            expect(['close', 'suspend', 'compact', 'request-grant', null]).toContain(recommendation);
        }
    });

    it('a hard budget blocks only the model-backed turn; the state stays readable for M0 queries', () => {
        const state = budgetState({sessionModelBackedTurns: 50, sessionCumulativeTokens: 490_000});
        const result = admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS);
        expect(result.modelBackedTurnAdmitted).toBeFalse();
        expect(evaluateSessionBudget(state, OPERATOR_STANDARD_LIMITS).level).toBeDefined();
        expect(state.sessionCumulativeTokens).toBe(490_000);
    });
});

describe('CA-17 protected reserves', () => {
    it('protects the configured share of remaining lane capacity', () => {
        const split = computeReserveSplit(budgetState({laneOperatorSessionUsedTokens: 1_000_000}), OPERATOR_STANDARD_LIMITS);
        expect(split.laneRemainingTokens).toBe(1_000_000);
        expect(split.protectedReserveTokens).toBe(200_000);
        expect(split.grantableTokens).toBe(800_000);
    });

    it('shrinks the reserve as the lane is consumed but never lets it go negative', () => {
        const split = computeReserveSplit(budgetState({laneOperatorSessionUsedTokens: 2_500_000}), OPERATOR_STANDARD_LIMITS);
        expect(split.laneRemainingTokens).toBe(0);
        expect(split.protectedReserveTokens).toBe(0);
        expect(split.grantableTokens).toBe(0);
    });

    it('rounds toward the reserve so an off-by-one never leaks escalation capacity', () => {
        const split = computeReserveSplit(budgetState({laneOperatorSessionUsedTokens: 1_999_999}), OPERATOR_STANDARD_LIMITS);
        expect(split.laneRemainingTokens).toBe(1);
        expect(split.protectedReserveTokens).toBe(1);
        expect(split.grantableTokens).toBe(0);
    });
});

describe('CA-17 fork and compaction non-replenishment', () => {
    it('a new budget segment does not reset lane-wide usage', () => {
        const parent = budgetState({budgetSegmentId: 'seg-1', sessionCumulativeTokens: 300_000, laneOperatorSessionUsedTokens: 900_000});
        const forked = initialSessionBudgetState({
            operatorSessionId: 'os-2', laneId: parent.laneId, budgetSegmentId: 'seg-2',
            priorLaneUsedTokens: parent.laneOperatorSessionUsedTokens
        });
        expect(forked.sessionCumulativeTokens).toBe(0);
        expect(forked.laneOperatorSessionUsedTokens).toBe(900_000);
    });

    it('exposes no path that lowers a cumulative dimension, so compaction cannot evade a hard budget', () => {
        const state = budgetState({sessionCumulativeTokens: 400_000, laneOperatorSessionUsedTokens: 1_500_000});
        const after = beginSessionTurn(debitSessionBudget(state, OPERATOR_STANDARD_LIMITS, {inputTokens: 0}).state);
        expect(after.sessionCumulativeTokens).toBeGreaterThanOrEqual(state.sessionCumulativeTokens);
        expect(after.laneOperatorSessionUsedTokens).toBeGreaterThanOrEqual(state.laneOperatorSessionUsedTokens);
    });
});

describe('CA-17 corrupt persisted budget state and policy', () => {
    it('refuses a state field that is not a non-negative safe integer', () => {
        const corrupt = {...budgetState(), sessionCumulativeTokens: -1} as SessionBudgetState;
        expect(reasonOf(() => evaluateSessionBudget(corrupt, OPERATOR_STANDARD_LIMITS))).toBe('SESSION_BUDGET_STATE_INVALID');
    });

    it('refuses a non-integral usage value round-tripped through JSON', () => {
        const corrupt = {...budgetState(), laneOperatorSessionUsedTokens: 1.5} as SessionBudgetState;
        expect(reasonOf(() => evaluateSessionBudget(corrupt, OPERATOR_STANDARD_LIMITS))).toBe('SESSION_BUDGET_STATE_INVALID');
    });

    it('refuses an unsupported telemetry quality', () => {
        const corrupt = {...budgetState(), telemetryQuality: 'guessed'} as unknown as SessionBudgetState;
        expect(reasonOf(() => evaluateSessionBudget(corrupt, OPERATOR_STANDARD_LIMITS))).toBe('SESSION_BUDGET_STATE_INVALID');
    });

    it('refuses limits that are not finite policy', () => {
        const corrupt = {...OPERATOR_STANDARD_LIMITS, sessionTurns: Number.POSITIVE_INFINITY} as SessionBudgetLimits;
        expect(reasonOf(() => evaluateSessionBudget(budgetState(), corrupt))).toBe('SESSION_BUDGET_LIMITS_INVALID');
    });

    it('refuses a per-session ceiling above the lane-wide ceiling', () => {
        expect(reasonOf(() => evaluateSessionBudget(budgetState(), budgetLimits({sessionCumulativeTokens: 3_000_000}))))
            .toBe('SESSION_BUDGET_LIMITS_INVALID');
    });

    it('refuses a protected-capacity percent outside 0-100', () => {
        expect(reasonOf(() => computeReserveSplit(budgetState(), budgetLimits({protectedCapacityPercent: 101}))))
            .toBe('SESSION_BUDGET_LIMITS_INVALID');
    });

    it('refuses an unsupported accounting unit', () => {
        const corrupt = {...OPERATOR_STANDARD_LIMITS, unit: 'dollars'} as unknown as SessionBudgetLimits;
        expect(reasonOf(() => evaluateSessionBudget(budgetState(), corrupt))).toBe('SESSION_BUDGET_LIMITS_INVALID');
    });
});
