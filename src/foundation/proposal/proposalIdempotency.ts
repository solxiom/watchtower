/**
 * Idempotency-key computation (`docs/spec/v1-contracts.md` §5 "The idempotency
 * key is the SHA-256 semantic digest of lane ID, proposal ID, effect type,
 * target identities, snapshot digest, and policy version"; §3.4 RFC 8785).
 * Reuses the site-wide canonicalizer (`jsonCanonicalizer.ts`) rather than a
 * second canonical-JSON implementation.
 */
import {semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';
import type {EffectType} from '../../contracts/index.js';

export function computeIdempotencyKey(
    laneId: string,
    proposalId: string,
    effectType: EffectType,
    targetIds: readonly string[],
    snapshotDigest: string,
    policyVersion: string
): string {
    return semanticDigest({laneId, proposalId, effectType, targetIds: [...targetIds], snapshotDigest, policyVersion});
}
