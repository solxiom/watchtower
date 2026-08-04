import type {
    CatalogCollections,
    JsonObject,
    ParsedCatalogFragment,
    ParsedCatalogGroup,
    ParsedCatalogTask,
    TaskCatalogCompositionFailure,
    TaskCatalogCompositionFailureCode
} from './taskCatalogContracts.js';
import {catalogFailure} from './catalogParsing.js';

type CatalogValue = JsonObject | ParsedCatalogTask | ParsedCatalogGroup;
type OwnedValue<T extends CatalogValue> = {readonly source: string; readonly value: T};

function addValues<T extends CatalogValue>(
    target: Map<string, OwnedValue<T>>,
    incoming: ReadonlyMap<string, T>,
    source: string,
    duplicateCode: TaskCatalogCompositionFailureCode
): TaskCatalogCompositionFailure | null {
    for (const [id, value] of incoming) {
        const existing = target.get(id);
        if (existing !== undefined) {
            return catalogFailure(duplicateCode, source, id, existing.source);
        }
        target.set(id, {source, value});
    }
    return null;
}

function emptyCollections(): CatalogCollections {
    return {
        handlers: new Map(), tasks: new Map(), groups: new Map(),
        actions: new Map(), leaves: new Map()
    };
}

export function collectCatalogFragments(fragments: readonly ParsedCatalogFragment[]):
    CatalogCollections | TaskCatalogCompositionFailure {
    const result = emptyCollections();
    for (const fragment of fragments) {
        const failures = [
            addValues(result.handlers, fragment.handlers, fragment.source, 'TASK_CATALOG_HANDLER_DUPLICATE'),
            addValues(result.tasks, fragment.tasks, fragment.source, 'TASK_CATALOG_TASK_DUPLICATE'),
            addValues(result.groups, fragment.groups, fragment.source, 'TASK_CATALOG_GROUP_DUPLICATE'),
            addValues(result.actions, fragment.actions, fragment.source, 'TASK_CATALOG_ACTION_DUPLICATE'),
            addValues(result.leaves, fragment.leaves, fragment.source, 'TASK_CATALOG_LEAF_DUPLICATE')
        ];
        const failure = failures.find((entry) => entry !== null);
        if (failure !== undefined && failure !== null) {
            return failure;
        }
    }
    for (const [taskId, task] of result.tasks) {
        const group = result.groups.get(taskId);
        if (group !== undefined) {
            return catalogFailure('TASK_CATALOG_RUNNABLE_DUPLICATE', task.source, taskId, group.source);
        }
    }
    return result;
}
