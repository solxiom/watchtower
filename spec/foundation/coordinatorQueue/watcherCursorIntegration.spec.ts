/**
 * CA-13 correction-01 F2 — the durable watcher-to-cursor boundary.
 *
 * These are the scenarios the original suite could not fail, because the poll
 * then took its start sequence from the caller and never touched the cursor.
 * Every assertion here reads `coordinator/cursor.json` after the poll: a report
 * that named a position the durable cursor does not hold would let the next
 * poll skip live work, which is exactly the defect under correction.
 */
import {existsSync} from 'node:fs';
import {CoordinatorQueue} from '../../../src/foundation/lane/coordinator/queue/CoordinatorQueue.js';
import {CoordinatorReplay} from '../../../src/foundation/lane/coordinator/queue/CoordinatorReplay.js';
import type {CursorManager} from '../../../src/foundation/lane/coordinator/queue/CursorManager.js';
import {WatcherPoller} from '../../../src/foundation/lane/coordinator/queue/WatcherPoller.js';
import {cursorPath} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import type {
    ImpactScopedHold
} from '../../../src/contracts/coordinatorQueue.js';
import type {
    M0Disposition, TriggerCandidate
} from '../../../src/contracts/coordinatorReplay.js';
import type {CycleHistorySource, TriggerIngestSource} from '../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import {
    LANE_ID, PACK_REVISION, candidateFor, classification, classifierFor, countingIds, cursorFor,
    cycleEntry, files, fixedClock, historyOf, ingestOf, lockFor, m0SinkExcept, makeLaneDir, removeLaneDir,
    triggerFor
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

describe('CA-13 watcher-to-cursor durable advancement (F2)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('starts from the durable cursor, not from a caller-supplied sequence', async () => {
        const candidates = [candidateFor('a', {sequence: 0}), candidateFor('b', {sequence: 1})];
        const first = harness(laneDir, {
            ingest: ingestOf(candidates),
            classifications: {'event-a': classification({decisionClass: 'M0'}), 'event-b': classification()}
        });
        await first.poller.poll();
        expect(first.cursor.current().lastProcessedSequence).toBe(0);

        // A brand-new poller with no shared memory resumes from cursor.json.
        const second = harness(laneDir, {
            ingest: ingestOf(candidates),
            classifications: {'event-a': classification({decisionClass: 'M0'}), 'event-b': classification()}
        });
        const report = await second.poller.poll();

        expect(report.fromSequence).toBe(1);
        expect(report.scanned).toBe(1);
    });

    it('checkpoints the cursor across events it terminally handled', async () => {
        const {cursor, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0}), candidateFor('b', {sequence: 1})]),
            fallback: classification({decisionClass: 'M0'})
        });

        const report = await poller.poll();

        expect(report.cursorAdvancedTo).toBe('event-b');
        expect(cursor.current().lastProcessedSequence).toBe(1);
        expect(cursor.current().lastCursorAdvanceAt).not.toBeNull();
    });

    it('records a non-effect checkpoint under its own authority, never as an effect outcome', async () => {
        const {cursor, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0})]),
            fallback: classification({decisionClass: 'M0'})
        });
        await poller.poll();

        const advance = cursor.checkpointHandled('event-a', [{eventId: 'event-x', sequence: 1}]);
        expect(advance.ok).toBeTrue();
        if (advance.ok) {
            expect(advance.authority).toBe('non-effect-handling');
            expect(advance.confirmedEffectEventId).toBeNull();
        }
    });

    it('stops the checkpoint at the first event that opened a cycle', async () => {
        const {cursor, poller} = harness(laneDir, {
            ingest: ingestOf([
                candidateFor('a', {sequence: 0}), candidateFor('b', {sequence: 1}), candidateFor('c', {sequence: 2})
            ]),
            classifications: {
                'event-a': classification({decisionClass: 'M0'}),
                'event-b': classification(),
                'event-c': classification({decisionClass: 'M0'})
            }
        });

        const report = await poller.poll();

        // `event-c` was handled too, but it sits behind the outstanding cycle
        // that `event-b` opened, so the single cursor position may not pass it.
        expect(report.cursorAdvancedTo).toBe('event-a');
        expect(cursor.current().lastProcessedSequence).toBe(0);
        expect(report.enqueuedTriggerIds.length).toBe(1);
    });

    it('does not advance at all when the first scanned event opens a cycle', async () => {
        const {cursor, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0}), candidateFor('b', {sequence: 1})])
        });

        const report = await poller.poll();

        expect(report.cursorAdvancedTo).toBeNull();
        expect(cursor.current().lastProcessedEventId).toBeNull();
    });

    it('holds the cursor behind an M0 event the routing layer did not handle', async () => {
        const {cursor, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0}), candidateFor('b', {sequence: 1})]),
            fallback: classification({decisionClass: 'M0'}),
            m0Sink: m0SinkExcept(['event-a'])
        });

        const report = await poller.poll();

        expect(report.m0UnhandledEventIds).toEqual(['event-a']);
        expect(report.cursorAdvancedTo).toBeNull();
        expect(cursor.current().lastProcessedEventId).toBeNull();
    });

    it('re-scans the same window idempotently after a crash before the checkpoint', async () => {
        const candidates = [candidateFor('a', {sequence: 0}), candidateFor('b', {sequence: 1})];
        const first = harness(laneDir, {ingest: ingestOf(candidates)});
        const firstReport = await first.poller.poll();
        expect(firstReport.enqueuedTriggerIds.length).toBe(2);
        expect(firstReport.cursorAdvancedTo).toBeNull();

        // The crash: the cursor never moved, so a restarted poller re-scans
        // both events. Nothing may be enqueued twice.
        const second = harness(laneDir, {ingest: ingestOf(candidates)});
        const secondReport = await second.poller.poll();

        expect(secondReport.enqueuedTriggerIds).toEqual([]);
        expect(secondReport.duplicateEventIds).toEqual(['event-a', 'event-b']);
        expect(second.queue.snapshot().entries.length).toBe(2);
    });

    it('checkpoints a window whose events were all suppressed as re-deliveries', async () => {
        const candidates = [candidateFor('a', {sequence: 0})];
        const first = harness(laneDir, {ingest: ingestOf(candidates)});
        await first.poller.poll();

        const second = harness(laneDir, {ingest: ingestOf(candidates)});
        const report = await second.poller.poll();

        expect(report.duplicateEventIds).toEqual(['event-a']);
        expect(report.cursorAdvancedTo).toBe('event-a');
        expect(second.cursor.current().lastProcessedSequence).toBe(0);
    });

    it('carries the §9 journal identity and byte offset into the cursor when the source supplies them', async () => {
        const {cursor, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0, byteOffset: 4096, journalIdentity: 'sha256:feed'})]),
            fallback: classification({decisionClass: 'M0'})
        });

        await poller.poll();

        expect(cursor.current().lastByteOffset).toBe(4096);
        expect(cursor.current().journalIdentity).toBe('sha256:feed');
    });

    it('retains the stored offset and identity when a later source cannot supply them', async () => {
        const m0 = classification({decisionClass: 'M0'});
        const first = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0, byteOffset: 4096, journalIdentity: 'sha256:feed'})]),
            fallback: m0
        });
        await first.poller.poll();
        expect(first.cursor.current().lastByteOffset).toBe(4096);

        // The second window comes from the index path, which decodes events
        // without their journal offsets. The stored §9 fields must survive
        // rather than being reset to zero or null.
        const second = harness(laneDir, {ingest: ingestOf([candidateFor('b', {sequence: 1})]), fallback: m0});
        await second.poller.poll();

        expect(second.cursor.current().lastProcessedEventId).toBe('event-b');
        expect(second.cursor.current().lastByteOffset).toBe(4096);
        expect(second.cursor.current().journalIdentity).toBe('sha256:feed');
    });
});

describe('CA-13 event-ID and correlation deduplication in one poll (F1)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('suppresses a repeated event ID even when the correlations differ', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([
                candidateFor('a', {sequence: 0, eventId: 'event-shared', correlationId: 'correlation-one'}),
                candidateFor('b', {sequence: 1, eventId: 'event-shared', correlationId: 'correlation-two'})
            ])
        });

        const report = await poller.poll();

        expect(report.enqueuedTriggerIds.length).toBe(1);
        expect(report.duplicateEventIds).toEqual(['event-shared']);
        expect(queue.snapshot().entries.length).toBe(1);
    });

    it('suppresses a repeated correlation ID even when the event IDs differ', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([
                candidateFor('a', {sequence: 0, correlationId: 'shared'}),
                candidateFor('b', {sequence: 1, correlationId: 'shared'})
            ])
        });

        const report = await poller.poll();

        expect(report.enqueuedTriggerIds.length).toBe(1);
        expect(report.duplicateEventIds).toEqual(['event-b']);
        expect(queue.snapshot().entries.length).toBe(1);
    });

    it('suppresses a re-delivery whose event already opened an in-flight cycle', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0, eventId: 'event-c1', correlationId: 'fresh-correlation'})]),
            history: historyOf([cycleEntry('c1', 'coordinator-routed')])
        });

        const report = await poller.poll();

        expect(report.enqueuedTriggerIds).toEqual([]);
        expect(report.duplicateEventIds).toEqual(['event-c1']);
        expect(queue.snapshot().entries).toEqual([]);
    });

    it('suppresses a re-delivered event whose cycle already completed', async () => {
        const {queue, poller} = harness(laneDir, {
            ingest: ingestOf([candidateFor('a', {sequence: 0, correlationId: 'shared'})]),
            history: historyOf([cycleEntry('c1', 'coordinator-cycle-complete', {correlationId: 'shared'})])
        });

        const report = await poller.poll();

        expect(report.enqueuedTriggerIds).toEqual([]);
        expect(report.duplicateEventIds).toEqual(['event-a']);
        expect(queue.snapshot().entries).toEqual([]);
    });
});
