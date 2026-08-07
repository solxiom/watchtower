/**
 * The one place a CA-10 durable artifact becomes bytes.
 *
 * Every artifact this capability writes — the invocation envelope, its
 * checksum, each effect-journal record, the active pack-revision pointer — is
 * canonicalized under the site-wide RFC 8785 canonicalizer
 * (`schemaComposition/jsonCanonicalizer.ts`, `v1-contracts.md` §3.4), never a
 * second `JSON.stringify` convention. Two artifacts with the same meaning must
 * therefore produce identical bytes and identical digests.
 *
 * Serialization is also the last fence before authoritative bytes exist, so a
 * value that is not valid JSON — a non-finite number, a lone surrogate, an
 * undefined member that would silently vanish — is refused here rather than
 * written in a form that could never be read back. `EffectPlan.parameters`
 * originates outside this boundary, which is exactly why it is proved rather
 * than assumed.
 */
import {EffectExecutionError} from '../../contracts/effects.js';
import {canonicalJson, formattedCanonicalJson, isJsonValue, semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';

/** One-line canonical form, for a JSONL journal record. */
export function canonicalBytes(value: unknown, subject: string): string {
    return canonicalJson(assertJson(value, subject));
}

/** Indented canonical form with a trailing newline, for a durable pointer file. */
export function formattedCanonicalBytes(value: unknown, subject: string): string {
    return formattedCanonicalJson(assertJson(value, subject));
}

/** The digest an envelope binds itself with, over the same canonical bytes. */
export function canonicalDigest(value: unknown, subject: string): `sha256:${string}` {
    return semanticDigest(assertJson(value, subject));
}

function assertJson(value: unknown, subject: string) {
    if (!isJsonValue(value)) {
        throw new EffectExecutionError('EFFECT_PLAN_INVALID', subject,
            'A durable effect artifact must be a valid JSON value before it is written.');
    }
    return value;
}
