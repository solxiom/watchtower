/**
 * Provenance and redaction (`docs/spec/coordinator-automation.md` §10.1
 * steps 3-4, 6). Redaction is real content removal, not just hashing:
 * `redactJsonValue` walks the resolved content tree and replaces every
 * value whose key matches the repository's one sensitive-key contract
 * (`SENSITIVE_KEY_PATTERN`, owned by `parsing/envParser.ts` — reused here,
 * not duplicated) with a fixed marker, regardless of nesting depth or
 * value type. Digesting and byte-limit enforcement then run over the
 * *redacted* content, so the returned provenance digest is exactly what a
 * caller receives — never a hash of bytes that were withheld.
 *
 * Content is already source-bounded (CA-02's page/depth/limit parameters);
 * an oversized response after redaction fails closed with
 * `BROKER_HARD_LIMIT_EXCEEDED` rather than truncating arbitrary JSON
 * structure, which could silently corrupt a dependency graph or requirement
 * list into something that reads as complete. Bounding happens by
 * requesting a smaller page/depth from the content source, not by clipping
 * bytes after the fact.
 */
import type {EnvelopeDigest} from '../../contracts/decision.js';
import {SENSITIVE_KEY_PATTERN} from '../parsing/index.js';
import {semanticDigest} from '../schemaComposition/index.js';
import type {JsonValue} from '../schemaComposition/index.js';
import {brokerFailure} from './contextBrokerErrors.js';

const REDACTED_MARKER = '[REDACTED]';

export interface RedactionResult {
    readonly content: JsonValue;
    readonly redacted: boolean;
    readonly redactedKeys: readonly string[];
}

function redactValue(value: JsonValue, keys: Set<string>): JsonValue {
    if (Array.isArray(value)) return value.map((entry) => redactValue(entry, keys));
    if (value === null || typeof value !== 'object') return value;
    const result: {[field: string]: JsonValue} = {};
    for (const [key, child] of Object.entries(value)) {
        if (SENSITIVE_KEY_PATTERN.test(key)) {
            result[key] = REDACTED_MARKER;
            keys.add(key);
        } else {
            result[key] = redactValue(child, keys);
        }
    }
    return result;
}

/** Recursively strips sensitive-keyed values from any depth of a `JsonValue` tree; never mutates its input. */
export function redactJsonValue(content: JsonValue): RedactionResult {
    const keys = new Set<string>();
    const redactedContent = redactValue(content, keys);
    return {content: redactedContent, redacted: keys.size > 0, redactedKeys: Object.freeze([...keys].sort())};
}

export interface DigestedContent {
    readonly digest: EnvelopeDigest;
    readonly byteLength: number;
}

export function digestContent(content: JsonValue): DigestedContent {
    const digest = semanticDigest(content);
    const byteLength = Buffer.byteLength(JSON.stringify(content), 'utf8');
    return {digest, byteLength};
}

/** Fails closed rather than silently returning fewer bytes than the caller asked for as if complete. */
export function enforceByteLimit(subject: string, byteLength: number, maxBytes: number): void {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) brokerFailure('BROKER_REFERENCE_INVALID', subject, 'maxBytes must be a positive safe integer');
    if (byteLength > maxBytes) brokerFailure('BROKER_HARD_LIMIT_EXCEEDED', subject, `resolved content is ${byteLength} bytes, exceeding the requested ${maxBytes}-byte ceiling`);
}

export function verifyExpectedDigest(subject: string, expected: EnvelopeDigest | undefined, actual: EnvelopeDigest): void {
    if (expected !== undefined && expected !== actual) brokerFailure('BROKER_DIGEST_MISMATCH', subject, 'resolved content digest does not match the caller-supplied expected digest');
}

const TOKEN_ESTIMATE_DIVISOR = 4;

/** A conservative deterministic estimate (bytes / 4); real billing is host-reported where available (`docs/spec/v1-contracts.md` §6/§7). */
export function estimateTokens(byteLength: number): number {
    return Math.ceil(byteLength / TOKEN_ESTIMATE_DIVISOR);
}
