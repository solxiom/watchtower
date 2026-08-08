import type {JsonObject, JsonValue} from '../../../contracts/index.js';

export const COORDINATOR_READ_REASONS = [
    'COORDINATOR_JSON_INVALID', 'COORDINATOR_JSONL_INVALID', 'COORDINATOR_INDEX_UNAVAILABLE',
    'COORDINATOR_INDEX_CORRUPT', 'COORDINATOR_SCHEMA_MISMATCH', 'COORDINATOR_CYCLE_UNAVAILABLE',
    'COORDINATOR_BATCH_NOT_FOUND', 'COORDINATOR_REQUIREMENT_NOT_FOUND', 'COORDINATOR_READY_SET_INVALID',
    'COORDINATOR_ARGUMENT_INVALID', 'COORDINATOR_PATH_UNAUTHORIZED', 'COORDINATOR_CURSOR_INVALID', 'COORDINATOR_EVENT_UNAVAILABLE',
    'COORDINATOR_INDEX_STALE', 'COORDINATOR_INDEX_SCHEMA_MISMATCH'
] as const;
export type CoordinatorReadReason = typeof COORDINATOR_READ_REASONS[number];

export type ReadResult<T> =
    | {readonly ok: true; readonly value: T}
    | {readonly ok: false; readonly reason: CoordinatorReadReason; readonly path: string; readonly line?: number};

export interface JsonLineRecord {readonly line: number; readonly value: JsonValue;}

export function isJsonObject(value: JsonValue | unknown): value is JsonObject {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function jsonValue(value: unknown): JsonValue | null {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return value;
    if (typeof value === 'number') return Number.isFinite(value) ? value : null;
    if (Array.isArray(value)) {
        const items: JsonValue[] = [];
        for (const item of value) { const parsed = jsonValue(item); if (parsed === null && item !== null) return null; items.push(parsed); }
        return items;
    }
    if (typeof value === 'object') {
        const entries: Array<[string, JsonValue]> = [];
        for (const [key, item] of Object.entries(value)) { const parsed = jsonValue(item); if (parsed === null && item !== null) return null; entries.push([key, parsed]); }
        return Object.fromEntries(entries);
    }
    return null;
}

export function stringField(value: JsonObject, key: string): string | null { return typeof value[key] === 'string' ? value[key] : null; }
export function numberField(value: JsonObject, key: string): number | null { return typeof value[key] === 'number' && Number.isFinite(value[key]) ? value[key] : null; }
export function objectField(value: JsonObject, key: string): JsonObject | null { return isJsonObject(value[key]) ? value[key] : null; }
export function arrayField(value: JsonObject, key: string): readonly JsonValue[] | null { return Array.isArray(value[key]) ? value[key] : null; }

export function hasExactShape(value: JsonValue, required: readonly string[], allowed: readonly string[]): value is JsonObject {
    if (!isJsonObject(value)) return false;
    const keys = Object.keys(value);
    return required.every(key => keys.includes(key)) && keys.every(key => allowed.includes(key));
}

export function failure(reason: CoordinatorReadReason, path: string, line?: number): JsonObject {
    return line === undefined ? {ok: false, reason, path} : {ok: false, reason, path, line};
}

export function readFailure<T = never>(reason: CoordinatorReadReason, path: string, line?: number): ReadResult<T> {
    return line === undefined ? {ok: false, reason, path} : {ok: false, reason, path, line};
}
