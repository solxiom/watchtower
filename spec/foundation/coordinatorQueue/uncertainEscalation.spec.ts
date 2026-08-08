/**
 * CA-13 correction-03 F1 — durable, idempotent escalation of an uncertain
 * outcome.
 *
 * The pre-correction replay returned an escalation object and enqueued nothing,
 * so the lane's response to "an effect may or may not have committed" evaporated
 * with the process that discovered it. Every scenario below therefore asserts on
 * the **persisted queue projection**, not on the returned report alone.
 *
 * The four claims are: one restart produces one durable escalation; repeated
 * restarts produce no more; the escalation references the uncertain cycle and
 * routes to D2 at safety-escalation priority; and the original uncertain record
 * is never rewritten, with the cursor held behind it throughout.
 */
import {readFileSync} from 'node:fs';
import {CoordinatorReplay} from '../../../src/foundation/lane/coordinator/queue/CoordinatorReplay.js';
import {escalationEventIdFor} from '../../../src/foundation/lane/coordinator/queue/uncertainEscalation.js';
import {queuePath, readQueueDocument} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import type {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import type {CycleHistoryEntry} from '../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import {
    LANE_ID, PACK_REVISION, countingIds, cursorFor, cycleEntry, files, fixedClock, historyOf,
    makeLaneDir, queueFor, removeLaneDir, triggerFor
} from './support/queueFixtures.js';

const UNCERTAIN_EVENT = 'effect-uncertain-1';

/** A cycle stopped at `effect-attempted` with an outcome the lane recorded as unknowable. */
function uncertainCycle(overrides: Partial<CycleHistoryEntry> = {}): CycleHistoryEntry {
    return cycleEntry('c1', 'coordinator-effect-attempted', {
        uncertainOutcomeEventId: UNCERTAIN_EVENT, ...overrides
    });
}

/** A fresh replay owner over the *same* lane, as a restart would build one. */
function replayFor(laneDir: string, entries: readonly CycleHistoryEntry[]): {replay: CoordinatorReplay; queue: CoordinatorQueue} {
    const queue = queueFor(laneDir);
    return {
        queue,
        replay: new CoordinatorReplay({
            queue, cursor: cursorFor(laneDir), history: historyOf(entries), ids: countingIds(),
            clock: fixedClock(), activePackRevision: () => PACK_REVISION
        })
    };
}

describe('CA-13 uncertain outcomes escalate durably (F1)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('admits the escalation into the persisted queue, not only into the report', async () => {
        const {replay} = replayFor(laneDir, [uncertainCycle()]);

        const report = await replay.recover();

        expect(report.escalations.length).toBe(1);
        expect(report.escalations[0].admission).toBe('created');
        const durable = readQueueDocument(laneDir, LANE_ID, files);
        expect(durable.entries.length).toBe(1);
        expect(durable.entries[0].trigger.eventId).toBe(escalationEventIdFor(UNCERTAIN_EVENT));
    });

    it('routes the escalation to D2 at safety-escalation priority, referencing the uncertain cycle', async () => {
        const {replay} = replayFor(laneDir, [uncertainCycle()]);

        const report = await replay.recover();
        const escalation = report.escalations[0];

        expect(escalation.decisionClass).toBe('D2');
        expect(escalation.triggerClass).toBe('safety-escalation');
        expect(escalation.priorCycleId).toBe('c1');
        expect(escalation.blockedCursorEventId).toBe(UNCERTAIN_EVENT);
        const entry = readQueueDocument(laneDir, LANE_ID, files).entries[0];
        expect(entry.trigger.decisionClass).toBe('D2');
        expect(entry.trigger.triggerClass).toBe('safety-escalation');
        expect(entry.priority).toBe(0);
        expect(entry.trigger.correlationId).toBe('correlation-c1');
    });

    it('produces one escalation across repeated restarts, not one per restart', async () => {
        const entries = [uncertainCycle()];
        for (let restart = 0; restart < 4; restart += 1) {
            const {replay} = replayFor(laneDir, entries);
            const report = await replay.recover();
            expect(report.escalations.length).toBe(1);
            expect(report.escalations[0].admission).toBe(restart === 0 ? 'created' : 'already-present');
        }

        const durable = readQueueDocument(laneDir, LANE_ID, files);
        expect(durable.entries.length).toBe(1);
        expect(durable.entries.filter((entry) => entry.trigger.triggerClass === 'safety-escalation').length).toBe(1);
    });

    it('does not re-admit an escalation whose cycle already opened after it was dequeued', async () => {
        const {replay, queue} = replayFor(laneDir, [uncertainCycle()]);
        await replay.recover();
        // The escalation was taken up: it is no longer in the projection, so only
        // the journal can report that it exists.
        const taken = queue.dequeue();
        expect(taken.ok).toBeTrue();
        expect(readQueueDocument(laneDir, LANE_ID, files).entries).toEqual([]);

        const journaled = [uncertainCycle(), cycleEntry('escalation-1', 'coordinator-routed', {priorUncertainCycleId: 'c1'})];
        const restarted = replayFor(laneDir, journaled);
        const report = await restarted.replay.recover();

        expect(report.escalations[0].admission).toBe('already-present');
        expect(report.escalations[0].cycleId).toBe('escalation-1');
        expect(readQueueDocument(laneDir, LANE_ID, files).entries).toEqual([]);
    });

    it('does not re-admit an escalation whose cycle already completed', async () => {
        const journaled = [
            uncertainCycle(),
            cycleEntry('escalation-1', 'coordinator-cycle-complete', {priorUncertainCycleId: 'c1'})
        ];
        const {replay} = replayFor(laneDir, journaled);

        const report = await replay.recover();

        expect(report.escalations[0].admission).toBe('already-present');
        expect(readQueueDocument(laneDir, LANE_ID, files).entries).toEqual([]);
    });

    it('holds the cursor for as long as the uncertainty stands, on every pass', async () => {
        const entries = [uncertainCycle()];
        for (let restart = 0; restart < 3; restart += 1) {
            const {replay} = replayFor(laneDir, entries);
            const report = await replay.recover();
            expect(report.cursorHeld).toBeTrue();
            expect(cursorFor(laneDir).current().lastProcessedEventId).toBeNull();
        }
    });

    it('leaves the recorded uncertain outcome exactly as the journal holds it', async () => {
        const entries = [uncertainCycle()];
        const {replay} = replayFor(laneDir, entries);

        await replay.recover();
        await replayFor(laneDir, entries).replay.recover();

        // The history projection this replay reads is unchanged, and the plan
        // still names the original cycle as escalate/uncertain rather than
        // rewriting it into something resolved.
        expect(entries[0].uncertainOutcomeEventId).toBe(UNCERTAIN_EVENT);
        expect(entries[0].lastPhase).toBe('coordinator-effect-attempted');
        const plan = (await replayFor(laneDir, entries).replay.recover()).plans.find((item) => item.cycleId === 'c1');
        expect(plan?.action).toBe('escalate');
        expect(plan?.reason).toBe('REPLAY_UNCERTAIN_OUTCOME');
        expect(plan?.priorUncertainCycleId).toBe('c1');
    });

    it('mints the escalation against the current pack revision so activation cannot discard it', async () => {
        const {replay, queue} = replayFor(laneDir, [uncertainCycle()]);
        await replay.recover();

        const invalidated = queue.invalidateSupersededRevision(PACK_REVISION);

        expect(invalidated).toEqual([]);
        expect(readQueueDocument(laneDir, LANE_ID, files).entries.length).toBe(1);
    });

    it('escalates each distinct uncertain cycle exactly once', async () => {
        const entries = [
            uncertainCycle(),
            cycleEntry('c2', 'coordinator-effect-attempted', {uncertainOutcomeEventId: 'effect-uncertain-2'})
        ];
        const {replay} = replayFor(laneDir, entries);

        const first = await replay.recover();
        const second = await replayFor(laneDir, entries).replay.recover();

        expect(first.escalations.map((item) => item.admission)).toEqual(['created', 'created']);
        expect(second.escalations.map((item) => item.admission)).toEqual(['already-present', 'already-present']);
        expect(readQueueDocument(laneDir, LANE_ID, files).entries.length).toBe(2);
    });

    it('writes no queue byte at all when the lane has no uncertain outcome', async () => {
        const {replay} = replayFor(laneDir, [cycleEntry('c1', 'coordinator-routed')]);

        const report = await replay.recover();

        expect(report.escalations).toEqual([]);
        expect(report.cursorHeld).toBeFalse();
        expect(() => readFileSync(queuePath(laneDir), 'utf8')).toThrow();
    });

    it('keeps unrelated queued work untouched while admitting an escalation', async () => {
        queueFor(laneDir).enqueue(triggerFor('unrelated'));
        const {replay} = replayFor(laneDir, [uncertainCycle()]);

        await replay.recover();

        const durable = readQueueDocument(laneDir, LANE_ID, files);
        expect(durable.entries.map((entry) => entry.triggerId)).toContain('trigger-unrelated');
        expect(durable.entries.length).toBe(2);
        // Safety outranks the pre-existing routine work regardless of arrival order.
        expect(queueFor(laneDir).peek()?.triggerClass).toBe('safety-escalation');
    });
});
