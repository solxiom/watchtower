import {
    defineOwnJsonProperty,
    formattedCanonicalJson,
    isJsonObject,
    semanticDigest
} from '../schemaComposition/jsonCanonicalizer.js';
import type {
    CatalogCollections,
    JsonObject,
    JsonValue,
    ParsedCatalogFragment,
    ParsedCatalogGroup,
    ParsedCatalogSchema,
    ParsedCatalogTask,
    ParsedLaneTaskProfile,
    TaskCatalogCompositionSuccess
} from './taskCatalogContracts.js';
import {TASK_CATALOG_ID} from './catalogReferenceValidator.js';
import {schemaCatalogMap} from './catalogSchemaRegistry.js';

function jsonMap<T>(
    values: ReadonlyMap<string, {readonly value: T}>,
    project: (value: T) => JsonValue
): JsonObject {
    const result: {[key: string]: JsonValue} = {};
    for (const [id, owned] of [...values].sort(([left], [right]) => left.localeCompare(right))) {
        defineOwnJsonProperty(result, id, project(owned.value));
    }
    return result;
}

function taskCatalogEntry(task: ParsedCatalogTask): JsonObject {
    const handle = task.runtime.handle;
    const handlerId = isJsonObject(handle) && typeof handle.handler === 'string' ? handle.handler : '';
    return {
        executionScope: task.metadata.executionScope,
        handlerId,
        inputSchema: task.metadata.inputSchema,
        leafIds: [...task.metadata.leafIds],
        mutationClass: task.metadata.mutationClass,
        requiresInvocationEnvelope: task.metadata.requiresInvocationEnvelope,
        resultSchema: task.metadata.resultSchema
    };
}

function groupCatalogEntry(group: ParsedCatalogGroup): JsonObject {
    return {
        executionScope: group.metadata.executionScope,
        inputSchema: group.metadata.inputSchema,
        leafIds: [...group.metadata.leafIds],
        mutationClass: group.metadata.mutationClass,
        requiresInvocationEnvelope: group.metadata.requiresInvocationEnvelope,
        resultSchema: group.metadata.resultSchema,
        taskIds: group.runtime.tasks
    };
}

function profileMap(profiles: readonly ParsedLaneTaskProfile[]): JsonObject {
    const result: {[key: string]: JsonValue} = {};
    for (const profile of [...profiles].sort((left, right) => left.profileId.localeCompare(right.profileId))) {
        defineOwnJsonProperty(result, profile.profileId, {taskIds: [...profile.taskIds]});
    }
    return result;
}

function runtimeConfig(collections: CatalogCollections): JsonObject {
    const tasks = new Map([...collections.tasks].filter(([, owned]) =>
        owned.value.metadata.executionScope === 'lane-runtime'));
    const groups = new Map([...collections.groups].filter(([, owned]) =>
        owned.value.metadata.executionScope === 'lane-runtime'));
    const handlerIds = new Set([...tasks.values()].flatMap((owned) => {
        const handle = owned.value.runtime.handle;
        return isJsonObject(handle) && typeof handle.handler === 'string' ? [handle.handler] : [];
    }));
    const handlerModules = [...collections.handlers]
        .filter(([handlerId]) => handlerIds.has(handlerId))
        .map(([, owned]) => owned.value.module)
        .filter((module): module is string => typeof module === 'string')
        .sort();
    return {
        groups: jsonMap(groups, (group) => group.runtime),
        handlers: handlerModules,
        tasks: jsonMap(tasks, (task) => task.runtime)
    };
}

function taskCatalog(
    fragments: readonly ParsedCatalogFragment[],
    profiles: readonly ParsedLaneTaskProfile[],
    schemas: readonly ParsedCatalogSchema[],
    collections: CatalogCollections
): JsonObject {
    return {
        actions: jsonMap(collections.actions, (action) => action),
        catalogId: TASK_CATALOG_ID,
        catalogVersion: 1,
        fragments: fragments.map((fragment) => fragment.fragmentId),
        groups: jsonMap(collections.groups, groupCatalogEntry),
        handlers: jsonMap(collections.handlers, (handler) => handler),
        leaves: jsonMap(collections.leaves, (leaf) => leaf),
        minimumRuntime: {cliVersion: '0.1.0', nodeVersion: '26.4.0'},
        profiles: profileMap(profiles),
        schemaVersion: 1,
        schemas: schemaCatalogMap(schemas),
        tasks: jsonMap(collections.tasks, taskCatalogEntry)
    };
}

export function buildCatalogAggregates(
    fragments: readonly ParsedCatalogFragment[],
    profiles: readonly ParsedLaneTaskProfile[],
    schemas: readonly ParsedCatalogSchema[],
    collections: CatalogCollections
): TaskCatalogCompositionSuccess {
    const config = runtimeConfig(collections);
    const catalog = taskCatalog(fragments, profiles, schemas, collections);
    return {
        ok: true,
        runtimeConfig: config,
        taskCatalog: catalog,
        runtimeConfigBytes: new TextEncoder().encode(formattedCanonicalJson(config)),
        taskCatalogBytes: new TextEncoder().encode(formattedCanonicalJson(catalog)),
        catalogSha256: semanticDigest(catalog),
        fragmentIds: fragments.map((fragment) => fragment.fragmentId),
        profileIds: profiles.map((profile) => profile.profileId).sort(),
        taskIds: [...collections.tasks.keys()].sort(),
        groupIds: [...collections.groups.keys()].sort(),
        schemaIds: schemas.map((schema) => schema.schemaId)
    };
}
