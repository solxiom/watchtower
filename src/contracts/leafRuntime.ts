/**
 * Closed public contracts for the cataloged leaf executable boundary
 * (`docs/spec/architecture.md` §4.5, `docs/spec/nirvana-integration-architecture.md` §4.7).
 *
 * A leaf is reached only by its owning TaskHandler, only by manifest-declared
 * identity, and only through argv. No caller supplies an executable path, a
 * shell string, or an environment map.
 */
import type {LaneRuntimeContext} from './taskRuntime.js';

export const LEAF_RUNTIME_REASONS = [
    'LEAF_REQUEST_INVALID',
    'LEAF_TASK_AUTHORITY_INVALID',
    'LEAF_OWNING_ACTION_UNKNOWN',
    'LEAF_NOT_DECLARED_BY_TASK',
    'LEAF_ACCESS_DENIED',
    'LEAF_UNKNOWN',
    'LEAF_PATH_ESCAPE',
    'LEAF_MISSING',
    'LEAF_NOT_EXECUTABLE',
    'LEAF_DIGEST_MISMATCH',
    'LEAF_ARGUMENT_INVALID',
    'LEAF_WORKING_DIRECTORY_INVALID',
    'LEAF_UNAVAILABLE',
    'LEAF_EXECUTION_FAILED',
    'LEAF_CANCELLED'
] as const;

export type LeafRuntimeReason = typeof LEAF_RUNTIME_REASONS[number];

/** Refusal raised before the leaf process starts; nothing has been executed. */
export class LeafRuntimeError extends Error {
    constructor(readonly reason: LeafRuntimeReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'LeafRuntimeError';
    }
}

/**
 * One argv-only invocation of one cataloged leaf, carrying the owning action
 * that the raw invoker resolves through the immutable catalog.
 *
 * This is the **internal** request shape of `LeafRuntimeInvoker`. It is not a
 * capability: naming a valid action does not confer authority, which is why the
 * invoker is never exported from a public barrel. Application code receives a
 * `TaskLeafCapability` instead, whose task identity is bound at construction by
 * the runtime composition (`architecture.md` §4.5,
 * `nirvana-integration-architecture.md` §4.7).
 */
export interface LeafInvocation {
    readonly leafId: string;
    readonly owningActionId: string;
    readonly args: readonly string[];
    readonly context: LaneRuntimeContext;
    readonly cancellation?: AbortSignal;
}

/**
 * One argv-only leaf request made **by the executing TaskHandler itself**.
 *
 * There is no action or task member: the capability already knows which task it
 * belongs to, because it can only be granted for the task this process was
 * started to run. A handler can therefore reach exactly the leaves its own
 * catalog entry declares, under its own mutation-class access fence, and no
 * application service can construct the capability at all.
 */
export interface TaskLeafRequest {
    readonly leafId: string;
    readonly args: readonly string[];
    readonly context: LaneRuntimeContext;
    readonly cancellation?: AbortSignal;
}

/** A leaf-invocation capability bound to exactly one packaged catalog task. */
export interface TaskLeafCapability {
    /** The catalog task this capability was granted for. */
    readonly taskId: string;
    /** The leaves that task declares; nothing else is reachable. */
    readonly leafIds: readonly string[];
    invoke(request: TaskLeafRequest): Promise<LeafInvocationResult>;
}

export interface LeafCompleted {
    readonly outcome: 'completed';
    readonly leafId: string;
    readonly exitCode: 0;
    readonly stdout: string;
    readonly stderr: string;
}

export interface LeafFailed {
    readonly outcome: 'failed';
    readonly leafId: string;
    readonly reason: LeafRuntimeReason;
    readonly exitCode: number | null;
    readonly signal: string | null;
    /** Bounded, redacted diagnostic; never a stack or environment map. */
    readonly diagnostic: string;
    readonly stdout: string;
    readonly stderr: string;
}

export interface LeafCancelled {
    readonly outcome: 'cancelled';
    readonly leafId: string;
    readonly signal: string;
    readonly stdout: string;
    readonly stderr: string;
}

export type LeafInvocationResult = LeafCompleted | LeafFailed | LeafCancelled;
