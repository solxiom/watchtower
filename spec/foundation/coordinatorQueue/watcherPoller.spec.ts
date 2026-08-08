/**
 * CA-13 watcher-integration proof.
 *
 * The watcher runtime is never started or modified here — the integration is
 * proved against the durable events it produces, read through the same typed
 * path production uses. This file covers ingestion, M0 bypass, and the recorded
 * blocker/activation events; the durable cursor boundary and the deduplication
 * matrix have their own suites
 * (`watcherCursorIntegration.spec.ts`) so that neither becomes a grab bag.
 */
import {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {CoordinatorReplay} from '../../../src/foundation/lane/coordinator/queue/CoordinatorReplay.js';
import type {CursorManager} from '../../../src/foundation/lane/coordinator/queue/CursorManager.js';
import {WatcherPoller} from '../../../src/foundation/lane/coordinator/queue/WatcherPoller.js';
import {triggerIngestFromIndex} from '../../../src/foundation/lane/coordinator/queue/coordinatorJournalSources.js';
import type {
    ImpactScopedHold
} from '../../../src/contracts/coordinatorQueue.js';
import type {
    M0Disposition, TriggerCandidate
} from '../../../src/contracts/coordinatorReplay.js';
import type {CycleHistorySource, TriggerIngestSource} from '../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import {
    LANE_ID, PACK_REVISION, candidateFor, classification, classifierFor, countingIds, cursorFor,
    cycleEntry, durableEvent, files, fixedClock, historyOf, ingestOf, lockFor, m0SinkExcept, makeLaneDir,
    readerOf, removeLaneDir, triggerFor
} from './support/queueFixtures.js';

interface Harness {
    readonly queue: CoordinatorQueue;
    readonly cursor: CursorManager;
    readonly poller: WatcherPoller;
}

function harness(laneDir: string, options: {
    ingest: TriggerIngestSource;
    classifications?: Readonly<Record<string, ReturnType<typeof classification>>>;
    fallback?: ReturnType<typeof classification>;
    history?: CycleHistorySource;
    m0Sink?: (candidate: TriggerCandidate) => Promise<M0Disposition>;
    impactScope?: (candidate: TriggerCandidate) => ImpactScopedHold | null;
    activatedRevision?: (candidate: TriggerCandidate) => string | null;
}): Harness {
    const queue = new CoordinatorQueue({laneDir, laneId: LANE_ID, files, lock: lockFor(laneDir), clock: fixedClock()});
    const cursor = cursorFor(laneDir);
    const replay = new CoordinatorReplay({
        queue, cursor, history: options.history ?? historyOf([]), ids: countingIds('replay'),
        clock: fixedClock(), activePackRevision: () => PACK_REVISION
    });
    const poller = new WatcherPoller({
        laneId: LANE_ID, queue, replay, cursor, ingest: options.ingest,
        classifier: classifierFor(options.classifications ?? {}, options.fallback ?? classification()),
        clock: fixedClock(), ids: countingIds('poll'),
        m0Sink: options.m0Sink ?? m0SinkExcept(),
        impactScope: options.impactScope ?? (() => null),
        activatedRevision: options.activatedRevision ?? (() => null)
    });
    return {queue, cursor, poller};
}

describe('CA-13 watcher poll ingestion', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('classifies and enqueues each new durable event exactly once', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0}), candidateFor('b', {sequence: 1})]),
            classifications: {
                'event-a': classification({triggerClass: 'safety-escalation', decisionClass: 'D3'}),
                'event-b': classification()
            }
        });

        const report = await poller.poll();

        expect(report.ok).toBeTrue();
        expect(report.fromSequence).toBe(0);
        expect(report.scanned).toBe(2);
        expect(report.enqueuedTriggerIds.length).toBe(2);
        expect(queue.peek()?.eventId).toBe('event-a');
        expect(queue.peek()?.triggerClass).toBe('safety-escalation');
    });

    it('reports WATCHER_NO_EVENTS without touching the queue or the cursor', async () => {
        const {queue, cursor, poller} = harness(laneDir, {ingest: ingestOf([])});

        const report = await poller.poll();

        expect(report.ok).toBeFalse();
        expect(report.reason).toBe('WATCHER_NO_EVENTS');
        expect(report.cursorAdvancedTo).toBeNull();
        expect(queue.snapshot().entries).toEqual([]);
        expect(cursor.current().lastProcessedEventId).toBeNull();
    });

    it('reads candidates through the CA-03 typed index rather than the journal file', async () => {
        const ingest = triggerIngestFromIndex(readerOf([
            durableEvent(0, 'handoff', {batchId: 'CA-13'}), durableEvent(1, 'blocked')
        ]));
        const page = await ingest.scan({fromSequence: 0, fromByteOffset: 0, limit: 10, expected: null});

        expect(page.candidates.map((candidate) => candidate.eventType)).toEqual(['handoff', 'blocked']);
        expect(page.candidates[0].batchId).toBe('CA-13');
        expect(page.candidates[1].batchId).toBeNull();
        // The index cannot see journal bytes, so it offers no boundary rather
        // than a fabricated one.
        expect(page.byteLength).toBeNull();
    });
});

describe('CA-13 M0 bypass', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('never enqueues an M0 candidate for a decision cycle', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('m0', {sequence: 0}), candidateFor('d2', {sequence: 1})]),
            classifications: {
                'event-m0': classification({decisionClass: 'M0'}),
                'event-d2': classification()
            }
        });

        const report = await poller.poll();

        expect(report.m0EventIds).toEqual(['event-m0']);
        expect(report.enqueuedTriggerIds.length).toBe(1);
        expect(queue.snapshot().entries.length).toBe(1);
        expect(queue.snapshot().entries[0].trigger.eventId).toBe('event-d2');
    });
});

describe('CA-13 recorded blocker and activation handling', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('applies the impact scope the blocker event recorded and does not queue it as a cycle', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('blocker', {sequence: 0, eventType: 'specification-blocker-detected'})]),
            impactScope: () => Object.freeze({
                blockerId: 'blocker-1', scope: 'impact-scoped' as const,
                batchIds: Object.freeze(['CA-99']), recordedAt: '2026-08-08T00:00:00.000Z'
            })
        });

        const report = await poller.poll();

        expect(report.holdsApplied).toEqual(['blocker-1']);
        expect(report.enqueuedTriggerIds).toEqual([]);
        expect(report.cursorAdvancedTo).toBe('event-blocker');
        expect(queue.activeHolds().map((hold) => hold.blockerId)).toEqual(['blocker-1']);
    });

    it('invalidates queued triggers bound to a superseded revision on activation', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('activation', {sequence: 0, eventType: 'specification-revision-activated'})]),
            activatedRevision: () => 'pack-revision-2'
        });
        queue.enqueue(triggerFor('stale', {packRevision: PACK_REVISION}));

        const report = await poller.poll();

        expect(report.invalidatedTriggerIds).toEqual(['trigger-stale']);
        expect(queue.snapshot().entries).toEqual([]);
    });

    it('queues a blocker event as an ordinary trigger when no scope was recorded', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('blocker', {sequence: 0, eventType: 'specification-blocker-detected'})]),
            fallback: classification({triggerClass: 'safety-escalation', decisionClass: 'D3'})
        });

        const report = await poller.poll();

        expect(report.holdsApplied).toEqual([]);
        expect(report.enqueuedTriggerIds.length).toBe(1);
        expect(queue.peek()?.triggerClass).toBe('safety-escalation');
    });
});
