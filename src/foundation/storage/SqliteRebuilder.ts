/**
 * Staged rebuild and atomic publication for derived SQLite stores, per
 * `docs/spec/v1-contracts.md §8A.3` and §8A.5.
 *
 * A rebuild never mutates the live store in place. It acquires the exclusive
 * writer/publication lock (§8A.4 single-writer invariant), builds a replacement
 * in a unique adjacent staging directory from the identical canonical sources
 * through the typed writer, verifies SQLite integrity and reproduces the
 * semantic root, closes the staged store to a clean single file, fsyncs it, and
 * only then removes the previous generation's stale sidecars and atomically
 * renames the staged file over the active path. Because the caller closes the
 * active store and holds the lock, no writer can overlap publication and no live
 * connection's sidecars are unlinked. Readers observe the complete old or the
 * complete new store.
 */
import {closeSync, fsyncSync, mkdtempSync, openSync, renameSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {createWatchtowerError} from '../../contracts/index.js';
import {createSqliteConfig, type SqliteConfigOverrides} from './SqliteConfig.js';
import {openDerivedStore} from './derivedSqliteStore.js';
import {resolveStoreFile} from './sqliteStorePaths.js';
import {computeSemanticRoot, logicalExportCounts} from './semanticRoot.js';
import {acquireWriteLock} from './sqliteWriteLock.js';
import type {DerivedStore, DerivedStoreLocation, DerivedStoreSchema, DerivedStoreWriter, RebuildResult} from './sqlitePorts.js';

const STALE_SIDECARS = ['-wal', '-shm'] as const;

export interface RebuildRequest {
    readonly location: DerivedStoreLocation;
    readonly schema: DerivedStoreSchema;
    readonly populate: (writer: DerivedStoreWriter) => Promise<void>;
    readonly overrides?: SqliteConfigOverrides;
    readonly lockTimeoutMs?: number;
}

function fsyncPath(path: string): void {
    const fd = openSync(path, 'r');
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

async function verify(store: DerivedStore, target: string): Promise<RebuildResult> {
    const integrity = await store.integrityCheck();
    if (!integrity.ok) {
        throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {
            operation: 'verify a staged rebuild',
            target,
            remediation: 'The staged store failed integrity_check; rebuild from canonical sources again.'
        });
    }
    const logical = await store.exportLogical();
    return {semanticRoot: computeSemanticRoot(logical), counts: logicalExportCounts(logical)};
}

async function buildStaged(stagingDir: string, request: RebuildRequest): Promise<RebuildResult> {
    const config = createSqliteConfig(request.overrides);
    const store = await openDerivedStore({root: stagingDir, name: request.location.name}, request.schema, config, {create: true});
    try {
        await request.populate(store);
        return await verify(store, request.location.name);
    } finally {
        await store.close();
    }
}

function publish(stagedFile: string, activeFile: string): void {
    fsyncPath(stagedFile);
    fsyncPath(dirname(stagedFile));
    for (const suffix of STALE_SIDECARS) {
        rmSync(`${activeFile}${suffix}`, {force: true});
    }
    renameSync(stagedFile, activeFile);
    fsyncPath(dirname(activeFile));
}

/**
 * Build a replacement store from canonical sources and atomically publish it
 * over the active path under the writer lock. Returns the reproduced semantic
 * root and per-table counts for the derived-store manifest. The caller must
 * have closed any active handle to the store before calling this.
 */
export async function rebuildStore(request: RebuildRequest): Promise<RebuildResult> {
    const activeFile = resolveStoreFile(request.location);
    const lock = await acquireWriteLock(`${activeFile}.lock`, {timeoutMs: request.lockTimeoutMs});
    const stagingDir = mkdtempSync(join(request.location.root, '.rebuild-'));
    try {
        const result = await buildStaged(stagingDir, request);
        publish(join(stagingDir, `${request.location.name}.sqlite`), activeFile);
        return result;
    } finally {
        rmSync(stagingDir, {recursive: true, force: true});
        await lock.release();
    }
}
