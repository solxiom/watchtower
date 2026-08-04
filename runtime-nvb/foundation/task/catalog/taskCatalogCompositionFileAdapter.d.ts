import type {TaskCatalogTaskResult} from
    '../../../src/foundation/task/catalog/taskCatalogTaskContracts.js';
import type {CatalogAggregateFileSystem} from
    '../../../src/foundation/task/catalog/catalogAggregateFileSystem.js';

export interface TaskCatalogCompositionRuntimeOptions {
    readonly tempToken: () => string;
    readonly aggregateFileSystem?: CatalogAggregateFileSystem;
}

export function runTaskCatalogCompositionTask(
    projectRoot: unknown,
    input: unknown,
    options: TaskCatalogCompositionRuntimeOptions
): Promise<TaskCatalogTaskResult>;
