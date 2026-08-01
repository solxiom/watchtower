export type JsonPrimitive = null | boolean | number | string;

export type JsonValue = JsonPrimitive | JsonValue[] | JsonObject;

export interface JsonObject {
    readonly [key: string]: JsonValue;
}

export interface SchemaFragmentInput {
    readonly source: string;
    readonly bytes: Uint8Array;
}

export type SchemaCompositionFailureCode =
    | 'SCHEMA_COMPOSITION_INPUT_INVALID'
    | 'SCHEMA_FRAGMENT_SOURCE_INVALID'
    | 'SCHEMA_FRAGMENT_BYTES_INVALID'
    | 'SCHEMA_FRAGMENT_JSON_INVALID'
    | 'SCHEMA_FRAGMENT_PROPERTY_DUPLICATE'
    | 'SCHEMA_FRAGMENT_ROOT_INVALID'
    | 'SCHEMA_FRAGMENT_METADATA_INVALID'
    | 'SCHEMA_FRAGMENT_ID_DUPLICATE'
    | 'SCHEMA_FRAGMENT_INCLUDE_MISSING'
    | 'SCHEMA_FRAGMENT_INCLUDE_CIRCULAR'
    | 'SCHEMA_DEFINITION_DUPLICATE'
    | 'SCHEMA_ROOT_CONFLICT'
    | 'SCHEMA_ROOT_REQUIRED_KEY_MISSING'
    | 'SCHEMA_REFERENCE_INVALID'
    | 'SCHEMA_REFERENCE_ESCAPES'
    | 'SCHEMA_REFERENCE_UNRESOLVED';

export interface SchemaCompositionFailure {
    readonly code: SchemaCompositionFailureCode;
    readonly source: string | null;
    readonly subject: string | null;
    readonly conflictingSource: string | null;
}

export interface SchemaCompositionSuccess {
    readonly ok: true;
    readonly aggregateBytes: Uint8Array;
    readonly semanticDigest: `sha256:${string}`;
    readonly fragmentIds: readonly string[];
    readonly definitionNames: readonly string[];
}

export interface SchemaCompositionRejected {
    readonly ok: false;
    readonly failure: SchemaCompositionFailure;
}

export type SchemaCompositionResult = SchemaCompositionSuccess | SchemaCompositionRejected;

export interface ParsedSchemaFragment {
    readonly source: string;
    readonly id: string;
    readonly includes: readonly string[];
    readonly content: JsonObject;
}
