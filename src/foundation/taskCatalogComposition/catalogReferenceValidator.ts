import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';
import type {
    CatalogCollections,
    ParsedLaneTaskProfile,
    TaskCatalogCompositionFailure
} from './taskCatalogContracts.js';
import {catalogFailure, stringArray} from './catalogParsing.js';

export const TASK_CATALOG_ID = 'watchtower-runtime-nvb/v1';

function runnableExists(collections: CatalogCollections, taskId: string): boolean {
    return collections.tasks.has(taskId) || collections.groups.has(taskId);
}

function runnerReferences(runtime: unknown): readonly string[] {
    if (!isJsonObject(runtime) || !isJsonObject(runtime.runnerOpts)) {
        return [];
    }
    const before = stringArray(runtime.runnerOpts.preTasks) ?? [];
    const after = stringArray(runtime.runnerOpts.postTasks) ?? [];
    return [...before, ...after];
}

function validateTaskReferences(collections: CatalogCollections): TaskCatalogCompositionFailure | null {
    for (const [taskId, owned] of collections.tasks) {
        const handle = owned.value.runtime.handle;
        const handlerId = isJsonObject(handle) && typeof handle.handler === 'string' ? handle.handler : '';
        if (!collections.handlers.has(handlerId)) {
            return catalogFailure('TASK_CATALOG_HANDLER_DANGLING', owned.source, `${taskId}:${handlerId}`);
        }
        for (const reference of runnerReferences(owned.value.runtime)) {
            if (!runnableExists(collections, reference)) {
                return catalogFailure('TASK_CATALOG_RUNNABLE_DANGLING', owned.source, reference);
            }
        }
        for (const leafId of owned.value.metadata.leafIds) {
            if (!collections.leaves.has(leafId)) {
                return catalogFailure('TASK_CATALOG_LEAF_DANGLING', owned.source, `${taskId}:${leafId}`);
            }
        }
    }
    return null;
}

function validateGroupReferences(collections: CatalogCollections): TaskCatalogCompositionFailure | null {
    for (const owned of collections.groups.values()) {
        const taskIds = stringArray(owned.value.runtime.tasks) ?? [];
        for (const taskId of [...taskIds, ...runnerReferences(owned.value.runtime)]) {
            if (!runnableExists(collections, taskId)) {
                return catalogFailure('TASK_CATALOG_RUNNABLE_DANGLING', owned.source, taskId);
            }
        }
        for (const leafId of owned.value.metadata.leafIds) {
            if (!collections.leaves.has(leafId)) {
                return catalogFailure('TASK_CATALOG_LEAF_DANGLING', owned.source, leafId);
            }
        }
    }
    return null;
}

function validateActions(collections: CatalogCollections): TaskCatalogCompositionFailure | null {
    for (const [actionId, owned] of collections.actions) {
        const taskId = owned.value.taskId;
        if (typeof taskId !== 'string' || !runnableExists(collections, taskId)) {
            return catalogFailure('TASK_CATALOG_ACTION_DANGLING', owned.source, actionId);
        }
    }
    return null;
}

function validateInvocationAuthority(collections: CatalogCollections): TaskCatalogCompositionFailure | null {
    const runnables = [...collections.tasks.values(), ...collections.groups.values()];
    for (const owned of runnables) {
        const metadata = owned.value.metadata;
        const mutationNeedsEnvelope = metadata.executionScope === 'lane-runtime' &&
            metadata.mutationClass !== 'read-only';
        if (metadata.executionScope === 'repository-development' && metadata.requiresInvocationEnvelope ||
            mutationNeedsEnvelope && !metadata.requiresInvocationEnvelope) {
            return catalogFailure('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID', owned.source, 'invocationAuthority');
        }
    }
    return null;
}

function runnableScope(collections: CatalogCollections, taskId: string): string | null {
    const runnable = collections.tasks.get(taskId) ?? collections.groups.get(taskId);
    return runnable?.value.metadata.executionScope ?? null;
}

function validateLaneRuntimeReferences(collections: CatalogCollections): TaskCatalogCompositionFailure | null {
    for (const [taskId, owned] of collections.tasks) {
        if (owned.value.metadata.executionScope !== 'lane-runtime') continue;
        for (const reference of runnerReferences(owned.value.runtime)) {
            if (runnableScope(collections, reference) !== 'lane-runtime') {
                return catalogFailure('TASK_CATALOG_SCOPE_REFERENCE_INVALID', owned.source, `${taskId}:${reference}`);
            }
        }
    }
    for (const [groupId, owned] of collections.groups) {
        if (owned.value.metadata.executionScope !== 'lane-runtime') continue;
        const tasks = stringArray(owned.value.runtime.tasks) ?? [];
        for (const reference of [...tasks, ...runnerReferences(owned.value.runtime)]) {
            if (runnableScope(collections, reference) !== 'lane-runtime') {
                return catalogFailure('TASK_CATALOG_SCOPE_REFERENCE_INVALID', owned.source, `${groupId}:${reference}`);
            }
        }
    }
    return null;
}

export function validateCatalogReferences(collections: CatalogCollections):
    TaskCatalogCompositionFailure | null {
    return validateTaskReferences(collections) ?? validateGroupReferences(collections) ??
        validateActions(collections) ?? validateInvocationAuthority(collections) ??
        validateLaneRuntimeReferences(collections);
}

export function validateProfiles(
    profiles: readonly ParsedLaneTaskProfile[],
    collections: CatalogCollections
): TaskCatalogCompositionFailure | null {
    const profileOwners = new Map<string, string>();
    for (const profile of profiles) {
        const existing = profileOwners.get(profile.profileId);
        if (existing !== undefined) {
            return catalogFailure('TASK_PROFILE_ID_DUPLICATE', profile.source, profile.profileId, existing);
        }
        profileOwners.set(profile.profileId, profile.source);
        if (profile.catalogId !== TASK_CATALOG_ID) {
            return catalogFailure('TASK_PROFILE_CATALOG_MISMATCH', profile.source, profile.catalogId);
        }
        for (const taskId of profile.taskIds) {
            const runnable = collections.tasks.get(taskId) ?? collections.groups.get(taskId);
            if (runnable === undefined) {
                return catalogFailure('TASK_PROFILE_TASK_DANGLING', profile.source, taskId);
            }
            if (runnable.value.metadata.executionScope !== 'lane-runtime') {
                return catalogFailure('TASK_PROFILE_TASK_SCOPE_INVALID', profile.source, taskId);
            }
        }
    }
    return null;
}
