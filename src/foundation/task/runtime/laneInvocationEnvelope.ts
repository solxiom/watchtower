/**
 * Validation of the single-use mutation invocation envelope
 * (`docs/spec/nirvana-integration-architecture.md` §7).
 *
 * A mutating action's authority is a *lane-contained artifact*, never a label a
 * caller types. The envelope path is what travels as argv, so before any process
 * starts this module proves the referenced artifact is inside the selected lane
 * overlay, owned by the effective account, mode-restricted, checksum-bound over
 * its own canonical bytes, unexpired, addressed to exactly this action, task,
 * input-schema version, and consuming handler, and not already consumed.
 *
 * RT-05 only *validates and forwards*. Creating, expiring, and removing an
 * envelope belongs to the sole effect executor (§7 steps 4 and 9), so nothing
 * here writes a byte: a failed check refuses before spawn and leaves the lane
 * exactly as it was.
 */
import {isAbsolute} from 'node:path';
import {isJsonObject, isJsonValue, semanticDigest} from '../../schemaComposition/jsonCanonicalizer.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import type {JsonObject} from '../../schemaComposition/schemaCompositionContracts.js';
import {
    LaneTaskRuntimeError,
    type LaneTaskBinding,
    type LaneTaskRuntimeReason,
    type PinnedTaskRuntimeTarget
} from '../../../contracts/taskRuntime.js';
import {hasExactMembers, isInstant, isNonEmptyString} from './nvbRecordValues.js';
import {containedInRoot} from './taskRuntimePin.js';
import type {RuntimeFileSystem} from './runtimeFileSystem.js';

/** Exactly the members `nirvana-integration-architecture.md` §7 enumerates. */
const ENVELOPE_MEMBERS = [
    'schemaVersion', 'actionId', 'laneId', 'catalogId', 'catalogSha256', 'taskId', 'inputSchema',
    'parameters', 'preconditionDigest', 'idempotencyKey', 'lockId', 'createdAt', 'expiresAt',
    'resultDestination', 'journalDestination', 'consumer', 'checksum'
];

const CONSUMER_MEMBERS = ['handlerId', 'singleUse'];
const ENVELOPE_SCHEMA_VERSION = 1;
/** Operator-owned, not group- or world-accessible. */
const ENVELOPE_MODE = 0o600;
const MAX_ENVELOPE_BYTES = 256 * 1024;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
/** The effect executor's consumption receipt; its presence proves single use is spent. */
const CONSUMED_SUFFIX = '.consumed';

export interface EnvelopeCheck {
    readonly reference: string;
    readonly laneDir: string;
    readonly laneId: string;
    readonly binding: LaneTaskBinding;
    readonly target: PinnedTaskRuntimeTarget;
    readonly files: RuntimeFileSystem;
    readonly now: Date;
}

/**
 * Refuse a mutating action without an envelope, refuse a non-mutating action
 * that smuggles one, and otherwise return the canonical envelope path that will
 * be passed as argv.
 */
export function requireInvocationEnvelope(reference: string | undefined, check: Omit<EnvelopeCheck, 'reference'>):
    string | undefined {
    const {binding} = check;
    if (reference === undefined) {
        if (binding.requiresInvocationEnvelope) {
            throw refuse('TASK_RUNTIME_ENVELOPE_REQUIRED', binding.taskId,
                'This task requires a single-use invocation envelope prepared by the effect executor.');
        }
        return undefined;
    }
    if (!binding.requiresInvocationEnvelope) {
        throw refuse('TASK_RUNTIME_ENVELOPE_INVALID', binding.taskId,
            'This task declares no invocation-envelope authority, so an envelope may not be supplied.');
    }
    return validateEnvelope({...check, reference});
}

function validateEnvelope(check: EnvelopeCheck): string {
    const canonicalPath = containedEnvelopePath(check);
    requireUnconsumed(check, canonicalPath);
    const document = readEnvelopeDocument(check, canonicalPath);
    requireChecksum(check, document);
    requireBinding(check, document);
    requireUnexpired(check, document);
    return canonicalPath;
}

/** The artifact is a real, lane-contained, operator-owned, mode-restricted file. */
function containedEnvelopePath(check: EnvelopeCheck): string {
    const {reference, binding, files, laneDir} = check;
    if (typeof reference !== 'string' || !isAbsolute(reference)) {
        throw refuse('TASK_RUNTIME_ENVELOPE_INVALID', binding.taskId,
            'An invocation envelope must be referenced by an absolute lane-contained path.');
    }
    const observation = files.observe(reference);
    if (observation.kind !== 'file') {
        throw refuse('TASK_RUNTIME_ENVELOPE_INVALID', binding.taskId,
            'The referenced invocation envelope is not a regular file.');
    }
    if (!containedInRoot(laneDir, observation.canonicalPath)) {
        throw refuse('TASK_RUNTIME_ENVELOPE_PATH_ESCAPE', binding.taskId,
            'The referenced invocation envelope resolves outside the selected lane overlay.');
    }
    requireOwnerAndMode(check, observation.mode, observation.owner?.uid ?? null);
    return observation.canonicalPath;
}

function requireOwnerAndMode(check: EnvelopeCheck, mode: number | null, uid: number | null): void {
    const {binding, files} = check;
    if (uid === null || uid !== files.account().uid) {
        throw refuse('TASK_RUNTIME_ENVELOPE_OWNER_INVALID', binding.taskId,
            'The invocation envelope is not owned by the effective account that would consume it.');
    }
    if (mode !== ENVELOPE_MODE) {
        throw refuse('TASK_RUNTIME_ENVELOPE_MODE_INVALID', binding.taskId,
            'The invocation envelope is not restricted to its owning account.');
    }
}

/** A spent envelope can never authorize a second effect. */
function requireUnconsumed(check: EnvelopeCheck, canonicalPath: string): void {
    if (check.files.observe(`${canonicalPath}${CONSUMED_SUFFIX}`).kind !== 'missing') {
        throw refuse('TASK_RUNTIME_ENVELOPE_CONSUMED', check.binding.taskId,
            'The referenced invocation envelope has already been consumed.');
    }
}

function readEnvelopeDocument(check: EnvelopeCheck, canonicalPath: string): JsonObject {
    const {binding, files} = check;
    const text = files.readText(canonicalPath, MAX_ENVELOPE_BYTES);
    if (text === null) {
        throw refuse('TASK_RUNTIME_ENVELOPE_UNREADABLE', binding.taskId,
            'The referenced invocation envelope is unreadable or oversized.');
    }
    let value: unknown;
    try {
        if (hasDuplicateJsonObjectKey(text)) throw new Error('duplicate member');
        value = JSON.parse(text);
    } catch {
        throw refuse('TASK_RUNTIME_ENVELOPE_INVALID', binding.taskId,
            'The referenced invocation envelope is not a well-formed JSON document.');
    }
    if (!isJsonObject(value) || !isJsonValue(value) || !hasEnvelopeShape(value)) {
        throw refuse('TASK_RUNTIME_ENVELOPE_INVALID', binding.taskId,
            'The referenced invocation envelope does not carry exactly the declared envelope members.');
    }
    return value;
}

function hasEnvelopeShape(document: JsonObject): boolean {
    const consumer = document.consumer;
    return hasExactMembers(document, ENVELOPE_MEMBERS)
        && document.schemaVersion === ENVELOPE_SCHEMA_VERSION
        && isNonEmptyString(document.actionId) && isNonEmptyString(document.laneId)
        && isNonEmptyString(document.catalogId) && isDigest(document.catalogSha256)
        && isNonEmptyString(document.taskId) && isNonEmptyString(document.inputSchema)
        && isJsonObject(document.parameters) && isDigest(document.preconditionDigest)
        && isNonEmptyString(document.idempotencyKey) && isNonEmptyString(document.lockId)
        && isInstant(document.createdAt) && isInstant(document.expiresAt)
        && isNonEmptyString(document.resultDestination) && isNonEmptyString(document.journalDestination)
        && isDigest(document.checksum)
        && isJsonObject(consumer) && hasExactMembers(consumer, CONSUMER_MEMBERS)
        && isNonEmptyString(consumer.handlerId) && consumer.singleUse === true;
}

/** The envelope is bound to its own bytes, so a field cannot be edited in place. */
function requireChecksum(check: EnvelopeCheck, document: JsonObject): void {
    const {checksum, ...body} = document;
    if (semanticDigest(body) !== checksum) {
        throw refuse('TASK_RUNTIME_ENVELOPE_CHECKSUM_MISMATCH', check.binding.taskId,
            'The invocation envelope contents do not match its own checksum.');
    }
}

/** The envelope authorizes exactly this lane, catalog, action, task, and handler. */
function requireBinding(check: EnvelopeCheck, document: JsonObject): void {
    const {binding, target, laneId} = check;
    const matches = document.laneId === laneId
        && document.catalogId === target.catalogId && document.catalogSha256 === target.catalogSha256
        && document.actionId === binding.actionId && document.taskId === binding.taskId
        && document.inputSchema === binding.inputSchema
        && (document.consumer as JsonObject).handlerId === binding.handlerId;
    if (!matches) {
        throw refuse('TASK_RUNTIME_ENVELOPE_TASK_MISMATCH', binding.taskId,
            'The invocation envelope does not name this lane, catalog, action, task, schema, and handler.');
    }
}

function requireUnexpired(check: EnvelopeCheck, document: JsonObject): void {
    const created = Date.parse(document.createdAt as string);
    const expires = Date.parse(document.expiresAt as string);
    const now = check.now.getTime();
    if (!(expires > created) || now >= expires || now < created) {
        throw refuse('TASK_RUNTIME_ENVELOPE_EXPIRED', check.binding.taskId,
            'The invocation envelope is expired, not yet valid, or carries an impossible validity window.');
    }
}

function isDigest(value: unknown): value is `sha256:${string}` {
    return typeof value === 'string' && DIGEST.test(value);
}

function refuse(reason: LaneTaskRuntimeReason, subject: string, message: string): LaneTaskRuntimeError {
    return new LaneTaskRuntimeError(reason, subject, message);
}
