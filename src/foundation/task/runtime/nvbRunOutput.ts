/**
 * Binds the pinned NVB runner's stdout stream to the one invocation this
 * process started.
 *
 * `nvbRunRecords.ts` decides what a well-formed record is; this module decides
 * whether a sequence of well-formed records is *this* run. The binding is
 * established by the caller before the child starts — the selected task, the
 * exact planned working directory, and a `notBefore` instant — so authority
 * never comes from whatever the child happened to say first. A stream is
 * accepted only when it opens with `run.started` at sequence 1, keeps one run
 * identity, increments sequence by exactly one, names no foreign task, carries
 * the planned cwd, starts at or after `notBefore`, and ends with exactly one
 * result for exactly the selected task. Anything else is a stable typed problem,
 * so malformed, extra-membered, foreign, contradictory, and replayed output can
 * never be reported as completion.
 */
import type {LaneTaskEvent, LaneTaskRuntimeReason} from '../../../contracts/taskRuntime.js';
import {readNvbRecord, redactDiagnostic, type NvbEventRecord, type NvbResultRecord} from './nvbRunRecords.js';

export {redactDiagnostic};
export type NvbRunResultView = NvbResultRecord;

/** The caller-established identity of the invocation whose output this is. */
export interface NvbRunBinding {
    /** The exact task the runner was asked to run. */
    readonly taskId: string;
    /** The exact planned process working directory. */
    readonly workingDirectory: string;
    /** ISO instant captured before the child started; earlier output is stale. */
    readonly notBefore: string;
}

/** Accumulates typed events and the single run result from streamed stdout. */
export class NvbRunOutputReader {
    private readonly collected: LaneTaskEvent[] = [];
    private runResult: NvbResultRecord | null = null;
    private runId: string | null = null;
    private lastSequence = 0;
    private lastInstant = 0;
    private problemReason: LaneTaskRuntimeReason | null = null;

    constructor(private readonly binding: NvbRunBinding) {}

    /** Accept one complete, non-empty stdout line. */
    acceptLine(line: string): void {
        if (this.runResult !== null) {
            this.flag('TASK_RUNTIME_RUN_STREAM_INVALID');
            return;
        }
        const record = readNvbRecord(line);
        if (record.kind === 'malformed') this.flag('TASK_RUNTIME_RUN_STREAM_INVALID');
        else if (record.kind === 'event') this.acceptEvent(record.event);
        else this.acceptResult(record.result);
    }

    get events(): readonly LaneTaskEvent[] {
        return this.collected;
    }

    get result(): NvbResultRecord | null {
        return this.runResult;
    }

    /** A stable reason when the stream is not a single, self-consistent run. */
    get problem(): LaneTaskRuntimeReason | null {
        return this.problemReason;
    }

    private acceptEvent(event: NvbEventRecord): void {
        const reason = this.eventProblem(event);
        if (reason !== null) {
            this.flag(reason);
            return;
        }
        this.lastSequence = event.sequence;
        this.lastInstant = Date.parse(event.timestamp);
        this.runId = event.runId;
        this.collected.push({
            runId: event.runId, sequence: event.sequence, timestamp: event.timestamp,
            category: event.category, type: event.type, taskId: event.taskId
        });
    }

    private eventProblem(event: NvbEventRecord): LaneTaskRuntimeReason | null {
        const opening = this.lastSequence === 0;
        if (opening && (event.sequence !== 1 || event.type !== 'run.started')) {
            return 'TASK_RUNTIME_RUN_STREAM_INVALID';
        }
        if (!opening && event.sequence !== this.lastSequence + 1) return 'TASK_RUNTIME_RUN_STREAM_INVALID';
        if (!this.sameRun(event.runId) || event.cwd !== this.binding.workingDirectory) {
            return 'TASK_RUNTIME_RUN_STREAM_INVALID';
        }
        if (event.taskId !== null && event.taskId !== this.binding.taskId) return 'TASK_RUNTIME_RUN_STREAM_FOREIGN';
        if (!this.current(event.timestamp)) return 'TASK_RUNTIME_RUN_STREAM_REPLAYED';
        // One run has one monotonic clock: a record dated before its predecessor
        // is a spliced or reordered stream, not this invocation's history.
        return Date.parse(event.timestamp) < this.lastInstant ? 'TASK_RUNTIME_RUN_STREAM_INVALID' : null;
    }

    private acceptResult(result: NvbResultRecord): void {
        if (this.lastSequence === 0 || !this.sameRun(result.runId)
            || result.cwd !== this.binding.workingDirectory) {
            this.flag('TASK_RUNTIME_RUN_STREAM_INVALID');
            return;
        }
        if (!this.withinRunClock(result)) return;
        this.runResult = result;
        if (result.requestedTasks.length !== 1 || result.requestedTasks[0] !== this.binding.taskId) {
            this.flag('TASK_RUNTIME_RESULT_TASK_MISMATCH');
        }
    }

    /**
     * The result must close the same run clock the events opened: at or after
     * the caller's `notBefore` instant and never before the last event it
     * claims to summarize.
     */
    private withinRunClock(result: NvbResultRecord): boolean {
        if (!this.current(result.startedAt ?? this.binding.notBefore)
            || !this.current(result.finishedAt ?? this.binding.notBefore)) {
            this.flag('TASK_RUNTIME_RUN_STREAM_REPLAYED');
            return false;
        }
        if (result.finishedAt !== null && Date.parse(result.finishedAt) < this.lastInstant) {
            this.flag('TASK_RUNTIME_RUN_STREAM_INVALID');
            return false;
        }
        return true;
    }

    private sameRun(runId: string): boolean {
        return this.runId === null || this.runId === runId;
    }

    /** A record from before this invocation started is replayed, not current. */
    private current(timestamp: string): boolean {
        const observed = Date.parse(timestamp);
        return Number.isFinite(observed) && observed >= Date.parse(this.binding.notBefore);
    }

    private flag(reason: LaneTaskRuntimeReason): void {
        if (this.problemReason === null) this.problemReason = reason;
    }
}
