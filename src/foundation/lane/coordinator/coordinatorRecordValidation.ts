/**
 * Shared closed-field predicates for CA-27's `hold/` and `amendment/`
 * persistence parsers (review correction CA27-01: "filesystem JSON is an
 * external trust boundary" — every nested field, not just the outer object
 * shape, must be validated before a durable record is trusted).
 *
 * Pure predicates only; no parsing algorithm or ownership decision lives
 * here, so this is not a second index/query/routing owner — it is the one
 * place the two sibling capsules' identical field-syntax checks live instead
 * of being copied twice.
 */
import {PROPOSAL_ORIGINS, type ProposalOrigin} from '../../../contracts/proposals.js';

const ISO_DATE_TIME = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{1,9})?Z$/u;
const SEAL_DIGEST = /^sha256:[0-9a-f]{64}$/u;
const COMMIT_SHA = /^[0-9a-f]{40}$/u;

/** Strict RFC 3339 UTC `Z` timestamp — `Date.parse` alone accepts far looser input than the durable contract permits. */
export function isIsoDateTime(value: unknown): value is string {
    return typeof value === 'string' && ISO_DATE_TIME.test(value) && !Number.isNaN(Date.parse(value));
}

export function isSealDigest(value: unknown): value is string {
    return typeof value === 'string' && SEAL_DIGEST.test(value);
}

/** `supersedesSeal` for a lane's first-ever activation is legitimately `''` (`packRevisionActivation.ts`); every other seal field must be a full digest. */
export function isSealDigestOrEmpty(value: unknown): value is string {
    return value === '' || isSealDigest(value);
}

export function isCommitSha(value: unknown): value is string {
    return typeof value === 'string' && COMMIT_SHA.test(value);
}

export function isNonEmptyString(value: unknown): value is string {
    return typeof value === 'string' && value.trim() !== '';
}

export function isNonNegativeInteger(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= 0;
}

export function isProposalOrigin(value: unknown): value is ProposalOrigin {
    return typeof value === 'string' && (PROPOSAL_ORIGINS as readonly string[]).includes(value);
}

export function isStringArray(value: unknown): value is readonly string[] {
    return Array.isArray(value) && value.every((entry) => typeof entry === 'string');
}

export function isNonEmptyStringArrayNoDuplicates(value: unknown): value is readonly string[] {
    if (!isStringArray(value) || value.length === 0) return false;
    if (value.some((entry) => entry.trim() === '')) return false;
    return new Set(value).size === value.length;
}
