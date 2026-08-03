/**
 * Compiles a catalog-declared JSON Schema into a single-value validator.
 *
 * The schema document has already been read from the immutable runtime root and
 * proved against its checksum by `LaneTaskCatalog`; this module only compiles it
 * and answers "does this untrusted value satisfy it". Ajv runs in non-strict
 * mode to match the accepted schema-composition consumers in this repository
 * (`runtimeKnowledgeManifest/RuntimeKnowledgeManifestSchemaConsumer.ts`), and a
 * schema that will not compile is reported as unavailable rather than silently
 * treated as a pass.
 */
import {join} from 'node:path';
import Ajv from 'ajv';
import Ajv2020 from 'ajv/dist/2020.js';
import {hasDuplicateJsonObjectKey} from '../schemaComposition/jsonDuplicateKeyDetector.js';
import {LaneTaskRuntimeError} from '../../contracts/taskRuntime.js';
import {requireContainedRuntimeFile} from './taskRuntimePin.js';
import type {RuntimeFileSystem} from './runtimeFileSystem.js';

const MAX_SCHEMA_BYTES = 1 * 1024 * 1024;
const DIGEST = /^sha256:[a-f0-9]{64}$/u;

/** A parsed JSON Schema document, treated opaquely by everything but Ajv. */
export type JsonSchemaDocument = Record<string, unknown>;

export interface SchemaValidator {
    validate(value: unknown): boolean;
}

/** Compile `schema`; returns `null` when the schema itself is not compilable. */
export function compileSchemaValidator(schema: JsonSchemaDocument): SchemaValidator | null {
    try {
        const draft = schema.$schema;
        const ajv = typeof draft === 'string' && draft.includes('2020')
            ? new Ajv2020({strict: false, allErrors: false})
            : new Ajv({strict: false, allErrors: false});
        const validate = ajv.compile(schema);
        return {validate: (value: unknown) => validate(value) === true};
    } catch {
        return null;
    }
}

/**
 * Read and checksum-verify one catalog-declared JSON Schema from inside the
 * immutable runtime root. `schemas[schemaId]` names a runtime-root-relative path
 * and its digest; the canonical target is proved contained, its bytes proved
 * against the declared digest, and the document parsed before it is returned.
 */
export function readCatalogSchema(
    schemas: Record<string, unknown>,
    catalogDirectory: string,
    runtimeRoot: string,
    files: RuntimeFileSystem,
    schemaId: string
): JsonSchemaDocument {
    const entry = objectAt(schemas, schemaId);
    const relativePath = entry.path;
    const digest = entry.sha256;
    if (typeof relativePath !== 'string' || !relativePath.startsWith('./') || relativePath.split('/').includes('..')
        || typeof digest !== 'string' || !DIGEST.test(digest)) {
        throw unavailable(schemaId, 'The catalog does not declare a complete, contained schema entry.');
    }
    const path = join(catalogDirectory, relativePath.replace('./', ''));
    const canonical = requireContainedRuntimeFile(
        files, runtimeRoot, path, schemaId, 'TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE'
    );
    if (files.digest(canonical) !== digest) {
        throw unavailable(schemaId, 'The catalog-declared schema bytes do not match the packaged digest.');
    }
    return parseSchema(files.readText(canonical, MAX_SCHEMA_BYTES), schemaId);
}

function objectAt(container: Record<string, unknown>, key: string): Record<string, unknown> {
    const value = container[key];
    return typeof value === 'object' && value !== null && !Array.isArray(value)
        ? value as Record<string, unknown>
        : {};
}

function parseSchema(text: string | null, schemaId: string): JsonSchemaDocument {
    if (text === null) throw unavailable(schemaId, 'The catalog-declared schema is missing, unreadable, or oversized.');
    let value: unknown;
    try {
        if (hasDuplicateJsonObjectKey(text)) throw new Error('duplicate member');
        value = JSON.parse(text);
    } catch {
        value = undefined;
    }
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw unavailable(schemaId, 'The catalog-declared schema is not a well-formed JSON Schema object.');
    }
    return value as JsonSchemaDocument;
}

function unavailable(schemaId: string, message: string): LaneTaskRuntimeError {
    return new LaneTaskRuntimeError('TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE', schemaId, message);
}
