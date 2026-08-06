import type {CycleBudgetLimits} from '../../../src/contracts/index.js';
import {BrokerError} from '../../../src/foundation/broker/index.js';
import {
    debitCycleBudget, evaluateCycleBudget, initialCycleBudgetState, validateCycleBudgetLimits, validateCycleBudgetState
} from '../../../src/foundation/broker/index.js';

const LIMITS: CycleBudgetLimits = Object.freeze({
    inputSoft: 100, inputHard: 200, outputHard: 50, contextRequestsHard: 3, wallClockHardMs: 10_000,
    cumulativeBatchSoft: 300, cumulativeBatchHard: 500, cumulativeLaneSoft: 3_000, cumulativeLaneHard: 5_000,
    unit: 'estimated-tokens'
});

function reasonOf(fn: () => unknown): string {
    try {
        fn();
    } catch (error) {
        if (error instanceof BrokerError) return error.reason;
        throw error;
    }
    throw new Error('expected a BrokerError to be thrown');
}

describe('validateCycleBudgetLimits', function () {
    it('accepts a well-formed limits object unchanged', function () {
        expect(validateCycleBudgetLimits(LIMITS)).toBe(LIMITS);
    });

    it('rejects a negative or non-integer field with BROKER_LIMITS_INVALID', function () {
        expect(reasonOf(() => validateCycleBudgetLimits({...LIMITS, inputHard: -1}))).toBe('BROKER_LIMITS_INVALID');
        expect(reasonOf(() => validateCycleBudgetLimits({...LIMITS, wallClockHardMs: 1.5}))).toBe('BROKER_LIMITS_INVALID');
    });

    it('rejects a soft ceiling above its paired hard ceiling', function () {
        expect(reasonOf(() => validateCycleBudgetLimits({...LIMITS, inputSoft: 300}))).toBe('BROKER_LIMITS_INVALID');
        expect(reasonOf(() => validateCycleBudgetLimits({...LIMITS, cumulativeBatchSoft: 600}))).toBe('BROKER_LIMITS_INVALID');
        expect(reasonOf(() => validateCycleBudgetLimits({...LIMITS, cumulativeLaneSoft: 6_000}))).toBe('BROKER_LIMITS_INVALID');
    });

    it('rejects an unsupported unit', function () {
        expect(reasonOf(() => validateCycleBudgetLimits({...LIMITS, unit: 'usd' as CycleBudgetLimits['unit']}))).toBe('BROKER_LIMITS_INVALID');
    });
});

describe('contextBrokerBudget', function () {
    it('starts at zero with the prior cumulative usage carried forward', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1', priorCumulativeBatchUsageTokens: 40, priorCumulativeLaneUsageTokens: 400});
        expect(state.estimatedInputTokens).toBe(0);
        expect(state.contextRequestCount).toBe(0);
        expect(state.cumulativeBatchUsageTokens).toBe(40);
        expect(state.cumulativeLaneUsageTokens).toBe(400);
    });

    it('debits additively and reports ok while under every limit', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        const first = debitCycleBudget(state, LIMITS, {estimatedInputTokens: 10, contextRequests: 1});
        expect(first.check.level).toBe('ok');
        expect(first.state.estimatedInputTokens).toBe(10);
        const second = debitCycleBudget(first.state, LIMITS, {estimatedInputTokens: 5, contextRequests: 1});
        expect(second.state.estimatedInputTokens).toBe(15);
        expect(second.state.contextRequestCount).toBe(2);
        expect(second.state.cumulativeBatchUsageTokens).toBe(15);
        expect(second.state.cumulativeLaneUsageTokens).toBe(15);
    });

    it('reports soft once the soft input-token threshold is crossed but still applies the debit', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        const result = debitCycleBudget(state, LIMITS, {estimatedInputTokens: 101, contextRequests: 1});
        expect(result.check.level).toBe('soft');
        expect(result.check.exceededDimensions).toEqual(['estimatedInputTokens']);
        expect(result.state.estimatedInputTokens).toBe(101);
    });

    it('refuses a debit that would cross the hard input-token ceiling, leaving the prior state reference unchanged', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {estimatedInputTokens: 201, contextRequests: 1}))).toBe('BROKER_HARD_LIMIT_EXCEEDED');
        expect(state.estimatedInputTokens).toBe(0);
    });

    it('refuses a debit that would cross the hard output-token ceiling', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {outputTokens: 51}))).toBe('BROKER_HARD_LIMIT_EXCEEDED');
    });

    it('refuses a debit that would cross the hard wall-clock ceiling', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {wallClockMs: 10_001}))).toBe('BROKER_HARD_LIMIT_EXCEEDED');
    });

    it('refuses a debit that would cross the hard cumulative-batch ceiling even when no single dimension alone would', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1', priorCumulativeBatchUsageTokens: 490});
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {estimatedInputTokens: 20}))).toBe('BROKER_HARD_LIMIT_EXCEEDED');
        expect(state.cumulativeBatchUsageTokens).toBe(490);
    });

    it('refuses a debit that would cross the hard cumulative-lane ceiling', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1', priorCumulativeLaneUsageTokens: 4_990});
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {estimatedInputTokens: 20}))).toBe('BROKER_HARD_LIMIT_EXCEEDED');
        expect(state.cumulativeLaneUsageTokens).toBe(4_990);
    });

    it('admits (does not throw for) a debit that lands exactly on a hard ceiling — only a value strictly greater than the ceiling is refused', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        const result = debitCycleBudget(state, LIMITS, {estimatedInputTokens: 200});
        expect(result.state.estimatedInputTokens).toBe(200);
        expect(result.check.level).toBe('soft');
    });

    it('refuses once the hard context-request ceiling is already reached, leaving the passed-in state to the caller unmutated', function () {
        let state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        for (let index = 0; index < 3; index += 1) {
            state = debitCycleBudget(state, LIMITS, {contextRequests: 1}).state;
        }
        expect(state.contextRequestCount).toBe(3);
        const before = state;
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {contextRequests: 1}))).toBe('BROKER_HARD_LIMIT_EXCEEDED');
        expect(state).toBe(before);
        expect(state.contextRequestCount).toBe(3);
    });

    it('rejects a negative or non-integer debit as malformed input rather than silently coercing it', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        expect(() => debitCycleBudget(state, LIMITS, {estimatedInputTokens: -1})).toThrowError(BrokerError);
        expect(() => debitCycleBudget(state, LIMITS, {estimatedInputTokens: 1.5})).toThrowError(BrokerError);
    });

    it('is a pure function: two independent debits from the same prior state never influence each other', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        const a = debitCycleBudget(state, LIMITS, {estimatedInputTokens: 10});
        const b = debitCycleBudget(state, LIMITS, {estimatedInputTokens: 20});
        expect(a.state.estimatedInputTokens).toBe(10);
        expect(b.state.estimatedInputTokens).toBe(20);
        expect(state.estimatedInputTokens).toBe(0);
    });

    it('evaluateCycleBudget reports the same level a debit would, without mutating anything', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1', priorCumulativeBatchUsageTokens: 350});
        expect(evaluateCycleBudget(state, LIMITS).level).toBe('soft');
    });

    it('refuses an overflow-producing debit rather than silently losing precision', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1', priorCumulativeBatchUsageTokens: Number.MAX_SAFE_INTEGER - 1});
        const wideLimits: CycleBudgetLimits = {...LIMITS, cumulativeBatchHard: Number.MAX_SAFE_INTEGER};
        expect(reasonOf(() => debitCycleBudget(state, wideLimits, {estimatedInputTokens: 10}))).toBe('BROKER_HARD_LIMIT_EXCEEDED');
    });

    it('rejects a malformed/round-tripped state (negative field) with BROKER_REFERENCE_INVALID before evaluating or debiting', function () {
        const state = {...initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'}), contextRequestCount: -1};
        expect(reasonOf(() => evaluateCycleBudget(state, LIMITS))).toBe('BROKER_REFERENCE_INVALID');
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {contextRequests: 1}))).toBe('BROKER_REFERENCE_INVALID');
    });

    it('rejects a malformed/round-tripped state (non-integer field) with BROKER_REFERENCE_INVALID', function () {
        const state = {...initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'}), retryEscalationCount: 2.5};
        expect(reasonOf(() => validateCycleBudgetState(state))).toBe('BROKER_REFERENCE_INVALID');
    });

    it('rejects a malformed/round-tripped state (negative hostReportedInputTokens) with BROKER_REFERENCE_INVALID', function () {
        const state = {...initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'}), hostReportedInputTokens: -1};
        expect(reasonOf(() => validateCycleBudgetState(state))).toBe('BROKER_REFERENCE_INVALID');
    });

    it('validateCycleBudgetState accepts a well-formed state unchanged, including a null hostReportedInputTokens', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        expect(validateCycleBudgetState(state)).toBe(state);
    });

    it('rejects a malformed debit.hostReportedInputTokens (negative) as BROKER_REFERENCE_INVALID', function () {
        const state = initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'});
        expect(reasonOf(() => debitCycleBudget(state, LIMITS, {hostReportedInputTokens: -1}))).toBe('BROKER_REFERENCE_INVALID');
    });
});
