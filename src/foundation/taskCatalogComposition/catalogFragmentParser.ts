import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';
import type {
    CatalogSourceInput,
    CatalogTaskMetadata,
    JsonObject,
    ParsedCatalogFragment,
    ParsedCatalogGroup,
    ParsedCatalogTask,
    TaskCatalogCompositionFailure,
    TaskExecutionScope,
    TaskMutationClass
} from './taskCatalogContracts.js';
import {
    catalogFailure,
    entriesInCanonicalOrder,
    hasExactKeys,
    isCatalogFailure,
    parseCatalogJson,
    sortedUnique,
    stringArray
} from './catalogParsing.js';
import {
    validCatalogDoc,
    validCatalogHandle,
    validCatalogRunnerOptions
} from './catalogRuntimeDefinitionParser.js';

const FRAGMENT_ID = /^[a-z0-9][a-z0-9.-]{0,127}$/;
const HANDLER_ID = /^[A-Z][A-Za-z0-9]{0,127}$/;
const RUNNABLE_ID = /^wt:[a-z][a-z0-9-]*(?::[a-z][a-z0-9-]*)+$/;
const ACTION_ID = /^[a-z][a-z0-9.-]{0,127}$/;
const LEAF_ID = /^[a-z][a-z0-9.-]{0,127}$/;
const SCHEMA_ID = /^watchtower:\/\/runtime\/schemas\/[a-z0-9-]+\/v1$/;
const SHA256 = /^sha256:[a-f0-9]{64}$/;
const MUTATIONS: readonly TaskMutationClass[] = [
    'read-only', 'derived-write', 'managed-runtime-write', 'managed-lane-write',
    'journaled-mutation', 'authoritative-effect', 'external-effect'
];
function isExecutionScope(value: unknown): value is TaskExecutionScope {
    return value === 'repository-development' || value === 'lane-runtime';
}

function isMutationClass(value: unknown): value is TaskMutationClass {
    return typeof value === 'string' && MUTATIONS.some((mutation) => mutation === value);
}

function schemaFailure(source: string, subject: string): TaskCatalogCompositionFailure {
    return catalogFailure('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID', source, subject);
}

function safeAssetPath(value: unknown, prefix: string, suffix = ''): value is string {
    if (typeof value !== 'string' || !value.startsWith(prefix) ||
        (suffix.length > 0 && !value.endsWith(suffix))) return false;
    const relativePath = value.slice(prefix.length);
    const segments = relativePath.split('/');
    return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..' &&
        /^[A-Za-z0-9._-]+$/.test(segment));
}

function parseMetadata(value: unknown, source: string, subject: string):
    CatalogTaskMetadata | TaskCatalogCompositionFailure {
    if (!isJsonObject(value) || !hasExactKeys(value, [
        'executionScope', 'inputSchema', 'leafIds', 'mutationClass',
        'requiresInvocationEnvelope', 'resultSchema'
    ])) {
        return schemaFailure(source, `${subject}.catalog`);
    }
    const leafIds = stringArray(value.leafIds);
    if (!isExecutionScope(value.executionScope) ||
        typeof value.inputSchema !== 'string' || !SCHEMA_ID.test(value.inputSchema) ||
        leafIds === null || !leafIds.every((leaf) => LEAF_ID.test(leaf)) || !sortedUnique(leafIds) ||
        !isMutationClass(value.mutationClass) ||
        typeof value.requiresInvocationEnvelope !== 'boolean' ||
        typeof value.resultSchema !== 'string' || !SCHEMA_ID.test(value.resultSchema)) {
        return schemaFailure(source, `${subject}.catalog`);
    }
    return {
        executionScope: value.executionScope,
        inputSchema: value.inputSchema,
        resultSchema: value.resultSchema,
        mutationClass: value.mutationClass,
        requiresInvocationEnvelope: value.requiresInvocationEnvelope,
        leafIds
    };
}

function parseTask(value: unknown, source: string, id: string):
    ParsedCatalogTask | TaskCatalogCompositionFailure {
    if (!isJsonObject(value) || !hasExactKeys(value, ['catalog', 'doc', 'handle', 'runnerOpts']) ||
        !validCatalogDoc(value.doc) || !validCatalogRunnerOptions(value.runnerOpts) ||
        !validCatalogHandle(value.handle)) {
        return schemaFailure(source, `tasks.${id}`);
    }
    const metadata = parseMetadata(value.catalog, source, `tasks.${id}`);
    if ('code' in metadata) {
        return metadata;
    }
    return {runtime: {doc: value.doc, runnerOpts: value.runnerOpts, handle: value.handle}, metadata};
}

function parseGroup(value: unknown, source: string, id: string):
    ParsedCatalogGroup | TaskCatalogCompositionFailure {
    if (!isJsonObject(value) || !hasExactKeys(value, ['catalog', 'doc', 'runnerOpts', 'tasks']) ||
        !validCatalogDoc(value.doc) || !validCatalogRunnerOptions(value.runnerOpts) ||
        stringArray(value.tasks) === null) {
        return schemaFailure(source, `groups.${id}`);
    }
    const metadata = parseMetadata(value.catalog, source, `groups.${id}`);
    return 'code' in metadata ? metadata : {
        runtime: {doc: value.doc, runnerOpts: value.runnerOpts, tasks: value.tasks}, metadata
    };
}

function parseMap<T>(
    value: unknown,
    source: string,
    subject: string,
    idPattern: RegExp,
    parse: (entry: unknown, source: string, id: string) => T | TaskCatalogCompositionFailure
): ReadonlyMap<string, T> | TaskCatalogCompositionFailure {
    if (!isJsonObject(value)) {
        return schemaFailure(source, subject);
    }
    if (!entriesInCanonicalOrder(value)) {
        return catalogFailure('TASK_CATALOG_ORDER_INVALID', source, subject);
    }
    const parsed = new Map<string, T>();
    for (const [id, entry] of Object.entries(value)) {
        if (!idPattern.test(id)) {
            return schemaFailure(source, `${subject}.${id}`);
        }
        const result = parse(entry, source, id);
        if (isCatalogFailure(result)) {
            return result;
        }
        parsed.set(id, result);
    }
    return parsed;
}

function parseHandler(value: unknown, source: string, id: string): JsonObject | TaskCatalogCompositionFailure {
    return isJsonObject(value) && hasExactKeys(value, ['module']) &&
        safeAssetPath(value.module, './handlers/', '.js') ? value :
        schemaFailure(source, `handlers.${id}`);
}

function parseAction(value: unknown, source: string, id: string): JsonObject | TaskCatalogCompositionFailure {
    return isJsonObject(value) && hasExactKeys(value, ['taskId']) &&
        typeof value.taskId === 'string' && RUNNABLE_ID.test(value.taskId) ? value :
        schemaFailure(source, `actions.${id}`);
}

function parseLeaf(value: unknown, source: string, id: string): JsonObject | TaskCatalogCompositionFailure {
    return isJsonObject(value) && hasExactKeys(value, ['executable', 'mode', 'path', 'sha256']) &&
        value.executable === true && value.mode === '0555' && safeAssetPath(value.path, './leaves/') &&
        typeof value.sha256 === 'string' && SHA256.test(value.sha256) ? value :
        schemaFailure(source, `leaves.${id}`);
}

export function parseCatalogFragment(input: CatalogSourceInput):
    ParsedCatalogFragment | TaskCatalogCompositionFailure {
    const parsed = parseCatalogJson(input);
    if (!parsed.ok) {
        return parsed.failure;
    }
    const root = parsed.value;
    if (!hasExactKeys(root, [
        'actions', 'fragmentId', 'groups', 'handlers', 'includes', 'leaves', 'schemaVersion', 'tasks'
    ])) return schemaFailure(input.source, 'root');
    const includes = stringArray(root.includes);
    if (root.schemaVersion !== 1 || typeof root.fragmentId !== 'string' ||
        !FRAGMENT_ID.test(root.fragmentId) || includes === null ||
        !includes.every((id) => FRAGMENT_ID.test(id)) || !sortedUnique(includes)) {
        return schemaFailure(input.source, 'metadata');
    }
    const handlers = parseMap(root.handlers, input.source, 'handlers', HANDLER_ID, parseHandler);
    const tasks = parseMap(root.tasks, input.source, 'tasks', RUNNABLE_ID, parseTask);
    const groups = parseMap(root.groups, input.source, 'groups', RUNNABLE_ID, parseGroup);
    const actions = parseMap(root.actions, input.source, 'actions', ACTION_ID, parseAction);
    const leaves = parseMap(root.leaves, input.source, 'leaves', LEAF_ID, parseLeaf);
    if (isCatalogFailure(handlers)) return handlers;
    if (isCatalogFailure(tasks)) return tasks;
    if (isCatalogFailure(groups)) return groups;
    if (isCatalogFailure(actions)) return actions;
    if (isCatalogFailure(leaves)) return leaves;
    return {
        source: input.source, fragmentId: root.fragmentId, includes,
        handlers, tasks, groups, actions, leaves
    };
}
