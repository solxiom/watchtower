/**
 * The only way a `TaskLeafCapability` comes into existence
 * (`docs/spec/architecture.md` §4.5, `docs/spec/nirvana-integration-architecture.md` §4.7).
 *
 * A caller-supplied action identifier is not authority: any application service
 * could name a valid action string. Leaf authority is therefore derived from
 * *what this process was started to do*. The packaged NVB child is started by
 * `LaneTaskRunner` as `node <nvb.js> <taskId> … --jsonfile=<pinned config>
 * --jsfile=<pinned module>`, so this module reads the executing task from the
 * current process argv and accepts it only when the pinned config the child was
 * given resolves inside the same immutable runtime root the catalog was verified
 * against. The capability is then bound to that one task before `invoke` exists.
 *
 * In any other process — the `wt` CLI, an application service, a spec harness —
 * there is no such argv, so no capability can be constructed at all, with or
 * without correct action and leaf identifiers. The raw `LeafRuntimeInvoker` is
 * never exported from a public barrel, so there is no second route.
 *
 * `argv` is deliberately **not** a parameter of the exported
 * `grantExecutingTaskLeafCapability`: an injectable override on a public
 * authority boundary is itself forgeable (Correction 05 finding 1) — any caller
 * holding an ordinary catalog/files seam could construct a plausible-looking
 * `argv` array without ever running inside a packaged NVB child. The public
 * function always samples the real `process.argv` of the process it runs in,
 * which a caller cannot substitute. `grantTaskLeafCapabilityFromArgv` is the
 * testable core with an explicit `argv` parameter; it is exported from this
 * module for direct, non-barrel spec imports only (the same pattern
 * `LeafRuntimeInvoker` uses) and must never be re-exported from a public
 * barrel.
 */
import {LeafRuntimeError, type LeafInvocationResult, type TaskLeafCapability, type TaskLeafRequest}
    from '../../../contracts/leafRuntime.js';
import {LaneTaskRuntimeError, type LaneTaskBinding} from '../../../contracts/taskRuntime.js';
import type {LaneTaskCatalog} from '../../task/runtime/LaneTaskCatalog.js';
import {containedInRoot} from '../../task/runtime/taskRuntimePin.js';
import type {RuntimeFileSystem} from '../../task/runtime/runtimeFileSystem.js';
import {LeafRuntimeInvoker} from './LeafRuntimeInvoker.js';
import type {RuntimeProcessInvoker} from './runtimeProcessPorts.js';

const CONFIG_FLAG = '--jsonfile=';
const TASK_ID = /^wt:[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/u;
/** argv index of the task name in the pinned runner invocation. */
const TASK_ARGUMENT = 2;

/** Public options: no `argv` field exists, so no caller can supply one. */
export interface TaskLeafGrantOptions {
    readonly catalog: LaneTaskCatalog;
    readonly files: RuntimeFileSystem;
    readonly processes?: RuntimeProcessInvoker;
}

/** The internal, spec-only core: `argv` is explicit and required for direct unit testing. */
export interface TaskLeafGrantFromArgvOptions extends TaskLeafGrantOptions {
    readonly argv: readonly string[];
}

/**
 * Grant the executing packaged task its own leaf capability, or refuse because
 * this process is not a packaged task run of a catalog task.
 *
 * Authority is sampled from this process's *own real* `process.argv` — never a
 * caller-supplied value — so no application service holding an ordinary
 * catalog/files seam can forge it.
 */
export function grantExecutingTaskLeafCapability(options: TaskLeafGrantOptions): TaskLeafCapability {
    return grantTaskLeafCapabilityFromArgv({...options, argv: process.argv});
}

/**
 * The testable core. Exported for direct, non-barrel spec imports only (mirrors
 * `LeafRuntimeInvoker`): a public barrel must re-export only
 * `grantExecutingTaskLeafCapability`, never this function.
 */
export function grantTaskLeafCapabilityFromArgv(options: TaskLeafGrantFromArgvOptions): TaskLeafCapability {
    const binding = executingTaskBinding(options);
    const invoker = new LeafRuntimeInvoker({
        catalog: options.catalog, files: options.files, processes: options.processes
    });
    return new BoundTaskLeafCapability(binding, invoker);
}

class BoundTaskLeafCapability implements TaskLeafCapability {
    constructor(
        private readonly binding: LaneTaskBinding,
        private readonly invoker: LeafRuntimeInvoker
    ) {}

    get taskId(): string {
        return this.binding.taskId;
    }

    get leafIds(): readonly string[] {
        return this.binding.leafIds;
    }

    /** The owning action is the bound one; a caller cannot select another. */
    async invoke(request: TaskLeafRequest): Promise<LeafInvocationResult> {
        if (typeof request !== 'object' || request === null || typeof request.leafId !== 'string') {
            throw new LeafRuntimeError('LEAF_REQUEST_INVALID', 'request',
                'A task leaf request must name a leaf declared by the executing task.');
        }
        return this.invoker.invoke({
            leafId: request.leafId,
            owningActionId: this.binding.actionId,
            args: request.args,
            context: request.context,
            cancellation: request.cancellation
        });
    }
}

/** Resolve the task this process was started to run, or refuse. */
function executingTaskBinding(options: TaskLeafGrantFromArgvOptions): LaneTaskBinding {
    const argv = options.argv;
    const taskId = argv[TASK_ARGUMENT];
    if (typeof taskId !== 'string' || !TASK_ID.test(taskId) || !pinnedTargetOf(argv, options)) {
        throw new LeafRuntimeError('LEAF_TASK_AUTHORITY_INVALID', String(taskId ?? ''),
            'Leaf authority is only granted inside a packaged run of a cataloged lane task.');
    }
    try {
        return options.catalog.resolveExecutingTask(taskId);
    } catch (error) {
        if (error instanceof LaneTaskRuntimeError) {
            // A catalog refusal at this boundary is an authority refusal: the
            // process claims to run a task the immutable catalog does not
            // allowlist through exactly one action.
            throw new LeafRuntimeError('LEAF_TASK_AUTHORITY_INVALID', taskId,
                'The immutable catalog does not grant leaf authority for the task this process claims to run.');
        }
        throw error;
    }
}

/**
 * The child must have been handed the pinned config inside the same immutable
 * runtime root this catalog was verified against, so a process cannot claim task
 * authority by putting a task name in its own argv.
 */
function pinnedTargetOf(argv: readonly string[], options: TaskLeafGrantOptions): boolean {
    const flag = argv.find((value) => typeof value === 'string' && value.startsWith(CONFIG_FLAG));
    if (flag === undefined) return false;
    const observation = options.files.observe(flag.slice(CONFIG_FLAG.length));
    return observation.kind === 'file' && containedInRoot(options.catalog.root, observation.canonicalPath);
}
