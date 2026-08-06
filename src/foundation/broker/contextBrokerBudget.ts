/**
 * Cycle-budget accounting (`docs/spec/coordinator-automation.md` §10.2,
 * `docs/spec/v1-contracts.md` §7). Pure state-transition functions only: a
 * debit takes the prior `CycleBudgetState` and a caller-supplied
 * `CycleBudgetLimits`, and returns the next state plus a soft/hard check —
 * or throws and leaves the prior state untouched when the debit would push
 * any hard dimension (including the cumulative batch/lane dimensions) past
 * its ceiling. No filesystem write, lock, or global mutable ledger lives
 * here — the caller (a future CA-13 coordinator queue) owns persisting the
 * returned state. This keeps every broker/budget path read-only-or-pure per
 * the batch's adversarial proof obligation, and avoids opening a second
 * mutation path outside the not-yet-accepted CA-10 effect executor.
 *
 * Limits are never invented here: `CycleBudgetLimits` is always caller-
 * supplied, resolved from installed policy (the CA-05/LC-05 provenance
 * chain), matching the amendment's "no hardcoded TypeScript copy is policy
 * authority" rule (`planning-remediation-amendment.md` §2.6).
 */
import type {CycleBudgetCheck, CycleBudgetDebit, CycleBudgetLimits, CycleBudgetResult, CycleBudgetState} from '../../contracts/index.js';
import {brokerFailure} from './contextBrokerErrors.js';

export function initialCycleBudgetState(params: Readonly<{
    cycleId: string; batchId: string; laneId: string;
    priorCumulativeBatchUsageTokens?: number; priorCumulativeLaneUsageTokens?: number;
}>): CycleBudgetState {
    return Object.freeze({
        cycleId: params.cycleId, batchId: params.batchId, laneId: params.laneId,
        estimatedInputTokens: 0, hostReportedInputTokens: null, brokerLoadedBytes: 0, outputTokens: 0,
        wallClockMs: 0, contextRequestCount: 0, retryEscalationCount: 0,
        cumulativeBatchUsageTokens: params.priorCumulativeBatchUsageTokens ?? 0,
        cumulativeLaneUsageTokens: params.priorCumulativeLaneUsageTokens ?? 0
    });
}

const LIMIT_FIELDS = [
    'inputSoft', 'inputHard', 'outputHard', 'contextRequestsHard', 'wallClockHardMs',
    'cumulativeBatchSoft', 'cumulativeBatchHard', 'cumulativeLaneSoft', 'cumulativeLaneHard'
] as const;

const STATE_NUMERIC_FIELDS = [
    'estimatedInputTokens', 'brokerLoadedBytes', 'outputTokens', 'wallClockMs',
    'contextRequestCount', 'retryEscalationCount', 'cumulativeBatchUsageTokens', 'cumulativeLaneUsageTokens'
] as const;

/**
 * Fails closed on a `CycleBudgetState` whose numeric fields are not safe,
 * non-negative integers — the defense this capsule needs against a state
 * round-tripped through untrusted storage (a caller-persisted JSON blob),
 * not just against a same-process debit argument. Every admission and debit
 * path validates its incoming `state` through this function before reading
 * any field from it.
 */
export function validateCycleBudgetState(state: CycleBudgetState): CycleBudgetState {
    for (const field of STATE_NUMERIC_FIELDS) {
        const value = state[field];
        if (!Number.isSafeInteger(value) || value < 0) brokerFailure('BROKER_REFERENCE_INVALID', field, `cycle-budget state field "${field}" must be a non-negative safe integer`);
    }
    if (state.hostReportedInputTokens !== null && (!Number.isSafeInteger(state.hostReportedInputTokens) || state.hostReportedInputTokens < 0)) {
        brokerFailure('BROKER_REFERENCE_INVALID', 'hostReportedInputTokens', 'hostReportedInputTokens must be null or a non-negative safe integer');
    }
    return state;
}

/** Fails closed on a malformed or self-contradictory policy input rather than silently admitting every request. */
export function validateCycleBudgetLimits(limits: CycleBudgetLimits): CycleBudgetLimits {
    for (const field of LIMIT_FIELDS) {
        const value = limits[field];
        if (!Number.isSafeInteger(value) || value < 0) brokerFailure('BROKER_LIMITS_INVALID', field, `cycle-budget limit "${field}" must be a non-negative safe integer`);
    }
    if (limits.inputSoft > limits.inputHard) brokerFailure('BROKER_LIMITS_INVALID', 'inputSoft', 'inputSoft must not exceed inputHard');
    if (limits.cumulativeBatchSoft > limits.cumulativeBatchHard) brokerFailure('BROKER_LIMITS_INVALID', 'cumulativeBatchSoft', 'cumulativeBatchSoft must not exceed cumulativeBatchHard');
    if (limits.cumulativeLaneSoft > limits.cumulativeLaneHard) brokerFailure('BROKER_LIMITS_INVALID', 'cumulativeLaneSoft', 'cumulativeLaneSoft must not exceed cumulativeLaneHard');
    if (limits.unit !== 'estimated-tokens') brokerFailure('BROKER_LIMITS_INVALID', 'unit', 'unit must be "estimated-tokens"');
    return limits;
}

function nonNegativeInteger(subject: string, value: number | undefined): number {
    if (value === undefined) return 0;
    if (!Number.isSafeInteger(value) || value < 0) brokerFailure('BROKER_REFERENCE_INVALID', subject, `debit value ${String(value)} must be a non-negative safe integer`);
    return value;
}

function safeSum(subject: string, ...values: readonly number[]): number {
    const sum = values.reduce((total, value) => total + value, 0);
    if (!Number.isSafeInteger(sum)) brokerFailure('BROKER_HARD_LIMIT_EXCEEDED', subject, 'accumulated usage is no longer representable as a safe integer');
    return sum;
}

function nextState(state: CycleBudgetState, debit: CycleBudgetDebit): CycleBudgetState {
    validateCycleBudgetState(state);
    const inputDelta = nonNegativeInteger('estimatedInputTokens', debit.estimatedInputTokens);
    const outputDelta = nonNegativeInteger('outputTokens', debit.outputTokens);
    const hostReportedInputTokens = debit.hostReportedInputTokens !== undefined
        ? nonNegativeInteger('hostReportedInputTokens', debit.hostReportedInputTokens)
        : state.hostReportedInputTokens;
    return Object.freeze({
        ...state,
        estimatedInputTokens: safeSum('estimatedInputTokens', state.estimatedInputTokens, inputDelta),
        hostReportedInputTokens,
        brokerLoadedBytes: safeSum('brokerLoadedBytes', state.brokerLoadedBytes, nonNegativeInteger('brokerBytes', debit.brokerBytes)),
        outputTokens: safeSum('outputTokens', state.outputTokens, outputDelta),
        wallClockMs: safeSum('wallClockMs', state.wallClockMs, nonNegativeInteger('wallClockMs', debit.wallClockMs)),
        contextRequestCount: safeSum('contextRequestCount', state.contextRequestCount, nonNegativeInteger('contextRequests', debit.contextRequests)),
        retryEscalationCount: state.retryEscalationCount + (debit.retryEscalation === true ? 1 : 0),
        cumulativeBatchUsageTokens: safeSum('cumulativeBatchUsageTokens', state.cumulativeBatchUsageTokens, inputDelta, outputDelta),
        cumulativeLaneUsageTokens: safeSum('cumulativeLaneUsageTokens', state.cumulativeLaneUsageTokens, inputDelta, outputDelta)
    });
}

/** Pure evaluation against a state, independent of any debit — used both for the pre-flight admission gate and post-debit reporting. */
export function evaluateCycleBudget(state: CycleBudgetState, limits: CycleBudgetLimits): CycleBudgetCheck {
    validateCycleBudgetState(state);
    const hardExceeded: string[] = [];
    if (state.estimatedInputTokens > limits.inputHard) hardExceeded.push('estimatedInputTokens');
    if (state.outputTokens > limits.outputHard) hardExceeded.push('outputTokens');
    if (state.contextRequestCount > limits.contextRequestsHard) hardExceeded.push('contextRequestCount');
    if (state.wallClockMs > limits.wallClockHardMs) hardExceeded.push('wallClockMs');
    if (state.cumulativeBatchUsageTokens > limits.cumulativeBatchHard) hardExceeded.push('cumulativeBatchUsageTokens');
    if (state.cumulativeLaneUsageTokens > limits.cumulativeLaneHard) hardExceeded.push('cumulativeLaneUsageTokens');
    if (hardExceeded.length > 0) return {level: 'hard', exceededDimensions: Object.freeze(hardExceeded)};

    const softExceeded: string[] = [];
    if (state.estimatedInputTokens > limits.inputSoft) softExceeded.push('estimatedInputTokens');
    if (state.cumulativeBatchUsageTokens > limits.cumulativeBatchSoft) softExceeded.push('cumulativeBatchUsageTokens');
    if (state.cumulativeLaneUsageTokens > limits.cumulativeLaneSoft) softExceeded.push('cumulativeLaneUsageTokens');
    if (softExceeded.length > 0) return {level: 'soft', exceededDimensions: Object.freeze(softExceeded)};

    return {level: 'ok', exceededDimensions: Object.freeze([])};
}

/**
 * Applies one debit and reports the resulting soft/hard status. A debit that
 * would push any hard dimension (input/output/wall-clock/context-requests or
 * either cumulative dimension) past its ceiling is refused: this function
 * throws `BROKER_HARD_LIMIT_EXCEEDED` and the prior `state` reference the
 * caller already holds is untouched, because this module never mutates its
 * arguments. A soft-dimension breach is admitted and reported so the caller
 * (`ContextBroker`) can enforce the justification gate on the *next* request.
 */
export function debitCycleBudget(state: CycleBudgetState, limits: CycleBudgetLimits, debit: CycleBudgetDebit): CycleBudgetResult {
    const advanced = nextState(state, debit);
    const check = evaluateCycleBudget(advanced, limits);
    if (check.level === 'hard') {
        brokerFailure('BROKER_HARD_LIMIT_EXCEEDED', state.cycleId, `debit would exceed the hard limit on: ${check.exceededDimensions.join(', ')}`);
    }
    return {state: advanced, check};
}
