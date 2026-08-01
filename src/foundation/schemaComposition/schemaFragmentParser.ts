import type {
    JsonValue,
    ParsedSchemaFragment,
    SchemaCompositionFailure,
    SchemaFragmentInput
} from './schemaCompositionContracts.js';
import {defineOwnJsonProperty, isJsonObject, isJsonValue} from './jsonCanonicalizer.js';
import {hasDuplicateJsonObjectKey} from './jsonDuplicateKeyDetector.js';

const FRAGMENT_MARKER = 'x-watchtower-fragment';
const FRAGMENT_ID = /^[a-z0-9][a-z0-9.-]{0,127}$/;
const SOURCE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const MAX_FRAGMENT_BYTES = 1024 * 1024;
const MAX_FRAGMENTS = 256;

function failure(
    code: SchemaCompositionFailure['code'],
    source: string | null,
    subject: string | null = null
): SchemaCompositionFailure {
    return {code, source, subject, conflictingSource: null};
}

function isSafeSource(source: string): boolean {
    const segments = source.split('/');
    return source.length > 0 && source.length <= 512 && !source.startsWith('/') &&
        segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..' &&
            SOURCE_SEGMENT.test(segment));
}

function validateInputEntry(value: unknown, index: number): SchemaFragmentInput | SchemaCompositionFailure {
    if (!isJsonObject(value) || Object.keys(value).sort().join(',') !== 'bytes,source') {
        return failure('SCHEMA_COMPOSITION_INPUT_INVALID', null, String(index));
    }
    if (typeof value.source !== 'string' || !isSafeSource(value.source)) {
        return failure('SCHEMA_FRAGMENT_SOURCE_INVALID', null, String(index));
    }
    if (!(value.bytes instanceof Uint8Array) || value.bytes.byteLength === 0 ||
        value.bytes.byteLength > MAX_FRAGMENT_BYTES) {
        return failure('SCHEMA_FRAGMENT_BYTES_INVALID', value.source);
    }
    return {source: value.source, bytes: value.bytes};
}

export function validateFragmentInputs(input: unknown):
    SchemaFragmentInput[] | SchemaCompositionFailure {
    if (!Array.isArray(input) || input.length === 0 || input.length > MAX_FRAGMENTS) {
        return failure('SCHEMA_COMPOSITION_INPUT_INVALID', null);
    }
    const validated: SchemaFragmentInput[] = [];
    for (let index = 0; index < input.length; index += 1) {
        const entry = validateInputEntry(input[index], index);
        if ('code' in entry) {
            return entry;
        }
        validated.push(entry);
    }
    return validated.sort((left, right) => left.source.localeCompare(right.source));
}

function parseMetadata(value: unknown, source: string):
    {readonly id: string; readonly includes: readonly string[]} | SchemaCompositionFailure {
    if (!isJsonObject(value) || Object.keys(value).some((key) => !['schemaVersion', 'id', 'includes'].includes(key)) ||
        value.schemaVersion !== 1 || typeof value.id !== 'string' || !FRAGMENT_ID.test(value.id) ||
        !Array.isArray(value.includes)) {
        return failure('SCHEMA_FRAGMENT_METADATA_INVALID', source);
    }
    const includes: string[] = [];
    for (const included of value.includes) {
        if (typeof included !== 'string' || !FRAGMENT_ID.test(included) || includes.includes(included)) {
            return failure('SCHEMA_FRAGMENT_METADATA_INVALID', source, 'includes');
        }
        includes.push(included);
    }
    return {id: value.id, includes: includes.sort()};
}

export function parseSchemaFragment(input: SchemaFragmentInput):
    ParsedSchemaFragment | SchemaCompositionFailure {
    let parsed: unknown;
    try {
        const text = new TextDecoder('utf-8', {fatal: true}).decode(input.bytes);
        if (hasDuplicateJsonObjectKey(text)) {
            return failure('SCHEMA_FRAGMENT_PROPERTY_DUPLICATE', input.source);
        }
        parsed = JSON.parse(text);
    } catch {
        return failure('SCHEMA_FRAGMENT_JSON_INVALID', input.source);
    }
    if (!isJsonObject(parsed) || !isJsonValue(parsed)) {
        return failure('SCHEMA_FRAGMENT_ROOT_INVALID', input.source);
    }
    const metadata = parseMetadata(parsed[FRAGMENT_MARKER], input.source);
    if ('code' in metadata) {
        return metadata;
    }
    const content: {[key: string]: JsonValue} = {};
    for (const [key, value] of Object.entries(parsed)) {
        if (key !== FRAGMENT_MARKER) {
            defineOwnJsonProperty(content, key, value);
        }
    }
    return {source: input.source, id: metadata.id, includes: metadata.includes, content};
}
