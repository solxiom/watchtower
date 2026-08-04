/**
 * Closed validation of the pinned NVB `--events-json --result-json` stream.
 *
 * Every line here is the *exact* shape a real `@nirvana/builder` run of
 * `wt:runtime:smoke` emitted, mutated one property at a time, so a passing case
 * proves the production reader accepts real output and a failing case proves it
 * refuses a specific forgery rather than a strawman.
 */
import {NvbRunOutputReader} from '../../src/foundation/task/runtime/nvbRunOutput.js';
import {readNvbRecord} from '../../src/foundation/task/runtime/nvbRunRecords.js';
import {harness} from './support/laneTaskRunnerHarness.js';
import {
    CONTROL_HOME,
    NOT_BEFORE,
    RUN_STARTED_AT,
    TASK_ID,
    invocation
} from './support/laneTaskRuntimeFixtures.js';
import {eventLine, runResultLine, runStartedLine, taskStartedLine} from './support/nvbStreamLines.js';

function reader(): NvbRunOutputReader {
    return new NvbRunOutputReader({taskId: TASK_ID, workingDirectory: CONTROL_HOME, notBefore: NOT_BEFORE});
}

function problemOf(lines: readonly string[]): string {
    const instance = reader();
    for (const line of lines) instance.acceptLine(line);
    return instance.problem ?? 'accepted';
}

async function runnerReasonOf(lines: readonly string[]): Promise<string> {
    const result = await harness({lines}).runner.run(invocation());
    return result.outcome === 'failed' ? result.reason : result.outcome;
}

describe('pinned NVB stream binding accepts exactly a real bound run', () => {
    it('accepts the captured real event and result sequence', () => {
        expect(problemOf([runStartedLine(), taskStartedLine(), runResultLine()])).toBe('accepted');
    });

    it('binds events and the result to the caller-planned working directory', () => {
        expect(problemOf([eventLine({cwd: '/tmp/elsewhere'}), runResultLine()]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(problemOf([runStartedLine(), runResultLine({cwd: '/tmp/elsewhere'})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });

    it('requires the stream to open with run.started at sequence 1', () => {
        expect(problemOf([taskStartedLine(), runResultLine()])).toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(problemOf([eventLine({sequence: 4}), runResultLine()])).toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(problemOf([runResultLine()])).toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });
});

describe('pinned NVB stream binding refuses malformed and open records', () => {
    it('refuses a non-JSON line instead of ignoring it', () => {
        expect(problemOf([runStartedLine(), 'not json at all', runResultLine()]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });

    it('refuses an extra member on an event or a result', () => {
        expect(problemOf([eventLine({smuggled: 'x'}), runResultLine()])).toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(problemOf([runStartedLine(), runResultLine({smuggled: 'x'})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });

    it('refuses a duplicate JSON member', () => {
        const duplicated = `${runResultLine().slice(0, -1)},"status":"finished"}`;
        expect(problemOf([runStartedLine(), duplicated])).toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });

    it('refuses a mixed-validity stream in which only some records are well formed', () => {
        expect(problemOf([runStartedLine(), '{"runId":"run-1"}', runResultLine()]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });
});

describe('pinned NVB stream binding refuses foreign, out-of-order, and replayed output', () => {
    it('refuses an event naming a task other than the selected one', () => {
        expect(problemOf([runStartedLine(), taskStartedLine({taskName: 'wt:runtime:foreign'})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_FOREIGN');
    });

    it('refuses a result whose requestedTasks is not exactly the selected task', () => {
        expect(problemOf([runStartedLine(), runResultLine({requestedTasks: ['wt:runtime:foreign']})]))
            .toBe('TASK_RUNTIME_RESULT_TASK_MISMATCH');
        expect(problemOf([runStartedLine(), runResultLine({requestedTasks: [TASK_ID, 'wt:runtime:other']})]))
            .toBe('TASK_RUNTIME_RESULT_TASK_MISMATCH');
    });

    it('refuses a gapped, repeated, or cross-run sequence', () => {
        expect(problemOf([runStartedLine(), taskStartedLine({sequence: 5})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(problemOf([runStartedLine(), taskStartedLine({sequence: 1})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(problemOf([runStartedLine('run-x'), runResultLine({runId: 'run-y'})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });

    it('refuses a second result and any record after the result', () => {
        expect(problemOf([runStartedLine(), runResultLine(), runResultLine({status: 'failed'})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(problemOf([runStartedLine(), runResultLine(), taskStartedLine({sequence: 3})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });

    it('refuses output recorded before this invocation started', () => {
        const stale = '2026-08-02T23:59:59.000Z';
        expect(problemOf([eventLine({timestamp: stale}), runResultLine()]))
            .toBe('TASK_RUNTIME_RUN_STREAM_REPLAYED');
        expect(problemOf([runStartedLine(), runResultLine({startedAt: stale})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_REPLAYED');
        expect(problemOf([runStartedLine(), runResultLine({startedAt: RUN_STARTED_AT})])).toBe('accepted');
    });
});

describe('the lane task runner reports every stream violation as typed failure', () => {
    it('never reports completion for malformed, foreign, or replayed output', async () => {
        expect(await runnerReasonOf([runStartedLine(), 'not json', runResultLine()]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
        expect(await runnerReasonOf([runStartedLine(), taskStartedLine({taskName: 'wt:runtime:foreign'}),
            runResultLine()])).toBe('TASK_RUNTIME_RUN_STREAM_FOREIGN');
        expect(await runnerReasonOf([eventLine({timestamp: '2026-08-01T00:00:00.000Z'}), runResultLine()]))
            .toBe('TASK_RUNTIME_RUN_STREAM_REPLAYED');
    });

    it('never reports completion for an extra-membered result', async () => {
        expect(await runnerReasonOf([runStartedLine(), runResultLine({smuggled: true})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });
});

/**
 * Exactness, member by member, against the pinned producer's own construction
 * sites: `b-core/src/contracts/ExecutionEvent.js` assigns the nine event members
 * and `makeResultPayload` assigns the eighteen result members. The cases are
 * derived from the captured lines themselves, so a member added or renamed
 * upstream cannot silently escape this matrix.
 */
const EVENT_MEMBERS = Object.keys(JSON.parse(eventLine()) as Record<string, unknown>);
const RESULT_MEMBERS = Object.keys(JSON.parse(runResultLine()) as Record<string, unknown>);

function omitting(line: string, member: string): string {
    const record = JSON.parse(line) as Record<string, unknown>;
    delete record[member];
    return JSON.stringify(record);
}

/** A value of the wrong type for every pinned member, including the enums. */
function mistyping(line: string, member: string): string {
    const record = JSON.parse(line) as Record<string, unknown>;
    return JSON.stringify({...record, [member]: member === 'sequence' || member === 'status' ? 'wrong' : 42});
}

function refused(line: string): boolean {
    return readNvbRecord(line).kind === 'malformed';
}

describe('pinned NVB records are exact in every member', () => {
    it('accepts the captured real event and result records unchanged', () => {
        expect(readNvbRecord(eventLine()).kind).toBe('event');
        expect(readNvbRecord(taskStartedLine()).kind).toBe('event');
        expect(readNvbRecord(runResultLine()).kind).toBe('result');
    });

    it('refuses an event that omits any pinned member', () => {
        expect(EVENT_MEMBERS.filter((member) => !refused(omitting(eventLine(), member)))).toEqual([]);
    });

    it('refuses an event whose member carries the wrong type', () => {
        expect(EVENT_MEMBERS.filter((member) => !refused(mistyping(eventLine(), member)))).toEqual([]);
    });

    it('refuses a result that omits any pinned member', () => {
        expect(RESULT_MEMBERS.filter((member) => !refused(omitting(runResultLine(), member)))).toEqual([]);
    });

    it('refuses a result whose member carries the wrong type', () => {
        expect(RESULT_MEMBERS.filter((member) => !refused(mistyping(runResultLine(), member)))).toEqual([]);
    });

    it('refuses nested error drift and an unparsable instant', () => {
        expect(refused(runResultLine({error: {name: 1, message: null, stack: 'at x'}}))).toBeTrue();
        expect(refused(runResultLine({error: {message: 'no name', stack: null}}))).toBeTrue();
        expect(refused(runResultLine({startedAt: 'not-a-date'}))).toBeTrue();
        expect(refused(eventLine({timestamp: '13:03'}))).toBeTrue();
    });

    it('refuses contradictory terminal fields and a serve identity on a task run', () => {
        expect(refused(runResultLine({failedTask: TASK_ID}))).toBeTrue();
        expect(refused(runResultLine({failurePhase: 'task'}))).toBeTrue();
        expect(refused(runResultLine({cancellationReason: 'operator'}))).toBeTrue();
        expect(refused(runResultLine({error: {name: 'Error', message: 'boom', stack: null}}))).toBeTrue();
        expect(refused(runResultLine({isServe: true}))).toBeTrue();
        expect(refused(runResultLine({serveName: 'web', sessionId: 'abc'}))).toBeTrue();
    });

    it('refuses a run that finishes before it starts, or omits its own clock', () => {
        expect(refused(runResultLine({finishedAt: '2026-08-02T00:00:00.000Z'}))).toBeTrue();
        expect(refused(runResultLine({startedAt: null}))).toBeTrue();
        expect(refused(runResultLine({finishedAt: null}))).toBeTrue();
    });

    it('accepts the conditional taskResults member the pinned producer adds for a multi-result run', () => {
        expect(readNvbRecord(runResultLine({taskResults: {[TASK_ID]: {structuredOutput: {ok: true}}}})).kind)
            .toBe('result');
        expect(refused(runResultLine({taskResults: 7}))).toBeTrue();
    });
});

describe('the bound stream keeps one monotonic run clock', () => {
    it('refuses an event dated before its predecessor inside the same run', () => {
        expect(problemOf([runStartedLine(), taskStartedLine({timestamp: NOT_BEFORE})]))
            .toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });

    it('refuses a result that closes before the last event it claims to summarize', () => {
        expect(problemOf([
            runStartedLine(),
            taskStartedLine({timestamp: '2026-08-03T00:00:05.000Z'}),
            runResultLine({finishedAt: '2026-08-03T00:00:01.500Z'})
        ])).toBe('TASK_RUNTIME_RUN_STREAM_INVALID');
    });
});
