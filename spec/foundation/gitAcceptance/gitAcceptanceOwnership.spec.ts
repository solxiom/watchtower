/**
 * CA-12 proof — reviewer-session ownership enforcement against the durable
 * worker-event journal, never session memory or Git author strings.
 */
import {join} from 'node:path';
import type {WorkerEventRecord} from '../../../src/contracts/index.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/index.js';
import {findReviewerAcceptEvent, readWorkerEventJournal, validateReviewerOwnership, workerEventJournalPath}
    from '../../../src/foundation/gitAcceptance/gitAcceptanceOwnership.js';
import type {AcceptanceProposal} from '../../../src/contracts/gitAcceptance.js';
import {makeLaneDir, removeLaneDir} from './support/gitAcceptanceFixtures.js';

function acceptEvent(overrides: Partial<{laneId: string; batch: string; session: string; sequence: number}> = {}): WorkerEventRecord {
    const {laneId = 'lane-1', batch = 'CA-12', session = 'reviewer-session-A', sequence = 0} = overrides;
    return {
        schemaVersion: 1, eventId: `evt-${sequence}`, type: 'accept', sequence, at: '2026-08-07T12:00:00.000Z',
        laneId, producer: 'coordinator-worker-event', correlationId: batch, causationId: null, policyVersion: 'shipping-v1',
        payload: {role: 'reviewer', batch, session}
    };
}

function proposal(overrides: Partial<AcceptanceProposal> = {}): AcceptanceProposal {
    return {laneId: 'lane-1', batchId: 'CA-12', cycleId: 'cycle-1', reviewerSessionId: 'reviewer-session-A', ...overrides};
}

describe('CA-12 — reviewer-session ownership', function () {
    it('passes for the exact session that authored the durable accept event', function () {
        const result = validateReviewerOwnership(proposal(), [acceptEvent()]);
        expect(result.ok).toBeTrue();
    });

    it('fails with GIT_OWNERSHIP_MISMATCH for a different session claiming the same batch', function () {
        const result = validateReviewerOwnership(proposal({reviewerSessionId: 'reviewer-session-B'}), [acceptEvent()]);
        expect(result).toEqual(jasmine.objectContaining({ok: false, reason: 'GIT_OWNERSHIP_MISMATCH'}));
    });

    it('fails closed when no accept event exists for the batch at all', function () {
        const result = validateReviewerOwnership(proposal({batchId: 'CA-99'}), [acceptEvent()]);
        expect(result).toEqual(jasmine.objectContaining({ok: false, reason: 'GIT_OWNERSHIP_MISMATCH'}));
    });

    it('never authorizes from an implementer-authored event, even naming the right batch and session', function () {
        const implementerEvent: WorkerEventRecord = {
            ...acceptEvent(), type: 'handoff', payload: {role: 'implementer', batch: 'CA-12', session: 'reviewer-session-A'}
        };
        const result = validateReviewerOwnership(proposal(), [implementerEvent]);
        expect(result).toEqual(jasmine.objectContaining({ok: false, reason: 'GIT_OWNERSHIP_MISMATCH'}));
    });

    it('never authorizes from a lane other than the one the proposal names', function () {
        const result = validateReviewerOwnership(proposal(), [acceptEvent({laneId: 'lane-2'})]);
        expect(result).toEqual(jasmine.objectContaining({ok: false, reason: 'GIT_OWNERSHIP_MISMATCH'}));
    });

    it('uses the most recent accept event when a batch was corrected and re-accepted', function () {
        const first = acceptEvent({session: 'reviewer-session-A', sequence: 0});
        const second = acceptEvent({session: 'reviewer-session-B', sequence: 1});
        expect(findReviewerAcceptEvent([first, second], 'CA-12')).toEqual(second);
        expect(validateReviewerOwnership(proposal({reviewerSessionId: 'reviewer-session-A'}), [first, second]).ok).toBeFalse();
        expect(validateReviewerOwnership(proposal({reviewerSessionId: 'reviewer-session-B'}), [first, second]).ok).toBeTrue();
    });
});

describe('CA-12 — durable worker-event journal read', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('returns no events for an absent journal rather than treating it as corrupt', function () {
        expect(readWorkerEventJournal(laneDir, nodeEffectFileSystem)).toEqual([]);
    });

    it('reads real durably-appended records and finds the reviewer accept among them', function () {
        nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'journal'));
        nodeEffectFileSystem.appendLine(workerEventJournalPath(laneDir), JSON.stringify(acceptEvent({sequence: 0})));
        nodeEffectFileSystem.appendLine(workerEventJournalPath(laneDir), JSON.stringify({
            ...acceptEvent({sequence: 1}), type: 'handoff', payload: {role: 'implementer', batch: 'CA-11', session: 'impl-1'}
        }));
        const records = readWorkerEventJournal(laneDir, nodeEffectFileSystem);
        expect(records.length).toBe(2);
        expect(findReviewerAcceptEvent(records, 'CA-12')).not.toBeNull();
        expect(findReviewerAcceptEvent(records, 'CA-11')).toBeNull();
    });
});
