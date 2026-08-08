/**
 * CA-13 correction-03 F2/F3 — cross-instance serialization of the queue and
 * cursor projections.
 *
 * Every scenario here uses **two independent owners over one real lane
 * directory**. That is the whole point: a single object trivially serializes
 * itself, and the defect these prove closed is what happens when two
 * coordinators — two processes, or one process restarted while another still
 * runs — each hold a snapshot taken at their own startup. Against the
 * pre-correction source each of these committed its own stale snapshot plus one
 * change and silently discarded the other's work.
 *
 * The lock under test is the **real** CA-10 lane lock over a real temp lane, not
 * a double, because mutual exclusion is the claim.
 */
import {readFileSync} from 'node:fs';
import {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {cursorPath, queuePath, readCursorDocument, readQueueDocument} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import {
    LANE_ID, cursorFor, files, fixedClock, holdFor, lockFor, makeLaneDir, queueFor, removeLaneDir, triggerFor
} from './support/queueFixtures.js';

describe('CA-13 cross-instance dequeue atomicity (F3)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('gives one trigger to exactly one of two independent dequeuers', () => {
        queueFor(laneDir).enqueue(triggerFor('only'));
        // Both instances load the same projection before either acts, which is
        // exactly the state two coordinator processes are in.
        const first = queueFor(laneDir);
        const second = queueFor(laneDir);
        expect(first.snapshot().entries.length).toBe(1);
        expect(second.snapshot().entries.length).toBe(1);

        const a = first.dequeue();
        const b = second.dequeue();

        const winners = [a, b].filter((result) => result.ok);
        expect(winners.length).toBe(1);
        const loser = [a, b].find((result) => !result.ok);
        expect(loser?.ok).toBeFalse();
        if (loser !== undefined && !loser.ok) expect(loser.reason).toBe('cycle-active');
        const durable = readQueueDocument(laneDir, LANE_ID, files);
        expect(durable.entries).toEqual([]);
        expect(durable.activeCycleId).toBe('cycle-only');
    });

    it('never hands the same trigger to two dequeuers across a whole queue', () => {
        const queue = queueFor(laneDir);
        for (const id of ['a', 'b', 'c']) {
            queue.enqueue(triggerFor(id, {enqueuedAt: `2026-08-08T00:00:0${id.charCodeAt(0) - 96}.000Z`}));
        }

        // Alternating instances, each completing its cycle before the next
        // dequeue, must still see every trigger exactly once.
        const taken: string[] = [];
        for (let round = 0; round < 3; round += 1) {
            const instance = queueFor(laneDir);
            const result = instance.dequeue();
            expect(result.ok).toBeTrue();
            if (result.ok) {
                taken.push(result.trigger.triggerId);
                instance.completeCycle(result.trigger.cycleId);
            }
        }

        expect(new Set(taken).size).toBe(3);
        expect(readQueueDocument(laneDir, LANE_ID, files).entries).toEqual([]);
    });

    it('holds one active cycle for the lane even when a stale instance retries', () => {
        queueFor(laneDir).enqueue(triggerFor('one'));
        const stale = queueFor(laneDir);
        const winner = queueFor(laneDir);
        expect(winner.dequeue().ok).toBeTrue();

        // `stale` still believes the queue holds one entry and no active cycle.
        expect(stale.snapshot().entries.length).toBe(1);
        expect(stale.snapshot().activeCycleId).toBeNull();
        const result = stale.dequeue();

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.code).toBe('QUEUE_CYCLE_ACTIVE');
    });
});

describe('CA-13 queue writers cannot lose one another updates (F2)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('keeps both triggers when two instances enqueue from the same base revision', () => {
        const first = queueFor(laneDir);
        const second = queueFor(laneDir);
        expect(first.snapshot().projectionRevision).toBe(second.snapshot().projectionRevision);

        first.enqueue(triggerFor('first'));
        second.enqueue(triggerFor('second', {enqueuedAt: '2026-08-08T00:00:01.000Z'}));

        const durable = readQueueDocument(laneDir, LANE_ID, files);
        expect(durable.entries.map((entry) => entry.triggerId).sort()).toEqual(['trigger-first', 'trigger-second']);
        expect(durable.projectionRevision).toBe(2);
    });

    it('keeps a hold recorded by one instance when another instance enqueues', () => {
        const holder = queueFor(laneDir);
        const enqueuer = queueFor(laneDir);

        holder.applyHold(holdFor('B-1', ['CA-99']));
        enqueuer.enqueue(triggerFor('unrelated'));

        const durable = readQueueDocument(laneDir, LANE_ID, files);
        expect(durable.holds.map((hold) => hold.blockerId)).toEqual(['B-1']);
        expect(durable.entries.length).toBe(1);
    });

    it('advances the revision on every committed mutation and on no refusal', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        expect(queue.snapshot().projectionRevision).toBe(1);

        // A duplicate is refused, so nothing is written and the token stands.
        expect(queue.enqueue(triggerFor('one')).ok).toBeFalse();
        expect(queue.snapshot().projectionRevision).toBe(1);
        expect(readQueueDocument(laneDir, LANE_ID, files).projectionRevision).toBe(1);
    });

    it('refuses a projection that has moved backwards rather than overwriting it', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        queue.enqueue(triggerFor('two', {enqueuedAt: '2026-08-08T00:00:01.000Z'}));
        const ahead = readFileSync(queuePath(laneDir), 'utf8');

        // Restore an older projection beneath a live owner — a backup copy or a
        // partially rolled-back lane.
        const rolledBack = {...JSON.parse(ahead) as Record<string, unknown>, projectionRevision: 0};
        files.writeAtomic(queuePath(laneDir), `${JSON.stringify(rolledBack)}\n`);

        expect(() => queue.enqueue(triggerFor('three'))).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'QUEUE_STATE_STALE');
    });

    it('refuses a queue projection that carries no compare-and-swap token', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        const document = JSON.parse(readFileSync(queuePath(laneDir), 'utf8')) as Record<string, unknown>;
        delete document.projectionRevision;
        files.writeAtomic(queuePath(laneDir), `${JSON.stringify(document)}\n`);

        expect(() => queueFor(laneDir)).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'QUEUE_STATE_UNREADABLE');
    });
});

describe('CA-13 cursor writers cannot lose one another updates (F2)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses the second of two checkpoints issued from one base revision', () => {
        const first = cursorFor(laneDir);
        const second = cursorFor(laneDir);

        expect(first.checkpointHandled(null, [{eventId: 'event-0', sequence: 0}]).ok).toBeTrue();
        // `second` still believes the cursor stands before sequence 0.
        const clobber = second.checkpointHandled(null, [{eventId: 'other-0', sequence: 0}]);

        expect(clobber.ok).toBeFalse();
        if (!clobber.ok) {
            expect(clobber.reason).toBe('CURSOR_STALE');
            expect(clobber.previousCursor).toBe('event-0');
        }
        expect(readCursorDocument(laneDir, LANE_ID, files).lastProcessedEventId).toBe('event-0');
        expect(readCursorDocument(laneDir, LANE_ID, files).projectionRevision).toBe(1);
    });

    it('lets the second writer continue once it reloads the durable position', () => {
        const first = cursorFor(laneDir);
        const second = cursorFor(laneDir);
        first.checkpointHandled(null, [{eventId: 'event-0', sequence: 0}]);

        const reloaded = second.reload();
        expect(reloaded.lastProcessedEventId).toBe('event-0');
        const advance = second.checkpointHandled('event-0', [{eventId: 'event-1', sequence: 1}]);

        expect(advance.ok).toBeTrue();
        expect(readCursorDocument(laneDir, LANE_ID, files).lastProcessedSequence).toBe(1);
    });

    it('refuses a cursor projection that has moved backwards beneath a live owner', () => {
        const cursor = cursorFor(laneDir);
        cursor.checkpointHandled(null, [{eventId: 'event-0', sequence: 0}]);
        cursor.checkpointHandled('event-0', [{eventId: 'event-1', sequence: 1}]);
        const document = JSON.parse(readFileSync(cursorPath(laneDir), 'utf8')) as Record<string, unknown>;
        files.writeAtomic(cursorPath(laneDir), `${JSON.stringify({...document, projectionRevision: 0})}\n`);

        expect(() => cursor.checkpointHandled('event-1', [{eventId: 'event-2', sequence: 2}])).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'CURSOR_STALE');
    });
});

describe('CA-13 lane mutation lock boundary (F2)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('reports a lane already held by a live owner as a typed refusal, never a steal', () => {
        const outer = lockFor(laneDir);
        outer.withLaneLock(() => {
            // A second acquisition while the first is held is the concurrent
            // writer case; it must fail closed rather than reclaim a live lock.
            expect(() => new CoordinatorQueue({laneDir, laneId: LANE_ID, files, lock: lockFor(laneDir), clock: fixedClock()})
                .enqueue(triggerFor('blocked'))).toThrowMatching(
                (error: Error & {reason?: string}) => error.reason === 'QUEUE_LANE_LOCKED');
        });
    });

    it('releases the lane after every mutation so the next writer proceeds', () => {
        queueFor(laneDir).enqueue(triggerFor('one'));
        expect(() => queueFor(laneDir).enqueue(triggerFor('two'))).not.toThrow();
        expect(readQueueDocument(laneDir, LANE_ID, files).entries.length).toBe(2);
    });

    it('releases the lane after a refusal that wrote nothing', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        expect(queue.enqueue(triggerFor('one')).ok).toBeFalse();

        expect(() => queueFor(laneDir).enqueue(triggerFor('two'))).not.toThrow();
    });
});
