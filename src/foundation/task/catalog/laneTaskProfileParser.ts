import type {
    CatalogSourceInput,
    ParsedLaneTaskProfile,
    TaskCatalogCompositionFailure
} from './taskCatalogContracts.js';
import {
    catalogFailure,
    hasExactKeys,
    parseCatalogJson,
    sortedUnique,
    stringArray
} from './catalogParsing.js';

const PROFILE_ID = /^[a-z0-9][a-z0-9-]{0,127}$/;
const CATALOG_ID = /^watchtower-runtime-nvb\/v[1-9][0-9]*$/;
const RUNNABLE_ID = /^wt:[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/;
const ALLOWED_FIELDS = new Set(['catalogId', 'profileId', 'schemaVersion', 'taskIds']);

export function parseLaneTaskProfile(input: CatalogSourceInput):
    ParsedLaneTaskProfile | TaskCatalogCompositionFailure {
    const parsed = parseCatalogJson(input);
    if (!parsed.ok) {
        return parsed.failure;
    }
    const root = parsed.value;
    const forbidden = Object.keys(root).find((key) => !ALLOWED_FIELDS.has(key));
    if (forbidden !== undefined) {
        return catalogFailure('TASK_PROFILE_FIELD_FORBIDDEN', input.source, forbidden);
    }
    const taskIds = stringArray(root.taskIds);
    if (!hasExactKeys(root, ['catalogId', 'profileId', 'schemaVersion', 'taskIds']) ||
        root.schemaVersion !== 1 || typeof root.profileId !== 'string' ||
        !PROFILE_ID.test(root.profileId) || typeof root.catalogId !== 'string' ||
        !CATALOG_ID.test(root.catalogId) || taskIds === null ||
        !taskIds.every((taskId) => RUNNABLE_ID.test(taskId))) {
        return catalogFailure('TASK_PROFILE_SCHEMA_INVALID', input.source);
    }
    if (!sortedUnique(taskIds)) {
        return catalogFailure('TASK_CATALOG_ORDER_INVALID', input.source, 'taskIds');
    }
    return {
        source: input.source,
        profileId: root.profileId,
        catalogId: root.catalogId,
        taskIds
    };
}
