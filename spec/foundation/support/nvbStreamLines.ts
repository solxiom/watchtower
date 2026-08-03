/**
 * The exact closed `--events-json --result-json` line shapes the pinned
 * `@nirvana/b-core` runner emits.
 *
 * The member sets and values below are a real capture, reproducible without this
 * repository's packaged runtime: run the pinned `@nirvana/builder` `bin/nvb.js`
 * against a scratch NVB target with one async TaskHandler and
 * `--events-json --result-json --cwd=<dir> --jsonfile=<config> --jsfile=<module>
 * --series`. That run emits `run.started`/`task.started`/`task.finished`/
 * `run.finished` with exactly the nine members of
 * `b-core/src/contracts/ExecutionEvent.js`, and one result with exactly the
 * eighteen members of `makeResultPayload`
 * (`b-core/src/support/basic/helpers/typicalCLIMainCall/resultPayload.js`);
 * `taskResults` appears only when a run produced more than one task result.
 *
 * Specs mutate one member at a time so a refusal proves a specific forgery
 * rather than a strawman.
 */
import {CONTROL_HOME, RUN_FINISHED_AT, RUN_STARTED_AT, TASK_ID} from './laneTaskRuntimeFixtures.js';

/**
 * The exact closed event shape the pinned `@nirvana/b-core` runner emits,
 * captured from a real `@nirvana/builder` run of `wt:runtime:smoke`.
 */
export function eventLine(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        version: 1, runId: 'run-1', sequence: 1, timestamp: RUN_STARTED_AT,
        type: 'run.started', source: 'runner', cwd: CONTROL_HOME, taskName: null,
        payload: {requestedTasks: [TASK_ID], runType: 'series', isServe: false},
        ...overrides
    });
}

export function runStartedLine(runId = 'run-1'): string {
    return eventLine({runId});
}

export function taskStartedLine(overrides: Record<string, unknown> = {}): string {
    return eventLine({
        sequence: 2, timestamp: RUN_STARTED_AT, type: 'task.started', source: 'task', taskName: TASK_ID,
        payload: {taskName: TASK_ID, displayName: TASK_ID, isInternalTask: false}, ...overrides
    });
}

/** The exact closed run-result shape the pinned runner emits. */
export function runResultLine(overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        runId: 'run-1', status: 'finished', cwd: CONTROL_HOME, isServe: false, serveName: null,
        sessionId: null, stopReason: null, cancellationReason: null, failurePhase: null,
        requestedTasks: [TASK_ID], startedAt: RUN_STARTED_AT, finishedAt: RUN_FINISHED_AT,
        failedTask: null, framework: null,
        structuredOutput: {schemaVersion: 1, ok: true, operation: 'runtime-smoke'},
        interpretation: null, error: null, observerDiagnostics: [], ...overrides
    });
}
