/**
 * The single owner of `watch`'s preflight fences: lane resolution, the lane's
 * pinned-runtime install identity, the RT-04-accepted immutable runtime root,
 * and the LC-09-activated pack index. `docs/spec/coordinator-automation.md`
 * §9.3 — "the watcher verifies a new index before pinning it for cycles" — is
 * exactly this class's index step; it reads only the public `current.json`
 * pointer shape §9.2 documents and delegates all structural/staleness/schema
 * verification to the already-accepted `IndexStore.openIndex`
 * (`CA-02`). It never recomputes pack-index compilation or query logic and
 * never mutates lane state — every failure here happens before `WatchAttachment`
 * ever writes a line.
 */
import {join} from 'node:path';
import {createWatchtowerError, IndexQueryError, RuntimeCatalogError, type PackIndexPointer, type WatchtowerError} from '../../../contracts/index.js';
import {RelevantLaneDiscovery, selectLane, type DiscoveredLane} from '../../discovery/index.js';
import {IndexStore, type IndexIdentity} from '../../index/index.js';
import {PACK_INDEX_COMPILER_VERSION, PACK_INDEX_DATABASE_SCHEMA_VERSION, isUuid} from '../../pack/index.js';
import {buildLaneFilePath} from '../../paths/index.js';
import {ContainedLaneReadFileStore, LaneInstallIdentityReader, type LaneReadFileStore} from '../../read/index.js';
import {RuntimeCatalog} from '../../runtime/index.js';

const CURRENT_POINTER_RELATIVE_PATH = join('coordinator', 'index', 'pack', 'current.json');
const MAX_POINTER_BYTES = 4096;

export interface WatchPreflightQuery {
    readonly cwd: string;
    readonly workspace?: string;
    readonly lane?: string;
    readonly initiative?: string;
    readonly environment?: NodeJS.ProcessEnv;
}

export interface WatchPreflightResult {
    readonly lane: DiscoveredLane;
    readonly runtimeVersion: string;
    readonly runtimeRoot: string;
    readonly indexId: string;
}

export interface WatchPreflightOptions {
    readonly discovery?: RelevantLaneDiscovery;
    readonly identity?: LaneInstallIdentityReader;
    readonly runtimeCatalog?: RuntimeCatalog;
    readonly files?: LaneReadFileStore;
}

export class WatchPreflight {
    private readonly discovery: RelevantLaneDiscovery;
    private readonly identity: LaneInstallIdentityReader;
    private readonly runtimeCatalog: RuntimeCatalog;
    private readonly files: LaneReadFileStore;

    constructor(options: WatchPreflightOptions = {}) {
        this.discovery = options.discovery ?? new RelevantLaneDiscovery();
        this.identity = options.identity ?? new LaneInstallIdentityReader();
        this.runtimeCatalog = options.runtimeCatalog ?? new RuntimeCatalog();
        this.files = options.files ?? new ContainedLaneReadFileStore();
    }

    async run(query: WatchPreflightQuery): Promise<WatchPreflightResult> {
        const relevant = this.discovery.discover(query);
        const lane = selectLane(relevant.lanes, query);
        const identity = this.identity.read(lane.laneDir);
        const runtimeRoot = this.resolveRuntimeRoot(identity.runtimeVersion);
        const indexId = await this.verifyActivatedIndex(lane);
        return {lane, runtimeVersion: identity.runtimeVersion, runtimeRoot, indexId};
    }

    private resolveRuntimeRoot(runtimeVersion: string): string {
        try {
            return this.runtimeCatalog.getRuntimeRoot(runtimeVersion);
        } catch (error) {
            throw mapRuntimeCatalogError(error, runtimeVersion);
        }
    }

    private async verifyActivatedIndex(lane: DiscoveredLane): Promise<string> {
        const pointer = this.readPointer(lane.laneDir);
        if (pointer.databaseSchemaVersion !== PACK_INDEX_DATABASE_SCHEMA_VERSION
            || pointer.compilerVersion !== PACK_INDEX_COMPILER_VERSION) {
            throw unsupportedPointerVersion(lane.laneId);
        }
        const indexDir = buildLaneFilePath(lane.laneDir, join('coordinator', 'index', 'pack', pointer.indexId));
        let store: IndexStore;
        try {
            store = await IndexStore.openIndex(indexDir);
        } catch (error) {
            throw mapIndexQueryError(error, lane.laneId);
        }
        try {
            if (!pointerMatchesGeneration(pointer, store.identity, lane.laneId)) {
                throw integrityFailure(lane.laneId, 'the current.json pointer does not match the opened generation identity');
            }
            const verification = await store.verifyAndBuildTables();
            if (!verification.report.ok) throw integrityFailure(lane.laneId, verification.report.details.join('; '));
        } finally {
            await store.close();
        }
        return pointer.indexId;
    }

    /** Reads the complete typed `current.json` pointer contract — every field, never a reduced shape. */
    private readPointer(laneDir: string): PackIndexPointer {
        const text = this.files.readOptional(laneDir, CURRENT_POINTER_RELATIVE_PATH, MAX_POINTER_BYTES);
        if (text === undefined) throw missingIndexDependency(laneDir);
        let value: unknown;
        try {
            value = JSON.parse(text);
        } catch {
            throw missingIndexDependency(laneDir);
        }
        const pointer = parsePointer(value);
        if (pointer === undefined) throw missingIndexDependency(laneDir);
        return pointer;
    }
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

/**
 * Validates every field of the accepted `current.json` pointer contract
 * (`docs/spec/coordinator-automation.md:446-449`, mirrored by the pack-index
 * owner's own `readPointer` in `packIndexPublisher.ts:79-85`, not re-exported
 * for read-only consumers). A pointer missing, mistyping, or narrowing any of
 * the five fields is treated as no activated index at all — never partially
 * trusted.
 */
function parsePointer(value: unknown): PackIndexPointer | undefined {
    if (!isRecord(value)) return undefined;
    const {indexId, packSealId, databaseSchemaVersion, compilerVersion, manifestDigest} = value;
    if (typeof indexId !== 'string' || !isUuid(indexId)) return undefined;
    if (typeof packSealId !== 'string' || packSealId.length === 0) return undefined;
    if (typeof databaseSchemaVersion !== 'number' || !Number.isInteger(databaseSchemaVersion)) return undefined;
    if (typeof compilerVersion !== 'string' || compilerVersion.length === 0) return undefined;
    if (typeof manifestDigest !== 'string' || manifestDigest.length === 0) return undefined;
    return {indexId, packSealId, databaseSchemaVersion, compilerVersion, manifestDigest};
}

/**
 * Cross-checks the pointer's declared schema/compiler/active-pack identity
 * against the opened generation (`pointer.indexId` already selected which
 * generation was opened, so this checks every remaining field: lane, pack
 * seal, schema, compiler, and manifest digest).
 */
function pointerMatchesGeneration(pointer: PackIndexPointer, identity: IndexIdentity, laneId: string): boolean {
    return identity.laneId === laneId
        && identity.packSealId === pointer.packSealId
        && identity.databaseSchemaVersion === pointer.databaseSchemaVersion
        && identity.compilerVersion === pointer.compilerVersion
        && identity.manifestDigest === pointer.manifestDigest;
}

function unsupportedPointerVersion(laneId: string): WatchtowerError {
    return createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
        operation: 'verify activated pack index', target: laneId,
        remediation: 'Upgrade Watchtower or re-run pack-index activation to produce a supported schema/compiler generation.'
    });
}

function missingIndexDependency(laneDir: string): WatchtowerError {
    return createWatchtowerError('ERR_MISSING_DEPENDENCY', {
        operation: 'resolve activated pack index', target: laneDir,
        remediation: 'Run lane initialization through LC-09 pack-index activation before watching.'
    });
}

function integrityFailure(laneId: string, detail: string): WatchtowerError {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {
        operation: 'verify activated pack index', target: `${laneId}: ${detail}`.slice(0, 200),
        remediation: 'Re-run pack acceptance and index activation for this lane.'
    });
}

function mapIndexQueryError(error: unknown, target: string): WatchtowerError {
    if (!(error instanceof IndexQueryError)) {
        return createWatchtowerError('ERR_INTERNAL', {
            operation: 'open activated pack index', target,
            remediation: 'Retry; report this failure if it persists.'
        });
    }
    const code = error.reason === 'INDEX_UNAVAILABLE' ? 'ERR_INDEX_UNAVAILABLE'
        : error.reason === 'INDEX_SCHEMA_MISMATCH' ? 'ERR_UNSUPPORTED_VERSION'
            : 'ERR_INTEGRITY_FAILURE';
    return createWatchtowerError(code, {
        operation: 'open activated pack index', target,
        remediation: 'Re-run pack acceptance and index activation for this lane.'
    });
}

function mapRuntimeCatalogError(error: unknown, target: string): WatchtowerError {
    if (!(error instanceof RuntimeCatalogError)) {
        return createWatchtowerError('ERR_INTERNAL', {
            operation: 'resolve pinned runtime root', target,
            remediation: 'Retry; report this failure if it persists.'
        });
    }
    const code = error.reason === 'VERSION_NOT_INSTALLED' ? 'ERR_MISSING_DEPENDENCY'
        : error.reason === 'INVALID_VERSION_STRING' ? 'ERR_INVALID_LANE_CONFIG'
            : 'ERR_INTEGRITY_FAILURE';
    return createWatchtowerError(code, {
        operation: 'resolve pinned runtime root', target,
        remediation: 'Install the lane-pinned Watchtower runtime version before watching.'
    });
}
