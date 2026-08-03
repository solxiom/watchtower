/**
 * The typed per-invocation request channel
 * (`docs/spec/nirvana-integration-architecture.md` §7: "Read-only tasks receive
 * a typed request after lane selection and checksum validation"; §4.5 step 5).
 *
 * The pinned NVB run contract has no dedicated per-run task-argument option:
 * `buildRunCommandArgs`
 * (`@nirvana/commons/foundation/extra/nvb/methods/runner/shared.js`) emits only
 * task names and run flags, and `@nirvana/b-core` supplies a TaskHandler's
 * `handleAsync` parameter exclusively from the task's static `handle.args`. The
 * pinned contract does, however, expose one public per-invocation channel to the
 * handler itself: `TaskHandler.argMap`
 * (`@nirvana/b-core/src/support/basic/TaskHandler.js`), which parses this
 * process's own argv through `@nirvana/base` `argUtil.makeArgMap`, and
 * `normalizeCmdArgs` in the pinned facade forwards extra argv to that CLI
 * unchanged. This module owns that channel.
 *
 * Two pinned-parser facts fix the encoding. `makeKeyValueMap` splits an argument
 * on the *first* `=` and keeps `split('=')[1]`, so any value containing `=` —
 * including standard base64 padding — is silently truncated; and the pinned CLI
 * already documents `base64:` encoded argv values for `--json-vars`. The request
 * therefore travels as unpadded base64url of the canonical JSON: one argv token,
 * no `=`, no control characters, no shell, and byte-identical after decoding.
 */
import {Buffer} from 'node:buffer';
import {canonicalJson, isJsonValue} from '../schemaComposition/jsonCanonicalizer.js';
import {LaneTaskRuntimeError} from '../../contracts/taskRuntime.js';
import type {JsonValue} from '../schemaComposition/schemaCompositionContracts.js';

/** The argv flag carrying one invocation's typed request. */
export const TASK_REQUEST_FLAG = '--wt-task-request';

/**
 * Canonical-JSON byte bound for one request. Far below the platform argument
 * limit, so a caller cannot turn the typed request into an unbounded argv.
 */
const MAX_REQUEST_BYTES = 32 * 1024;

/** Encode one validated typed request as the single argv token the child reads. */
export function encodeTaskRequest(request: JsonValue, taskId: string): string {
    const canonical = canonicalJson(request);
    const bytes = Buffer.from(canonical, 'utf8');
    if (bytes.byteLength > MAX_REQUEST_BYTES) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_INPUT_INVALID', taskId,
            'The typed task request exceeds the bounded per-invocation request size.');
    }
    return `${TASK_REQUEST_FLAG}=${bytes.toString('base64url')}`;
}

/**
 * Decode the typed request inside a packaged TaskHandler. The handler reads the
 * token from the pinned `TaskHandler.argMap` and validates the decoded value
 * against its declared input schema; a token that is not exactly one JSON value
 * is refused rather than repaired.
 */
export function decodeTaskRequest(token: unknown): JsonValue | null {
    if (typeof token !== 'string' || token.length === 0 || !/^[A-Za-z0-9_-]+$/u.test(token)) return null;
    const decoded = Buffer.from(token, 'base64url').toString('utf8');
    let value: unknown;
    try {
        value = JSON.parse(decoded);
    } catch {
        return null;
    }
    return isJsonValue(value) ? value : null;
}

/** A caller request must be a bounded JSON value before anything validates it. */
export function requireJsonRequest(request: unknown, taskId: string): JsonValue {
    if (request === undefined || !isJsonValue(request)) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_REQUEST_INVALID', taskId,
            'A lane task invocation must carry a typed JSON request for its action.');
    }
    return request;
}
