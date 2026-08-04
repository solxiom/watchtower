import {isJsonObject, isJsonValue} from '../../schemaComposition/jsonCanonicalizer.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import type {
    CatalogSourceInput,
    JsonObject,
    JsonValue,
    TaskCatalogCompositionFailure
} from './taskCatalogContracts.js';

const SOURCE_SEGMENT = /^[A-Za-z0-9._-]+$/;
const MAX_SOURCE_BYTES = 1024 * 1024;
const MAX_INPUTS = 256;

export function catalogFailure(
    code: TaskCatalogCompositionFailure['code'],
    source: string | null,
    subject: string | null = null,
    conflictingSource: string | null = null
): TaskCatalogCompositionFailure {
    return {code, source, subject, conflictingSource};
}

export function isCatalogFailure(value: unknown): value is TaskCatalogCompositionFailure {
    return typeof value === 'object' && value !== null && 'code' in value &&
        'source' in value && 'subject' in value && 'conflictingSource' in value;
}

function safeSource(source: string): boolean {
    const segments = source.split('/');
    return source.length > 0 && source.length <= 512 && !source.startsWith('/') &&
        segments.every((segment) => segment !== '' && segment !== '.' && segment !== '..' &&
            SOURCE_SEGMENT.test(segment));
}

function validateSourceEntry(
    value: unknown,
    index: number
): CatalogSourceInput | TaskCatalogCompositionFailure {
    if (!isJsonObject(value) || Object.keys(value).sort().join(',') !== 'bytes,source') {
        return catalogFailure('TASK_CATALOG_COMPOSITION_INPUT_INVALID', null, String(index));
    }
    if (typeof value.source !== 'string' || !safeSource(value.source)) {
        return catalogFailure('TASK_CATALOG_SOURCE_INVALID', null, String(index));
    }
    if (!(value.bytes instanceof Uint8Array) || value.bytes.byteLength === 0 ||
        value.bytes.byteLength > MAX_SOURCE_BYTES) {
        return catalogFailure('TASK_CATALOG_BYTES_INVALID', value.source);
    }
    return {source: value.source, bytes: value.bytes};
}

export function validateCatalogSources(
    input: unknown,
    kind: 'fragments' | 'profiles' | 'schemas'
): CatalogSourceInput[] | TaskCatalogCompositionFailure {
    if (!Array.isArray(input) || input.length === 0 || input.length > MAX_INPUTS) {
        return catalogFailure('TASK_CATALOG_COMPOSITION_INPUT_INVALID', null, kind);
    }
    const sources: CatalogSourceInput[] = [];
    for (let index = 0; index < input.length; index += 1) {
        const source = validateSourceEntry(input[index], index);
        if ('code' in source) {
            return source;
        }
        sources.push(source);
    }
    return sources.sort((left, right) => left.source.localeCompare(right.source));
}

export function parseCatalogJson(
    input: CatalogSourceInput
): {readonly ok: true; readonly value: JsonObject} |
    {readonly ok: false; readonly failure: TaskCatalogCompositionFailure} {
    let parsed: unknown;
    try {
        const text = new TextDecoder('utf-8', {fatal: true}).decode(input.bytes);
        if (hasDuplicateJsonObjectKey(text)) {
            return {ok: false, failure: catalogFailure('TASK_CATALOG_PROPERTY_DUPLICATE', input.source)};
        }
        parsed = JSON.parse(text);
    } catch {
        return {ok: false, failure: catalogFailure('TASK_CATALOG_JSON_INVALID', input.source)};
    }
    return isJsonObject(parsed) && isJsonValue(parsed) ? {ok: true, value: parsed} :
        {ok: false, failure: catalogFailure('TASK_CATALOG_JSON_INVALID', input.source)};
}

export function hasExactKeys(
    value: JsonObject,
    required: readonly string[],
    optional: readonly string[] = []
): boolean {
    const allowed = new Set([...required, ...optional]);
    return required.every((key) => Object.hasOwn(value, key)) &&
        Object.keys(value).every((key) => allowed.has(key));
}

export function stringArray(value: JsonValue | undefined): readonly string[] | null {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string') ? value : null;
}

export function sortedUnique(values: readonly string[]): boolean {
    return values.every((value, index) => index === 0 || values[index - 1].localeCompare(value) < 0);
}

export function entriesInCanonicalOrder(value: JsonObject): boolean {
    const keys = Object.keys(value);
    return keys.every((key, index) => index === 0 || keys[index - 1].localeCompare(key) < 0);
}
