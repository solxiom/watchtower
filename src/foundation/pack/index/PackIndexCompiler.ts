/**
 * Compiles a sealed, LC-02-accepted implementation pack into the immutable
 * pack-index SQLite generation described by `docs/spec/v1-contracts.md §8A.3`
 * and `docs/spec/coordinator-automation.md §9`: identical logical rows and
 * semantic root for identical pack bytes, path/digest/foreign-key checks on
 * every owned boundary, and staged immutable publication behind an atomic
 * `current.json` switch. Depends only on DB-01's derived-storage substrate,
 * LC-02's sealed-pack view, and LC-03's lane layout convention; it owns no
 * query surface (`CA-02`), no runtime/session index (`CA-03`/`CA-16`), and no
 * command/effect wrapper (`CA-30`).
 */
import {randomUUID} from 'node:crypto';
import {mkdirSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {WatchtowerError} from '../../../contracts/index.js';
import {packIndexRejection, type PackIndexCompileResult, type PackIndexManifest} from '../../../contracts/packIndex.js';
import type {ConsumedPack} from '../../../contracts/pack.js';
import type {PackFileSystem, PackSchemaValidators} from '../index.js';
import {computeSemanticRoot, logicalExportCounts, openDerivedStorage} from '../../storage/index.js';
import type {DerivedStorage, DerivedStoreWriter, TypedRow} from '../../storage/index.js';
import {acquirePointerLock} from './packIndexPointerLock.js';
import {readPackIndexSource, type PackIndexSource} from './packIndexManifestFile.js';
import {buildPackIndexRows, type PackIndexRows} from './packIndexRowBuilder.js';
import {readIndexManifest, readPointer, writeIndexManifest, writePointer} from './packIndexPublisher.js';
import {PACK_INDEX_DATABASE_SCHEMA_VERSION, PACK_INDEX_META_TABLE, PACK_INDEX_SCHEMA} from './packIndexSchema.js';

export const PACK_INDEX_COMPILER_VERSION = '1.0.0';

export interface PackIndexCompileRequest {
    /** LC-02's accepted, sealed pack view; not re-validated, only re-proven fresh. */
    readonly pack: ConsumedPack;
    /** Canonically authorized absolute path to the pack root the caller already resolved. */
    readonly packRoot: string;
    /** The pack's repository-relative path, recorded as `index-manifest.json`'s `source.path`. */
    readonly packPath: string;
    readonly laneId: string;
    /** Canonically authorized absolute path to `coordinator/index/pack/`. */
    readonly indexRoot: string;
}

export interface PackIndexCompileDeps {
    readonly fs: PackFileSystem;
    readonly validators: PackSchemaValidators;
    readonly storage?: (root: string) => DerivedStorage;
    readonly now?: () => string;
    readonly indexId?: () => string;
}

function isWatchtowerError(value: unknown): value is WatchtowerError {
    return value instanceof WatchtowerError;
}

/** The single owner of pack-index compilation and staged immutable publication. */
export class PackIndexCompiler {
    private readonly storage: (root: string) => DerivedStorage;
    private readonly now: () => string;
    private readonly nextIndexId: () => string;

    constructor(private readonly deps: PackIndexCompileDeps) {
        this.storage = deps.storage ?? openDerivedStorage;
        this.now = deps.now ?? (() => new Date().toISOString());
        this.nextIndexId = deps.indexId ?? randomUUID;
    }

    async compile(request: PackIndexCompileRequest): Promise<PackIndexCompileResult> {
        const source = readPackIndexSource(request.packRoot, request.pack, this.deps.fs, this.deps.validators);
        if ('reason' in source) return source;
        const rows = buildPackIndexRows(source.document, request.pack);
        if ('reason' in rows) return rows;

        mkdirSync(request.indexRoot, {recursive: true});
        const fastPathReuse = await this.tryReuse(request, source);
        if (fastPathReuse !== null) return fastPathReuse;

        const lock = await acquirePointerLock(request.indexRoot);
        if ('reason' in lock) return lock;
        try {
            const reuseUnderLock = await this.tryReuse(request, source);
            if (reuseUnderLock !== null) return reuseUnderLock;
            return await this.publish(request, rows, source);
        } finally {
            lock.release();
        }
    }

    /**
     * Reuses the current generation only when every identity fact this batch
     * owns agrees: the pointer, the per-generation sidecar's full identity
     * against the current request/source (not just `packSealId`/digest),
     * structural SQLite integrity, the `index_meta` rows actually stored in the
     * database against the expected identity, and a freshly recomputed
     * semantic root/counts against the sidecar's claimed values. A validly
     * parseable but tampered sidecar, or a structurally intact database with
     * changed rows, fails every one of those checks and is never reused — a
     * fresh generation is published and the pointer moves forward instead.
     */
    private async tryReuse(request: PackIndexCompileRequest, source: PackIndexSource) {
        const {indexRoot, pack} = request;
        const pointer = readPointer(indexRoot);
        if (pointer === null) return null;
        if (pointer.packSealId !== pack.sealId || pointer.manifestDigest !== source.manifestDigest) return null;
        if (pointer.databaseSchemaVersion !== PACK_INDEX_DATABASE_SCHEMA_VERSION || pointer.compilerVersion !== PACK_INDEX_COMPILER_VERSION) return null;
        const indexDir = join(indexRoot, pointer.indexId);
        const manifest = readIndexManifest(indexDir);
        if (manifest === null || !sidecarMatchesRequest(manifest, request, source)) return null;
        if (!(await this.generationContentMatches(indexDir, request, source, manifest))) return null;
        return {ok: true as const, indexId: pointer.indexId, indexDir, manifest, reused: true};
    }

    /**
     * Opens the generation read-only and proves its actual stored bytes — not
     * merely its sidecar's claims — still match this request: structural
     * integrity, every `index_meta` row equal to the expected identity set, and
     * a freshly recomputed logical export whose semantic root and counts equal
     * the sidecar's recorded `semanticRoot`/`counts`.
     */
    private async generationContentMatches(
        indexDir: string, request: PackIndexCompileRequest, source: PackIndexSource, manifest: PackIndexManifest
    ): Promise<boolean> {
        try {
            const store = await this.storage(indexDir).open('pack', PACK_INDEX_SCHEMA, {readOnly: true});
            try {
                if (!(await store.integrityCheck()).ok) return false;
                const storedMeta = await store.list(PACK_INDEX_META_TABLE);
                if (!metaRowsMatch(storedMeta, metaRows(request, source))) return false;
                const logical = await store.exportLogical();
                const semanticRoot = computeSemanticRoot(logical);
                const counts = logicalExportCounts(logical);
                return semanticRoot === manifest.semanticRoot && countsEqual(counts, manifest.counts);
            } finally {
                await store.close();
            }
        } catch {
            return false;
        }
    }

    private async publish(
        request: PackIndexCompileRequest, rows: PackIndexRows, source: PackIndexSource
    ): Promise<PackIndexCompileResult> {
        const indexId = this.nextIndexId();
        const indexDir = join(request.indexRoot, indexId);
        mkdirSync(indexDir, {recursive: true});
        try {
            const {semanticRoot, counts} = await this.storage(indexDir).rebuild(
                'pack', PACK_INDEX_SCHEMA, (writer) => populate(writer, request, rows, source)
            );
            const manifest: PackIndexManifest = {
                schemaVersion: 1, backend: 'sqlite', storeKind: 'pack',
                databaseSchemaVersion: PACK_INDEX_DATABASE_SCHEMA_VERSION, compilerVersion: PACK_INDEX_COMPILER_VERSION,
                laneId: request.laneId, packId: request.pack.packId, packSealId: request.pack.sealId,
                source: {
                    identity: request.pack.packId, checkpoint: request.pack.sealId, repository: request.pack.packRepository,
                    path: request.packPath, manifestDigest: source.manifestDigest, lockDigest: source.lockDigest
                },
                counts, semanticRoot, builtAt: this.now()
            };
            writeIndexManifest(indexDir, manifest);
            writePointer(request.indexRoot, {
                indexId, packSealId: request.pack.sealId, databaseSchemaVersion: PACK_INDEX_DATABASE_SCHEMA_VERSION,
                compilerVersion: PACK_INDEX_COMPILER_VERSION, manifestDigest: source.manifestDigest
            });
            return {ok: true, indexId, indexDir, manifest, reused: false};
        } catch (error) {
            rmSync(indexDir, {recursive: true, force: true});
            const reason = isWatchtowerError(error) && error.code === 'ERR_INTEGRITY_FAILURE' ? 'PACK_INDEX_INTEGRITY_FAILURE' : 'PACK_INDEX_PUBLISH_FAILED';
            return packIndexRejection(reason, indexId, error instanceof Error ? error.message : 'staged rebuild failed');
        }
    }
}

/** Every identity fact the sidecar itself asserts must agree with the current request/source before reuse is even considered. */
function sidecarMatchesRequest(manifest: PackIndexManifest, request: PackIndexCompileRequest, source: PackIndexSource): boolean {
    return manifest.databaseSchemaVersion === PACK_INDEX_DATABASE_SCHEMA_VERSION
        && manifest.compilerVersion === PACK_INDEX_COMPILER_VERSION
        && manifest.laneId === request.laneId
        && manifest.packId === request.pack.packId
        && manifest.packSealId === request.pack.sealId
        && manifest.source.identity === request.pack.packId
        && manifest.source.checkpoint === request.pack.sealId
        && manifest.source.repository === request.pack.packRepository
        && manifest.source.path === request.packPath
        && manifest.source.manifestDigest === source.manifestDigest
        && manifest.source.lockDigest === source.lockDigest;
}

function metaRowsMatch(stored: readonly TypedRow[], expected: ReadonlyArray<readonly [string, string]>): boolean {
    if (stored.length !== expected.length) return false;
    const storedByKey = new Map(stored.map((row) => [row.key, row.value]));
    return expected.every(([key, value]) => storedByKey.get(key) === value);
}

function countsEqual(actual: Readonly<Record<string, number>>, expected: Readonly<Record<string, number>>): boolean {
    const actualKeys = Object.keys(actual);
    const expectedKeys = Object.keys(expected);
    return actualKeys.length === expectedKeys.length && actualKeys.every((key) => actual[key] === expected[key]);
}

function metaRows(request: PackIndexCompileRequest, source: PackIndexSource): ReadonlyArray<readonly [string, string]> {
    return [
        ['schemaVersion', '1'], ['backend', 'sqlite'], ['storeKind', 'pack'],
        ['databaseSchemaVersion', String(PACK_INDEX_DATABASE_SCHEMA_VERSION)], ['compilerVersion', PACK_INDEX_COMPILER_VERSION],
        ['laneId', request.laneId], ['packId', request.pack.packId], ['packSealId', request.pack.sealId],
        ['packRepository', request.pack.packRepository], ['packPath', request.packPath],
        ['manifestDigest', source.manifestDigest], ['lockDigest', source.lockDigest]
    ];
}

/** Insertion order respects every declared foreign key: parents before children. */
async function populate(writer: DerivedStoreWriter, request: PackIndexCompileRequest, rows: PackIndexRows, source: PackIndexSource): Promise<void> {
    await writer.insertMany(PACK_INDEX_META_TABLE, metaRows(request, source).map(([key, value]) => ({key, value})));
    await writer.insertMany('repository', rows.repository);
    await writer.insertMany('batch', rows.batch);
    await writer.insertMany('dependency', rows.dependency);
    await writer.insertMany('requirement', rows.requirement);
    await writer.insertMany('batch_requirement', rows.batch_requirement);
    await writer.insertMany('batch_repository', rows.batch_repository);
    await writer.insertMany('proof', rows.proof);
    await writer.insertMany('artifact', rows.artifact);
}
