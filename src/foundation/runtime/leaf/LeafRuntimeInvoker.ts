/**
 * The only way a cataloged leaf executable is reached
 * (`docs/spec/architecture.md` §4.5, `docs/spec/nirvana-integration-architecture.md` §4.7).
 *
 * A caller names a leaf identifier, the allowlisted action whose task owns that
 * leaf, and argv. It cannot supply an executable path, a shell string, an
 * environment map, or a working directory: the executable comes from the
 * packaged catalog, its canonical target is proved contained inside the
 * immutable runtime root and its bytes proved against the manifest digest, the
 * environment is the same validated `WT_*` allowlist the task runner exports,
 * and the working directory is the lane control home (`context.workspace`).
 *
 * This module is **internal** to the runtime composition and is never exported
 * from a public barrel: its request carries an `owningActionId`, and naming a
 * valid action is not authority. Application code receives a
 * `TaskLeafCapability` from `taskLeafCapability.ts`, which binds the task
 * identity before `invoke` exists.
 *
 * Ownership is proved, not asserted: the owning action is resolved through the
 * immutable catalog and the resolved task's `leafIds` must actually declare this
 * leaf, so an unrelated application service or TaskHandler cannot select another
 * capability's leaf. That resolved task's mutation class is also the leaf's
 * access contract, so a leaf owned by a lane-writing task is fenced with the
 * same effective-account write check its task receives. Exit status and
 * terminating signal are preserved in the typed result.
 */
import {
    LeafRuntimeError,
    type LeafInvocation,
    type LeafInvocationResult,
    type LeafRuntimeReason
} from '../../../contracts/leafRuntime.js';
import type {LaneRuntimeLeaf, LaneTaskBinding} from '../../../contracts/taskRuntime.js';
import {LaneTaskRuntimeError} from '../../../contracts/taskRuntime.js';
import type {LaneTaskCatalog} from '../../taskRuntime/LaneTaskCatalog.js';
import {LaneRuntimeAccessGuard} from '../../taskRuntime/LaneRuntimeAccessGuard.js';
import {buildRuntimeEnvironment} from '../../taskRuntime/laneTaskEnvironment.js';
import {containedInRoot} from '../../taskRuntime/taskRuntimePin.js';
import type {RuntimeFileSystem} from '../../taskRuntime/runtimeFileSystem.js';
import {NirvanaProcessInvoker} from './NirvanaProcessInvoker.js';
import type {RuntimeProcessInvoker} from './runtimeProcessPorts.js';

const MAX_ARGUMENTS = 64;
const MAX_ARGUMENT_LENGTH = 4096;
const UNSAFE_ARGUMENT = /[\u0000-\u001f\u007f]/u;
const EXECUTABLE_MODE = 0o555;
const CANCELLATION_SIGNAL: NodeJS.Signals = 'SIGTERM';

export interface LeafRuntimeInvokerOptions {
    readonly catalog: LaneTaskCatalog;
    readonly files: RuntimeFileSystem;
    readonly processes?: RuntimeProcessInvoker;
}

export class LeafRuntimeInvoker {
    private readonly catalog: LaneTaskCatalog;
    private readonly files: RuntimeFileSystem;
    private readonly processes: RuntimeProcessInvoker;
    private readonly guard: LaneRuntimeAccessGuard;

    constructor(options: LeafRuntimeInvokerOptions) {
        this.catalog = options.catalog;
        this.files = options.files;
        this.processes = options.processes ?? new NirvanaProcessInvoker();
        this.guard = new LaneRuntimeAccessGuard(this.files);
    }

    /**
     * Invoke one cataloged leaf. Every refusal happens before the process
     * starts; once it starts, the outcome is always a typed result.
     */
    async invoke(invocation: LeafInvocation): Promise<LeafInvocationResult> {
        requireRequest(invocation);
        const owner = this.requireOwningTask(invocation.owningActionId, invocation.leafId);
        const leaf = this.catalog.resolveLeaf(invocation.leafId);
        const executable = this.verifyLeafBytes(leaf);
        const args = validatedArguments(invocation.args, leaf.leafId);
        const cwd = this.authorize(invocation.context, owner, leaf.leafId);
        const outcome = await this.processes.invoke({
            executable,
            args,
            cwd,
            environment: buildRuntimeEnvironment(invocation.context),
            cancellation: invocation.cancellation,
            killSignal: CANCELLATION_SIGNAL
        });
        if (outcome.disposition === 'unavailable') {
            throw refuse('LEAF_UNAVAILABLE', leaf.leafId, 'The cataloged leaf executable could not be started.');
        }
        if (outcome.disposition === 'cancelled') {
            return {
                outcome: 'cancelled', leafId: leaf.leafId, signal: outcome.signal ?? CANCELLATION_SIGNAL,
                stdout: outcome.stdout, stderr: outcome.stderr
            };
        }
        return outcome.exitCode === 0 && outcome.signal === null
            ? {outcome: 'completed', leafId: leaf.leafId, exitCode: 0, stdout: outcome.stdout, stderr: outcome.stderr}
            : {
                outcome: 'failed', leafId: leaf.leafId, reason: 'LEAF_EXECUTION_FAILED',
                exitCode: outcome.exitCode, signal: outcome.signal,
                diagnostic: outcome.signal === null
                    ? `The leaf exited with status ${String(outcome.exitCode)}.`
                    : `The leaf was terminated by signal ${outcome.signal}.`,
                stdout: outcome.stdout, stderr: outcome.stderr
            };
    }

    /**
     * Prove the canonical executable is contained in the immutable runtime root
     * and carries the packaged bytes and mode before anything is executed. The
     * canonical containment recheck defeats a checksum-matching symlink that
     * would otherwise execute outside the pinned root.
     */
    private verifyLeafBytes(leaf: LaneRuntimeLeaf): string {
        const observation = this.files.observe(leaf.path);
        if (observation.kind !== 'file') {
            throw refuse('LEAF_MISSING', leaf.leafId, 'The cataloged leaf executable is missing from the runtime root.');
        }
        if (!containedInRoot(this.catalog.root, observation.canonicalPath)) {
            throw refuse('LEAF_PATH_ESCAPE', leaf.leafId,
                'The cataloged leaf resolves through a link that leaves the pinned runtime root.');
        }
        if (!observation.executable || observation.mode !== EXECUTABLE_MODE) {
            throw refuse('LEAF_NOT_EXECUTABLE', leaf.leafId,
                'The cataloged leaf does not carry the manifest-declared executable mode.');
        }
        if (this.files.digest(observation.canonicalPath) !== leaf.sha256) {
            throw refuse('LEAF_DIGEST_MISMATCH', leaf.leafId,
                'The cataloged leaf bytes do not match the packaged manifest digest.');
        }
        return observation.canonicalPath;
    }

    /**
     * Resolve the owning action through the immutable catalog and prove the
     * requested leaf is one this task actually declares. A caller therefore
     * cannot reach a leaf by naming an action that does not own it.
     */
    private requireOwningTask(owningActionId: string, leafId: string): LaneTaskBinding {
        let binding: LaneTaskBinding;
        try {
            binding = this.catalog.resolveAction(owningActionId);
        } catch (error) {
            if (error instanceof LaneTaskRuntimeError) {
                throw refuse('LEAF_OWNING_ACTION_UNKNOWN', String(owningActionId),
                    'The owning action this leaf invocation names is not an allowlisted lane action.');
            }
            throw error;
        }
        if (!binding.leafIds.includes(leafId)) {
            throw refuse('LEAF_NOT_DECLARED_BY_TASK', leafId,
                'The catalog task behind the owning action does not declare this leaf.');
        }
        return binding;
    }

    /**
     * Apply the control-home cwd and the owning task's account fences. The
     * control home (`context.workspace`) is the working directory; the overlay
     * and the immutable root are fenced through the shared access guard using
     * the owning task's mutation class, so a write-classed leaf cannot run with
     * a non-writable overlay.
     */
    private authorize(context: LeafInvocation['context'], owner: LaneTaskBinding, leafId: string): string {
        try {
            return this.guard.authorize(context.workspace, context.laneDir, this.catalog.root, owner).workingDirectory;
        } catch (error) {
            if (!(error instanceof LaneTaskRuntimeError)) throw error;
            if (error.reason === 'TASK_RUNTIME_ACCOUNT_ACCESS_DENIED' || error.reason === 'TASK_RUNTIME_ROOT_WRITABLE'
                || error.reason === 'TASK_RUNTIME_TASK_MUTATION_FORBIDDEN') {
                throw refuse('LEAF_ACCESS_DENIED', leafId,
                    'The effective account is not authorized for this leaf under its owning task contract.');
            }
            throw refuse('LEAF_WORKING_DIRECTORY_INVALID', leafId,
                'The lane control home or overlay is not an accessible directory for this account.');
        }
    }
}

function requireRequest(invocation: LeafInvocation): void {
    if (typeof invocation !== 'object' || invocation === null
        || typeof invocation.leafId !== 'string' || typeof invocation.owningActionId !== 'string'
        || typeof invocation.context !== 'object' || invocation.context === null) {
        throw refuse('LEAF_REQUEST_INVALID', 'invocation',
            'A leaf invocation must name a leaf, its owning action, and a lane runtime context.');
    }
}

/**
 * Arguments are values, never syntax: each is a bounded, control-character-free
 * string, and the list is copied so a caller cannot mutate it after validation.
 */
function validatedArguments(args: unknown, leafId: string): readonly string[] {
    if (!Array.isArray(args) || args.length > MAX_ARGUMENTS) {
        throw refuse('LEAF_ARGUMENT_INVALID', leafId,
            'A leaf invocation must supply a bounded array of argument values.');
    }
    for (const value of args) {
        if (typeof value !== 'string' || value.length > MAX_ARGUMENT_LENGTH || UNSAFE_ARGUMENT.test(value)) {
            throw refuse('LEAF_ARGUMENT_INVALID', leafId,
                'Leaf arguments must be bounded, control-character-free strings.');
        }
    }
    return [...args as readonly string[]];
}

function refuse(reason: LeafRuntimeReason, subject: string, message: string): LeafRuntimeError {
    return new LeafRuntimeError(reason, subject, message);
}
