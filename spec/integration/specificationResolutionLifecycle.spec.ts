/**
 * CA-24 — the complete specification-resolution acceptance fixture
 * (`docs/spec/implementation/wt-coordinator-automation/specification-resolution-batch-amendment.md`
 * "Required Acceptance Fixture"; `docs/spec/specification-resolution.md` §4–§8).
 *
 * One lane, two concurrent lines. Line A hits a real normative contradiction;
 * line B stays eligible. The suite walks the whole lifecycle —
 * contradiction → advice → authority → re-seal → activation → explicit sync →
 * same-session resume — through the accepted owners (CA-27's hold and
 * admission services, CA-09's sole validator, CA-10's activation pointer) and
 * asserts each of the nine required items in order. Nothing here re-implements
 * a capability: every assertion is a property of an accepted owner's answer.
 */
import {
    ScopedHoldService, nodeHoldIdFactory, readHoldDocument
} from '../../src/foundation/lane/coordinator/hold/index.js';
import {nodeQueueFileSystem} from '../../src/foundation/lane/coordinator/queue/nodeQueueFileSystem.js';
import {readActiveRevision} from '../../src/foundation/effect/packRevisionActivation.js';
import {ProposalValidator} from '../../src/foundation/proposal/index.js';
import {
    isAdvisoryOperation, permittedProposalTypes
} from '../../src/foundation/lane/coordinator/mutation/index.js';
import type {ProposalValidationResult} from '../../src/contracts/proposals.js';
import {
    acceptedRecordFor, admissionServiceFor, admitBodyFor, authorityFor, effectFiles, fixedEffectClock,
    lockFor, makeLaneDir, removeLaneDir, storeFor
} from '../foundation/coordinatorAmendment/support/amendmentFixtures.js';
import {
    ACTIVE_SEAL, CANDIDATE_SEAL, COMMIT_SHA, contextFor, fixtureFor, proposalFor
} from '../foundation/proposal/support/proposalFixtures.js';

const LANE_ID = '11111111-2222-4333-8444-555555555557';
/** Strictly after the admission clock the CA-27 fixtures pin. */
const HOLD_EXPIRY = '2026-08-09T00:00:00.000Z';
const LINE_A = 'B1';
const LINE_B = 'B2';

function validate(type: Parameters<typeof fixtureFor>[0], overrides: Parameters<typeof contextFor>[1] = {}): ProposalValidationResult {
    const fixture = fixtureFor(type);
    return new ProposalValidator().validateProposal(proposalFor(fixture), contextFor(fixture, overrides));
}

describe('CA-24 M6 fixture — impact-scoped hold keeps the unaffected line runnable', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('(1) holds only line A and (9) leaves line B outside every hold scope', function () {
        const holds = new ScopedHoldService({
            laneDir, laneId: LANE_ID, files: nodeQueueFileSystem, lock: lockFor(laneDir),
            clock: {now: () => new Date('2026-08-08T00:00:00.000Z')}, ids: nodeHoldIdFactory
        });
        const placed = holds.place({scope: [LINE_A], reason: 'NORMATIVE_CONTRADICTION', expiresAt: HOLD_EXPIRY}, 'coordinator-D3');
        expect(placed.scope).toEqual([LINE_A]);

        const document = readHoldDocument(laneDir, LANE_ID, nodeQueueFileSystem);
        expect(document.holds.length).toBe(1);
        expect(document.holds.every((hold) => !hold.scope.includes(LINE_B))).toBeTrue();
    });

    it('(9) a lane-wide hold is never implied by an empty scope', function () {
        const holds = new ScopedHoldService({
            laneDir, laneId: LANE_ID, files: nodeQueueFileSystem, lock: lockFor(laneDir),
            clock: {now: () => new Date('2026-08-08T00:00:00.000Z')}, ids: nodeHoldIdFactory
        });
        expect(() => holds.place({scope: [], reason: 'contradiction', expiresAt: HOLD_EXPIRY}, 'coordinator-D3')).toThrowError();
        expect(readHoldDocument(laneDir, LANE_ID, nodeQueueFileSystem).holds).toEqual([]);
    });
});

describe('CA-24 M6 fixture — advice carries no authority', function () {
    it('(2) the advisor proposal maps to no effect and reaches no effect path', function () {
        const fixture = fixtureFor('propose-specification-resolution');
        expect(fixture.effects).toEqual([]);
        expect(isAdvisoryOperation('resolution-propose')).toBeTrue();
        expect(permittedProposalTypes('resolution-propose')).toEqual(['propose-specification-resolution']);
        expect(validate('propose-specification-resolution').valid).toBeTrue();
    });

    it('(2) the advisor operation may not carry an activation proposal', function () {
        expect(permittedProposalTypes('resolution-propose')).not.toContain('admit-pack-amendment');
        expect(permittedProposalTypes('resolution-resume')).toEqual(['resume-specification-blocked-session']);
    });
});

describe('CA-24 M6 fixture — authority, acceptance, and seal fences', function () {
    it('(3) refuses an admission whose session is not the recorded spec authority', function () {
        const refused = validate('admit-pack-amendment', {
            operatorSession: {sessionId: 'authority-1', role: 'operator', confirmedProposalIds: new Set(['prop-admit-pack-amendment'])}
        });
        expect(refused.valid).toBeFalse();
    });

    it('(3) refuses an admission with no confirmed operator action at all', function () {
        const refused = validate('admit-pack-amendment', {operatorSession: undefined});
        expect(refused.valid).toBeFalse();
    });

    it('(4) refuses an amendment with no independent accepted record', function () {
        expect(validate('admit-pack-amendment', {acceptedAmendments: {}}).valid).toBeFalse();
    });

    it('(4) refuses a candidate seal that does not replace the current active seal', function () {
        const sameSeal = validate('admit-pack-amendment', {
            packIndex: {packSealId: 'seal-1', activeSeal: CANDIDATE_SEAL, manifestDigest: ACTIVE_SEAL}
        });
        expect(sameSeal.valid).toBeFalse();
    });

    it('accepts the fully authorized, independently accepted, replacing amendment', function () {
        expect(validate('admit-pack-amendment').valid).toBeTrue();
    });
});

/** One authorized, independently accepted admission through CA-27's owner. */
function admitOnce(laneDir: string) {
    const store = storeFor(laneDir);
    store.create({packId: 'watchtower-v1', reason: 'normative contradiction'});
    store.recordAcceptance(acceptedRecordFor());
    return admissionServiceFor(laneDir).admit({
        amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: ['wt-1'],
        body: admitBodyFor(), authority: authorityFor()
    });
}

describe('CA-24 M6 fixture — atomic activation', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('(5) activates exactly one new revision and makes the prior seal stale', function () {
        expect(readActiveRevision(laneDir, effectFiles)).toBeNull();
        const revision = admitOnce(laneDir);
        expect(revision.activeSeal).toBe(CANDIDATE_SEAL);
        const durable = readActiveRevision(laneDir, effectFiles);
        expect(durable?.activeSeal).toBe(CANDIDATE_SEAL);
        expect(durable?.activeSeal).not.toBe(ACTIVE_SEAL);
    });

    it('records the admission with the clock and lock its accepted owner was given', function () {
        expect(fixedEffectClock().now().toISOString()).toBe('2026-08-08T00:00:00.000Z');
        admitOnce(laneDir);
        expect(storeFor(laneDir).admittedRevisions()['blocker-1']?.activeSeal).toBe(CANDIDATE_SEAL);
    });
});

describe('CA-24 M6 fixture — replay safety', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('(8) a duplicate admission is idempotent and never activates twice', function () {
        const first = admitOnce(laneDir);
        const replay = admissionServiceFor(laneDir).admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-1', affectedWorktreeIds: ['wt-1'],
            body: admitBodyFor(), authority: authorityFor({packActiveSeal: CANDIDATE_SEAL})
        });
        expect(replay.activeSeal).toBe(first.activeSeal);
        expect(readActiveRevision(laneDir, effectFiles)?.activeSeal).toBe(CANDIDATE_SEAL);
    });

    it('(8) a tampered retry of an already-live admission is refused, not repaired', function () {
        admitOnce(laneDir);
        expect(() => admissionServiceFor(laneDir, '2026-08-08T00:00:00.000Z').admit({
            amendmentRequestId: 'amend-1', blockerId: 'blocker-9', affectedWorktreeIds: ['wt-1'],
            body: admitBodyFor({blockerId: 'blocker-9'}), authority: authorityFor({packActiveSeal: CANDIDATE_SEAL})
        })).toThrowError();
        expect(readActiveRevision(laneDir, effectFiles)?.activeSeal).toBe(CANDIDATE_SEAL);
    });

});

const ADMITTED = {'blocker-1': {blockerId: 'blocker-1', activeSeal: CANDIDATE_SEAL, requiredCommit: COMMIT_SHA}};
const ASSIGNMENT = {
    'blocker-1': {blockerId: 'blocker-1', workerSessionId: 'worker-1', operatorSessionId: 'opsess-1', worktreeId: 'wt-1', claimIds: []}
};

describe('CA-24 M6 fixture — worktree synchronization', function () {
    it('(6) refuses to resume an unsynchronized worktree', function () {
        const refused = validate('resume-specification-blocked-session', {
            worktreeSyncRecords: {'wt-1': {worktreeId: 'wt-1', status: 'stale', syncedRevision: '0'.repeat(40)}}
        });
        expect(refused.valid).toBeFalse();
    });

    it('(6) refuses a worktree synchronized to a revision other than the admitted one', function () {
        const refused = validate('resume-specification-blocked-session', {
            worktreeSyncRecords: {'wt-1': {worktreeId: 'wt-1', status: 'synchronized', syncedRevision: '9'.repeat(40)}}
        });
        expect(refused.valid).toBeFalse();
    });

});

describe('CA-24 M6 fixture — same-session resume', function () {
    it('(7) resumes the original worker and operator-session identity after explicit sync', function () {
        const accepted = validate('resume-specification-blocked-session', {
            admittedRevisions: ADMITTED, originalAssignments: ASSIGNMENT,
            worktreeSyncRecords: {'wt-1': {worktreeId: 'wt-1', status: 'synchronized', syncedRevision: COMMIT_SHA}}
        });
        expect(accepted.valid).toBeTrue();
    });

    it('(7) refuses a substituted worker or operator-session identity', function () {
        const substituted = validate('resume-specification-blocked-session', {
            admittedRevisions: ADMITTED,
            worktreeSyncRecords: {'wt-1': {worktreeId: 'wt-1', status: 'synchronized', syncedRevision: COMMIT_SHA}},
            originalAssignments: {
                'blocker-1': {blockerId: 'blocker-1', workerSessionId: 'worker-9', operatorSessionId: 'opsess-9', worktreeId: 'wt-1', claimIds: []}
            }
        });
        expect(substituted.valid).toBeFalse();
    });

    it('(9) line B stays selectable while line A is held', function () {
        const fixture = fixtureFor('select-ready-batch');
        const context = contextFor(fixture, {
            laneState: {
                snapshotDigest: contextFor(fixture).laneState.snapshotDigest,
                batches: {B1: {batchId: LINE_A, status: 'pending'}, B2: {batchId: LINE_B, status: 'pending'}}
            },
            activeHolds: [{holdId: 'hold-1', scope: [LINE_A], status: 'active'}]
        });
        const validator = new ProposalValidator();
        expect(validator.validateProposal(proposalFor(fixture, {body: {batchId: LINE_B}}), context).valid).toBeTrue();
        // The same cycle may not select the held line.
        expect(validator.validateProposal(proposalFor(fixture, {body: {batchId: LINE_A}}), context).valid).toBeFalse();
    });
});
