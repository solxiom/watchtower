/**
 * Reads the typed task input the pinned config target actually delivers to the
 * child, so it can be validated before anything starts.
 *
 * The pinned NVB run contract has no per-invocation typed-argument channel: a
 * TaskHandler's argument comes only from its task's `handle.args` in the
 * `--jsonfile` target (`@nirvana/b-core` `src/contracts/Integrator.js`). That
 * file is the checksum-pinned, runtime-root-contained artifact the runner
 * already resolved, so reading it here is reading exactly the bytes the child
 * will read — not a second, divergent source of truth. Watchtower validates that
 * value against the binding's catalog-declared `inputSchema` and refuses before
 * the process starts when the packaged projection and the declared contract
 * disagree.
 */
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import {isJsonValue} from '../../schemaComposition/jsonCanonicalizer.js';
import {LaneTaskRuntimeError, type LaneTaskRuntimeReason} from '../../../contracts/taskRuntime.js';
import type {JsonValue} from '../../../contracts/types.js';
import type {RuntimeFileSystem} from './runtimeFileSystem.js';

const MAX_CONFIG_BYTES = 4 * 1024 * 1024;

/**
 * The single typed input the pinned config declares for `taskId`. A packaged
 * lane-runtime task declares exactly one handler argument, because the pinned
 * TaskHandler contract takes exactly one input value.
 */
export function readDeclaredTaskInput(
    files: RuntimeFileSystem,
    configTarget: string,
    taskId: string
): JsonValue {
    const document = parseConfig(files.readText(configTarget, MAX_CONFIG_BYTES));
    const task = member(member(document, 'tasks'), taskId);
    if (task === null) {
        throw refuse('TASK_RUNTIME_TASK_NOT_IN_CONFIG', taskId,
            'The pinned executable projection does not declare the catalog task this action selects.');
    }
    const args = member(task, 'handle')?.args;
    if (!Array.isArray(args) || args.length !== 1 || !isJsonValue(args[0])) {
        throw refuse('TASK_RUNTIME_INPUT_INVALID', taskId,
            'The pinned executable projection does not declare exactly one JSON task input value.');
    }
    return args[0];
}

function parseConfig(text: string | null): Record<string, unknown> {
    if (text === null) {
        throw refuse('TASK_RUNTIME_CONFIG_UNREADABLE', 'configTarget',
            'The pinned executable projection is missing, unreadable, or oversized.');
    }
    let value: unknown;
    try {
        if (hasDuplicateJsonObjectKey(text)) throw new Error('duplicate member');
        value = JSON.parse(text);
    } catch {
        throw refuse('TASK_RUNTIME_CONFIG_INVALID', 'configTarget',
            'The pinned executable projection is not a well-formed JSON document.');
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw refuse('TASK_RUNTIME_CONFIG_INVALID', 'configTarget',
            'The pinned executable projection must be a JSON object.');
    }
    return value as Record<string, unknown>;
}

function member(container: Record<string, unknown> | null, key: string): Record<string, unknown> | null {
    const value = container?.[key];
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : null;
}

function refuse(reason: LaneTaskRuntimeReason, subject: string, message: string): LaneTaskRuntimeError {
    return new LaneTaskRuntimeError(reason, subject, message);
}
