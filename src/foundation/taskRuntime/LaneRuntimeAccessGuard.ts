/**
 * Sole owner of OS account resolution and access checking for the lane task
 * runtime (`docs/spec/v1.md` §12, `docs/spec/architecture.md` §6.3, §9.1).
 *
 * Three fences are enforced before any process starts:
 *
 * 1. the **control home** (`context.workspace`) is canonical, a real directory,
 *    and readable/traversable by the effective account — it is the explicit task
 *    and leaf working directory (`nirvana-integration-architecture.md` §4.5);
 * 2. the structured **overlay** (`context.laneDir`, exported as `WT_LANE_DIR`) is
 *    canonical, a real directory, readable/traversable, and writable only when
 *    the task's declared mutation class actually writes lane state, so a
 *    read-only worker account can invoke read-only actions and nothing else; and
 * 3. the immutable runtime root is readable and traversable but **not** writable
 *    by the effective account, so a published version root can never be edited by
 *    the process that executes from it.
 *
 * The control home and the overlay are distinct paths and are validated
 * separately; neither is ever silently substituted for the other.
 *
 * A cataloged leaf is authorized through this same `authorize` entry point using
 * its **owning task's** binding, so a leaf declared by a lane-writing task
 * receives that task's write fence rather than a weaker read-only one.
 */
import {isAbsolute} from 'node:path';
import {
    LaneTaskRuntimeError,
    type LaneTaskBinding,
    type LaneTaskMutationClass,
    type LaneTaskRuntimeReason
} from '../../contracts/taskRuntime.js';
import {containedInRoot} from './taskRuntimePin.js';
import type {RuntimeAccount, RuntimeFileSystem} from './runtimeFileSystem.js';

/** Mutation classes whose effects land inside the lane's own overlay. */
const LANE_WRITING_CLASSES: readonly LaneTaskMutationClass[] = [
    'derived-write', 'managed-lane-write', 'journaled-mutation', 'authoritative-effect'
];

/** A mutation class that may never run against an immutable lane runtime. */
const RUNTIME_WRITING_CLASS: LaneTaskMutationClass = 'managed-runtime-write';

export interface AuthorizedRuntimeAccess {
    /** Canonical control home used as the explicit task/leaf working directory. */
    readonly workingDirectory: string;
    readonly account: RuntimeAccount;
}

export class LaneRuntimeAccessGuard {
    constructor(private readonly files: RuntimeFileSystem) {}

    /**
     * Authorize one task or owned-leaf invocation. Every refusal happens before
     * the plan is built, so no authoritative byte has been touched when this
     * throws.
     */
    authorize(
        controlHome: string,
        laneDir: string,
        runtimeRoot: string,
        binding: LaneTaskBinding
    ): AuthorizedRuntimeAccess {
        this.rejectForbiddenMutation(binding);
        const workingDirectory = this.authorizeControlHome(controlHome);
        this.authorizeOverlay(laneDir, binding);
        this.authorizeImmutableRuntimeRoot(runtimeRoot);
        return {workingDirectory, account: this.files.account()};
    }

    private rejectForbiddenMutation(binding: LaneTaskBinding): void {
        if (binding.mutationClass === RUNTIME_WRITING_CLASS) {
            throw refuse('TASK_RUNTIME_TASK_MUTATION_FORBIDDEN', binding.taskId,
                'A runtime-writing task cannot be invoked against an immutable lane runtime.');
        }
    }

    private authorizeControlHome(controlHome: string): string {
        if (typeof controlHome !== 'string' || !isAbsolute(controlHome)) {
            throw refuse('TASK_RUNTIME_CONTROL_HOME_INVALID', 'workspace',
                'The lane control home must be an absolute path.');
        }
        const observation = this.files.observe(controlHome);
        if (observation.kind !== 'directory') {
            throw refuse('TASK_RUNTIME_CONTROL_HOME_INVALID', 'workspace',
                'The lane control home does not resolve to a directory.');
        }
        const canonical = observation.canonicalPath;
        if (!this.files.isReadable(canonical) || !this.files.isTraversable(canonical)) {
            throw refuse('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED', 'workspace',
                'The effective account cannot read or traverse the lane control home.');
        }
        return canonical;
    }

    private authorizeOverlay(laneDir: string, binding: LaneTaskBinding): void {
        const canonical = this.authorizeReadableDirectory(laneDir, 'laneDir');
        if (LANE_WRITING_CLASSES.includes(binding.mutationClass) && !this.files.isWritable(canonical)) {
            throw refuse('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED', binding.taskId,
                'The effective account cannot write the lane overlay this task mutates.');
        }
    }

    private authorizeReadableDirectory(path: string, subject: string): string {
        if (typeof path !== 'string' || !isAbsolute(path)) {
            throw refuse('TASK_RUNTIME_WORKING_DIRECTORY_INVALID', subject,
                'The lane overlay must be an absolute path.');
        }
        const observation = this.files.observe(path);
        if (observation.kind !== 'directory') {
            throw refuse('TASK_RUNTIME_WORKING_DIRECTORY_INVALID', subject,
                'The lane overlay does not resolve to a directory.');
        }
        const canonical = observation.canonicalPath;
        if (!this.files.isReadable(canonical) || !this.files.isTraversable(canonical)) {
            throw refuse('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED', subject,
                'The effective account cannot read or traverse the lane overlay.');
        }
        return canonical;
    }

    private authorizeImmutableRuntimeRoot(runtimeRoot: string): void {
        const observation = this.files.observe(runtimeRoot);
        if (observation.kind !== 'directory') {
            throw refuse('TASK_RUNTIME_ROOT_INVALID', 'runtimeRoot',
                'The pinned runtime root does not resolve to a directory.');
        }
        const canonical = observation.canonicalPath;
        if (!this.files.isReadable(canonical) || !this.files.isTraversable(canonical)) {
            throw refuse('TASK_RUNTIME_ACCOUNT_ACCESS_DENIED', 'runtimeRoot',
                'The effective account cannot read or traverse the pinned runtime root.');
        }
        if (this.files.isWritable(canonical)) {
            throw refuse('TASK_RUNTIME_ROOT_WRITABLE', 'runtimeRoot',
                'The pinned runtime root is writable by the effective account and is therefore not immutable.');
        }
    }
}

/** Whether a resolved executable is a real, contained, executable regular file. */
export function isContainedExecutable(root: string, path: string, files: RuntimeFileSystem): boolean {
    const observation = files.observe(path);
    return observation.kind === 'file' && observation.executable
        && containedInRoot(root, observation.canonicalPath);
}

function refuse(reason: LaneTaskRuntimeReason, subject: string, message: string): LaneTaskRuntimeError {
    return new LaneTaskRuntimeError(reason, subject, message);
}
