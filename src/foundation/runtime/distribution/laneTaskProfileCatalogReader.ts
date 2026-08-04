/**
 * Read-time-independent proof that a requested lane task profile only
 * narrows an already-staged packaged catalog: it never trusts the catalog
 * document beyond `unknown`, and it never lets a profile declare a task the
 * catalog does not define or any field beyond its allowlist. Shares the
 * `LaneTaskRuntimeError` reason vocabulary with the pin reader/catalog reader
 * it feeds, since both describe the same install-time/run-time contract.
 */
import {dirname, join} from 'node:path';
import {isJsonValue, semanticDigest} from '../../schemaComposition/jsonCanonicalizer.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import type {JsonObject} from '../../schemaComposition/schemaCompositionContracts.js';
import {LaneTaskRuntimeError, type LaneTaskRuntimeReason} from '../../../contracts/taskRuntime.js';
import {requireContainedRuntimeFile} from '../../taskRuntime/taskRuntimePin.js';
import type {RuntimeFileSystem} from '../../taskRuntime/runtimeFileSystem.js';

const CATALOG_FILE = 'task-catalog.json';
const MAX_CATALOG_BYTES = 4 * 1024 * 1024;
const CATALOG_ID = /^[a-z0-9][a-z0-9-]{0,63}(?:\/[a-z0-9][a-z0-9-]{0,63})*\/v[0-9]{1,3}$/u;
const TASK_ID = /^wt:[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/u;
/**
 * Correction 01, finding 7: the previous pattern was not end-anchored and a
 * failed match silently compared as equal (`0`), so a malformed CLI or
 * minimum version could pass the compatibility fence. Both sides are now
 * required to fully match before any numeric comparison happens.
 */
const SEMVER = /^([0-9]+)\.([0-9]+)\.([0-9]+)(?:-[0-9A-Za-z.-]+)?$/u;

export interface InstallCatalogIdentity {
    readonly catalogId: string;
    readonly catalogSha256: `sha256:${string}`;
}

/**
 * Read, parse, and identity-check the catalog beside `configTarget`; prove
 * `profile` exists, adds no field beyond `taskIds`, and names no task the
 * catalog omits; and prove `cliVersion` meets the catalog's declared minimum.
 * One read, three proofs — never three independent parses of the same bytes.
 */
export function readNarrowedProfileCatalog(
    runtimeRoot: string,
    configTarget: string,
    files: RuntimeFileSystem,
    profile: string,
    cliVersion: string
): InstallCatalogIdentity {
    const document = readCatalogDocument(runtimeRoot, configTarget, files);
    verifyMinimumCliVersion(document, cliVersion);
    verifyProfileNarrowsCatalog(document, profile);
    return {catalogId: requireCatalogId(document), catalogSha256: semanticDigest(document)};
}

function verifyProfileNarrowsCatalog(document: JsonObject, profile: string): void {
    const profiles = fields(document.profiles);
    if (!Object.hasOwn(profiles, profile)) {
        throw refuse('TASK_RUNTIME_PROFILE_UNKNOWN', profile, 'The packaged task catalog declares no such lane task profile.');
    }
    const entry = fields(profiles[profile]);
    if (Object.keys(entry).length !== 1 || !Array.isArray(entry.taskIds)) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', profile, 'A lane task profile must declare exactly one field: taskIds.');
    }
    const tasks = fields(document.tasks);
    for (const taskId of entry.taskIds) {
        if (typeof taskId !== 'string' || !TASK_ID.test(taskId) || !Object.hasOwn(tasks, taskId)) {
            throw refuse('TASK_RUNTIME_CATALOG_INVALID', String(taskId), 'The lane task profile names a task the catalog does not define.');
        }
    }
}

function verifyMinimumCliVersion(document: JsonObject, cliVersion: string): void {
    const minimum = fields(document.minimumRuntime).cliVersion;
    if (typeof minimum !== 'string' || !SEMVER.test(minimum)) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', 'minimumRuntime.cliVersion',
            'The packaged catalog declares no valid minimum CLI semantic version.');
    }
    if (typeof cliVersion !== 'string' || !SEMVER.test(cliVersion)) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', String(cliVersion), 'The requesting CLI version is not a valid semantic version.');
    }
    if (compareVersions(cliVersion, minimum) < 0) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', cliVersion, 'The running CLI is older than the packaged catalog requires.');
    }
}

function readCatalogDocument(runtimeRoot: string, configTarget: string, files: RuntimeFileSystem): JsonObject {
    const lexicalPath = join(dirname(configTarget), CATALOG_FILE);
    const canonicalPath = requireContainedRuntimeFile(files, runtimeRoot, lexicalPath, CATALOG_FILE, 'TASK_RUNTIME_CATALOG_UNREADABLE');
    const text = files.readText(canonicalPath, MAX_CATALOG_BYTES);
    if (text === null) throw refuse('TASK_RUNTIME_CATALOG_UNREADABLE', CATALOG_FILE, 'The packaged task catalog is missing, unreadable, or oversized.');
    let value: unknown;
    try {
        if (hasDuplicateJsonObjectKey(text)) throw new Error('duplicate member');
        value = JSON.parse(text);
    } catch {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', CATALOG_FILE, 'The packaged task catalog is not a well-formed JSON document.');
    }
    if (!isJsonValue(value) || typeof value !== 'object' || value === null || Array.isArray(value) || value.schemaVersion !== 1) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', CATALOG_FILE, 'The packaged task catalog must be a schemaVersion 1 JSON object.');
    }
    return value;
}

function requireCatalogId(document: JsonObject): string {
    if (typeof document.catalogId !== 'string' || !CATALOG_ID.test(document.catalogId)) {
        throw refuse('TASK_RUNTIME_CATALOG_INVALID', 'catalogId', 'The packaged task catalog declares no valid catalogId.');
    }
    return document.catalogId;
}

/** Both arguments must already satisfy `SEMVER.test` before this is called. */
function compareVersions(left: string, right: string): number {
    const a = SEMVER.exec(left) as RegExpExecArray;
    const b = SEMVER.exec(right) as RegExpExecArray;
    for (let index = 1; index <= 3; index += 1) {
        const diff = Number(a[index]) - Number(b[index]);
        if (diff !== 0) return diff;
    }
    return 0;
}

function fields(value: unknown): JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value) ? value as JsonObject : {};
}

function refuse(reason: LaneTaskRuntimeReason, subject: string, message: string): LaneTaskRuntimeError {
    return new LaneTaskRuntimeError(reason, subject, message);
}
