import {dirname, join} from 'node:path';

import type {CatalogAggregateFileSystem} from './catalogAggregateFileSystem.js';
import {nodeCatalogAggregateFileSystem} from './catalogAggregateFileSystem.js';
import {cleanupCommittedAggregates} from './catalogAggregateCommitCleanup.js';
import type {CatalogAggregateLock} from './catalogAggregateLock.js';
import {
    acquireCatalogAggregateLock,
    releaseCatalogAggregateLock,
    retainCatalogAggregateLockEvidence
} from './catalogAggregateLock.js';
import {
    aggregateErrorCode,
    attemptAggregateOperation,
    syncAggregateDirectory
} from './catalogAggregateDurabilityOperations.js';
import {TaskCatalogFileBoundaryError} from './TaskCatalogFileBoundaryError.js';

const TOKEN = /^[A-Za-z0-9-]{1,128}$/;

export interface CatalogAggregateSpec {
    readonly path: string;
    readonly label: string;
    readonly bytes: Uint8Array;
}

interface PreparedAggregate extends CatalogAggregateSpec {
    readonly tempPath: string;
    readonly backupPath: string;
    readonly existed: boolean;
    readonly mode: number;
}

interface TransactionState {
    readonly directory: string;
    readonly prepared: PreparedAggregate[];
    readonly backedUp: Set<string>;
    readonly installed: Set<string>;
    committed: boolean;
}

async function fileState(path: string, fileSystem: CatalogAggregateFileSystem):
    Promise<{readonly existed: boolean; readonly mode: number}> {
    try {
        const info = await fileSystem.lstat(path);
        if (!info.isFile() || info.isSymbolicLink()) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_AGGREGATE_PATH_INVALID', path);
        }
        return {existed: true, mode: info.mode & 0o777};
    } catch (error: unknown) {
        if (error instanceof TaskCatalogFileBoundaryError) throw error;
        if (aggregateErrorCode(error) === 'ENOENT') return {existed: false, mode: 0o644};
        throw error;
    }
}

async function assertAbsent(path: string, fileSystem: CatalogAggregateFileSystem): Promise<void> {
    try {
        await fileSystem.lstat(path);
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_PARTIAL_ARTIFACT', path);
    } catch (error: unknown) {
        if (aggregateErrorCode(error) !== 'ENOENT') throw error;
    }
}

async function stageAggregate(
    spec: CatalogAggregateSpec,
    token: string,
    fileSystem: CatalogAggregateFileSystem
): Promise<PreparedAggregate> {
    const state = await fileState(spec.path, fileSystem);
    const directory = dirname(spec.path);
    const tempPath = join(directory, `.${spec.label}.${token}.tmp`);
    const backupPath = join(directory, `.${spec.label}.${token}.bak`);
    await assertAbsent(tempPath, fileSystem);
    await assertAbsent(backupPath, fileSystem);
    const handle = await fileSystem.open(tempPath, 'wx', 0o644);
    try {
        await handle.writeFile(spec.bytes);
        await handle.chmod(state.mode);
        await handle.sync();
        await handle.close();
    } catch (error: unknown) {
        const failures: string[] = [];
        await attemptAggregateOperation(() => handle.close(), failures, `close:${tempPath}`);
        await attemptAggregateOperation(() => fileSystem.unlink(tempPath), failures, `temp:${tempPath}`);
        if (failures.length > 0) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_ROLLBACK_FAILED', failures[0]);
        }
        throw error;
    }
    return {...spec, tempPath, backupPath, ...state};
}

async function rollback(state: TransactionState, fileSystem: CatalogAggregateFileSystem): Promise<void> {
    const failures: string[] = [];
    for (const item of [...state.prepared].reverse()) {
        if (state.installed.has(item.path)) {
            await attemptAggregateOperation(() => fileSystem.unlink(item.path), failures, `unlink:${item.path}`);
        }
        if (state.backedUp.has(item.path)) {
            await attemptAggregateOperation(
                () => fileSystem.rename(item.backupPath, item.path), failures, `restore:${item.path}`
            );
        }
        if (!state.installed.has(item.path)) {
            await attemptAggregateOperation(
                () => fileSystem.unlink(item.tempPath), failures, `temp:${item.tempPath}`
            );
        }
    }
    await attemptAggregateOperation(
        () => syncAggregateDirectory(state.directory, fileSystem), failures, `sync:${state.directory}`
    );
    if (failures.length > 0) {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_ROLLBACK_FAILED', failures[0]);
    }
}

async function installPair(state: TransactionState, fileSystem: CatalogAggregateFileSystem): Promise<void> {
    for (const item of state.prepared) {
        if (item.existed) {
            await fileSystem.rename(item.path, item.backupPath);
            state.backedUp.add(item.path);
        }
    }
    for (const item of state.prepared) {
        await fileSystem.rename(item.tempPath, item.path);
        state.installed.add(item.path);
    }
    await syncAggregateDirectory(state.directory, fileSystem);
    state.committed = true;
}

async function recoverBeforeCommit(
    state: TransactionState,
    lock: CatalogAggregateLock,
    fileSystem: CatalogAggregateFileSystem
): Promise<void> {
    try {
        await rollback(state, fileSystem);
        await releaseCatalogAggregateLock(lock, fileSystem);
    } catch (error: unknown) {
        await retainCatalogAggregateLockEvidence(lock, 'TASK_CATALOG_ROLLBACK_FAILED');
        if (error instanceof TaskCatalogFileBoundaryError) throw error;
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_ROLLBACK_FAILED', lock.path);
    }
}

export async function replaceCatalogAggregates(
    specs: readonly CatalogAggregateSpec[],
    token: string,
    fileSystem: CatalogAggregateFileSystem = nodeCatalogAggregateFileSystem
): Promise<void> {
    if (!TOKEN.test(token) || specs.length !== 2 || dirname(specs[0].path) !== dirname(specs[1].path)) {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_TASK_INPUT_INVALID', 'tempToken');
    }
    const directory = dirname(specs[0].path);
    const lock = await acquireCatalogAggregateLock(directory, fileSystem);
    const state: TransactionState = {
        directory, prepared: [], backedUp: new Set(), installed: new Set(), committed: false
    };
    try {
        for (const spec of specs) state.prepared.push(await stageAggregate(spec, token, fileSystem));
        await installPair(state, fileSystem);
        await cleanupCommittedAggregates(state, fileSystem);
        try {
            await releaseCatalogAggregateLock(lock, fileSystem);
        } catch {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_DURABILITY_UNCERTAIN', lock.path);
        }
    } catch (error: unknown) {
        if (!state.committed) {
            await recoverBeforeCommit(state, lock, fileSystem);
        } else {
            await retainCatalogAggregateLockEvidence(lock, 'TASK_CATALOG_DURABILITY_UNCERTAIN');
        }
        throw error;
    }
}
