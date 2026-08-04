/**
 * Sole owner of the `install.json` `taskRuntime` pin contract
 * (`docs/spec/v1.md` §7.5). Install-manifest bytes arrive as `unknown`; this
 * module either returns a `PinnedTaskRuntimeTarget` whose targets provably
 * resolve inside the checksum-verified immutable runtime root, or raises the
 * exact typed reason. There is no partially validated pin.
 */
import {isAbsolute, relative, resolve, sep} from 'node:path';
import {
    LaneTaskRuntimeError,
    type LaneTaskRuntimeReason,
    type PinnedTaskRuntimeTarget
} from '../../../contracts/taskRuntime.js';
import type {RuntimeFileSystem} from './runtimeFileSystem.js';

const CATALOG_ID = /^[a-z0-9][a-z0-9-]{0,63}(?:\/[a-z0-9][a-z0-9-]{0,63})*\/v[0-9]{1,3}$/u;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;
const PROFILE = /^[a-z0-9][a-z0-9-]{0,127}$/u;
const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const PIN_FIELDS = ['catalogId', 'catalogSha256', 'profile', 'configTarget', 'moduleTarget'] as const;

/**
 * Validate a lane's pinned task-runtime block against an already verified
 * runtime root. `runtimeRoot` must be the value `RuntimeCatalog.getRuntimeRoot`
 * returned for the lane's pinned runtime version, so checksum verification has
 * already happened through its accepted owner.
 */
export function readTaskRuntimePin(
    value: unknown,
    runtimeRoot: string,
    files: RuntimeFileSystem
): PinnedTaskRuntimeTarget {
    const block = requireExactBlock(value);
    const catalogId = requireMatch(block.catalogId, CATALOG_ID, 'catalogId');
    const catalogSha256 = requireMatch(block.catalogSha256, DIGEST, 'catalogSha256');
    const profile = requireMatch(block.profile, PROFILE, 'profile');
    const root = requireRuntimeRoot(runtimeRoot, files);
    return {
        catalogId,
        catalogSha256: catalogSha256 as `sha256:${string}`,
        profile,
        configTarget: requireContainedFile(block.configTarget, root, 'configTarget', files),
        moduleTarget: requireContainedFile(block.moduleTarget, root, 'moduleTarget', files)
    };
}

/** The canonical runtime root, refusing anything that is not a real directory. */
export function requireRuntimeRoot(runtimeRoot: string, files: RuntimeFileSystem): string {
    if (typeof runtimeRoot !== 'string' || runtimeRoot.length === 0 || !isAbsolute(runtimeRoot)
        || CONTROL_CHARACTER.test(runtimeRoot)) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_ROOT_INVALID', 'runtimeRoot',
            'The pinned runtime root must be an absolute, control-character-free path.');
    }
    const observation = files.observe(runtimeRoot);
    if (observation.kind !== 'directory') {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_ROOT_INVALID', 'runtimeRoot',
            'The pinned runtime root does not resolve to a directory.');
    }
    return observation.canonicalPath;
}

/** Whether `candidate` resolves inside `root` after full canonicalization. */
export function containedInRoot(root: string, candidate: string): boolean {
    const difference = relative(root, candidate);
    return difference === '' || (!difference.startsWith(`..${sep}`) && difference !== '..' && !isAbsolute(difference));
}

/**
 * Observe the canonical target of a lexical runtime-root path and prove it is a
 * regular file contained inside the root after symlink resolution. A
 * checksum-matching symlink whose canonical target escapes the root is refused.
 */
export function requireContainedRuntimeFile(
    files: {observe(path: string): {kind: string; canonicalPath: string}},
    runtimeRoot: string,
    lexicalPath: string,
    subject: string,
    reason: LaneTaskRuntimeReason
): string {
    if (!containedInRoot(runtimeRoot, lexicalPath)) {
        throw new LaneTaskRuntimeError(reason, subject,
            'The packaged file does not sit inside the pinned runtime root.');
    }
    const observation = files.observe(lexicalPath);
    if (observation.kind !== 'file' || !containedInRoot(runtimeRoot, observation.canonicalPath)) {
        throw new LaneTaskRuntimeError(reason, subject,
            'The packaged file is missing or resolves through a link that leaves the runtime root.');
    }
    return observation.canonicalPath;
}

function requireExactBlock(value: unknown): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_PIN_INVALID', 'taskRuntime',
            'The install manifest taskRuntime block must be a JSON object.');
    }
    const block = value as Record<string, unknown>;
    const keys = Object.keys(block);
    const missing = PIN_FIELDS.filter((field) => !keys.includes(field));
    const extra = keys.filter((key) => !PIN_FIELDS.includes(key as typeof PIN_FIELDS[number]));
    if (missing.length > 0 || extra.length > 0) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_PIN_INVALID', missing[0] ?? extra[0],
            missing.length > 0 ? 'The taskRuntime pin is missing a required field.'
                : 'The taskRuntime pin declares an unsupported field.');
    }
    return block;
}

function requireMatch(value: unknown, pattern: RegExp, field: string): string {
    if (typeof value !== 'string' || !pattern.test(value)) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_PIN_INVALID', field,
            `The taskRuntime pin field ${field} does not match its required syntax.`);
    }
    return value;
}

function requireContainedFile(
    value: unknown,
    root: string,
    field: string,
    files: RuntimeFileSystem
): string {
    if (typeof value !== 'string' || value.length === 0 || !isAbsolute(value) || CONTROL_CHARACTER.test(value)
        || value.split(sep).includes('..')) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_PIN_INVALID', field,
            `The taskRuntime pin field ${field} must be an absolute path without parent segments.`);
    }
    if (!containedInRoot(root, resolve(value))) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_PIN_TARGET_ESCAPE', field,
            `The taskRuntime pin field ${field} points outside the pinned runtime root.`);
    }
    const observation = files.observe(value);
    if (observation.kind !== 'file') {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_PIN_TARGET_MISSING', field,
            `The taskRuntime pin field ${field} does not resolve to a regular file.`);
    }
    if (!containedInRoot(root, observation.canonicalPath)) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_PIN_TARGET_ESCAPE', field,
            `The taskRuntime pin field ${field} resolves through a link that leaves the runtime root.`);
    }
    return observation.canonicalPath;
}
