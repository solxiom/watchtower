import type {JsonObject, JsonValue} from '../schemaComposition/schemaCompositionContracts.js';

export interface CatalogSourceInput {
    readonly source: string;
    readonly bytes: Uint8Array;
}

export interface TaskCatalogCompositionInput {
    readonly fragments: readonly CatalogSourceInput[];
    readonly profiles: readonly CatalogSourceInput[];
    readonly schemas: readonly CatalogSourceInput[];
}

export interface ParsedCatalogSchema {
    readonly source: string;
    readonly schemaId: string;
    readonly sha256: `sha256:${string}`;
    readonly value: JsonObject;
}

export type TaskMutationClass =
    | 'read-only'
    | 'derived-write'
    | 'managed-runtime-write'
    | 'managed-lane-write'
    | 'journaled-mutation'
    | 'authoritative-effect'
    | 'external-effect';

export type TaskExecutionScope = 'repository-development' | 'lane-runtime';

export interface CatalogTaskMetadata {
    readonly executionScope: TaskExecutionScope;
    readonly inputSchema: string;
    readonly resultSchema: string;
    readonly mutationClass: TaskMutationClass;
    readonly requiresInvocationEnvelope: boolean;
    readonly leafIds: readonly string[];
}

export interface ParsedCatalogFragment {
    readonly source: string;
    readonly fragmentId: string;
    readonly includes: readonly string[];
    readonly handlers: ReadonlyMap<string, JsonObject>;
    readonly tasks: ReadonlyMap<string, ParsedCatalogTask>;
    readonly groups: ReadonlyMap<string, ParsedCatalogGroup>;
    readonly actions: ReadonlyMap<string, JsonObject>;
    readonly leaves: ReadonlyMap<string, JsonObject>;
}

export interface ParsedCatalogTask {
    readonly runtime: JsonObject;
    readonly metadata: CatalogTaskMetadata;
}

export interface ParsedCatalogGroup {
    readonly runtime: JsonObject;
    readonly metadata: CatalogTaskMetadata;
}

export interface ParsedLaneTaskProfile {
    readonly source: string;
    readonly profileId: string;
    readonly catalogId: string;
    readonly taskIds: readonly string[];
}

export type TaskCatalogCompositionFailureCode =
    | 'TASK_CATALOG_COMPOSITION_INPUT_INVALID'
    | 'TASK_CATALOG_SOURCE_INVALID'
    | 'TASK_CATALOG_BYTES_INVALID'
    | 'TASK_CATALOG_JSON_INVALID'
    | 'TASK_CATALOG_PROPERTY_DUPLICATE'
    | 'TASK_CATALOG_FRAGMENT_SCHEMA_INVALID'
    | 'TASK_CATALOG_FRAGMENT_ID_DUPLICATE'
    | 'TASK_CATALOG_INCLUDE_MISSING'
    | 'TASK_CATALOG_INCLUDE_CIRCULAR'
    | 'TASK_CATALOG_HANDLER_DUPLICATE'
    | 'TASK_CATALOG_TASK_DUPLICATE'
    | 'TASK_CATALOG_GROUP_DUPLICATE'
    | 'TASK_CATALOG_RUNNABLE_DUPLICATE'
    | 'TASK_CATALOG_ACTION_DUPLICATE'
    | 'TASK_CATALOG_LEAF_DUPLICATE'
    | 'TASK_CATALOG_HANDLER_DANGLING'
    | 'TASK_CATALOG_RUNNABLE_DANGLING'
    | 'TASK_CATALOG_SCOPE_REFERENCE_INVALID'
    | 'TASK_CATALOG_ACTION_DANGLING'
    | 'TASK_CATALOG_LEAF_DANGLING'
    | 'TASK_PROFILE_SCHEMA_INVALID'
    | 'TASK_PROFILE_FIELD_FORBIDDEN'
    | 'TASK_PROFILE_ID_DUPLICATE'
    | 'TASK_PROFILE_CATALOG_MISMATCH'
    | 'TASK_PROFILE_TASK_DANGLING'
    | 'TASK_PROFILE_TASK_SCOPE_INVALID'
    | 'TASK_CATALOG_ORDER_INVALID'
    | 'TASK_CATALOG_SCHEMA_INVALID'
    | 'TASK_CATALOG_SCHEMA_ID_DUPLICATE'
    | 'TASK_CATALOG_SCHEMA_DANGLING';

export interface TaskCatalogCompositionFailure {
    readonly code: TaskCatalogCompositionFailureCode;
    readonly source: string | null;
    readonly subject: string | null;
    readonly conflictingSource: string | null;
}

export interface TaskCatalogCompositionSuccess {
    readonly ok: true;
    readonly runtimeConfig: JsonObject;
    readonly taskCatalog: JsonObject;
    readonly runtimeConfigBytes: Uint8Array;
    readonly taskCatalogBytes: Uint8Array;
    readonly catalogSha256: `sha256:${string}`;
    readonly fragmentIds: readonly string[];
    readonly profileIds: readonly string[];
    readonly taskIds: readonly string[];
    readonly groupIds: readonly string[];
    readonly schemaIds: readonly string[];
}

export interface TaskCatalogCompositionRejected {
    readonly ok: false;
    readonly failure: TaskCatalogCompositionFailure;
}

export type TaskCatalogCompositionResult =
    | TaskCatalogCompositionSuccess
    | TaskCatalogCompositionRejected;

export interface CatalogCollections {
    readonly handlers: Map<string, {readonly source: string; readonly value: JsonObject}>;
    readonly tasks: Map<string, {readonly source: string; readonly value: ParsedCatalogTask}>;
    readonly groups: Map<string, {readonly source: string; readonly value: ParsedCatalogGroup}>;
    readonly actions: Map<string, {readonly source: string; readonly value: JsonObject}>;
    readonly leaves: Map<string, {readonly source: string; readonly value: JsonObject}>;
}

export type {JsonObject, JsonValue};
