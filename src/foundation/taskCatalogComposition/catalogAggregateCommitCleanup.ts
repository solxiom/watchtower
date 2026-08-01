import type {CatalogAggregateFileSystem} from './catalogAggregateFileSystem.js';
import {syncAggregateDirectory} from './catalogAggregateDurabilityOperations.js';
import {TaskCatalogFileBoundaryError} from './TaskCatalogFileBoundaryError.js';

interface CommittedAggregate {
    readonly path: string;
    readonly backupPath: string;
}

export interface CommittedAggregateState {
    readonly directory: string;
    readonly prepared: readonly CommittedAggregate[];
    readonly backedUp: ReadonlySet<string>;
}

export async function cleanupCommittedAggregates(
    state: CommittedAggregateState,
    fileSystem: CatalogAggregateFileSystem
): Promise<void> {
    for (const item of state.prepared) {
        if (!state.backedUp.has(item.path)) continue;
        try {
            await fileSystem.unlink(item.backupPath);
        } catch {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_DURABILITY_UNCERTAIN', item.backupPath);
        }
    }
    try {
        await syncAggregateDirectory(state.directory, fileSystem);
    } catch {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_DURABILITY_UNCERTAIN', state.directory);
    }
}
