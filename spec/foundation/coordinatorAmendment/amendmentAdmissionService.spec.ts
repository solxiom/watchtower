/**
 * CA-27 `AmendmentAdmissionService` proof: atomic admission drives CA-10's
 * accepted `activatePackRevision` exactly once per amendment request, records
 * the outcome durably, fails closed on a missing/mismatched accepted record,
 * and — review correction CA27-02 — independently re-proves authority,
 * independence, and seal reproduction itself rather than trusting that CA-09
 * necessarily ran first. A forged-but-flag-valid candidate seal, a missing
 * spec-authority role, and a pack-author/spec-authority session collision must
 * all be refused before the active pointer or amendment document changes.
 */
import {chmodSync} from 'node:fs';
import {join} from 'node:path';
import {EffectExecutionError} from '../../../src/contracts/effects.js';
import {readActiveRevision} from '../../../src/foundation/effect/packRevisionActivation.js';
import {AmendmentError, readAmendmentDocument} from '../../../src/foundation/lane/coordinator/amendment/index.js';
import {CANDIDATE_SEAL, COMMIT_SHA} from '../proposal/support/proposalFixtures.js';
import {
    acceptedRecordFor, admissionServiceFor, admitBodyFor, authorityFor, effectFiles, makeLaneDir, queueFiles,
    removeLaneDir, storeFor, LANE_ID
} from './support/amendmentFixtures.js';

const FORGED_SEAL = `sha256:${'f'.repeat(64)}`;
const OTHER_VALID_SEAL = `sha256:${'9'.repeat(64)}`;

function reasonOf(error: unknown): string | undefined {
    return (error as {reason?: string}).reason;
}

describe('CA-27 AmendmentAdmissionService', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('atomically activates the accepted candidate seal and records the admission', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());

        const service = admissionServiceFor(laneDir);
        const activated = service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: ['wt-1'],
            body: admitBodyFor(), authority: authorityFor()
        });

        expect(activated.activeSeal).toBe(CANDIDATE_SEAL);
        expect(activated.supersedesSeal).toBeNull();
        expect(activated.requiredCommit).toBe(COMMIT_SHA);
        expect(readActiveRevision(laneDir, effectFiles)).toEqual(activated);

        expect(store.get('amend-1')?.status).toBe('admitted');
        expect(store.admittedRevisions()).toEqual({'blocker-1': {blockerId: 'blocker-1', activeSeal: CANDIDATE_SEAL, requiredCommit: COMMIT_SHA}});
    });

    it('is idempotent: a second admission of the same request replays the same outcome without a second write', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        const request = {amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [], body: admitBodyFor(), authority: authorityFor()};

        const first = service.admit(request);
        const revisionAfterFirst = readAmendmentDocument(laneDir, LANE_ID, queueFiles).projectionRevision;
        const second = service.admit(request);
        const revisionAfterSecond = readAmendmentDocument(laneDir, LANE_ID, queueFiles).projectionRevision;

        expect(second).toEqual(first);
        expect(revisionAfterSecond).toBe(revisionAfterFirst);
    });

    it('refuses admission with no accepted record', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [], body: admitBodyFor(), authority: authorityFor()}))
            .toThrowMatching((error: Error) => error instanceof AmendmentError && reasonOf(error) === 'AMENDMENT_NOT_ACCEPTED');
    });

    it('refuses admission of a request that was never created', () => {
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({amendmentRequestId: 'never-created', blockerId: 'blocker-1', affectedWorktreeIds: [], body: admitBodyFor(), authority: authorityFor()}))
            .toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_NOT_FOUND');
    });

    it('refuses admission when the target blockerId does not match the accepted record', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'a-different-blocker', affectedWorktreeIds: [],
            body: admitBodyFor({blockerId: 'a-different-blocker'}), authority: authorityFor()
        })).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_NOT_ACCEPTED');
    });

    it('defers the superseded-seal check to CA-10\'s activatePackRevision rather than re-deriving it', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor({supersedesSeal: OTHER_VALID_SEAL}));
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor({supersedesSeal: OTHER_VALID_SEAL}), authority: authorityFor()
        })).toThrowMatching((error: Error) => error instanceof EffectExecutionError && reasonOf(error) === 'EFFECT_REVISION_NOT_ADMITTED');
    });

    /**
     * CA27-05, failure direction 1: activation itself fails. `activatePackRevision`
     * is CA-10's own atomic single-file replace, so its own accepted contract
     * already guarantees the old revision survives a failed activation; this
     * proves that guarantee holds through this batch's own admission boundary
     * too, and that the amendment projection is never written when activation
     * never happened.
     */
    it('activation failure leaves both authoritative files untouched: no pointer write, no projection write (CA27-05)', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor({supersedesSeal: OTHER_VALID_SEAL}));
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor({supersedesSeal: OTHER_VALID_SEAL}), authority: authorityFor()
        })).toThrow();
        expect(readActiveRevision(laneDir, effectFiles)).toBeNull();
        expect(store.get('amend-1')?.status).toBe('accepted');
        expect(readAmendmentDocument(laneDir, LANE_ID, queueFiles).admitted).toEqual({});
    });

    /**
     * CA27-05, failure direction 2: activation succeeds but the amendment
     * projection write fails afterward. The pointer is genuinely live with the
     * new seal — `activatePackRevision`'s own idempotency check proves it — but
     * this batch's durable evidence of *why* has not caught up. A retry must
     * settle the projection without re-invoking `activatePackRevision` and,
     * critically, without re-deriving authority — proved in the next spec.
     */
    it('a projection write failure after a successful activation leaves the pointer live and the record behind, then a retry settles it without a second write (CA27-05)', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        const request = {amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: ['wt-1'], body: admitBodyFor(), authority: authorityFor()};

        const requestsDir = join(laneDir, 'coordinator', 'amendment-requests');
        chmodSync(requestsDir, 0o500);
        try {
            expect(() => service.admit(request))
                .toThrowMatching((error: Error) => error instanceof AmendmentError && reasonOf(error) === 'AMENDMENT_STATE_WRITE_FAILED');
        } finally {
            chmodSync(requestsDir, 0o700);
        }

        const activatedDuringFailure = readActiveRevision(laneDir, effectFiles);
        expect(activatedDuringFailure?.activeSeal).toBe(CANDIDATE_SEAL);
        expect(store.get('amend-1')?.status).toBe('accepted');
        expect(readAmendmentDocument(laneDir, LANE_ID, queueFiles).admitted).toEqual({});

        const settled = service.admit(request);
        expect(settled).toEqual(activatedDuringFailure!);
        expect(store.get('amend-1')?.status).toBe('admitted');
        expect(store.admittedRevisions()).toEqual({'blocker-1': {blockerId: 'blocker-1', activeSeal: CANDIDATE_SEAL, requiredCommit: COMMIT_SHA}});
    });

    /**
     * The precise bug a naive "just retry the whole thing" fix would reintroduce:
     * once activation genuinely succeeded, a caller who re-reads current state
     * sees the candidate seal as *already* active. If the retry re-ran
     * `assertAdmissionAuthority`, that would refuse it as "not a replacement" —
     * permanently wedging the projection repair. The recovery path must skip
     * authority re-derivation entirely once CA-10's own pointer already proves
     * this exact admission is live.
     */
    it('settles a stuck projection even when the retry\'s own authority context now shows the candidate seal as already active (CA27-05)', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        const request = {amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: ['wt-1'], body: admitBodyFor(), authority: authorityFor()};

        const requestsDir = join(laneDir, 'coordinator', 'amendment-requests');
        chmodSync(requestsDir, 0o500);
        try {
            expect(() => service.admit(request)).toThrow();
        } finally {
            chmodSync(requestsDir, 0o700);
        }

        const retryWithNowStaleAuthority = {...request, authority: authorityFor({packActiveSeal: CANDIDATE_SEAL})};
        const settled = service.admit(retryWithNowStaleAuthority);
        expect(settled.activeSeal).toBe(CANDIDATE_SEAL);
        expect(store.get('amend-1')?.status).toBe('admitted');
    });

    /**
     * Review correction CA27-06 — the independent reviewer's exact
     * reproduction: once a pack revision matching a blocker is genuinely live,
     * a retry carrying a forged `resolutionId`/`packAcceptanceRef`/
     * `candidateSeal` must still be refused. Liveness alone is not authority
     * for whatever body a caller happens to supply.
     */
    it('refuses a recovery retry whose body is forged, even though the target pack revision is already live (CA27-06)', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        const request = {amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: ['wt-1'], body: admitBodyFor(), authority: authorityFor()};

        const requestsDir = join(laneDir, 'coordinator', 'amendment-requests');
        chmodSync(requestsDir, 0o500);
        try {
            expect(() => service.admit(request)).toThrow();
        } finally {
            chmodSync(requestsDir, 0o700);
        }
        // The activation genuinely happened; the projection is still owed.
        expect(readActiveRevision(laneDir, effectFiles)?.activeSeal).toBe(CANDIDATE_SEAL);
        expect(store.get('amend-1')?.status).toBe('accepted');

        const forged = {
            ...request,
            body: admitBodyFor({resolutionId: 'forged-resolution', packAcceptanceRef: 'tampered.json', candidateSeal: FORGED_SEAL}),
            authority: authorityFor({packActiveSeal: CANDIDATE_SEAL})
        };
        expect(() => service.admit(forged))
            .toThrowMatching((error: Error) => error instanceof AmendmentError && reasonOf(error) === 'AMENDMENT_NOT_ACCEPTED');

        // No projection write happened from the forged retry.
        expect(store.get('amend-1')?.status).toBe('accepted');
        expect(readAmendmentDocument(laneDir, LANE_ID, queueFiles).admitted).toEqual({});

        // The legitimate repair retry still works afterward.
        const settled = service.admit(request);
        expect(settled.activeSeal).toBe(CANDIDATE_SEAL);
        expect(store.get('amend-1')?.status).toBe('admitted');
    });

    it('refuses a forged-but-flag-valid candidate seal that does not reproduce, and activates nothing', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor({candidateSeal: FORGED_SEAL}));
        const service = admissionServiceFor(laneDir);

        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor({candidateSeal: FORGED_SEAL}), authority: authorityFor()
        })).toThrowMatching((error: Error) => error instanceof AmendmentError && reasonOf(error) === 'AMENDMENT_NOT_ACCEPTED');

        expect(readActiveRevision(laneDir, effectFiles)).toBeNull();
        expect(store.get('amend-1')?.status).toBe('accepted');
        expect(readAmendmentDocument(laneDir, LANE_ID, queueFiles).admitted).toEqual({});
    });

    it('refuses a candidate seal that equals the current active seal (not a replacement)', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor(), authority: authorityFor({packActiveSeal: CANDIDATE_SEAL})
        })).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_NOT_ACCEPTED');
    });

    it('refuses admission without the recorded spec-authority role', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor(), authority: authorityFor({operatorSession: {sessionId: 'authority-1', role: 'operator'}})
        })).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_INDEPENDENCE_VIOLATION');
    });

    it('refuses admission when the confirming session is not the recorded spec-authority session', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor({specAuthoritySessionId: 'someone-else'}), authority: authorityFor()
        })).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_INDEPENDENCE_VIOLATION');
    });

    it('refuses admission when the spec-authority session equals the pack-author session', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor(), authority: authorityFor({packAuthorSessionId: 'authority-1'})
        })).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_INDEPENDENCE_VIOLATION');
    });

    it('refuses admission when the proposal body binding does not match the accepted record', () => {
        const store = storeFor(laneDir);
        store.create({packId: 'pack-1', reason: 'drift'});
        store.recordAcceptance(acceptedRecordFor());
        const service = admissionServiceFor(laneDir);
        expect(() => service.admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: [],
            body: admitBodyFor({packAcceptanceRef: 'tampered.json'}), authority: authorityFor()
        })).toThrowMatching((error: Error) => reasonOf(error) === 'AMENDMENT_NOT_ACCEPTED');
        expect(readActiveRevision(laneDir, effectFiles)).toBeNull();
    });
});
