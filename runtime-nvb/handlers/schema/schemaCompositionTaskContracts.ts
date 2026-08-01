import type {SchemaCompositionFailureCode} from '../../../src/foundation/schemaComposition/index.js';

export type SchemaCompositionTaskMode = 'check' | 'write';

export type SchemaCompositionTaskFailureCode = SchemaCompositionFailureCode
    | 'SCHEMA_TASK_INPUT_INVALID'
    | 'SCHEMA_FRAGMENT_DIRECTORY_INVALID'
    | 'SCHEMA_FRAGMENT_FILE_INVALID'
    | 'SCHEMA_AGGREGATE_PATH_INVALID'
    | 'SCHEMA_AGGREGATE_STALE'
    | 'SCHEMA_FILE_IO_FAILED'
    | 'SCHEMA_WRITE_VERIFICATION_FAILED';

export interface SchemaCompositionTaskFailure {
    readonly code: SchemaCompositionTaskFailureCode;
    readonly subject: string | null;
}

export interface SchemaCompositionTaskSuccess {
    readonly schemaVersion: 1;
    readonly ok: true;
    readonly mode: SchemaCompositionTaskMode;
    readonly semanticDigest: `sha256:${string}`;
    readonly aggregateBytes: number;
    readonly fragmentCount: number;
    readonly definitionCount: number;
    readonly wrote: boolean;
}

export interface SchemaCompositionTaskRejected {
    readonly schemaVersion: 1;
    readonly ok: false;
    readonly mode: SchemaCompositionTaskMode | null;
    readonly failure: SchemaCompositionTaskFailure;
}

export type SchemaCompositionTaskResult = SchemaCompositionTaskSuccess | SchemaCompositionTaskRejected;
