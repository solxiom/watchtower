import {join} from 'node:path';
import {IndexQueryError, type PackIndexPointer} from '../../../contracts/index.js';
import {IndexStore, type IndexIdentity} from '../../index/index.js';
import {buildLaneFilePath} from '../../paths/index.js';
import {ContainedLaneReadFileStore, type LaneReadFileStore} from '../../read/index.js';
import {PACK_INDEX_COMPILER_VERSION, PACK_INDEX_DATABASE_SCHEMA_VERSION, isUuid} from '../../pack/index.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip} from '../DoctorCheckResult.js';

const ID = 'pack-index' as const;
const POINTER_RELATIVE_PATH = join('coordinator', 'index', 'pack', 'current.json');
const MAX_POINTER_BYTES = 4096;

export interface PackIndexCheckOptions {
    readonly files?: LaneReadFileStore;
    readonly openIndex?: (indexPath: string) => Promise<IndexStore>;
}

/**
 * Verifies the LC-09-activated pack index generation this lane currently
 * points to still opens, still passes structural + foreign-key integrity,
 * and its recomputed semantic root still matches the recorded one — reusing
 * the accepted `IndexStore.openIndex`/`verifyAndBuildTables` owner verbatim
 * (CA-02) rather than re-deriving SQLite integrity or semantic-root logic
 * here. Never rebuilds, repairs, or writes the index; every generation is
 * closed in a `finally` even on failure. No pointer file at all is `skip`
 * (index activation is a separate, optional lane step, so an untouched lane
 * is not a failure); a pointer file that exists but is malformed JSON or an
 * invalid/incomplete pointer shape is `fail` — that is existing state that
 * is actually corrupt, not merely absent, and must not be silently folded
 * into "never activated". A stale/corrupt/schema-mismatched generation is
 * likewise `fail`.
 */
export function createPackIndexCheck(options: PackIndexCheckOptions = {}): DoctorCheckProvider {
    const files = options.files ?? new ContainedLaneReadFileStore();
    const openIndex = options.openIndex ?? ((indexPath: string) => IndexStore.openIndex(indexPath));
    return {
        id: ID,
        async run(context: DoctorLaneContext) {
            const laneDir = context.lane.laneDir;
            const text = files.readOptional(laneDir, POINTER_RELATIVE_PATH, MAX_POINTER_BYTES);
            if (text === undefined) {
                return skip(ID, 'No activated pack index pointer (coordinator/index/pack/current.json) was found for this lane.');
            }
            const pointer = parsePointerText(text);
            if (pointer === undefined) {
                return fail(ID, 'The pack index pointer (coordinator/index/pack/current.json) exists but is ' +
                    'malformed JSON or does not match the required pointer shape.');
            }
            if (pointer.databaseSchemaVersion !== PACK_INDEX_DATABASE_SCHEMA_VERSION
                || pointer.compilerVersion !== PACK_INDEX_COMPILER_VERSION) {
                return fail(ID, `The activated pack index generation ${pointer.indexId} uses an unsupported ` +
                    `schema/compiler version (${pointer.databaseSchemaVersion}/${pointer.compilerVersion}).`);
            }
            const indexDir = buildLaneFilePath(laneDir, join('coordinator', 'index', 'pack', pointer.indexId));
            let store: IndexStore;
            try {
                store = await openIndex(indexDir);
            } catch (error) {
                return fail(ID, indexQueryErrorMessage(error, pointer.indexId));
            }
            try {
                if (!pointerMatchesGeneration(pointer, store.identity, context.lane.laneId)) {
                    return fail(ID, `The current.json pointer for generation ${pointer.indexId} does not match ` +
                        'the opened generation identity.');
                }
                const verification = await store.verifyAndBuildTables();
                if (!verification.report.ok) {
                    return fail(ID, `Pack index generation ${pointer.indexId} failed integrity verification: ${
                        verification.report.details.join('; ')}.`);
                }
                return pass(ID, `Pack index generation ${pointer.indexId} is present and verifies clean.`);
            } finally {
                await store.close();
            }
        }
    };
}

export const packIndexCheck: DoctorCheckProvider = createPackIndexCheck();

/** The pointer's exact, closed key set — an extra/unsupported key is a rejection, not an ignorable extra. */
const POINTER_KEYS = ['indexId', 'packSealId', 'databaseSchemaVersion', 'compilerVersion', 'manifestDigest'] as const;

function parsePointerText(text: string): PackIndexPointer | undefined {
    let value: unknown;
    try {
        if (hasDuplicateJsonObjectKey(text)) return undefined;
        value = JSON.parse(text);
    } catch {
        return undefined;
    }
    return parsePointer(value);
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function parsePointer(value: unknown): PackIndexPointer | undefined {
    if (!isRecord(value)) return undefined;
    const keys = Object.keys(value);
    if (keys.length !== POINTER_KEYS.length || !POINTER_KEYS.every(key => keys.includes(key))) return undefined;
    const {indexId, packSealId, databaseSchemaVersion, compilerVersion, manifestDigest} = value;
    if (typeof indexId !== 'string' || !isUuid(indexId)) return undefined;
    if (typeof packSealId !== 'string' || packSealId.length === 0) return undefined;
    if (typeof databaseSchemaVersion !== 'number' || !Number.isInteger(databaseSchemaVersion)) return undefined;
    if (typeof compilerVersion !== 'string' || compilerVersion.length === 0) return undefined;
    if (typeof manifestDigest !== 'string' || manifestDigest.length === 0) return undefined;
    return {indexId, packSealId, databaseSchemaVersion, compilerVersion, manifestDigest};
}

function pointerMatchesGeneration(pointer: PackIndexPointer, identity: IndexIdentity, laneId: string): boolean {
    return identity.laneId === laneId
        && identity.packSealId === pointer.packSealId
        && identity.databaseSchemaVersion === pointer.databaseSchemaVersion
        && identity.compilerVersion === pointer.compilerVersion
        && identity.manifestDigest === pointer.manifestDigest;
}

function indexQueryErrorMessage(error: unknown, indexId: string): string {
    if (error instanceof IndexQueryError) {
        return `Pack index generation ${indexId} could not be opened (${error.reason}): ${error.message}.`;
    }
    return `Pack index generation ${indexId} could not be opened: an unexpected error occurred.`;
}
