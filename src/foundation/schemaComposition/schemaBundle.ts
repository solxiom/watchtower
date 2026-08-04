import {readFileSync} from 'node:fs';
import {createWatchtowerError, type WatchtowerError} from '../../contracts/index.js';

const SCHEMA_ID = 'https://nirvana.dev/watchtower/spec/v1.schema.json';
const REQUIRED_DEFINITIONS = ['commandResult', 'commandError'] as const;

export interface SchemaBundle {
    readonly id: string;
    readonly schema: object;
}

export type SchemaBundleLoadResult =
    | {readonly ok: true; readonly bundle: SchemaBundle}
    | {readonly ok: false; readonly error: WatchtowerError};

export type SchemaAssetReader = () => unknown;

/**
 * Reads the generated RM-13 aggregate as a runtime asset. There is no pinned
 * Nirvana facade yet with this CLI-safe, read-only asset-loading semantics.
 */
export function loadV1SchemaBundle(reader: SchemaAssetReader = readV1SchemaAsset): SchemaBundleLoadResult {
    try {
        const asset = reader();
        if (typeof asset !== 'string') {
            return rejected('schema asset is not UTF-8 text');
        }
        const parsed: unknown = JSON.parse(asset);
        if (!isSchemaBundle(parsed)) {
            return rejected('schema identity or envelope definitions are invalid');
        }
        return {ok: true, bundle: {id: SCHEMA_ID, schema: parsed}};
    } catch {
        return rejected('schema asset cannot be read or parsed');
    }
}

function readV1SchemaAsset(): unknown {
    const schemaUrl = new URL('../../../docs/spec/schemas/v1.schema.json', import.meta.url);
    return readFileSync(schemaUrl, 'utf8');
}

function isSchemaBundle(value: unknown): value is object {
    if (!isRecord(value) || value.$id !== SCHEMA_ID) {
        return false;
    }
    const definitions = value.$defs;
    return isRecord(definitions) && REQUIRED_DEFINITIONS.every((name) => Object.hasOwn(definitions, name));
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function rejected(target: string): SchemaBundleLoadResult {
    return {
        ok: false,
        error: createWatchtowerError('ERR_INTEGRITY_FAILURE', {
            operation: 'load command-envelope schema', target, remediation: 'restore the RM-13 generated schema asset'
        })
    };
}
