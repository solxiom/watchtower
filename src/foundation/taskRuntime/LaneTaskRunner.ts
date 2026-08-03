/**
 * The only application-facing NVB invocation boundary
 * (`docs/spec/architecture.md` §4.5, `docs/spec/v1.md` §15).
 *
 * Application services depend on this port. Commands, TaskHandlers, and
 * foundation capabilities never start a runtime process, never name a task
 * identifier, and never construct an NVB target of their own — they name one
 * allowlisted action and consume one typed result.
 */
import type {LaneTaskInvocation, LaneTaskRunResult} from '../../contracts/taskRuntime.js';

export interface LaneTaskRunner {
    /**
     * Invoke one allowlisted action against the lane's pinned task runtime.
     *
     * Refusals before the process starts raise `LaneTaskRuntimeError` with a
     * stable reason and leave every authoritative byte unchanged. Once the
     * runner has started, the outcome is always a typed `LaneTaskRunResult`.
     */
    run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult>;
}

/** Reads one lane's pinned `taskRuntime` block as untrusted bytes. */
export interface TaskRuntimePinSource {
    readTaskRuntime(laneDir: string): unknown;
}

/** Resolves the checksum-verified immutable root for a pinned runtime version. */
export interface RuntimeRootResolver {
    resolveRuntimeRoot(runtimeVersion: string): string;
}
