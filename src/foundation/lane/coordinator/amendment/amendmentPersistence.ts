/**
 * Durable form of `coordinator/amendment-requests/amendment-requests.json`
 * (CA-27). Mirrors `holdPersistence.ts`/`queuePersistence.ts`: an absent or
 * empty file is a legitimate initial state, an unreadable or malformed one
 * fails closed.
 *
 * Review correction CA27-01: `accepted`/`admitted` are external-trust-boundary
 * maps, not opaque blobs — every nested `AcceptedAmendmentRecord`/
 * `AdmittedRevisionState` field is validated against its closed syntax
 * (non-empty identity strings, `sha256:<64 hex>` seals, 40-hex commits, the
 * exact `committed`/`verdict`/`reviewerRole`/`independent` literals, no
 * unrecognized member), and each map key must equal the record's own declared
 * identity — a mismatched key/record binding is exactly the kind of forged
 * state this boundary must fail closed on rather than silently trust.
 */
import {join} from 'node:path';
import {
    AmendmentError, emptyAmendmentDocument, type AcceptedAmendmentRecord, type AdmittedRevisionState,
    type AmendmentRequestDocument, type AmendmentRequestRecord, type AmendmentRequestStatus
} from './amendmentContracts.js';
import {
    isCommitSha, isIsoDateTime, isNonEmptyString, isNonNegativeInteger, isSealDigest, isSealDigestOrEmpty, isStringArray
} from '../coordinatorRecordValidation.js';
import type {QueueFileSystem} from '../queue/queuePorts.js';

const MAX_PROJECTION_BYTES = 4 * 1024 * 1024;
const REQUEST_STATUSES: readonly AmendmentRequestStatus[] = Object.freeze(['pending', 'accepted', 'admitted']);
const DOCUMENT_KEYS = Object.freeze(['schemaVersion', 'laneId', 'requests', 'accepted', 'admitted', 'projectionRevision']);
const REQUEST_KEYS = Object.freeze(['amendmentRequestId', 'packId', 'reason', 'requestedAt', 'status']);
const ACCEPTED_KEYS = Object.freeze([
    'amendmentRequestId', 'blockerId', 'resolutionId', 'supersedesSeal', 'candidateSeal', 'parentReviewedCommit',
    'newReviewedCommit', 'packAcceptanceRef', 'reviewerSessionId', 'authorSessionId', 'committed', 'verdict',
    'reviewerRole', 'independent', 'changedPaths', 'changedRequirementIds', 'impactDigest', 'sealAlgorithm', 'sealVersion'
]);
const ADMITTED_KEYS = Object.freeze(['blockerId', 'activeSeal', 'requiredCommit']);

export function amendmentRequestsDir(laneDir: string): string {
    return join(laneDir, 'coordinator', 'amendment-requests');
}

export function amendmentRequestsPath(laneDir: string): string {
    return join(amendmentRequestsDir(laneDir), 'amendment-requests.json');
}

export function readAmendmentDocument(laneDir: string, laneId: string, files: QueueFileSystem): AmendmentRequestDocument {
    const path = amendmentRequestsPath(laneDir);
    const read = files.readText(path, MAX_PROJECTION_BYTES);
    if (read.kind === 'missing') return emptyAmendmentDocument(laneId);
    if (read.kind === 'unreadable') {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, `The amendment-request projection exists but could not be read (${read.reason}).`);
    }
    if (read.text.trim() === '') return emptyAmendmentDocument(laneId);
    let value: unknown;
    try {
        value = JSON.parse(read.text);
    } catch {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'The amendment-request projection is not well-formed JSON.');
    }
    return parseAmendmentDocument(value, path, laneId);
}

export function writeAmendmentDocument(laneDir: string, document: AmendmentRequestDocument, files: QueueFileSystem): void {
    const path = amendmentRequestsPath(laneDir);
    try {
        files.ensureDirectory(amendmentRequestsDir(laneDir));
        files.writeAtomic(path, `${JSON.stringify(document)}\n`);
    } catch (error) {
        throw new AmendmentError('AMENDMENT_STATE_WRITE_FAILED', path, `The amendment-request projection could not be durably written: ${(error as Error).message}`);
    }
}

function parseAmendmentDocument(value: unknown, path: string, expectedLaneId: string): AmendmentRequestDocument {
    if (!isPlainObject(value) || !hasExactKeys(value, DOCUMENT_KEYS)) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'The amendment-request projection is not a JSON object with the declared schema members.');
    }
    if (value.schemaVersion !== 1 || value.laneId !== expectedLaneId || !Array.isArray(value.requests)
        || !isPlainObject(value.accepted) || !isPlainObject(value.admitted) || !isNonNegativeInteger(value.projectionRevision)) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
            'The amendment-request projection schema version, lane ID, requests array, accepted/admitted maps, or projection revision is invalid.');
    }
    const requests = value.requests.map((entry) => parseRequest(entry, path));
    const requestIds = new Set<string>();
    for (const request of requests) {
        if (requestIds.has(request.amendmentRequestId)) {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, `duplicate amendment-request ID "${request.amendmentRequestId}".`);
        }
        requestIds.add(request.amendmentRequestId);
    }
    const accepted = parseAcceptedMap(value.accepted, path);
    const admitted = parseAdmittedMap(value.admitted, path);
    assertCrossRecordInvariants(requests, accepted, admitted, path);
    return Object.freeze({
        schemaVersion: 1 as const, laneId: expectedLaneId, requests: Object.freeze(requests),
        accepted: Object.freeze(accepted), admitted: Object.freeze(admitted), projectionRevision: value.projectionRevision
    });
}

/**
 * Review correction CA27-07: closed field syntax at each of `requests`/
 * `accepted`/`admitted` is not enough — a document can carry three internally
 * well-formed maps that disagree with each other, and `acceptedAmendments()`/
 * `admittedRevisions()` hand those straight to CA-09/CA-10 as trusted
 * projections. This is the one place their required relationship is proved
 * before the document is ever returned:
 *
 * - every `accepted` entry names a request that actually exists in `requests`
 *   (an orphan accepted record is corrupt state, not a legitimate acceptance
 *   of nothing);
 * - that request's own `status` is never `'pending'` once it carries an
 *   accepted record — an accepted record is exactly what makes a request
 *   *not* pending, so the two fields disagreeing is a hand-edit or a torn
 *   write, never a valid durable fact;
 * - every `admitted` entry (keyed by `blockerId`) traces back to an `accepted`
 *   record for that same `blockerId` (an admitted revision with no accepted
 *   record behind it is corrupt state — nothing in this capsule ever admits
 *   without first reading an accepted record); and
 * - that accepted record's own request is `status === 'admitted'` — an
 *   admitted revision whose request the document itself still calls
 *   `'accepted'` is the same kind of torn, disagreeing state; and
 * - review correction CA27-08, the converse of the previous rule: every
 *   request whose own `status` is `'admitted'` has a matching `accepted`
 *   record *and* a matching `admitted[blockerId]` projection. Both durable
 *   writers (`AmendmentAdmissionService.settleProjection`) update a request's
 *   `status`, its `accepted` entry, and its `admitted[blockerId]` entry in the
 *   same write, so a request claiming `'admitted'` with no accepted record or
 *   no matching admitted projection is exactly the same kind of torn state the
 *   forward checks above refuse — accepting it would let `admittedRevisions()`
 *   silently lose an admitted revision the document itself says exists.
 */
function assertCrossRecordInvariants(
    requests: readonly AmendmentRequestRecord[], accepted: Record<string, AcceptedAmendmentRecord>,
    admitted: Record<string, AdmittedRevisionState>, path: string
): void {
    const requestById = new Map(requests.map((request) => [request.amendmentRequestId, request]));
    for (const [requestId, record] of Object.entries(accepted)) {
        const request = requestById.get(requestId);
        if (request === undefined) {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
                `accepted record "${requestId}" has no corresponding entry in the amendment-request list.`);
        }
        if (request.status === 'pending') {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
                `amendment request "${requestId}" carries an accepted record but its own status is still "pending".`);
        }
    }
    const acceptedByBlockerId = new Map(Object.values(accepted).map((record) => [record.blockerId, record]));
    for (const blockerId of Object.keys(admitted)) {
        const record = acceptedByBlockerId.get(blockerId);
        if (record === undefined) {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
                `admitted revision "${blockerId}" has no corresponding accepted amendment record.`);
        }
        const request = requestById.get(record.amendmentRequestId);
        if (request === undefined || request.status !== 'admitted') {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
                `admitted revision "${blockerId}" does not correspond to a request whose status is "admitted".`);
        }
    }
    for (const request of requests) {
        if (request.status !== 'admitted') continue;
        const record = accepted[request.amendmentRequestId];
        if (record === undefined || admitted[record.blockerId] === undefined) {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
                `amendment request "${request.amendmentRequestId}" is marked "admitted" but carries no matching accepted record and admitted projection.`);
        }
    }
}

function parseRequest(value: unknown, path: string): AmendmentRequestRecord {
    if (!isPlainObject(value) || !hasExactKeys(value, REQUEST_KEYS)) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'An amendment-request record is not a JSON object with the declared members.');
    }
    if (!isNonEmptyString(value.amendmentRequestId) || !isNonEmptyString(value.packId) || !isNonEmptyString(value.reason)
        || !isIsoDateTime(value.requestedAt)
        || typeof value.status !== 'string' || !REQUEST_STATUSES.includes(value.status as AmendmentRequestStatus)) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'An amendment-request record fails its closed field syntax.');
    }
    return Object.freeze({
        amendmentRequestId: value.amendmentRequestId, packId: value.packId, reason: value.reason,
        requestedAt: value.requestedAt, status: value.status as AmendmentRequestStatus
    });
}

function parseAcceptedMap(value: Record<string, unknown>, path: string): Record<string, AcceptedAmendmentRecord> {
    const result: Record<string, AcceptedAmendmentRecord> = {};
    for (const [key, entry] of Object.entries(value)) {
        const record = parseAcceptedRecord(entry, path);
        if (record.amendmentRequestId !== key) {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
                `accepted map key "${key}" does not match its record's own amendmentRequestId "${record.amendmentRequestId}".`);
        }
        result[key] = record;
    }
    return result;
}

function parseAcceptedRecord(value: unknown, path: string): AcceptedAmendmentRecord {
    if (!isPlainObject(value) || !hasExactKeys(value, ACCEPTED_KEYS)) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'An accepted-amendment record is not a JSON object with the declared members.');
    }
    if (!isNonEmptyString(value.amendmentRequestId) || !isNonEmptyString(value.blockerId) || !isNonEmptyString(value.resolutionId)
        || !isSealDigestOrEmpty(value.supersedesSeal) || !isSealDigest(value.candidateSeal)
        || !isCommitSha(value.parentReviewedCommit) || !isCommitSha(value.newReviewedCommit)
        || !isNonEmptyString(value.packAcceptanceRef) || !isNonEmptyString(value.reviewerSessionId) || !isNonEmptyString(value.authorSessionId)
        || value.committed !== true || value.verdict !== 'accept' || value.reviewerRole !== 'reviewer' || value.independent !== true
        || !isStringArray(value.changedPaths) || !isStringArray(value.changedRequirementIds)
        || !isNonEmptyString(value.impactDigest) || !isNonEmptyString(value.sealAlgorithm) || !isNonEmptyString(value.sealVersion)
        || value.reviewerSessionId === value.authorSessionId) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'An accepted-amendment record fails its closed field syntax or independence invariant.');
    }
    return Object.freeze({
        amendmentRequestId: value.amendmentRequestId, blockerId: value.blockerId, resolutionId: value.resolutionId,
        supersedesSeal: value.supersedesSeal, candidateSeal: value.candidateSeal, parentReviewedCommit: value.parentReviewedCommit,
        newReviewedCommit: value.newReviewedCommit, packAcceptanceRef: value.packAcceptanceRef,
        reviewerSessionId: value.reviewerSessionId, authorSessionId: value.authorSessionId,
        committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true,
        changedPaths: Object.freeze([...value.changedPaths]), changedRequirementIds: Object.freeze([...value.changedRequirementIds]),
        impactDigest: value.impactDigest, sealAlgorithm: value.sealAlgorithm, sealVersion: value.sealVersion
    });
}

function parseAdmittedMap(value: Record<string, unknown>, path: string): Record<string, AdmittedRevisionState> {
    const result: Record<string, AdmittedRevisionState> = {};
    for (const [key, entry] of Object.entries(value)) {
        const record = parseAdmittedRecord(entry, path);
        if (record.blockerId !== key) {
            throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path,
                `admitted map key "${key}" does not match its record's own blockerId "${record.blockerId}".`);
        }
        result[key] = record;
    }
    return result;
}

function parseAdmittedRecord(value: unknown, path: string): AdmittedRevisionState {
    if (!isPlainObject(value) || !hasExactKeys(value, ADMITTED_KEYS)) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'An admitted-revision record is not a JSON object with the declared members.');
    }
    if (!isNonEmptyString(value.blockerId) || !isSealDigest(value.activeSeal) || !isCommitSha(value.requiredCommit)) {
        throw new AmendmentError('AMENDMENT_STATE_UNREADABLE', path, 'An admitted-revision record fails its closed field syntax.');
    }
    return Object.freeze({blockerId: value.blockerId, activeSeal: value.activeSeal, requiredCommit: value.requiredCommit});
}

function isPlainObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    const actual = Object.keys(value);
    return actual.length === keys.length && keys.every((key) => key in value);
}
