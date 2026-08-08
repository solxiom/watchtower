/**
 * CA-13 correction-01 identity proof — event-ID suppression (F1), lane binding
 * (F3), and entry-identity validation (review note).
 *
 * These are the cases the original focused suite could not fail: it only ever
 * shared a correlation ID, and it only ever loaded a projection into the lane
 * that wrote it. Each spec below is written so that it fails against the
 * pre-correction source.
 */
import {readFileSync} from 'node:fs';
import {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {CoordinatorReplay} from '../../../src/foundation/lane/coordinator/queue/CoordinatorReplay.js';
import {cursorPath, queuePath, readQueueDocument} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import {parseTrigger} from '../../../src/foundation/lane/coordinator/queue/queueValidation.js';
import {
    LANE_ID, PACK_REVISION, countingIds, cursorFor, cycleEntry, files, fixedClock, historyOf, lockFor,
    makeLaneDir, removeLaneDir, triggerFor
} from './support/queueFixtures.js';

const OTHER_LANE = '99999999-8888-4777-8666-555555555555';

function newQueue(laneDir: string, laneId: string = LANE_ID): CoordinatorQueue {
    return new CoordinatorQueue({laneDir, laneId, files, lock: lockFor(laneDir), clock: fixedClock()});
}

function reasonOf(error: unknown): string | undefined {
    return (error as {reason?: string}).reason;
}

function writeBytes(path: string, laneDir: string, value: unknown): void {
    files.ensureDirectory(`${laneDir}/coordinator`);
    files.writeAtomic(path, `${JSON.stringify(value)}\n`);
}

describe('CA-13 event-ID suppression in the queue (F1)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses a second trigger for one durable event under a different correlation', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one', {eventId: 'event-shared', correlationId: 'correlation-one'}));
        const duplicate = queue.enqueue(triggerFor('two', {eventId: 'event-shared', correlationId: 'correlation-two'}));

        expect(duplicate.ok).toBeFalse();
        if (!duplicate.ok) {
            expect(duplicate.reason).toBe('duplicate-event');
            expect(duplicate.code).toBe('QUEUE_DUPLICATE_EVENT');
            expect(duplicate.priorCycleId).toBe('cycle-one');
            expect(duplicate.message).toContain('event-shared');
        }
        expect(queue.snapshot().entries.length).toBe(1);
    });

    it('still suppresses by correlation when the event IDs differ', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one', {correlationId: 'shared'}));
        const duplicate = queue.enqueue(triggerFor('two', {correlationId: 'shared'}));

        expect(duplicate.ok).toBeFalse();
        if (!duplicate.ok) expect(duplicate.message).toContain('Correlation shared');
    });

    it('keeps event-ID suppression across a restart without a side index', () => {
        newQueue(laneDir).enqueue(triggerFor('one', {eventId: 'event-shared'}));

        const restarted = newQueue(laneDir);
        const duplicate = restarted.enqueue(triggerFor('two', {eventId: 'event-shared', correlationId: 'other'}));

        expect(duplicate.ok).toBeFalse();
        expect(restarted.snapshot().entries.length).toBe(1);
    });

    it('admits two genuinely distinct events', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        expect(queue.enqueue(triggerFor('two')).ok).toBeTrue();
        expect(queue.snapshot().entries.length).toBe(2);
    });
});

describe('CA-13 event-ID suppression against the journal (F1)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    function replayFor(entries: Parameters<typeof historyOf>[0]): {replay: CoordinatorReplay; queue: CoordinatorQueue} {
        const queue = newQueue(laneDir);
        return {
            queue,
            replay: new CoordinatorReplay({
                queue, cursor: cursorFor(laneDir), history: historyOf(entries), ids: countingIds(),
                clock: fixedClock(), activePackRevision: () => PACK_REVISION
            })
        };
    }

    it('refuses a re-delivery whose event opened a cycle that is still in flight', async () => {
        const {replay, queue} = replayFor([cycleEntry('c1', 'coordinator-effect-prepared')]);

        const outcome = await replay.admit(triggerFor('redelivered', {eventId: 'event-c1', correlationId: 'brand-new'}));

        expect(outcome.ok).toBeFalse();
        if (!outcome.ok) {
            expect(outcome.priorCycleId).toBe('c1');
            expect(outcome.message).toContain('already opened cycle c1');
        }
        expect(queue.snapshot().entries).toEqual([]);
    });

    it('drops a queued trigger whose event completed a cycle while the lane was down', async () => {
        newQueue(laneDir).enqueue(triggerFor('settled', {eventId: 'event-c1', correlationId: 'unrelated-correlation'}));
        const {replay, queue} = replayFor([cycleEntry('c1', 'coordinator-cycle-complete')]);

        const report = await replay.recover();

        expect(report.droppedTriggerIds).toEqual(['trigger-settled']);
        expect(queue.snapshot().entries).toEqual([]);
    });

    it('admits a trigger whose event has never opened a cycle', async () => {
        const {replay} = replayFor([cycleEntry('c1', 'coordinator-routed')]);
        expect((await replay.admit(triggerFor('fresh'))).ok).toBeTrue();
    });
});

describe('CA-13 lane-identity binding (F3)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses a structurally valid queue projection written by another lane', () => {
        newQueue(laneDir).enqueue(triggerFor('one'));
        const durable = readFileSync(queuePath(laneDir), 'utf8');

        expect(() => newQueue(laneDir, OTHER_LANE)).toThrowMatching((error: Error) =>
            reasonOf(error) === 'QUEUE_STATE_UNREADABLE' && /belongs to lane/.test(error.message));
        expect(readFileSync(queuePath(laneDir), 'utf8')).toBe(durable);
    });

    it('refuses a queue whose entries carry another lane s triggers', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        const entry = {...document.entries[0], trigger: {...document.entries[0].trigger, laneId: OTHER_LANE}};
        writeBytes(queuePath(laneDir), laneDir, {...document, entries: [entry]});

        expect(() => newQueue(laneDir)).toThrowMatching((error: Error) => reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
    });

    it('refuses a cursor projection written by another lane', () => {
        writeBytes(cursorPath(laneDir), laneDir, {
            schemaVersion: 1, laneId: OTHER_LANE, journalIdentity: null, lastProcessedEventId: 'event-a',
            lastProcessedSequence: 3, lastByteOffset: 0, prefixDigest: null, projectionRevision: 1,
            lastCursorAdvanceAt: null
        });

        expect(() => cursorFor(laneDir)).toThrowMatching((error: Error) =>
            reasonOf(error) === 'CURSOR_STATE_UNREADABLE' && /belongs to lane/.test(error.message));
    });

    it('refuses to enqueue a trigger built for another lane and writes nothing', () => {
        const queue = newQueue(laneDir);
        const foreign = {...triggerFor('foreign'), laneId: OTHER_LANE};

        expect(() => queue.enqueue(foreign)).toThrowMatching((error: Error) =>
            reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
        expect(queue.snapshot().entries).toEqual([]);
        expect(newQueue(laneDir).snapshot().entries).toEqual([]);
    });

    it('accepts a projection whose lane matches, unchanged', () => {
        newQueue(laneDir).enqueue(triggerFor('one'));
        expect(newQueue(laneDir).snapshot().entries.length).toBe(1);
    });

    it('rejects a mismatched trigger lane at the parser boundary too', () => {
        const trigger = JSON.parse(JSON.stringify(triggerFor('one'))) as Record<string, unknown>;
        expect(parseTrigger(trigger, 'fixture', LANE_ID).laneId).toBe(LANE_ID);
        expect(() => parseTrigger(trigger, 'fixture', OTHER_LANE)).toThrowMatching(
            (error: Error) => reasonOf(error) === 'QUEUE_TRIGGER_INVALID');
    });
});

describe('CA-13 queue entry identity validation (review note)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses an entry whose stored triggerId disagrees with the trigger it wraps', () => {
        newQueue(laneDir).enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        writeBytes(queuePath(laneDir), laneDir, {
            ...document, entries: [{...document.entries[0], triggerId: 'trigger-somebody-else'}]
        });

        expect(() => newQueue(laneDir)).toThrowMatching((error: Error) =>
            reasonOf(error) === 'QUEUE_STATE_UNREADABLE' && /entry triggerId/.test(error.message));
    });

    it('refuses an entry whose stored enqueuedAt disagrees with the trigger it wraps', () => {
        newQueue(laneDir).enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        writeBytes(queuePath(laneDir), laneDir, {
            ...document, entries: [{...document.entries[0], enqueuedAt: '2020-01-01T00:00:00.000Z'}]
        });

        expect(() => newQueue(laneDir)).toThrowMatching((error: Error) =>
            reasonOf(error) === 'QUEUE_STATE_UNREADABLE' && /entry enqueuedAt/.test(error.message));
    });

    it('refuses an entry with no stored triggerId rather than deriving one', () => {
        newQueue(laneDir).enqueue(triggerFor('one'));
        const document = readQueueDocument(laneDir, LANE_ID, files);
        const {triggerId, ...withoutId} = document.entries[0];
        expect(triggerId).toBeDefined();
        writeBytes(queuePath(laneDir), laneDir, {...document, entries: [withoutId]});

        expect(() => newQueue(laneDir)).toThrowMatching((error: Error) => reasonOf(error) === 'QUEUE_STATE_UNREADABLE');
    });
});
