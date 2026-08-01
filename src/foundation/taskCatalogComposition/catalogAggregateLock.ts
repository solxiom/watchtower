import {dirname, join} from 'node:path';

import type {
    CatalogAggregateFileHandle,
    CatalogAggregateFileSystem
} from './catalogAggregateFileSystem.js';
import {
    aggregateErrorCode,
    attemptAggregateOperation,
    syncAggregateDirectory
} from './catalogAggregateDurabilityOperations.js';
import {TaskCatalogFileBoundaryError} from './TaskCatalogFileBoundaryError.js';

const LOCK_NAME = '.task-catalog.aggregate.lock';

export interface CatalogAggregateLock {
    readonly path: string;
    readonly handle: CatalogAggregateFileHandle;
    open: boolean;
}

export async function acquireCatalogAggregateLock(
    directory: string,
    fileSystem: CatalogAggregateFileSystem
): Promise<CatalogAggregateLock> {
    const path = join(directory, LOCK_NAME);
    let handle: CatalogAggregateFileHandle | null = null;
    try {
        handle = await fileSystem.open(path, 'wx', 0o600);
        await handle.sync();
        return {path, handle, open: true};
    } catch (error: unknown) {
        if (aggregateErrorCode(error) === 'EEXIST') {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_CONCURRENT_WRITE', path);
        }
        if (handle !== null) {
            const failures: string[] = [];
            await attemptAggregateOperation(() => handle?.close() ?? Promise.resolve(), failures, `close:${path}`);
            await attemptAggregateOperation(() => fileSystem.unlink(path), failures, `lock:${path}`);
            await attemptAggregateOperation(
                () => syncAggregateDirectory(directory, fileSystem), failures, `sync:${directory}`
            );
            if (failures.length > 0) {
                throw new TaskCatalogFileBoundaryError('TASK_CATALOG_ROLLBACK_FAILED', failures[0]);
            }
        }
        throw error;
    }
}

export async function releaseCatalogAggregateLock(
    lock: CatalogAggregateLock,
    fileSystem: CatalogAggregateFileSystem
): Promise<void> {
    await closeCatalogAggregateLockEvidence(lock);
    await fileSystem.unlink(lock.path);
    await syncAggregateDirectory(dirname(lock.path), fileSystem);
}

export async function closeCatalogAggregateLockEvidence(lock: CatalogAggregateLock): Promise<void> {
    if (!lock.open) return;
    await lock.handle.close();
    lock.open = false;
}

export async function retainCatalogAggregateLockEvidence(
    lock: CatalogAggregateLock,
    failureCode: 'TASK_CATALOG_DURABILITY_UNCERTAIN' | 'TASK_CATALOG_ROLLBACK_FAILED'
): Promise<void> {
    try {
        await closeCatalogAggregateLockEvidence(lock);
    } catch {
        throw new TaskCatalogFileBoundaryError(failureCode, lock.path);
    }
}
