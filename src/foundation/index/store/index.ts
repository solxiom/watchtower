/**
 * Opens, verifies, and closes one already-published CA-01 pack-index
 * generation (`docs/spec/v1-contracts.md §8A`, `docs/spec/coordinator-automation.md
 * §9.4`). `IndexStore` is the sole owner of pack-index SQLite access: it opens
 * the immutable per-generation `pack` derived store read-only through DB-01's
 * `DerivedStorage`/`DerivedStore` ports, fails closed on schema mismatch,
 * tampering, or structural corruption, and exposes only typed, already-indexed
 * views built once per session — never a database handle or a per-query table
 * read. Row-shape translation lives in `indexStore/packIndexRowMappers.ts`;
 * the bounded in-memory indexes live in `indexStore/packIndexTables.ts`; both
 * are this batch's own sibling owners, not a generic helper.
 *
 * A session verifies structural integrity, recomputes the semantic root, and
 * builds every typed index from that one read at most once (`ensureQueryable`,
 * cached until invalidation) — the same full read `verifyIndexIntegrity`
 * already had to perform for the semantic-root proof. Every query after that
 * is a `Map`/`Set` lookup, never a fresh SQLite read.
 */
import {computeSemanticRoot, openDerivedStorage, type DerivedStore, type IntegrityReport} from '../../storage/index.js';
import {
    PACK_INDEX_DATABASE_SCHEMA_VERSION,
    PACK_INDEX_META_TABLE,
    PACK_INDEX_SCHEMA,
    readIndexManifest
} from '../../pack/index/index.js';
import {IndexQueryError} from '../../../contracts/index.js';
import type {ArtifactIndexEntry, BatchIndexEntry, RepositoryIndexEntry, RequirementIndexEntry} from '../../../contracts/index.js';
import {basename, expectedMetaRows, metaRowsMatch, type IndexIdentity} from './indexStoreIdentity.js';
import {buildPackIndexTables, type PackIndexTables} from './packIndexTables.js';

export type {IndexIdentity} from './indexStoreIdentity.js';

/**
 * A verified, open, read-only handle onto one immutable pack-index generation.
 * Every read method fails closed with a typed `IndexQueryError` once the
 * generation is unavailable, stale, or corrupt; none ever returns partial
 * rows alongside a failure.
 */
export class IndexStore {
    private queryable: Promise<PackIndexTables> | null = null;
    private invalidatedReason: string | null = null;

    private constructor(private readonly store: DerivedStore, readonly identity: IndexIdentity) {}

    /**
     * Opens the `pack` derived store at `indexPath` (one CA-01 `<index-id>/`
     * generation directory) read-only, validates the recorded database schema
     * version, runs a structural quick check, and proves the stored
     * `index_meta` rows agree with the generation's own `index-manifest.json`
     * sidecar before returning a handle. `INDEX_UNAVAILABLE` when no
     * generation is published at the path, `INDEX_SCHEMA_MISMATCH` when the
     * sidecar's database schema version is unsupported, `INDEX_CORRUPT` when
     * the database cannot be opened or its structural check fails, and
     * `INDEX_STALE` when the on-disk rows disagree with the sidecar.
     */
    static async openIndex(indexPath: string): Promise<IndexStore> {
        const manifest = readIndexManifest(indexPath);
        if (manifest === null) {
            throw new IndexQueryError('INDEX_UNAVAILABLE', indexPath, 'no readable index-manifest.json sidecar at the given index directory');
        }
        if (manifest.databaseSchemaVersion !== PACK_INDEX_DATABASE_SCHEMA_VERSION) {
            throw new IndexQueryError(
                'INDEX_SCHEMA_MISMATCH', indexPath,
                `index database schema ${manifest.databaseSchemaVersion} does not match the supported schema ${PACK_INDEX_DATABASE_SCHEMA_VERSION}`
            );
        }

        let store: DerivedStore;
        try {
            store = await openDerivedStorage(indexPath).open('pack', PACK_INDEX_SCHEMA, {readOnly: true});
        } catch (error) {
            throw new IndexQueryError('INDEX_CORRUPT', indexPath, `the pack-index database could not be opened: ${error instanceof Error ? error.message : String(error)}`);
        }

        try {
            const quickCheck = await store.integrityCheck();
            if (!quickCheck.ok) {
                throw new IndexQueryError('INDEX_CORRUPT', indexPath, `pack-index structural integrity check failed: ${quickCheck.details.join('; ')}`);
            }
            const storedMeta = await store.list(PACK_INDEX_META_TABLE);
            if (!metaRowsMatch(storedMeta, expectedMetaRows(manifest))) {
                throw new IndexQueryError('INDEX_STALE', indexPath, 'stored index_meta rows do not match the index-manifest.json sidecar identity');
            }
        } catch (error) {
            await store.close().catch(() => undefined);
            throw error;
        }

        return new IndexStore(store, {
            indexId: basename(indexPath), laneId: manifest.laneId, packId: manifest.packId, packSealId: manifest.packSealId,
            manifestDigest: manifest.source.manifestDigest, databaseSchemaVersion: manifest.databaseSchemaVersion,
            compilerVersion: manifest.compilerVersion, semanticRoot: manifest.semanticRoot, builtAt: manifest.builtAt
        });
    }

    /** The semantic root of the currently open, still-valid generation; `null` once invalidated. */
    currentIndexDigest(): string | null {
        return this.invalidatedReason === null ? this.identity.semanticRoot : null;
    }

    /**
     * Runs the full structural + foreign-key check, recomputes the semantic
     * root over every row, and builds the bounded in-memory index tables from
     * that exact same read — the one read this session ever performs. A
     * drift or structural failure invalidates the store for the rest of the
     * session and builds no tables.
     */
    async verifyAndBuildTables(): Promise<{readonly report: IntegrityReport; readonly tables: PackIndexTables | null}> {
        const structural = await this.store.integrityCheck();
        if (!structural.ok) {
            this.invalidateIndex(`structural integrity check failed: ${structural.details.join('; ')}`);
            return {report: structural, tables: null};
        }
        const logical = await this.store.exportLogical();
        const semanticRoot = computeSemanticRoot(logical);
        if (semanticRoot !== this.identity.semanticRoot) {
            const detail = `recomputed semantic root ${semanticRoot} does not match the recorded root ${this.identity.semanticRoot}`;
            this.invalidateIndex(detail);
            return {report: {ok: false, details: [detail]}, tables: null};
        }
        return {report: {ok: true, details: []}, tables: buildPackIndexTables(logical)};
    }

    /** Marks the open generation invalid for the rest of the session; every subsequent query fails closed. */
    invalidateIndex(reason: string): void {
        this.invalidatedReason = reason;
        this.queryable = null;
    }

    async close(): Promise<void> {
        await this.store.close();
    }

    /** Builds the typed index tables at most once per session (cached), then fails closed forever after invalidation. */
    private tables(): Promise<PackIndexTables> {
        if (this.invalidatedReason !== null) {
            return Promise.reject(new IndexQueryError('INDEX_UNAVAILABLE', this.identity.indexId, this.invalidatedReason));
        }
        if (this.queryable === null) {
            this.queryable = this.verifyAndBuildTables().then(({report, tables}) => {
                if (!report.ok || tables === null) {
                    throw new IndexQueryError(
                        report.details.some((detail) => detail.includes('semantic root')) ? 'INDEX_STALE' : 'INDEX_CORRUPT',
                        this.identity.indexId, report.details.join('; ')
                    );
                }
                return tables;
            });
        }
        return this.queryable;
    }

    async getRepository(id: string): Promise<RepositoryIndexEntry | undefined> {
        return (await this.tables()).repositoriesById.get(id);
    }

    async listRepositories(): Promise<readonly RepositoryIndexEntry[]> {
        return [...(await this.tables()).repositoriesById.values()];
    }

    async getBatch(id: string): Promise<BatchIndexEntry | undefined> {
        return (await this.tables()).batchesById.get(id);
    }

    async getRequirement(id: string): Promise<RequirementIndexEntry | undefined> {
        return (await this.tables()).requirementsById.get(id);
    }

    async getArtifact(ref: string): Promise<ArtifactIndexEntry | undefined> {
        return (await this.tables()).artifactsByRef.get(ref);
    }

    /** The single typed index view `IndexQuery` composes every bounded list/graph query from. */
    async indexTables(): Promise<PackIndexTables> {
        return this.tables();
    }
}
