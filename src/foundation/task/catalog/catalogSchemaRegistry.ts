import {createHash} from 'node:crypto';

import type {
    CatalogCollections,
    CatalogSourceInput,
    ParsedCatalogSchema,
    TaskCatalogCompositionFailure
} from './taskCatalogContracts.js';
import {catalogFailure, parseCatalogJson} from './catalogParsing.js';

const SCHEMA_DRAFT = 'http://json-schema.org/draft-07/schema#';
const SCHEMA_ID = /^watchtower:\/\/runtime\/schemas\/[a-z0-9-]+\/v1$/;
const REQUIRED_CONTRACTS = [
    'watchtower://runtime/schemas/lane-task-profile/v1',
    'watchtower://runtime/schemas/runtime-nvb-config/v1',
    'watchtower://runtime/schemas/task-catalog-fragment/v1',
    'watchtower://runtime/schemas/task-catalog/v1'
];

function digest(bytes: Uint8Array): `sha256:${string}` {
    return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

function parseSchema(input: CatalogSourceInput): ParsedCatalogSchema | TaskCatalogCompositionFailure {
    const parsed = parseCatalogJson(input);
    if (!parsed.ok) return parsed.failure;
    const schemaId = parsed.value.$id;
    if (parsed.value.$schema !== SCHEMA_DRAFT || typeof schemaId !== 'string' ||
        !SCHEMA_ID.test(schemaId)) {
        return catalogFailure('TASK_CATALOG_SCHEMA_INVALID', input.source, '$id');
    }
    return {source: input.source, schemaId, sha256: digest(input.bytes), value: parsed.value};
}

export function parseCatalogSchemas(inputs: readonly CatalogSourceInput[]):
    ParsedCatalogSchema[] | TaskCatalogCompositionFailure {
    const byId = new Map<string, ParsedCatalogSchema>();
    for (const input of inputs) {
        const schema = parseSchema(input);
        if ('code' in schema) return schema;
        const existing = byId.get(schema.schemaId);
        if (existing !== undefined) {
            return catalogFailure(
                'TASK_CATALOG_SCHEMA_ID_DUPLICATE', schema.source, schema.schemaId, existing.source
            );
        }
        byId.set(schema.schemaId, schema);
    }
    return [...byId.values()].sort((left, right) => left.schemaId.localeCompare(right.schemaId));
}

function referencedSchemaIds(collections: CatalogCollections): string[] {
    return [...collections.tasks.values(), ...collections.groups.values()].flatMap((owned) => [
        owned.value.metadata.inputSchema, owned.value.metadata.resultSchema
    ]);
}

export function validateCatalogSchemaReferences(
    schemas: readonly ParsedCatalogSchema[],
    collections: CatalogCollections
): TaskCatalogCompositionFailure | null {
    const ids = new Set(schemas.map((schema) => schema.schemaId));
    for (const schemaId of [...REQUIRED_CONTRACTS, ...referencedSchemaIds(collections)].sort()) {
        if (!ids.has(schemaId)) {
            return catalogFailure('TASK_CATALOG_SCHEMA_DANGLING', null, schemaId);
        }
    }
    return null;
}

export function schemaCatalogMap(schemas: readonly ParsedCatalogSchema[]):
    {[key: string]: {readonly path: string; readonly sha256: string}} {
    const result: {[key: string]: {readonly path: string; readonly sha256: string}} = {};
    for (const schema of schemas) {
        result[schema.schemaId] = {path: `./schemas/${schema.source}`, sha256: schema.sha256};
    }
    return result;
}
