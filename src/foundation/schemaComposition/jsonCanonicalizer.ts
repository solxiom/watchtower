import {createHash} from 'node:crypto';

import type {JsonObject, JsonValue} from './schemaCompositionContracts.js';

export function isJsonObject(value: unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isWellFormedString(value: string): boolean {
    for (let index = 0; index < value.length; index += 1) {
        const unit = value.charCodeAt(index);
        if (unit >= 0xD800 && unit <= 0xDBFF) {
            const next = value.charCodeAt(index + 1);
            if (!(next >= 0xDC00 && next <= 0xDFFF)) {
                return false;
            }
            index += 1;
        } else if (unit >= 0xDC00 && unit <= 0xDFFF) {
            return false;
        }
    }
    return true;
}

export function isJsonValue(value: unknown): value is JsonValue {
    if (value === null || typeof value === 'boolean') {
        return true;
    }
    if (typeof value === 'string') {
        return isWellFormedString(value);
    }
    if (typeof value === 'number') {
        return Number.isFinite(value);
    }
    if (Array.isArray(value)) {
        return value.every(isJsonValue);
    }
    return isJsonObject(value) && Object.keys(value).every(isWellFormedString) &&
        Object.values(value).every(isJsonValue);
}

export function defineOwnJsonProperty(
    target: {[key: string]: JsonValue},
    key: string,
    value: JsonValue
): void {
    Object.defineProperty(target, key, {value, enumerable: true, configurable: true, writable: true});
}

export function sortJsonValue(value: JsonValue): JsonValue {
    if (Array.isArray(value)) {
        return value.map(sortJsonValue);
    }
    if (!isJsonObject(value)) {
        return value;
    }
    const sorted: {[key: string]: JsonValue} = {};
    for (const key of Object.keys(value).sort()) {
        defineOwnJsonProperty(sorted, key, sortJsonValue(value[key]));
    }
    return sorted;
}

export function canonicalJson(value: JsonValue): string {
    return JSON.stringify(sortJsonValue(value));
}

export function formattedCanonicalJson(value: JsonValue): string {
    return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

export function semanticDigest(value: JsonValue): `sha256:${string}` {
    return `sha256:${createHash('sha256').update(canonicalJson(value), 'utf8').digest('hex')}`;
}
