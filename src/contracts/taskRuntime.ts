/**
 * Closed public contracts for the lane task runtime boundary
 * (`docs/spec/architecture.md` §4.5, `docs/spec/v1.md` §12,
 * `docs/spec/nirvana-integration-architecture.md` §4.5).
 *
 * Every value that crosses this boundary from outside Watchtower — install
 * manifest bytes, packaged catalog bytes, NVB process output — enters as
 * `unknown` and leaves as one of the closed shapes declared here.
 */
import type {JsonValue} from './types.js';

/** Stable reason codes for every refusal and failure at this boundary. */
export const LANE_TASK_RUNTIME_REASONS = [
    'TASK_RUNTIME_REQUEST_INVALID',
    'TASK_RUNTIME_PIN_INVALID',
    'TASK_RUNTIME_PIN_TARGET_ESCAPE',
    'TASK_RUNTIME_PIN_TARGET_MISSING',
    'TASK_RUNTIME_ROOT_INVALID',
    'TASK_RUNTIME_ROOT_WRITABLE',
    'TASK_RUNTIME_CATALOG_UNREADABLE',
    'TASK_RUNTIME_CATALOG_INVALID',
    'TASK_RUNTIME_CATALOG_IDENTITY_MISMATCH',
    'TASK_RUNTIME_CATALOG_DIGEST_MISMATCH',
    'TASK_RUNTIME_PROFILE_UNKNOWN',
    'TASK_RUNTIME_ACTION_UNKNOWN',
    'TASK_RUNTIME_ACTION_DANGLING',
    'TASK_RUNTIME_TASK_NOT_IN_PROFILE',
    'TASK_RUNTIME_TASK_SCOPE_INVALID',
    'TASK_RUNTIME_TASK_MUTATION_FORBIDDEN',
    'TASK_RUNTIME_ENVELOPE_REQUIRED',
    'TASK_RUNTIME_ENVELOPE_INVALID',
    'TASK_RUNTIME_ENVELOPE_PATH_ESCAPE',
    'TASK_RUNTIME_ENVELOPE_UNREADABLE',
    'TASK_RUNTIME_ENVELOPE_OWNER_INVALID',
    'TASK_RUNTIME_ENVELOPE_MODE_INVALID',
    'TASK_RUNTIME_ENVELOPE_CHECKSUM_MISMATCH',
    'TASK_RUNTIME_ENVELOPE_EXPIRED',
    'TASK_RUNTIME_ENVELOPE_TASK_MISMATCH',
    'TASK_RUNTIME_ENVELOPE_CONSUMED',
    'TASK_RUNTIME_CONFIG_UNREADABLE',
    'TASK_RUNTIME_CONFIG_INVALID',
    'TASK_RUNTIME_TASK_NOT_IN_CONFIG',
    'TASK_RUNTIME_INPUT_INVALID',
    'TASK_RUNTIME_ENVIRONMENT_INVALID',
    'TASK_RUNTIME_CONTROL_HOME_INVALID',
    'TASK_RUNTIME_WORKING_DIRECTORY_INVALID',
    'TASK_RUNTIME_ACCOUNT_ACCESS_DENIED',
    'TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE',
    'TASK_RUNTIME_RUNNER_UNAVAILABLE',
    'TASK_RUNTIME_RUN_OUTPUT_INVALID',
    'TASK_RUNTIME_RUN_STREAM_INVALID',
    'TASK_RUNTIME_RUN_STREAM_FOREIGN',
    'TASK_RUNTIME_RUN_STREAM_REPLAYED',
    'TASK_RUNTIME_RUN_RESULT_MISSING',
    'TASK_RUNTIME_RESULT_TASK_MISMATCH',
    'TASK_RUNTIME_RESULT_SCHEMA_INVALID',
    'TASK_RUNTIME_TASK_RESULT_MISSING',
    'TASK_RUNTIME_TASK_EXECUTION_FAILED',
    'TASK_RUNTIME_TASK_CANCELLED'
] as const;

export type LaneTaskRuntimeReason = typeof LANE_TASK_RUNTIME_REASONS[number];

/**
 * Refusal raised before any process starts. Every such failure leaves
 * authoritative bytes unchanged, so a caller may retry after correcting the
 * named subject without first inspecting durable state.
 */
export class LaneTaskRuntimeError extends Error {
    constructor(readonly reason: LaneTaskRuntimeReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'LaneTaskRuntimeError';
    }
}

/** The lane's pinned, checksum-anchored NVB target from `install.json`. */
export interface PinnedTaskRuntimeTarget {
    readonly catalogId: string;
    readonly catalogSha256: `sha256:${string}`;
    readonly profile: string;
    readonly configTarget: string;
    readonly moduleTarget: string;
}

/** Mutation classes a catalog task may declare (`RT-09` catalog contract). */
export type LaneTaskMutationClass =
    | 'read-only'
    | 'derived-write'
    | 'managed-runtime-write'
    | 'managed-lane-write'
    | 'journaled-mutation'
    | 'authoritative-effect'
    | 'external-effect';

/** One allowlisted action resolved to exactly one catalog task. */
export interface LaneTaskBinding {
    readonly actionId: string;
    readonly taskId: string;
    readonly handlerId: string;
    readonly inputSchema: string;
    readonly resultSchema: string;
    readonly mutationClass: LaneTaskMutationClass;
    readonly requiresInvocationEnvelope: boolean;
    readonly leafIds: readonly string[];
}

/** One cataloged leaf executable declared by the packaged runtime. */
export interface LaneRuntimeLeaf {
    readonly leafId: string;
    readonly path: string;
    readonly sha256: `sha256:${string}`;
    readonly mode: '0555';
}

/**
 * The validated lane facts the runtime invocation contract exports. Names match
 * `docs/spec/v1.md` §12 exactly; nothing else is ever forwarded to a child.
 *
 * `workspace` is the lane **control home** — the repository/worktree that owns
 * the `.watchtower` overlay (`architecture.md` §3). It is the explicit task/leaf
 * process `cwd` (`nirvana-integration-architecture.md` §4.5 step 4). `laneDir`
 * is the structured overlay directory exported as `WT_LANE_DIR` (`v1.md` §12);
 * it is never the process working directory.
 */
export interface LaneRuntimeContext {
    readonly workspace: string;
    readonly laneId: string;
    readonly initiativeId: string;
    readonly laneSlug: string;
    readonly laneDir: string;
    readonly homeRepositoryId: string;
    readonly repositoriesFile: string;
    readonly runtimeRoot: string;
    readonly runtimeVersion: string;
    readonly knowledgeRoot: string;
    readonly activeRepositoryId?: string;
    readonly coordinatorCycleId?: string;
    readonly decisionClass?: string;
    /** The only non-`WT_` values a child receives, supplied by the caller. */
    readonly baseEnvironment: LaneRuntimeBaseEnvironment;
}

/** Explicit process-environment base; never read ambiently by this boundary. */
export interface LaneRuntimeBaseEnvironment {
    readonly path: string;
    readonly home: string;
}

/**
 * One typed invocation of one allowlisted action.
 *
 * `input` is the **caller's** per-invocation typed request
 * (`nirvana-integration-architecture.md` §7: "Read-only tasks receive a typed
 * request after lane selection and checksum validation"; §4.5 step 5). It is
 * validated against the selected task's checksum-bound `inputSchema` before the
 * process starts and delivered to the owning TaskHandler unchanged through the
 * pinned `TaskHandler.argMap` channel (see
 * `foundation/taskRuntime/laneTaskRequest.ts` for the pinned-parser constraints
 * that fix the encoding). The task's static `handle.args` in the pinned config
 * remains validated configuration; it is not this request.
 *
 * `invocationEnvelope` is the absolute path of the single-use envelope the sole
 * effect executor prepared for a mutating action (§7). It is authority, not a
 * label: lane containment, ownership, mode, checksum, validity window, named
 * action/task/schema/handler, and single-use state are all proved before spawn.
 */
export interface LaneTaskInvocation {
    readonly actionId: string;
    readonly context: LaneRuntimeContext;
    /** The typed per-invocation request delivered to the owning TaskHandler. */
    readonly input: JsonValue;
    /** Absolute lane-contained path of the single-use invocation envelope. */
    readonly invocationEnvelope?: string;
    readonly cancellation?: AbortSignal;
}

export type LaneTaskEventCategory = 'run' | 'task' | 'group' | 'process' | 'execution' | 'other';

/** One structured NVB run event, narrowed to the fields Watchtower relies on. */
export interface LaneTaskEvent {
    readonly runId: string;
    readonly sequence: number;
    readonly timestamp: string;
    readonly category: LaneTaskEventCategory;
    readonly type: string;
    readonly taskId: string | null;
}

export interface LaneTaskCompleted {
    readonly outcome: 'completed';
    readonly actionId: string;
    readonly taskId: string;
    readonly runId: string;
    readonly startedAt: string | null;
    readonly finishedAt: string | null;
    readonly result: JsonValue;
    readonly events: readonly LaneTaskEvent[];
}

export interface LaneTaskFailed {
    readonly outcome: 'failed';
    readonly actionId: string;
    readonly taskId: string;
    readonly runId: string | null;
    readonly reason: LaneTaskRuntimeReason;
    readonly failedTaskId: string | null;
    readonly exitCode: number | null;
    readonly signal: string | null;
    /** Bounded, redacted diagnostic; never a stack, path chain, or environment. */
    readonly diagnostic: string;
    readonly events: readonly LaneTaskEvent[];
}

export interface LaneTaskCancelled {
    readonly outcome: 'cancelled';
    readonly actionId: string;
    readonly taskId: string;
    readonly runId: string | null;
    readonly signal: string;
    readonly events: readonly LaneTaskEvent[];
}

export type LaneTaskRunResult = LaneTaskCompleted | LaneTaskFailed | LaneTaskCancelled;
