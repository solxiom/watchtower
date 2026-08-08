/**
 * CA-13 correction-04 F1 — every boundary between admission, dequeue, cycle
 * opening, and journal fsync.
 *
 * The re-review reproduced a duplicate escalation by crashing in one specific
 * gap: after the escalation was dequeued, and before its cycle-opening record
 * reached the journal. In that window the queue no longer holds the trigger and
 * the journal cannot yet answer for it, so both halves of duplicate suppression
 * miss and a restart mints a second safety cycle for one uncertainty.
 *
 * These scenarios walk the whole lifecycle and restart at each boundary, using a
 * **fresh replay owner over the same real lane** every time — which is what a
 * restart actually is. The journal is modelled as the history projection replay
 * reads, so "the cycle-opening record is not yet durable" is expressed exactly
 * as it appears to the lane: an absent entry.
 */
import {CoordinatorReplay} from '../../../src/foundation/lane/coordinator/queue/CoordinatorReplay.js';
import {readQueueDocument} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import type {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import type {CycleHistoryEntry} from '../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import {
    LANE_ID, PACK_REVISION, countingIds, cursorFor, cycleEntry, files, fixedClock, historyOf,
    makeLaneDir, queueFor, removeLaneDir, triggerFor
} from './support/queueFixtures.js';

const UNCERTAIN_EVENT = 'effect-uncertain-1';

function uncertainCycle(): CycleHistoryEntry {
    return cycleEntry('c1', 'coordinator-effect-attempted', {uncertainOutcomeEventId: UNCERTAIN_EVENT});
}

/** A restart: a brand-new owner set over the same durable lane. */
function restart(laneDir: string, entries: readonly CycleHistoryEntry[]): {replay: CoordinatorReplay; queue: CoordinatorQueue} {
    const queue = queueFor(laneDir);
    return {
        queue,
        replay: new CoordinatorReplay({
            queue, cursor: cursorFor(laneDir), history: historyOf(entries), ids: countingIds(),
            clock: fixedClock(), activePackRevision: () => PACK_REVISION
        })
    };
}

function escalations(laneDir: string): number {
    return readQueueDocument(laneDir, LANE_ID, files).entries
        .filter((entry) => entry.trigger.triggerClass === 'safety-escalation').length;
}

describe('CA-13 uncertain escalation survives a crash at every boundary (F1)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('crash after admission, before dequeue: the queued escalation suppresses the second', async () => {
        const journal = [uncertainCycle()];
        await restart(laneDir, journal).replay.recover();

        const second = await restart(laneDir, journal).replay.recover();

        expect(second.escalations[0].admission).toBe('already-present');
        expect(escalations(laneDir)).toBe(1);
    });

    it('crash after dequeue, before the cycle-opening record is durable: the reservation suppresses the second', async () => {
        const journal = [uncertainCycle()];
        const first = restart(laneDir, journal);
        await first.replay.recover();
        const taken = first.queue.dequeue();
        expect(taken.ok).toBeTrue();
        // The exact reproduced window: the trigger has left the projection and
        // the journal still has no cycle for it.
        expect(readQueueDocument(laneDir, LANE_ID, files).entries).toEqual([]);
        expect(journal.some((entry) => entry.priorUncertainCycleId === 'c1')).toBeFalse();

        const second = await restart(laneDir, journal).replay.recover();

        expect(second.escalations.length).toBe(1);
        expect(second.escalations[0].admission).toBe('already-present');
        if (taken.ok) expect(second.escalations[0].cycleId).toBe(taken.trigger.cycleId);
        expect(escalations(laneDir)).toBe(0);
        expect(readQueueDocument(laneDir, LANE_ID, files).reservations.length).toBe(1);
    });

    it('reports the unopened cycle so the caller can re-issue its journal record', async () => {
        const journal = [uncertainCycle()];
        const first = restart(laneDir, journal);
        await first.replay.recover();
        const taken = first.queue.dequeue();

        const second = await restart(laneDir, journal).replay.recover();

        expect(taken.ok).toBeTrue();
        if (taken.ok) expect(second.unopenedCycleIds).toEqual([taken.trigger.cycleId]);
    });

    it('crash after the cycle-opening record is durable: the journal suppresses the second', async () => {
        const journal: CycleHistoryEntry[] = [uncertainCycle()];
        const first = restart(laneDir, journal);
        await first.replay.recover();
        const taken = first.queue.dequeue();
        expect(taken.ok).toBeTrue();
        if (taken.ok) {
            journal.push(cycleEntry(taken.trigger.cycleId, 'coordinator-cycle-requested', {priorUncertainCycleId: 'c1'}));
        }

        const second = await restart(laneDir, journal).replay.recover();

        expect(second.escalations[0].admission).toBe('already-present');
        expect(second.unopenedCycleIds).toEqual([]);
        expect(escalations(laneDir)).toBe(0);
    });

    it('crash after the escalation cycle completes: no escalation is ever re-admitted', async () => {
        const journal: CycleHistoryEntry[] = [uncertainCycle()];
        const first = restart(laneDir, journal);
        await first.replay.recover();
        const taken = first.queue.dequeue();
        expect(taken.ok).toBeTrue();
        if (taken.ok) {
            journal.push(cycleEntry(taken.trigger.cycleId, 'coordinator-cycle-complete', {priorUncertainCycleId: 'c1'}));
            first.queue.completeCycle(taken.trigger.cycleId);
        }
        // Completion is what releases the claim — by then the journal answers.
        expect(readQueueDocument(laneDir, LANE_ID, files).reservations).toEqual([]);

        const second = await restart(laneDir, journal).replay.recover();

        expect(second.escalations[0].admission).toBe('already-present');
        expect(escalations(laneDir)).toBe(0);
    });

    it('stays at one escalation across ten restarts spread over every boundary', async () => {
        const journal: CycleHistoryEntry[] = [uncertainCycle()];
        let opened: string | null = null;
        for (let restartIndex = 0; restartIndex < 10; restartIndex += 1) {
            const owner = restart(laneDir, journal);
            const report = await owner.replay.recover();
            expect(report.escalations.length).toBe(1);
            expect(report.cursorHeld).toBeTrue();
            if (restartIndex === 2) {
                const taken = owner.queue.dequeue();
                if (taken.ok) opened = taken.trigger.cycleId;
            }
            if (restartIndex === 5 && opened !== null) {
                journal.push(cycleEntry(opened, 'coordinator-routed', {priorUncertainCycleId: 'c1'}));
            }
        }

        const created = readQueueDocument(laneDir, LANE_ID, files);
        expect(created.entries.filter((entry) => entry.trigger.triggerClass === 'safety-escalation').length).toBe(0);
        expect(created.reservations.length).toBe(1);
        expect(cursorFor(laneDir).current().lastProcessedEventId).toBeNull();
    });

    it('two concurrent replay owners admit one escalation between them', async () => {
        const journal = [uncertainCycle()];
        const first = restart(laneDir, journal);
        const second = restart(laneDir, journal);

        const reports = [await first.replay.recover(), await second.replay.recover()];

        expect(reports.filter((report) => report.escalations[0].admission === 'created').length).toBe(1);
        expect(reports.filter((report) => report.escalations[0].admission === 'already-present').length).toBe(1);
        expect(escalations(laneDir)).toBe(1);
    });

    it('two concurrent owners race the dequeue of one escalation and one wins', async () => {
        const journal = [uncertainCycle()];
        await restart(laneDir, journal).replay.recover();
        const first = queueFor(laneDir);
        const second = queueFor(laneDir);

        const results = [first.dequeue(), second.dequeue()];

        expect(results.filter((result) => result.ok).length).toBe(1);
        expect(readQueueDocument(laneDir, LANE_ID, files).reservations.length).toBe(1);
    });

    it('leaves the uncertain outcome and the held cursor untouched at every boundary', async () => {
        const journal: CycleHistoryEntry[] = [uncertainCycle()];
        const owner = restart(laneDir, journal);
        await owner.replay.recover();
        owner.queue.dequeue();

        const after = await restart(laneDir, journal).replay.recover();

        expect(journal[0].uncertainOutcomeEventId).toBe(UNCERTAIN_EVENT);
        expect(journal[0].lastPhase).toBe('coordinator-effect-attempted');
        expect(after.cursorHeld).toBeTrue();
        expect(cursorFor(laneDir).current().lastProcessedEventId).toBeNull();
        const plan = after.plans.find((item) => item.cycleId === 'c1');
        expect(plan?.action).toBe('escalate');
        expect(plan?.reason).toBe('REPLAY_UNCERTAIN_OUTCOME');
    });
});

describe('CA-13 reservations suppress ordinary re-delivery too (F1)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses a re-delivery of an event claimed by a dequeued cycle', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        expect(queue.dequeue().ok).toBeTrue();

        const again = queueFor(laneDir).enqueue(triggerFor('one', {triggerId: 'trigger-again', cycleId: 'cycle-again'}));

        expect(again.ok).toBeFalse();
        if (!again.ok) {
            expect(again.code).toBe('QUEUE_DUPLICATE_EVENT');
            expect(again.priorCycleId).toBe('cycle-one');
        }
    });

    it('refuses a re-delivery sharing only the correlation of a dequeued cycle', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one', {correlationId: 'shared'}));
        expect(queue.dequeue().ok).toBeTrue();

        const again = queueFor(laneDir).enqueue(triggerFor('two', {correlationId: 'shared'}));

        expect(again.ok).toBeFalse();
        if (!again.ok) expect(again.code).toBe('QUEUE_DUPLICATE_EVENT');
    });

    it('admits the work again once the cycle completes and the claim is released', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        const taken = queue.dequeue();
        expect(taken.ok).toBeTrue();
        if (taken.ok) queue.completeCycle(taken.trigger.cycleId);

        // A genuinely new event under the same correlation is ordinary new work
        // once nothing claims it; the journal, not the queue, owns "already
        // completed" from here.
        expect(queueFor(laneDir).enqueue(triggerFor('two', {correlationId: 'correlation-two'})).ok).toBeTrue();
    });

    it('releases a claim only on explicit instruction, and reports whether it held one', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        const taken = queue.dequeue();
        expect(taken.ok).toBeTrue();

        if (taken.ok) {
            expect(queue.releaseReservation(taken.trigger.cycleId)).toBeTrue();
            expect(queue.releaseReservation(taken.trigger.cycleId)).toBeFalse();
        }
        expect(readQueueDocument(laneDir, LANE_ID, files).reservations).toEqual([]);
    });

    it('refuses a queue projection whose reservation is missing a field rather than repairing it', () => {
        const queue = queueFor(laneDir);
        queue.enqueue(triggerFor('one'));
        queue.dequeue();
        const document = JSON.parse(
            readQueueDocumentText(laneDir)) as {reservations: Record<string, unknown>[]};
        delete document.reservations[0].eventId;
        files.writeAtomic(`${laneDir}/coordinator/queue.json`, `${JSON.stringify(document)}\n`);

        expect(() => queueFor(laneDir)).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'QUEUE_STATE_UNREADABLE');
    });
});

function readQueueDocumentText(laneDir: string): string {
    const read = files.readText(`${laneDir}/coordinator/queue.json`, 4 * 1024 * 1024);
    return read.kind === 'text' ? read.text : '{}';
}
