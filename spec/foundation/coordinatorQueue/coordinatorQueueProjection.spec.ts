/**
 * CA-13 queue-projection negative-case proof.
 *
 * `queue.json` is predecessor state: it may have been written by an older
 * schema, truncated by a crash, or edited by hand. The rule under test is that
 * every one of those cases produces the exact typed reason and *no* partial
 * success — never a lane that quietly restarts with an empty queue, which
 * would drop every unhandled trigger the file was holding.
 */
import {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {queuePath, readQueueDocument} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import {parseTrigger} from '../../../src/foundation/lane/coordinator/queue/queueValidation.js';
import {
    LANE_ID, files, fixedClock, lockFor, makeLaneDir, removeLaneDir, triggerFor
} from './support/queueFixtures.js';

function writeQueueBytes(laneDir: string, text: string): void {
    files.ensureDirectory(`${laneDir}/coordinator`);
    files.writeAtomic(queuePath(laneDir), text);
}

function loadQueue(laneDir: string): CoordinatorQueue {
    return new CoordinatorQueue({laneDir, laneId: LANE_ID, files, lock: lockFor(laneDir), clock: fixedClock()});
}

function reasonOf(error: unknown): string | undefined {
    return (error as {reason?: string}).reason;
}

function expectRefusal(laneDir: string, reason: string): void {
    expect(() => loadQueue(laneDir)).toThrowMatching((error: Error) => reasonOf(error) === reason);
}

describe('CA-13 queue projection validation', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('treats an absent projection as an empty queue', () => {
        expect(loadQueue(laneDir).snapshot().entries).toEqual([]);
        expect(loadQueue(laneDir).snapshot().nextSequenceNumber).toBe(1);
    });

    it('treats a zero-byte projection as an empty queue', () => {
        writeQueueBytes(laneDir, '');
        expect(loadQueue(laneDir).snapshot().entries).toEqual([]);
    });

    it('refuses a projection that is not well-formed JSON', () => {
        writeQueueBytes(laneDir, '{"schemaVersion":1,\n');
        expectRefusal(laneDir, 'QUEUE_STATE_UNREADABLE');
    });

    it('refuses a projection written by an unsupported schema version', () => {
        writeQueueBytes(laneDir, '{"schemaVersion":2,"laneId":"x","nextSequenceNumber":1,"entries":[],"holds":[],"activeCycleId":null}\n');
        expectRefusal(laneDir, 'QUEUE_STATE_UNREADABLE');
    });

    it('refuses a projection whose entries member is not an array', () => {
        writeQueueBytes(laneDir, '{"schemaVersion":1,"laneId":"x","nextSequenceNumber":1,"entries":{},"holds":[],"activeCycleId":null}\n');
        expectRefusal(laneDir, 'QUEUE_STATE_UNREADABLE');
    });

    it('refuses a projection carrying the same trigger twice', () => {
        const queue = loadQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        writeQueueBytes(laneDir, `${JSON.stringify({...document, entries: [document.entries[0], document.entries[0]]})}\n`);

        expectRefusal(laneDir, 'QUEUE_STATE_UNREADABLE');
    });

    it('refuses an entry whose trigger declares an unknown priority class', () => {
        const queue = loadQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        const entry = {...document.entries[0], trigger: {...document.entries[0].trigger, triggerClass: 'urgent'}};
        writeQueueBytes(laneDir, `${JSON.stringify({...document, entries: [entry]})}\n`);

        expectRefusal(laneDir, 'QUEUE_TRIGGER_INVALID');
    });

    it('refuses an entry whose trigger declares a non-queued decision class', () => {
        const queue = loadQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        const entry = {...document.entries[0], trigger: {...document.entries[0].trigger, decisionClass: 'M0'}};
        writeQueueBytes(laneDir, `${JSON.stringify({...document, entries: [entry]})}\n`);

        expectRefusal(laneDir, 'QUEUE_TRIGGER_INVALID');
    });

    it('refuses a hold whose scope is not a recorded scope', () => {
        const queue = loadQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        const hold = {blockerId: 'b1', scope: 'lane-wide', batchIds: [], recordedAt: '2026-08-08T00:00:00.000Z'};
        writeQueueBytes(laneDir, `${JSON.stringify({...document, holds: [hold]})}\n`);

        expectRefusal(laneDir, 'QUEUE_STATE_UNREADABLE');
    });

    it('refuses a directory in place of the projection rather than reading it as absent', () => {
        files.ensureDirectory(queuePath(laneDir));
        expectRefusal(laneDir, 'QUEUE_STATE_UNREADABLE');
    });
});

describe('CA-13 trigger validation', () => {
    it('accepts a fully formed trigger unchanged', () => {
        const trigger = triggerFor('one');
        expect(parseTrigger(JSON.parse(JSON.stringify(trigger)), 'fixture')).toEqual(trigger);
    });

    it('rejects a missing required field rather than defaulting it', () => {
        const {correlationId, ...withoutCorrelation} = triggerFor('one');
        expect(correlationId).toBeDefined();
        expect(() => parseTrigger(withoutCorrelation, 'fixture')).toThrowMatching(
            (error: Error) => reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
    });

    it('rejects an empty string where an identifier is required', () => {
        expect(() => parseTrigger({...triggerFor('one'), triggerId: ''}, 'fixture')).toThrowMatching(
            (error: Error) => reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
    });

    it('rejects a fractional or negative event sequence', () => {
        for (const eventSequence of [1.5, -2]) {
            expect(() => parseTrigger({...triggerFor('one'), eventSequence}, 'fixture')).toThrowMatching(
                (error: Error) => reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
        }
    });

    it('accepts -1 as the no-journal-origin sentinel', () => {
        expect(parseTrigger({...triggerFor('one'), eventSequence: -1}, 'fixture').eventSequence).toBe(-1);
    });

    it('accepts a null batch ID and rejects a non-string one', () => {
        expect(parseTrigger({...triggerFor('one'), batchId: null}, 'fixture').batchId).toBeNull();
        expect(() => parseTrigger({...triggerFor('one'), batchId: 7}, 'fixture')).toThrowMatching(
            (error: Error) => reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
    });

    it('rejects an array in place of the trigger object', () => {
        expect(() => parseTrigger([], 'fixture')).toThrowMatching(
            (error: Error) => reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
    });
});
