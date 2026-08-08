/**
 * Closed public contracts for the coordinator trigger queue (CA-13;
 * `docs/spec/coordinator-automation.md` §14/§17,
 * `docs/spec/v1-contracts.md` §9/§11,
 * `docs/spec/specification-resolution.md` §3/§7).
 *
 * "New triggers are queued with stable ordering" (§14). This is that
 * boundary's vocabulary: the trigger a watcher poll derives, its persisted
 * queue slot, the recorded hold, the queue projection, and the typed
 * enqueue/dequeue outcomes. The cursor and replay vocabulary — how far the lane
 * has durably got, and what a restart owes — lives in `coordinatorReplay.ts`,
 * because that is a different reason to change.
 *
 * The reason codes stay here and cover both halves: they are one closed failure
 * vocabulary for one boundary, and splitting them would let the same condition
 * acquire two spellings. Nothing here reads, writes, classifies, or advances
 * anything; every value crossing this boundary from durable bytes enters as
 * `unknown` and leaves as one of these shapes.
 */
import type {RoutingDecisionClass} from './routing.js';

/**
 * Stable reason codes for every queue, cursor, replay, and watcher refusal.
 * The eight names the batch contract fixes keep their exact spelling; the
 * remainder cover the durable-state failures the same boundary must report
 * rather than conflate with one of those eight.
 */
export const COORDINATOR_QUEUE_REASONS = [
    'QUEUE_FULL',
    'QUEUE_CYCLE_ACTIVE',
    'QUEUE_DUPLICATE_EVENT',
    'QUEUE_STATE_UNREADABLE',
    'QUEUE_STATE_WRITE_FAILED',
    'QUEUE_STATE_STALE',
    'QUEUE_LANE_LOCKED',
    'QUEUE_TRIGGER_INVALID',
    'QUEUE_REVISION_SUPERSEDED',
    'CURSOR_ADVANCE_BLOCKED',
    'CURSOR_STALE',
    'CURSOR_STATE_UNREADABLE',
    'CURSOR_STATE_WRITE_FAILED',
    'REPLAY_UNCERTAIN_OUTCOME',
    'REPLAY_CYCLE_ORPHANED',
    'WATCHER_NO_EVENTS',
    'WATCHER_INGEST_FAILED'
] as const;

export type CoordinatorQueueReason = typeof COORDINATOR_QUEUE_REASONS[number];

/**
 * Raised only for a refusal that happens before any authoritative byte is
 * written, so a caller may retry after correcting the named subject without
 * first inspecting durable state. An ordering, hold, duplicate, or blocked
 * cursor outcome is *not* thrown: those are ordinary typed results the caller
 * must answer for, and turning them into exceptions would let a `catch` treat
 * "the cursor may not advance yet" as an incident.
 */
export class CoordinatorQueueError extends Error {
    constructor(readonly reason: CoordinatorQueueReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'CoordinatorQueueError';
    }
}

/**
 * Priority classes in the exact order `v1-contracts.md` §9 fixes: safety
 * integrity first, then system/operator escalation, then ordinary durable
 * worker events.
 */
export const TRIGGER_CLASSES = ['safety-escalation', 'operator-request', 'routine-event'] as const;
export type TriggerClass = typeof TRIGGER_CLASSES[number];

/** Lower is higher priority. Frozen so no caller can reorder the lane's safety class. */
export const TRIGGER_CLASS_PRIORITY: Readonly<Record<TriggerClass, 0 | 1 | 2>> = Object.freeze({
    'safety-escalation': 0, 'operator-request': 1, 'routine-event': 2
});

/**
 * One queued judgment cycle request derived from exactly one durable event.
 *
 * `eventSequence` is the contiguous lane-journal-local sequence of the source
 * event (§9) and is `-1` only for a trigger with no journal origin, such as the
 * escalation cycle replay creates for a prior uncertain outcome.
 * `packRevision` binds the trigger to the pack revision it was derived
 * against, which is what makes activation invalidation possible at all.
 */
export interface CoordinatorTrigger {
    readonly schemaVersion: 1;
    readonly triggerId: string;
    readonly cycleId: string;
    readonly eventId: string;
    readonly eventType: string;
    readonly eventSequence: number;
    readonly triggerClass: TriggerClass;
    readonly decisionClass: Exclude<RoutingDecisionClass, 'M0'>;
    readonly batchId: string | null;
    readonly laneId: string;
    readonly correlationId: string;
    readonly packRevision: string;
    readonly enqueuedAt: string;
    /**
     * The uncertain cycle this trigger exists to escalate, or `null` for an
     * ordinary trigger. Carried so the reservation a dequeue records — and the
     * cycle-opening event the caller journals — can name the uncertainty
     * without the queue having to re-derive it (correction-04 F1).
     */
    readonly priorUncertainCycleId: string | null;
}

/**
 * The lane's durable claim on a dequeued trigger, held from the moment the
 * trigger leaves the queue until its cycle reaches a terminal journal state
 * (correction-04 F1).
 *
 * It exists to close one crash window. Duplicate suppression asks the journal
 * "did a cycle already open for this?", and between a dequeue and the fsync of
 * that cycle-opening record the journal cannot answer yes — while the queue no
 * longer holds the trigger either. A restart in that window would admit the work
 * a second time, which for an uncertain-outcome escalation means two safety
 * cycles for one uncertainty.
 *
 * The reservation is written in the *same* lane-locked compare-and-swap
 * transaction that removes the entry, so "taken" and "claimed" cannot come
 * apart, and it is cleared only when the cycle completes — by which point the
 * journal answers for itself.
 */
export interface OpenCycleReservation {
    readonly cycleId: string;
    readonly triggerId: string;
    readonly eventId: string;
    readonly correlationId: string;
    readonly priorUncertainCycleId: string | null;
    readonly reservedAt: string;
}

/** One persisted queue slot. `sequenceNumber` is the monotonic insertion tie-break. */
export interface QueueEntry {
    readonly triggerId: string;
    readonly trigger: CoordinatorTrigger;
    readonly priority: 0 | 1 | 2;
    readonly enqueuedAt: string;
    readonly sequenceNumber: number;
}

/**
 * One explicit impact-scoped automation hold recorded by
 * `specification-blocker-detected` (§18). The scope is *read* from the event,
 * never computed here: expansion "requires deterministic impact evidence or
 * spec-authority confirmation" (`specification-resolution.md` §3), which is not
 * a queue decision.
 */
export interface ImpactScopedHold {
    readonly blockerId: string;
    readonly scope: 'impact-scoped' | 'lane';
    readonly batchIds: readonly string[];
    readonly recordedAt: string;
}

/**
 * `coordinator/queue.json` — a projection of unhandled trigger IDs (§9/§17).
 *
 * `projectionRevision` is the compare-and-swap token. Every mutation is decided
 * against a projection re-read inside the lane lock and written back at
 * `revision + 1`; a writer whose base revision is no longer the persisted one is
 * refused with `QUEUE_STATE_STALE` rather than allowed to overwrite work it
 * never saw (correction-03 F2/F3).
 */
export interface CoordinatorQueueDocument {
    readonly schemaVersion: 1;
    readonly laneId: string;
    readonly nextSequenceNumber: number;
    readonly entries: readonly QueueEntry[];
    readonly holds: readonly ImpactScopedHold[];
    readonly activeCycleId: string | null;
    /** Durable claims on triggers that have left the queue but not yet settled. */
    readonly reservations: readonly OpenCycleReservation[];
    readonly projectionRevision: number;
}

export interface EnqueueAccepted {
    readonly ok: true;
    readonly triggerId: string;
    readonly position: number;
    readonly queueLength: number;
}

export interface EnqueueRefused {
    readonly ok: false;
    readonly reason: 'duplicate-event' | 'queue-full' | 'revision-superseded';
    readonly code: Extract<CoordinatorQueueReason, 'QUEUE_DUPLICATE_EVENT' | 'QUEUE_FULL' | 'QUEUE_REVISION_SUPERSEDED'>;
    readonly priorCycleId: string | null;
    readonly message: string;
}

export type EnqueueResult = EnqueueAccepted | EnqueueRefused;

export interface DequeueTaken {
    readonly ok: true;
    readonly trigger: CoordinatorTrigger;
    readonly queueLength: number;
}

export interface DequeueRefused {
    readonly ok: false;
    readonly reason: 'queue-empty' | 'cycle-active' | 'impact-scoped-hold';
    readonly code: Extract<CoordinatorQueueReason, 'QUEUE_CYCLE_ACTIVE'> | null;
    readonly heldTriggerIds: readonly string[];
}

export type DequeueResult = DequeueTaken | DequeueRefused;
