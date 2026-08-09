/**
 * The primitive value checks every session-proposal durable record is built
 * from (CA-26), and the one rule that makes each record *closed*: an object
 * carrying a member this capability does not name is corrupt, not tolerable.
 *
 * These are deliberately separate from `sessionProposalDocument.ts`, which owns
 * *which* members a document has. This module owns *what a member may be*, so
 * the document module reads as a shape declaration rather than a mix of shape
 * and string handling.
 *
 * Nothing here reads a file, a clock, or the validator, and nothing decides a
 * lifecycle question.
 */
import {isRfc3339DateTime} from '../../../schemaComposition/index.js';
import type {JsonObject} from '../../../../contracts/types.js';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;

/** A cycle presents as unbounded nesting; the depth ceiling refuses it without a visited set. */
const MAX_JSON_DEPTH = 32;

export class SessionProposalDocumentError extends Error {
    constructor(readonly subject: string, message: string) {
        super(message);
        this.name = 'SessionProposalDocumentError';
    }
}

export function fail(subject: string, message: string): never {
    throw new SessionProposalDocumentError(subject, `${subject} ${message}`);
}

export function object(value: unknown, subject: string): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(subject, 'must be an object');
    return value as Record<string, unknown>;
}

/**
 * An object whose member set is exactly the closed set this capability names.
 *
 * A durable record is a trust boundary: an unknown member is either a
 * different schema version, a hand edit, or a value some other writer expects
 * to survive a round trip through here — and this capsule rewrites the whole
 * document on every transition, so it cannot honour any of the three. Refusing
 * is the only answer that never silently drops data.
 */
export function closedObject(value: unknown, subject: string, allowed: readonly string[]): Record<string, unknown> {
    const record = object(value, subject);
    const unexpected = Object.keys(record).filter((key) => !allowed.includes(key)).sort();
    if (unexpected.length > 0) fail(subject, `carries unsupported member(s) ${unexpected.join(', ')}`);
    return record;
}

export function text(value: unknown, subject: string): string {
    if (!isBoundedText(value)) fail(subject, 'must be bounded text');
    return value;
}

/**
 * The one definition of "text this capsule will durably store" — bounded,
 * non-empty, and free of control characters (review correction CA26-R3-02).
 *
 * It was previously enforced only on the **read** path, which let a write
 * accept a value its own reader would later refuse: `reject(ref, '\n')`
 * committed a document and published its event, and the next load reported the
 * proposal as corrupt. Exporting the predicate is what lets the write path
 * refuse the same values the read path does, from a single rule.
 */
export function isBoundedText(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 512 && !/[\x00-\x1f\x7f]/u.test(value);
}

/**
 * Coerce an internally generated diagnostic (a store error message, a validator
 * detail) into storable text. Operator input is **refused** rather than
 * coerced — silently altering what an operator wrote would be a second,
 * invisible authority — but a diagnostic string is evidence, not authority, so
 * a newline in an I/O error must not be able to brick the record.
 */
export function storableDetail(value: string): string {
    const flattened = value.replace(/[\x00-\x1f\x7f]/gu, ' ').trim();
    if (flattened.length === 0) return '(no detail)';
    return flattened.length > 512 ? `${flattened.slice(0, 509)}...` : flattened;
}

/**
 * An identity that also names a filesystem segment. Bounded text is not
 * enough: a separator or dot segment in either identity would let one document
 * address a different file, so both are held to a single safe segment here —
 * at the parser, before any path is built from them.
 */
export function identity(value: unknown, subject: string): string {
    const parsed = text(value, subject);
    if (!/^[A-Za-z0-9][A-Za-z0-9._-]{0,127}$/u.test(parsed) || parsed.includes('..')) {
        fail(subject, 'must be a single bounded identity segment without separators or dot segments');
    }
    return parsed;
}

export function date(value: unknown, subject: string): string {
    const parsed = text(value, subject);
    if (!isRfc3339DateTime(parsed)) fail(subject, 'must be an RFC 3339 date-time');
    return parsed;
}

export function digest(value: unknown, subject: string): `sha256:${string}` {
    const parsed = text(value, subject);
    if (!DIGEST.test(parsed)) fail(subject, 'must be a sha256 digest');
    return parsed as `sha256:${string}`;
}

export function member<T extends string>(value: unknown, allowed: readonly T[], subject: string): T {
    if (typeof value !== 'string' || !allowed.includes(value as T)) fail(subject, 'is not a supported value');
    return value as T;
}

/**
 * A member that must be *present* — as an explicit value or an explicit
 * `null` — but never simply absent. A durable record that omits a member this
 * capability declares is corrupt in the same way an unsupported member is
 * (review correction CA26-R2-03): `JSON.parse` can never produce a literal
 * `undefined` value, so an absent key and `record[key] === undefined` are the
 * same fact, and this is the one place that fact becomes a typed refusal
 * instead of silently reading as `null`.
 */
export function requiredMember(record: Record<string, unknown>, key: string, subject: string): unknown {
    if (!(key in record)) fail(subject, 'is a required member and is missing');
    return record[key];
}

/** An explicit `null` or exactly one of the allowed values. The caller must prove the member is present first. */
export function optionalMember<T extends string>(value: unknown, allowed: readonly T[], subject: string): T | null {
    return value === null ? null : member(value, allowed, subject);
}

/** An explicit `null` or bounded text. The caller must prove the member is present first. */
export function optionalText(value: unknown, subject: string): string | null {
    return value === null ? null : text(value, subject);
}

/**
 * A checked `unknown` → `JsonObject` narrowing. The carried proposal is
 * round-tripped through durable JSON, so proving it is JSON *here* is what lets
 * the rest of the capsule treat it as data rather than take it on a cast:
 * `undefined`, functions, class instances, cycles, and non-finite numbers all
 * fail closed instead of serializing into something a later read cannot parse.
 */
export function asJsonObject(value: unknown, subject: string): JsonObject {
    const record = object(value, subject);
    for (const [key, entry] of Object.entries(record)) assertJsonValue(entry, `${subject}.${key}`, 1);
    return record as JsonObject;
}

function assertJsonValue(value: unknown, subject: string, depth: number): void {
    if (depth > MAX_JSON_DEPTH) fail(subject, 'exceeds the maximum JSON nesting depth');
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) fail(subject, 'must be a finite number');
        return;
    }
    if (Array.isArray(value)) {
        value.forEach((item, index) => assertJsonValue(item, `${subject}[${index}]`, depth + 1));
        return;
    }
    if (typeof value === 'object' && Object.getPrototypeOf(value) === Object.prototype) {
        for (const [key, entry] of Object.entries(value as Record<string, unknown>)) assertJsonValue(entry, `${subject}.${key}`, depth + 1);
        return;
    }
    fail(subject, 'must be a JSON value');
}
