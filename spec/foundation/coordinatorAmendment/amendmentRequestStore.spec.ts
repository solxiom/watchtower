/**
 * CA-27 `AmendmentRequestStore` proof: `create` is a durable handoff record
 * and never a pack edit (`docs/spec/coordinator-automation.md` §11.2), and
 * `recordAcceptance` enforces authority/independence defensively at the
 * effect boundary — never trusting a caller's claim alone, even though CA-09's
 * `checkSpecResolutionAuthority` already re-derives the same proof from this
 * store's projection before an admission is ever attempted.
 */
import {readdirSync} from 'node:fs';
import {AmendmentError} from '../../../src/foundation/lane/coordinator/amendment/amendmentContracts.js';
import {amendmentRequestsDir, amendmentRequestsPath} from '../../../src/foundation/lane/coordinator/amendment/amendmentPersistence.js';
import {acceptedRecordFor, makeLaneDir, queueFiles, removeLaneDir, storeFor, LANE_ID} from './support/amendmentFixtures.js';

function reasonOf(error: unknown): string | undefined {
    return (error as {reason?: string}).reason;
}

describe('CA-27 AmendmentRequestStore', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('creates a pending amendment request and lists it back', () => {
        const store = storeFor(laneDir);
        const record = store.create({packId: 'pack-1', reason: 'drift'});
        expect(record).toEqual({
            amendmentRequestId: 'amend-1', packId: 'pack-1', reason: 'drift',
            requestedAt: jasmine.any(String) as unknown as string, status: 'pending'
        });
        expect(store.get('amend-1')).toEqual(record);
        expect(store.list()).toEqual([record]);
    });

    it('refuses an empty packId or reason', () => {
        const store = storeFor(laneDir);
        expect(() => store.create({packId: '', reason: 'drift'})).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_PACK_ID_REQUIRED');
        expect(() => store.create({packId: 'pack-1', reason: ' '})).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_REASON_REQUIRED');
    });

    it('never writes outside its own coordinator/amendment-requests/ directory', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        const coordinatorEntries = readdirSync(`${laneDir}/coordinator`);
        expect(coordinatorEntries).toEqual(['amendment-requests']);
    });

    it('records an independently-reviewed acceptance and marks the request accepted', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        expect(store.get('amend-1')?.status).toBe('accepted');
        expect(store.acceptedAmendments()).toEqual({'amend-1': acceptedRecordFor()});
    });

    it('refuses an accepted record for a request that does not exist', () => {
        const store = storeFor(laneDir);
        expect(() => store.recordAcceptance(acceptedRecordFor()))
            .toThrowMatching((error: Error) => error instanceof AmendmentError && reasonOf(error) === 'AMENDMENT_NOT_FOUND');
    });

    it('refuses a non-independent, non-committed, or non-reviewer acceptance', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        expect(() => store.recordAcceptance(acceptedRecordFor({reviewerSessionId: 'author-1'})))
            .toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_INDEPENDENCE_VIOLATION');
        expect(() => store.recordAcceptance(acceptedRecordFor({committed: false as unknown as true})))
            .toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_INDEPENDENCE_VIOLATION');
        expect(() => store.recordAcceptance(acceptedRecordFor({independent: false as unknown as true})))
            .toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_INDEPENDENCE_VIOLATION');
    });

    it('is idempotent for an identical re-acceptance and refuses a conflicting one', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        expect(() => store.recordAcceptance(acceptedRecordFor())).not.toThrow();
        expect(() => store.recordAcceptance(acceptedRecordFor({packAcceptanceRef: 'different.json'})))
            .toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_ALREADY_ACCEPTED');
    });

    it('is durable across store instances over the same lane directory', () => {
        const first = storeFor(laneDir);
        const record = first.create({packId: 'pack-1', reason: 'drift'});
        const second = storeFor(laneDir);
        expect(second.get('amend-1')).toEqual(record);
    });

    function writeRawDocument(accepted: Record<string, unknown>): void {
        queueFiles.ensureDirectory(amendmentRequestsDir(laneDir));
        queueFiles.writeAtomic(amendmentRequestsPath(laneDir), `${JSON.stringify({
            schemaVersion: 1, laneId: LANE_ID,
            requests: [{amendmentRequestId: 'amend-1', packId: 'pack-1', reason: 'drift', requestedAt: '2026-08-08T00:00:00.000Z', status: 'accepted'}],
            accepted, admitted: {}, projectionRevision: 0
        })}\n`);
    }

    function expectRejectedDocument(accepted: Record<string, unknown>): void {
        writeRawDocument(accepted);
        expect(() => storeFor(laneDir).list())
            .toThrowMatching((error: Error) => error instanceof AmendmentError && reasonOf(error) === 'AMENDMENT_STATE_UNREADABLE');
    }

    it('rejects a persisted accepted-map entry whose key does not match its record\'s own amendmentRequestId (CA27-01)', () => {
        expectRejectedDocument({'amend-1': {...acceptedRecordFor(), amendmentRequestId: 'amend-2'}});
    });

    it('rejects a persisted accepted record with a malformed seal, commit, or role literal (CA27-01)', () => {
        expectRejectedDocument({'amend-1': {...acceptedRecordFor(), candidateSeal: 'not-a-seal'}});
        expectRejectedDocument({'amend-1': {...acceptedRecordFor(), newReviewedCommit: 'not-a-commit-sha'}});
        expectRejectedDocument({'amend-1': {...acceptedRecordFor(), reviewerRole: 'operator'}});
        expectRejectedDocument({'amend-1': {...acceptedRecordFor(), verdict: 'reject'}});
    });

    it('rejects a persisted accepted record carrying an unrecognized or missing member (CA27-01)', () => {
        expectRejectedDocument({'amend-1': {...acceptedRecordFor(), unexpectedField: 'x'}});
        const {impactDigest: _omit, ...withoutImpactDigest} = acceptedRecordFor();
        expectRejectedDocument({'amend-1': withoutImpactDigest});
    });

    it('rejects a persisted accepted record whose reviewer and author sessions collide (CA27-01)', () => {
        expectRejectedDocument({'amend-1': {...acceptedRecordFor(), reviewerSessionId: 'same-session', authorSessionId: 'same-session'}});
    });

    /**
     * Review correction CA27-07: closed field syntax alone is not enough — the
     * `requests`/`accepted`/`admitted` maps must also agree with each other.
     * Each of these documents is internally well-formed at every individual
     * layer and would have passed before this correction; each represents
     * durable state that could never result from this capsule's own writers
     * (`AmendmentRequestStore.recordAcceptance` and
     * `AmendmentAdmissionService.settleProjection` always update a request's
     * `status` and its cross-referenced map entry in the same durable write).
     */
    function writeRawRelationalDocument(document: {
        readonly requests: readonly Record<string, unknown>[];
        readonly accepted: Record<string, unknown>;
        readonly admitted: Record<string, unknown>;
    }): void {
        queueFiles.ensureDirectory(amendmentRequestsDir(laneDir));
        queueFiles.writeAtomic(amendmentRequestsPath(laneDir), `${JSON.stringify({
            schemaVersion: 1, laneId: LANE_ID, projectionRevision: 0, ...document
        })}\n`);
    }

    function expectRejectedFullDocument(document: {
        readonly requests: readonly Record<string, unknown>[];
        readonly accepted: Record<string, unknown>;
        readonly admitted: Record<string, unknown>;
    }): void {
        writeRawRelationalDocument(document);
        expect(() => storeFor(laneDir).list())
            .toThrowMatching((error: Error) => error instanceof AmendmentError && reasonOf(error) === 'AMENDMENT_STATE_UNREADABLE');
    }

    const pendingRequest = {amendmentRequestId: 'amend-1', packId: 'pack-1', reason: 'drift', requestedAt: '2026-08-08T00:00:00.000Z', status: 'pending'};
    const acceptedRequest = {...pendingRequest, status: 'accepted'};
    const admittedRequest = {...pendingRequest, status: 'admitted'};
    const admittedState = {blockerId: 'blocker-1', activeSeal: acceptedRecordFor().candidateSeal, requiredCommit: acceptedRecordFor().newReviewedCommit};

    it('rejects an accepted record with no corresponding amendment request (orphan accepted, CA27-07)', () => {
        expectRejectedFullDocument({requests: [], accepted: {'amend-1': acceptedRecordFor()}, admitted: {}});
    });

    it('rejects an accepted record whose own request is still pending (pending+accepted mismatch, CA27-07)', () => {
        expectRejectedFullDocument({requests: [pendingRequest], accepted: {'amend-1': acceptedRecordFor()}, admitted: {}});
    });

    it('rejects an admitted revision with no corresponding accepted record (orphan admitted, CA27-07)', () => {
        expectRejectedFullDocument({requests: [admittedRequest], accepted: {}, admitted: {'blocker-1': admittedState}});
    });

    it('rejects an admitted revision whose accepted request is not itself marked admitted (CA27-07)', () => {
        expectRejectedFullDocument({requests: [acceptedRequest], accepted: {'amend-1': acceptedRecordFor()}, admitted: {'blocker-1': admittedState}});
    });

    /**
     * Review correction CA27-08: the converse of the previous case. A request
     * marked `'admitted'` with an accepted record but *no* matching
     * `admitted[blockerId]` projection is exactly the reviewer's own
     * reproduction — internally well-formed at every individual layer, and
     * impossible to produce through this capsule's own writer, which always
     * updates `status`, `accepted`, and `admitted` together in one write.
     */
    it('rejects a request marked admitted with no matching admitted[blockerId] projection (reverse invariant, CA27-08)', () => {
        expectRejectedFullDocument({requests: [admittedRequest], accepted: {'amend-1': acceptedRecordFor()}, admitted: {}});
    });

    it('accepts the exact closed relational shape this capsule writes at every lifecycle stage (CA27-07)', () => {
        writeRawRelationalDocument({requests: [pendingRequest], accepted: {}, admitted: {}});
        expect(storeFor(laneDir).list()).toEqual([jasmine.objectContaining({status: 'pending'})]);
        writeRawRelationalDocument({requests: [acceptedRequest], accepted: {'amend-1': acceptedRecordFor()}, admitted: {}});
        expect(storeFor(laneDir).list()).toEqual([jasmine.objectContaining({status: 'accepted'})]);
        writeRawRelationalDocument({requests: [admittedRequest], accepted: {'amend-1': acceptedRecordFor()}, admitted: {'blocker-1': admittedState}});
        expect(storeFor(laneDir).list()).toEqual([jasmine.objectContaining({status: 'admitted'})]);
    });
});
