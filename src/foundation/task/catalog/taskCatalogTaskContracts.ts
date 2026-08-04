import type {TaskCatalogCompositionFailureCode} from './index.js';

export type TaskCatalogTaskMode = 'check' | 'write';

export type TaskCatalogTaskFailureCode = TaskCatalogCompositionFailureCode
    | 'TASK_CATALOG_TASK_INPUT_INVALID'
    | 'TASK_CATALOG_FRAGMENT_DIRECTORY_INVALID'
    | 'TASK_PROFILE_DIRECTORY_INVALID'
    | 'TASK_CATALOG_SCHEMA_DIRECTORY_INVALID'
    | 'TASK_CATALOG_LEAF_DIRECTORY_INVALID'
    | 'TASK_CATALOG_LEAF_ASSET_INVALID'
    | 'TASK_CATALOG_LEAF_ASSET_EXTRA'
    | 'TASK_CATALOG_LEAF_CHECKSUM_MISMATCH'
    | 'TASK_CATALOG_LEAF_MODE_INVALID'
    | 'TASK_CATALOG_SOURCE_FILE_INVALID'
    | 'TASK_CATALOG_AGGREGATE_PATH_INVALID'
    | 'TASK_CATALOG_AGGREGATE_STALE'
    | 'TASK_CATALOG_PARTIAL_ARTIFACT'
    | 'TASK_CATALOG_CONCURRENT_WRITE'
    | 'TASK_CATALOG_DURABILITY_UNCERTAIN'
    | 'TASK_CATALOG_ROLLBACK_FAILED'
    | 'TASK_CATALOG_FILE_IO_FAILED'
    | 'TASK_CATALOG_WRITE_VERIFICATION_FAILED';

export interface TaskCatalogTaskFailure {
    readonly code: TaskCatalogTaskFailureCode;
    readonly subject: string | null;
}

export interface TaskCatalogTaskSuccess {
    readonly schemaVersion: 1;
    readonly ok: true;
    readonly mode: TaskCatalogTaskMode;
    readonly catalogSha256: `sha256:${string}`;
    readonly runtimeConfigBytes: number;
    readonly taskCatalogBytes: number;
    readonly fragmentCount: number;
    readonly profileCount: number;
    readonly taskCount: number;
    readonly groupCount: number;
    readonly wrote: boolean;
}

export interface TaskCatalogTaskRejected {
    readonly schemaVersion: 1;
    readonly ok: false;
    readonly mode: TaskCatalogTaskMode | null;
    readonly failure: TaskCatalogTaskFailure;
}

export type TaskCatalogTaskResult = TaskCatalogTaskSuccess | TaskCatalogTaskRejected;
