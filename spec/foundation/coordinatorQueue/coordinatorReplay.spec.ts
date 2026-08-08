/**
 * CA-13 interrupted, duplicate, and uncertain replay proof.
 *
 * A crash is simulated at every phase of the §14 lifecycle by leaving the
 * coordinator history exactly as that crash would leave it, then asking a
 * *fresh* replay manager what the lane owes. The assertions are on the derived
 * plan rather than on any repair, because this owner deliberately never
 * repairs: recovery is executed later through the normal validated cycle path.
 */
import {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {CoordinatorReplay} from '../../../src/foundation/lane/coordinator/queue/CoordinatorReplay.js';
import {CursorManager} from '../../../src/foundation/lane/coordinator/queue/CursorManager.js';
import {effectEvidenceFromJournal} from '../../../src/foundation/lane/coordinator/queue/effectEvidenceSource.js';
import {cycleHistoryFromIndex} from '../../../src/foundation/lane/coordinator/queue/coordinatorJournalSources.js';
import {planCycleRecovery} from '../../../src/foundation/lane/coordinator/queue/cycleRecovery.js';
import type {
    CycleRecoveryAction
} from '../../../src/contracts/coordinatorReplay.js';
import type {CycleHistorySource} from '../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import {
    LANE_ID, PACK_REVISION, countingIds, cycleEntry, durableEvent, files, fixedClock, historyOf,
    lockFor, makeLaneDir, readerOf, removeLaneDir, triggerFor
} from './support/queueFixtures.js';

function newReplay(laneDir: string, history: CycleHistorySource): {replay: CoordinatorReplay; queue: CoordinatorQueue} {
    const lock = lockFor(laneDir);
    const queue = new CoordinatorQueue({laneDir, laneId: LANE_ID, files, lock, clock: fixedClock()});
    const cursor = new CursorManager({
        laneDir, laneId: LANE_ID, files, lock, clock: fixedClock(), evidence: effectEvidenceFromJournal(laneDir)
    });
    return {queue, replay: new CoordinatorReplay({
        queue, cursor, history, ids: countingIds(), clock: fixedClock(), activePackRevision: () => PACK_REVISION
    })};
}

const PHASE_EXPECTATIONS: readonly [string, CycleRecoveryAction][] = [
    ['coordinator-cycle-requested', 'reroute'],
    ['coordinator-routed', 'reinvoke'],
    ['coordinator-proposal-received', 'revalidate'],
    ['coordinator-effect-prepared', 'reattempt-idempotent'],
    ['coordinator-effect-attempted', 'verify'],
    ['coordinator-effect-verified', 'mark-complete']
];

describe('CA-13 interrupted-cycle recovery at every phase', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    for (const [phase, action] of PHASE_EXPECTATIONS) {
        it(`recovers a cycle interrupted at ${phase} with ${action}`, async () => {
            const {replay} = newReplay(laneDir, historyOf([cycleEntry('c1', phase)]));
            const report = await replay.recover();

            expect(report.plans.length).toBe(1);
            expect(report.plans[0].action).toBe(action);
            expect(report.plans[0].lastPhase).toBe(phase);
            expect(report.plans[0].reason).toBeNull();
            expect(report.cursorHeld).toBeFalse();
        });
    }

    it('produces no recovery work for a completed cycle', async () => {
        const {replay} = newReplay(laneDir, historyOf([cycleEntry('c1', 'coordinator-cycle-complete')]));
        expect((await replay.recover()).plans).toEqual([]);
    });

    it('reports an unrecognized last phase as an orphaned cycle rather than guessing', async () => {
        const {replay} = newReplay(laneDir, historyOf([cycleEntry('c1', 'tmux-pane-output')]));
        const report = await replay.recover();

        expect(report.plans[0].action).toBe('escalate');
        expect(report.plans[0].reason).toBe('REPLAY_CYCLE_ORPHANED');
        expect(report.orphanedCycleIds).toEqual(['c1']);
    });

    it('recovers unrelated cycles independently in one pass', async () => {
        const {replay} = newReplay(laneDir, historyOf([
            cycleEntry('c1', 'coordinator-routed'), cycleEntry('c2', 'coordinator-effect-verified')
        ]));
        const report = await replay.recover();

        expect(report.plans.map((plan) => plan.action)).toEqual(['reinvoke', 'mark-complete']);
    });

    it('maps every declared phase exactly once and nothing else', () => {
        expect(planCycleRecovery(cycleEntry('c1', 'coordinator-cycle-complete'))).toBeNull();
        for (const [phase, action] of PHASE_EXPECTATIONS) {
            expect(planCycleRecovery(cycleEntry('c1', phase))?.action).withContext(phase).toBe(action);
        }
    });
});

describe('CA-13 uncertain-outcome replay', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('creates a D2 escalation cycle referencing the uncertain one and holds the cursor', async () => {
        const {replay} = newReplay(laneDir, historyOf([
            cycleEntry('c1', 'coordinator-effect-attempted', {uncertainOutcomeEventId: 'effect-uncertain-1'})
        ]));
        const report = await replay.recover();

        expect(report.cursorHeld).toBeTrue();
        expect(report.escalations.length).toBe(1);
        expect(report.escalations[0].priorCycleId).toBe('c1');
        expect(report.escalations[0].decisionClass).toBe('D2');
        expect(report.escalations[0].triggerClass).toBe('safety-escalation');
        expect(report.escalations[0].blockedCursorEventId).toBe('effect-uncertain-1');
        expect(report.escalations[0].cycleId).not.toBe('c1');
        expect(report.plans[0].action).toBe('escalate');
        expect(report.plans[0].reason).toBe('REPLAY_UNCERTAIN_OUTCOME');
        expect(report.plans[0].priorUncertainCycleId).toBe('c1');
    });

    it('leaves unrelated interrupted cycles recoverable while the cursor is held', async () => {
        const {replay} = newReplay(laneDir, historyOf([
            cycleEntry('c1', 'coordinator-effect-attempted', {uncertainOutcomeEventId: 'effect-uncertain-1'}),
            cycleEntry('c2', 'coordinator-routed')
        ]));
        const report = await replay.recover();

        expect(report.cursorHeld).toBeTrue();
        expect(report.plans.find((plan) => plan.cycleId === 'c2')?.action).toBe('reinvoke');
    });
});

describe('CA-13 duplicate-event suppression', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses a trigger whose correlation ID already completed a cycle', async () => {
        const history = historyOf([cycleEntry('c1', 'coordinator-cycle-complete', {correlationId: 'shared'})]);
        const {replay, queue} = newReplay(laneDir, history);

        const outcome = await replay.admit(triggerFor('replayed', {correlationId: 'shared'}));

        expect(outcome.ok).toBeFalse();
        if (!outcome.ok) {
            expect(outcome.reason).toBe('duplicate-event');
            expect(outcome.priorCycleId).toBe('c1');
        }
        expect(queue.snapshot().entries).toEqual([]);
    });

    it('admits a trigger whose correlation ID has no completed cycle', async () => {
        const {replay, queue} = newReplay(laneDir, historyOf([cycleEntry('c1', 'coordinator-routed')]));

        expect((await replay.admit(triggerFor('fresh'))).ok).toBeTrue();
        expect(queue.snapshot().entries.length).toBe(1);
    });

    it('drops a queued trigger whose cycle completed while the lane was down', async () => {
        const queueBefore = new CoordinatorQueue({laneDir, laneId: LANE_ID, files, lock: lockFor(laneDir), clock: fixedClock()});
        queueBefore.enqueue(triggerFor('settled', {correlationId: 'shared'}));
        queueBefore.enqueue(triggerFor('outstanding', {correlationId: 'other', enqueuedAt: '2026-08-08T00:00:01.000Z'}));

        const {replay, queue} = newReplay(laneDir, historyOf([
            cycleEntry('c1', 'coordinator-cycle-complete', {correlationId: 'shared', triggerEventId: 'event-unrelated'})
        ]));
        const report = await replay.recover();

        expect(report.droppedTriggerIds).toEqual(['trigger-settled']);
        expect(queue.snapshot().entries.map((entry) => entry.triggerId)).toEqual(['trigger-outstanding']);
    });

    it('accepts a fresh cursor that has never advanced', async () => {
        const {replay} = newReplay(laneDir, historyOf([], []));
        await expectAsync(replay.assertCursorUsable()).toBeResolved();
    });
});

describe('CA-13 cycle history projection', () => {
    it('selects the furthest-advanced phase regardless of journal interleaving', async () => {
        const history = cycleHistoryFromIndex([
            readerOf([
                durableEvent(0, 'coordinator-cycle-requested', {cycleId: 'c1', correlationId: 'trigger-corr'}),
                durableEvent(1, 'coordinator-effect-verified', {cycleId: 'c1', correlationId: 'c1'})
            ]),
            readerOf([durableEvent(0, 'coordinator-routed', {cycleId: 'c1', correlationId: 'c1'})])
        ]);
        const cycles = await history.cycles();

        expect(cycles.length).toBe(1);
        expect(cycles[0].lastPhase).toBe('coordinator-effect-verified');
        expect(cycles[0].correlationId).toBe('trigger-corr');
    });

    it('resolves any cycle already opened for one durable trigger event', async () => {
        const history = cycleHistoryFromIndex(readerOf([
            durableEvent(0, 'coordinator-cycle-requested', {eventId: 'watcher-1', cycleId: 'c1'}),
            durableEvent(1, 'coordinator-routed', {cycleId: 'c1'})
        ]));

        expect(await history.cycleForTriggerEvent('watcher-1')).toBe('c1');
        expect(await history.cycleForTriggerEvent('watcher-2')).toBeNull();
    });

    it('recognizes an uncertain attempt through the payload phase, not the event type alone', async () => {
        const history = cycleHistoryFromIndex(readerOf([
            durableEvent(0, 'coordinator-cycle-requested', {cycleId: 'c1'}),
            durableEvent(1, 'coordinator-effect-attempted', {cycleId: 'c1', eventId: 'uncertain-1', payload: {phase: 'uncertain'}})
        ]));
        const cycles = await history.cycles();

        expect(cycles[0].uncertainOutcomeEventId).toBe('uncertain-1');
    });

    it('does not mark an ordinary attempt as uncertain', async () => {
        const history = cycleHistoryFromIndex(readerOf([
            durableEvent(0, 'coordinator-effect-attempted', {cycleId: 'c1', payload: {phase: 'attempted'}})
        ]));
        expect((await history.cycles())[0].uncertainOutcomeEventId).toBeNull();
    });

    it('fails closed rather than scanning past the bounded replay window', async () => {
        const events = Array.from({length: 12}, (unused, index) => durableEvent(index, 'coordinator-routed', {cycleId: `c${index}`}));
        const history = cycleHistoryFromIndex(readerOf(events), 5);

        await expectAsync(history.cycles()).toBeRejectedWithError(/bounded 5-event replay window/);
    });

    it('refuses a history with no journal index instead of degrading to an unindexed read', () => {
        expect(() => cycleHistoryFromIndex([])).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'REPLAY_CYCLE_ORPHANED');
    });
});
