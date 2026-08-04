/**
 * Maps one finished NVB process outcome and its bound output stream to a typed
 * `LaneTaskRunResult`.
 *
 * This is pure mapping: it starts nothing and reads no filesystem. It applies
 * the post-process failure order — stream authority, run result presence, run
 * status, process exit status, declared result presence, and declared result
 * schema — and returns exactly one closed outcome. The result-schema validator
 * is compiled before the process starts, so a completed run whose structured
 * output does not satisfy the selected task's checksum-bound `resultSchema` is a
 * typed failure here, never a completion.
 */
import {
    type LaneTaskBinding,
    type LaneTaskEvent,
    type LaneTaskRunResult,
    type LaneTaskRuntimeReason
} from '../../contracts/taskRuntime.js';
import type {RuntimeProcessOutcome} from '../runtime/leaf/runtimeProcessPorts.js';
import {cancellationSignal} from './laneTaskInvocationPlan.js';
import {NvbRunOutputReader, redactDiagnostic, type NvbRunResultView} from './nvbRunOutput.js';
import type {SchemaValidator} from './laneTaskSchemaValidation.js';

export interface OutcomeInput {
    readonly actionId: string;
    readonly binding: LaneTaskBinding;
    readonly resultValidator: SchemaValidator;
    readonly outcome: RuntimeProcessOutcome;
    readonly reader: NvbRunOutputReader;
}

/** Map a started run's process outcome and bound stream to one typed result. */
export function interpretOutcome(input: OutcomeInput): LaneTaskRunResult {
    const {actionId, binding, outcome, reader} = input;
    const events = reader.events;
    if (outcome.disposition === 'unavailable') {
        return failure(actionId, binding, reader.result, outcome, events, 'TASK_RUNTIME_RUNNER_UNAVAILABLE',
            'The pinned NVB runner could not be started for this lane invocation.');
    }
    if (outcome.disposition === 'cancelled') {
        return cancelled(actionId, binding, reader.result, events, outcome.signal ?? cancellationSignal());
    }
    if (reader.problem !== null) {
        return failure(actionId, binding, reader.result, outcome, events, reader.problem,
            'The pinned NVB run output is not a single, self-consistent result for this task.');
    }
    return interpretResult(input, events);
}

function interpretResult(input: OutcomeInput, events: readonly LaneTaskEvent[]): LaneTaskRunResult {
    const {actionId, binding, outcome, reader, resultValidator} = input;
    const result = reader.result;
    if (result === null) {
        return failure(actionId, binding, null, outcome, events, 'TASK_RUNTIME_RUN_RESULT_MISSING',
            'The pinned NVB runner produced no structured run result.');
    }
    if (result.status === 'cancelled') {
        return cancelled(actionId, binding, result, events, cancellationSignal());
    }
    if (result.status === 'failed') {
        return failure(actionId, binding, result, outcome, events, 'TASK_RUNTIME_TASK_EXECUTION_FAILED',
            result.diagnostic ?? 'The invoked task reported a failed run.');
    }
    if (outcome.exitCode !== 0) {
        return failure(actionId, binding, result, outcome, events, 'TASK_RUNTIME_RUN_OUTPUT_INVALID',
            'The pinned NVB runner reported a finished run with a non-zero exit status.');
    }
    if (result.structuredOutput === null) {
        return failure(actionId, binding, result, outcome, events, 'TASK_RUNTIME_TASK_RESULT_MISSING',
            `The invoked task produced no result for its declared schema ${binding.resultSchema}.`);
    }
    if (!resultValidator.validate(result.structuredOutput)) {
        return failure(actionId, binding, result, outcome, events, 'TASK_RUNTIME_RESULT_SCHEMA_INVALID',
            `The invoked task result does not satisfy its declared schema ${binding.resultSchema}.`);
    }
    return {
        outcome: 'completed', actionId, taskId: binding.taskId, runId: result.runId,
        startedAt: result.startedAt, finishedAt: result.finishedAt,
        result: result.structuredOutput, events
    };
}

function failure(
    actionId: string,
    binding: LaneTaskBinding,
    result: NvbRunResultView | null,
    outcome: RuntimeProcessOutcome,
    events: readonly LaneTaskEvent[],
    reason: LaneTaskRuntimeReason,
    diagnostic: string
): LaneTaskRunResult {
    return {
        outcome: 'failed', actionId, taskId: binding.taskId, runId: result?.runId ?? null, reason,
        failedTaskId: result?.failedTask ?? null, exitCode: outcome.exitCode, signal: outcome.signal,
        diagnostic: redactDiagnostic(diagnostic), events
    };
}

function cancelled(
    actionId: string,
    binding: LaneTaskBinding,
    result: NvbRunResultView | null,
    events: readonly LaneTaskEvent[],
    signal: string
): LaneTaskRunResult {
    return {outcome: 'cancelled', actionId, taskId: binding.taskId, runId: result?.runId ?? null, signal, events};
}
