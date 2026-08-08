/**
 * Watcher-to-coordinator integration (CA-13;
 * `docs/spec/coordinator-automation.md` §14 steps 1–5 and 10).
 *
 * The watcher itself is *not* modified and is not called: this owner reads its
 * durable output through the accepted CA-03 runtime indexes, derives one
 * trigger per new event, deduplicates by event ID and correlation ID, enqueues
 * the judgment cycles, and then checkpoints the durable cursor.
 *
 * The poll is **cursor-driven at both ends** (correction-01 F2). It starts from
 * `coordinator/cursor.json`, never from a caller-supplied sequence, so no
 * caller can reprocess consumed events or skip past an unhandled one. It ends
 * by checking the cursor forward across the longest *contiguous prefix* of
 * scanned events that were terminally handled here, and stops that prefix at
 * the first event that opened a cycle — because a cycle is outstanding work,
 * and §14 advances the cursor "only after durable handling".
 *
 * A crash anywhere before the checkpoint simply re-scans the same window. That
 * is safe precisely because every step is idempotent: holds are replaced by
 * blocker ID, activation invalidation is a set difference, and re-enqueue is
 * refused by event-ID suppression.
 *
 * Two event types are handled specially because §18 records their meaning
 * directly in the event, so honouring them is mechanical rather than a
 * judgment: `specification-blocker-detected` carries the impact scope that
 * becomes a hold, and `specification-revision-activated` carries the revision
 * that invalidates pack-bound queue entries. Neither is computed here.
 */
import type {
    CoordinatorTrigger, ImpactScopedHold
} from '../../../../contracts/coordinatorQueue.js';
import type {
    M0Disposition, TriggerCandidate, WatcherPollReport
} from '../../../../contracts/coordinatorReplay.js';
import {pollReport, settledPrefix, type Disposition} from './watcherPollReport.js';
import type {CoordinatorQueue} from './CoordinatorQueue.js';
import type {CoordinatorReplay} from './CoordinatorReplay.js';
import type {CursorManager} from './CursorManager.js';
import {checkpointTargets, scanFenceOf} from './pollCursorFence.js';
import type {
    QueueClock, QueueIdFactory, TriggerClassification, TriggerClassifier, TriggerIngestSource
} from './queuePorts.js';

const BLOCKER_EVENT = 'specification-blocker-detected';
const ACTIVATION_EVENT = 'specification-revision-activated';

/** A poll past this would stop being a bounded ingestion step. */
export const DEFAULT_POLL_LIMIT = 128;

export interface WatcherPollerOptions {
    readonly laneId: string;
    readonly queue: CoordinatorQueue;
    readonly replay: CoordinatorReplay;
    /** The durable cursor this poll both starts from and checkpoints. */
    readonly cursor: CursorManager;
    readonly ingest: TriggerIngestSource;
    readonly classifier: TriggerClassifier;
    readonly clock: QueueClock;
    readonly ids: QueueIdFactory;
    readonly pollLimit?: number;
    /**
     * Hands one M0 candidate to the routing layer (CA-05) and reports whether
     * it was handled. Required, with no default: an unhandled M0 event must
     * hold the cursor, and a silently assumed disposition would check the
     * cursor past preauthorized work that never ran.
     */
    readonly m0Sink: (candidate: TriggerCandidate) => Promise<M0Disposition>;
    /**
     * Resolves the impact scope a blocker event recorded. Supplied by the
     * caller because the scope is journal payload, not a queue computation.
     */
    readonly impactScope: (candidate: TriggerCandidate) => ImpactScopedHold | null;
    /** Resolves the pack revision an activation event made current. */
    readonly activatedRevision: (candidate: TriggerCandidate) => string | null;
}

export class WatcherPoller {
    private readonly pollLimit: number;

    constructor(private readonly options: WatcherPollerOptions) {
        this.pollLimit = options.pollLimit ?? DEFAULT_POLL_LIMIT;
    }

    /**
     * One bounded poll from the durable cursor, followed by one checkpoint.
     *
     * M0 candidates are handed to routing and never enqueued: "M0 observations
     * and preauthorized effects" are handled without a decision cycle (§14 step
     * 4), and putting one in the judgment queue would be the model-free
     * guarantee leaking.
     */
    async poll(): Promise<WatcherPollReport> {
        // Re-read the durable cursor rather than trusting this instance's
        // snapshot: another lane writer may have advanced it since construction,
        // and starting a scan from a stale position would re-deliver events that
        // are already settled.
        const cursor = this.options.cursor.reload();
        const fromSequence = cursor.lastProcessedSequence + 1;
        // The cursor's own durable boundary is handed to the source as a fence,
        // not as a hint: a source that can see journal bytes must refuse a
        // journal that no longer presents that boundary rather than read on
        // under a stale cursor (correction-04 F4).
        const page = await this.options.ingest.scan({
            fromSequence, fromByteOffset: cursor.lastByteOffset, limit: this.pollLimit,
            expected: scanFenceOf(cursor)
        });
        const candidates = page.candidates;
        if (candidates.length === 0) {
            return pollReport({
                fromSequence, scanned: 0, highWaterSequence: cursor.lastProcessedSequence,
                reason: 'WATCHER_NO_EVENTS', ok: false
            });
        }
        const dispositions: Disposition[] = [];
        for (const candidate of candidates) dispositions.push(await this.handle(candidate));
        return pollReport({
            fromSequence, scanned: candidates.length,
            highWaterSequence: candidates[candidates.length - 1].sequence, reason: null, ok: true,
            cursorAdvancedTo: this.checkpoint(cursor.lastProcessedEventId, settledPrefix(candidates, dispositions), page.byteLength),
            dispositions
        });
    }

    private async handle(candidate: TriggerCandidate): Promise<Disposition> {
        const recorded = this.applyRecordedEffect(candidate);
        if (recorded !== null) return recorded;
        const classification = this.options.classifier.classify(candidate);
        if (classification.decisionClass === 'M0') {
            const disposition = await this.options.m0Sink(candidate);
            return {settled: disposition.handled, m0EventId: candidate.eventId, m0Unhandled: !disposition.handled};
        }
        const outcome = await this.options.replay.admit(this.triggerFor(candidate, classification));
        return outcome.ok
            ? {settled: false, enqueuedTriggerId: outcome.triggerId}
            : {settled: true, duplicateEventId: candidate.eventId};
    }

    /**
     * Apply a blocker or activation the journal already recorded. Returns a
     * disposition when the candidate was consumed as lane state rather than
     * queued as a judgment trigger, and `null` when it must be classified
     * normally instead.
     */
    private applyRecordedEffect(candidate: TriggerCandidate): Disposition | null {
        if (candidate.eventType === BLOCKER_EVENT) {
            const hold = this.options.impactScope(candidate);
            if (hold === null) return null;
            this.options.queue.applyHold(hold);
            return {settled: true, holdApplied: hold.blockerId};
        }
        if (candidate.eventType !== ACTIVATION_EVENT) return null;
        const revision = this.options.activatedRevision(candidate);
        if (revision === null) return null;
        return {settled: true, invalidatedTriggerIds: this.options.queue.invalidateSupersededRevision(revision)};
    }

    /**
     * Check the cursor forward across the settled prefix. Returns the event ID
     * the cursor now stands at, or `null` when nothing was checkpointed — which
     * includes a refused checkpoint, because a poll must never report a
     * position the durable cursor does not actually hold.
     *
     * The whole prefix is handed over as ordered positions, not just its last
     * member plus a bag of event IDs: the cursor owner proves the run is
     * contiguous from where it currently stands before it moves, and it can only
     * prove that from the sequences (correction-03 F2).
     */
    private checkpoint(
        currentCursor: string | null, settled: readonly TriggerCandidate[], byteLength: number | null
    ): string | null {
        if (settled.length === 0) return null;
        const result = this.options.cursor.checkpointHandled(currentCursor, checkpointTargets(settled, byteLength));
        return result.ok ? result.newCursor : null;
    }

    private triggerFor(candidate: TriggerCandidate, classification: TriggerClassification): CoordinatorTrigger {
        return Object.freeze({
            schemaVersion: 1 as const, triggerId: this.options.ids.nextTriggerId(),
            cycleId: this.options.ids.nextCycleId(), eventId: candidate.eventId,
            eventType: candidate.eventType, eventSequence: candidate.sequence,
            triggerClass: classification.triggerClass,
            decisionClass: classification.decisionClass as CoordinatorTrigger['decisionClass'],
            batchId: candidate.batchId, laneId: this.options.laneId,
            correlationId: candidate.correlationId, packRevision: classification.packRevision,
            enqueuedAt: this.options.clock.now().toISOString(),
            // An ordinary watcher trigger answers no uncertainty; only replay's
            // escalation names a prior cycle here.
            priorUncertainCycleId: null
        });
    }
}
