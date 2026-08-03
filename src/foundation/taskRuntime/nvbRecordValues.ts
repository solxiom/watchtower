/**
 * Value-level predicates for the pinned NVB record members.
 *
 * `nvbRunRecords.ts` decides which members a record must carry; this module
 * decides what a single member is allowed to be. Both halves are deliberately
 * strict: a member of the wrong type, an unparsable instant, or a nested value
 * that is not JSON is a forged or drifted producer, never a value to narrow.
 */
import {isJsonObject, isJsonValue} from '../schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../schemaComposition/schemaCompositionContracts.js';

/** ISO-8601 instant with milliseconds and an explicit zone, as the pinned runner emits. */
const INSTANT = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?(?:Z|[+-]\d{2}:\d{2})$/u;

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

/** Exactly a string or `null`; an absent member is not a null member. */
export function isNullableString(value: unknown): value is string | null {
    return value === null || typeof value === 'string';
}

export function isNullableJsonObject(value: unknown): value is JsonObject | null {
    return value === null || (isJsonObject(value) && isJsonValue(value));
}

export function isJsonObjectMember(value: unknown): value is JsonObject {
    return isJsonObject(value) && isJsonValue(value);
}

export function isStringArray(value: unknown): value is readonly string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string');
}

export function isJsonObjectArray(value: unknown): value is readonly JsonObject[] {
    return Array.isArray(value) && value.every(isJsonObjectMember);
}

/** A well-formed, parsable ISO instant; a syntactically plausible date is not enough. */
export function isInstant(value: unknown): value is string {
    return typeof value === 'string' && INSTANT.test(value) && Number.isFinite(Date.parse(value));
}

export function isNullableInstant(value: unknown): value is string | null {
    return value === null || isInstant(value);
}

export function instantOf(value: string | null): number | null {
    return value === null ? null : Date.parse(value);
}

/** Every required member present, every present member known: no more, no less. */
export function hasExactMembers(
    record: Record<string, unknown>,
    required: readonly string[],
    optional: readonly string[] = []
): boolean {
    const keys = Object.keys(record);
    return required.every((name) => Object.hasOwn(record, name))
        && keys.every((key) => required.includes(key) || optional.includes(key));
}
