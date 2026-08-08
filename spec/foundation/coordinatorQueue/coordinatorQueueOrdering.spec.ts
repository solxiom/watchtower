/**
 * CA-13 stable-priority, hold, and activation-invalidation proof.
 *
 * Every assertion here is about *observable dequeue order and durable bytes*,
 * never about the comparator's internals: a queue that ordered correctly in
 * memory but reloaded differently from `queue.json` would still stall a safety
 * escalation after a restart, which is the failure this batch exists to
 * prevent.
 */
import {readFileSync} from 'node:fs';
import {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {queuePath} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import {
    LANE_ID, PACK_REVISION, faultingQueueFiles, files, fixedClock, holdFor, lockFor, makeLaneDir, removeLaneDir,
    triggerFor
} from './support/queueFixtures.js';

function newQueue(laneDir: string, maxQueueLength?: number): CoordinatorQueue {
    return new CoordinatorQueue({laneDir, laneId: LANE_ID, files, lock: lockFor(laneDir), clock: fixedClock(), maxQueueLength});
}

function dequeueAll(queue: CoordinatorQueue): readonly string[] {
    const taken: string[] = [];
    for (;;) {
        const result = queue.dequeue();
        if (!result.ok) return taken;
        taken.push(result.trigger.triggerId);
        queue.completeCycle(result.trigger.cycleId);
    }
}

describe('CA-13 stable priority ordering', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('dequeues safety, then operator, then routine regardless of insertion order', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('routine', {triggerClass: 'routine-event', enqueuedAt: '2026-08-08T00:00:00.000Z'}));
        queue.enqueue(triggerFor('safety', {triggerClass: 'safety-escalation', enqueuedAt: '2026-08-08T00:00:05.000Z'}));
        queue.enqueue(triggerFor('operator', {triggerClass: 'operator-request', enqueuedAt: '2026-08-08T00:00:10.000Z'}));

        expect(dequeueAll(queue)).toEqual(['trigger-safety', 'trigger-operator', 'trigger-routine']);
    });

    it('reports the position a safety escalation actually landed in', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('r1', {enqueuedAt: '2026-08-08T00:00:00.000Z'}));
        queue.enqueue(triggerFor('r2', {enqueuedAt: '2026-08-08T00:00:01.000Z'}));
        const escalation = queue.enqueue(triggerFor('safety', {triggerClass: 'safety-escalation', enqueuedAt: '2026-08-08T00:00:02.000Z'}));

        expect(escalation.ok).toBeTrue();
        if (escalation.ok) {
            expect(escalation.position).toBe(1);
            expect(escalation.queueLength).toBe(3);
        }
    });

    it('keeps FIFO by enqueuedAt within one class', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('second', {enqueuedAt: '2026-08-08T00:00:09.000Z'}));
        queue.enqueue(triggerFor('first', {enqueuedAt: '2026-08-08T00:00:01.000Z'}));

        expect(dequeueAll(queue)).toEqual(['trigger-first', 'trigger-second']);
    });

    it('breaks an identical timestamp by durable event sequence, then event ID', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('late', {eventSequence: 9, eventId: 'event-aaa'}));
        queue.enqueue(triggerFor('early', {eventSequence: 4, eventId: 'event-zzz'}));
        queue.enqueue(triggerFor('tie', {eventSequence: 4, eventId: 'event-bbb'}));

        expect(dequeueAll(queue)).toEqual(['trigger-tie', 'trigger-early', 'trigger-late']);
    });

    it('produces the same order after reconstruction from queue.json', () => {
        const queue = newQueue(laneDir);
        for (const id of ['c', 'a', 'b']) queue.enqueue(triggerFor(id, {eventSequence: id.charCodeAt(0)}));
        const live = queue.snapshot().entries.length;

        const reloaded = newQueue(laneDir);
        expect(reloaded.snapshot().entries.length).toBe(live);
        expect(dequeueAll(reloaded)).toEqual(['trigger-a', 'trigger-b', 'trigger-c']);
    });

    it('derives priority on reload instead of trusting the persisted value', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('routine', {triggerClass: 'routine-event'}));
        queue.enqueue(triggerFor('safety', {triggerClass: 'safety-escalation', enqueuedAt: '2026-08-08T00:09:00.000Z'}));

        const tampered = JSON.parse(readFileSync(queuePath(laneDir), 'utf8')) as {entries: {priority: number}[]};
        for (const entry of tampered.entries) entry.priority = 2;
        files.writeAtomic(queuePath(laneDir), `${JSON.stringify(tampered)}\n`);

        expect(newQueue(laneDir).peek()?.triggerId).toBe('trigger-safety');
    });
});

describe('CA-13 queue admission and activation fences', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('suppresses a second trigger carrying an already queued correlation ID', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one', {correlationId: 'shared'}));
        const duplicate = queue.enqueue(triggerFor('two', {correlationId: 'shared'}));

        expect(duplicate.ok).toBeFalse();
        if (!duplicate.ok) {
            expect(duplicate.reason).toBe('duplicate-event');
            expect(duplicate.code).toBe('QUEUE_DUPLICATE_EVENT');
            expect(duplicate.priorCycleId).toBe('cycle-one');
        }
        expect(queue.snapshot().entries.length).toBe(1);
    });

    it('refuses admission past the configured maximum without partial success', () => {
        const queue = newQueue(laneDir, 1);
        queue.enqueue(triggerFor('one'));
        const full = queue.enqueue(triggerFor('two'));

        expect(full.ok).toBeFalse();
        if (!full.ok) expect(full.code).toBe('QUEUE_FULL');
        expect(queue.snapshot().entries.length).toBe(1);
    });

    it('permits no second dequeue while a cycle is active', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        queue.enqueue(triggerFor('two', {enqueuedAt: '2026-08-08T00:00:01.000Z'}));

        expect(queue.dequeue().ok).toBeTrue();
        const blocked = queue.dequeue();
        expect(blocked.ok).toBeFalse();
        if (!blocked.ok) {
            expect(blocked.reason).toBe('cycle-active');
            expect(blocked.code).toBe('QUEUE_CYCLE_ACTIVE');
        }
    });

    it('keeps the active cycle across a restart so a crashed lane cannot double-dequeue', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        queue.dequeue();

        expect(newQueue(laneDir).dequeue().ok).toBeFalse();
    });

    it('reports an empty queue distinctly from a fully held queue', () => {
        const queue = newQueue(laneDir);
        const empty = queue.dequeue();
        expect(empty.ok).toBeFalse();
        if (!empty.ok) expect(empty.reason).toBe('queue-empty');
    });
});

describe('CA-13 impact-scoped blocker with unrelated progress', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('holds only the blocked batch and lets an unrelated batch keep moving', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('blocked', {batchId: 'CA-99', enqueuedAt: '2026-08-08T00:00:00.000Z'}));
        queue.enqueue(triggerFor('unrelated', {batchId: 'CA-42', enqueuedAt: '2026-08-08T00:00:01.000Z'}));
        queue.applyHold(holdFor('blocker-1', ['CA-99']));

        const taken = queue.dequeue();
        expect(taken.ok).toBeTrue();
        if (taken.ok) expect(taken.trigger.batchId).toBe('CA-42');
        expect(queue.snapshot().entries.map((entry) => entry.triggerId)).toEqual(['trigger-blocked']);
    });

    it('reports the held triggers rather than an empty queue when everything is in scope', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('blocked', {batchId: 'CA-99'}));
        queue.applyHold(holdFor('blocker-1', ['CA-99']));

        const held = queue.dequeue();
        expect(held.ok).toBeFalse();
        if (!held.ok) {
            expect(held.reason).toBe('impact-scoped-hold');
            expect(held.heldTriggerIds).toEqual(['trigger-blocked']);
        }
    });

    it('resumes the held batch once the blocker is released, in its original position', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('blocked', {batchId: 'CA-99', enqueuedAt: '2026-08-08T00:00:00.000Z'}));
        queue.enqueue(triggerFor('unrelated', {batchId: 'CA-42', enqueuedAt: '2026-08-08T00:00:01.000Z'}));
        queue.applyHold(holdFor('blocker-1', ['CA-99']));
        const first = queue.dequeue();
        if (first.ok) queue.completeCycle(first.trigger.cycleId);
        queue.releaseHold('blocker-1');

        expect(dequeueAll(queue)).toEqual(['trigger-blocked']);
    });

    it('survives a restart with the hold still recorded', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('blocked', {batchId: 'CA-99'}));
        queue.applyHold(holdFor('blocker-1', ['CA-99']));

        expect(newQueue(laneDir).dequeue().ok).toBeFalse();
    });

    it('applies a lane-scope hold to every trigger, including triggers with no batch', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('nobatch', {batchId: null}));
        queue.applyHold(holdFor('blocker-1', [], 'lane'));

        expect(queue.dequeue().ok).toBeFalse();
    });
});

describe('CA-13 activation invalidation', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('drops queue entries bound to a superseded pack revision and keeps current ones', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('stale', {packRevision: 'pack-revision-0'}));
        queue.enqueue(triggerFor('current', {packRevision: PACK_REVISION, enqueuedAt: '2026-08-08T00:00:01.000Z'}));

        expect(queue.invalidateSupersededRevision(PACK_REVISION)).toEqual(['trigger-stale']);
        expect(newQueue(laneDir).snapshot().entries.map((entry) => entry.triggerId)).toEqual(['trigger-current']);
    });

    it('is a no-op — and writes nothing — when every entry is already current', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('current'));
        const before = readFileSync(queuePath(laneDir), 'utf8');

        expect(queue.invalidateSupersededRevision(PACK_REVISION)).toEqual([]);
        expect(readFileSync(queuePath(laneDir), 'utf8')).toBe(before);
    });
});

describe('CA-13 queue durability', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('leaves the previous projection intact when the staged write fails', () => {
        const queue = newQueue(laneDir);
        queue.enqueue(triggerFor('one'));
        const durable = readFileSync(queuePath(laneDir), 'utf8');

        const faulted = new CoordinatorQueue({
            laneDir, laneId: LANE_ID, lock: lockFor(laneDir), clock: fixedClock(),
            files: faultingQueueFiles('createExclusive', (path) => path.includes('queue.json'))
        });
        expect(() => faulted.enqueue(triggerFor('two'))).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'QUEUE_STATE_WRITE_FAILED');
        expect(readFileSync(queuePath(laneDir), 'utf8')).toBe(durable);
        expect(newQueue(laneDir).snapshot().entries.length).toBe(1);
    });

    it('keeps the in-memory queue equal to the durable bytes after a failed write', () => {
        const faulted = new CoordinatorQueue({
            laneDir, laneId: LANE_ID, lock: lockFor(laneDir), clock: fixedClock(),
            files: faultingQueueFiles('createExclusive', (path) => path.includes('queue.json'))
        });
        expect(() => faulted.enqueue(triggerFor('one'))).toThrow();
        expect(faulted.snapshot().entries).toEqual([]);
    });
});
