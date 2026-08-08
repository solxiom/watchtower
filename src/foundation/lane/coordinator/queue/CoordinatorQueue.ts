/**
 * The lane's single coordinator trigger queue (CA-13;
 * `docs/spec/coordinator-automation.md` §14, `docs/spec/v1-contracts.md` §9).
 *
 * "One lane has one active mutating coordinator cycle" and "new triggers are
 * queued with stable ordering" (§14). This owner enforces exactly that: it
 * holds the persisted projection, admits and removes triggers, records the
 * active cycle, and honours explicit impact-scoped holds. It does not classify
 * events (CA-05), execute effects (CA-10), advance the cursor
 * (`CursorManager`), or decide what an interrupted cycle should do
 * (`CoordinatorReplay`).
 *
 * Ordering lives in `queuePriority.ts` and durable form in
 * `queuePersistence.ts`, so this module contains neither a comparator nor a
 * parser — a queue that also owned its ordering algorithm and its byte format
 * would be the god object the pack rules reject.
 *
 * Every mutation runs through `projectionTransaction.ts`: lane lock, re-read,
 * decide, compare-and-swap, write (correction-03 F2/F3). No method below
 * decides anything against `this.document`, because that snapshot may be older
 * than the lane — it is a read cache, never a mutation base.
 */
import {
    CoordinatorQueueError,
    type CoordinatorQueueDocument, type CoordinatorTrigger, type DequeueResult,
    type EnqueueResult, type ImpactScopedHold, type OpenCycleReservation, type QueueEntry
} from '../../../../contracts/coordinatorQueue.js';
import {orderedEntries, positionOf, priorityOf} from './queuePriority.js';
import {refuseAdmission} from './queueAdmission.js';
import {dequeueRefusal, isHeldBy} from './queueSelection.js';
import {holdsCycle, reservationFor, withReservation, withoutCycle} from './cycleReservations.js';
import {emptyQueueDocument, queuePath, readQueueDocument, writeQueueDocument} from './queuePersistence.js';
import {commitProjection, type ProjectionDecision} from './projectionTransaction.js';
import type {LaneMutationLock} from './laneMutationLock.js';
import type {QueueClock, QueueFileSystem} from './queuePorts.js';

/** A lane queue past this is a backlog incident, not normal scheduling. */
export const DEFAULT_MAX_QUEUE_LENGTH = 512;

/** The identities a completed cycle has already consumed (`CoordinatorReplay` owns their derivation). */
export interface SettledIdentities {
    readonly correlationIds: ReadonlySet<string>;
    readonly eventIds: ReadonlySet<string>;
}

export interface CoordinatorQueueOptions {
    readonly laneDir: string;
    readonly laneId: string;
    readonly files: QueueFileSystem;
    /** The §11 lane mutation lock every write is serialized behind. */
    readonly lock: LaneMutationLock;
    /** Stamps the reservation a dequeue records; the capsule's only clock. */
    readonly clock: QueueClock;
    readonly maxQueueLength?: number;
}

export class CoordinatorQueue {
    private document: CoordinatorQueueDocument;
    private readonly maxQueueLength: number;

    constructor(private readonly options: CoordinatorQueueOptions) {
        this.maxQueueLength = options.maxQueueLength ?? DEFAULT_MAX_QUEUE_LENGTH;
        if (this.maxQueueLength < 1) {
            throw new CoordinatorQueueError('QUEUE_FULL', options.laneId, 'A coordinator queue must admit at least one trigger.');
        }
        this.document = this.load();
    }

    /**
     * The last projection this instance read. It is a cache: another lane writer
     * may have moved the durable queue since, which is exactly why no mutation
     * decides against it.
     */
    snapshot(): CoordinatorQueueDocument {
        return this.document;
    }

    /** Re-read the durable projection into this instance's cache. */
    reload(): CoordinatorQueueDocument {
        this.document = this.load();
        return this.document;
    }

    /** Non-destructive read of the highest-priority trigger, holds ignored. */
    peek(): CoordinatorTrigger | null {
        const ordered = orderedEntries(this.document.entries);
        return ordered.length === 0 ? null : ordered[0].trigger;
    }

    /**
     * Admit one trigger.
     *
     * The fences themselves — lane identity, event-ID and correlation-ID
     * suppression against both queued entries and open reservations, capacity —
     * live in `queueAdmission.ts`. They read only the persisted projection, so
     * they are restart-safe without a side index: whatever was queued or claimed
     * before a crash is still queued or claimed after it.
     */
    enqueue(trigger: CoordinatorTrigger): EnqueueResult {
        return this.transact((current): ProjectionDecision<CoordinatorQueueDocument, EnqueueResult> => {
            const refusal = refuseAdmission(trigger, current, this.options.laneId, this.maxQueueLength);
            if (refusal !== null) return {next: null, result: refusal};
            const entry: QueueEntry = Object.freeze({
                triggerId: trigger.triggerId, trigger, priority: priorityOf(trigger.triggerClass),
                enqueuedAt: trigger.enqueuedAt, sequenceNumber: current.nextSequenceNumber
            });
            const entries = [...current.entries, entry];
            return {
                next: {...current, entries, nextSequenceNumber: current.nextSequenceNumber + 1},
                result: Object.freeze({
                    ok: true as const, triggerId: trigger.triggerId,
                    position: positionOf(entries, trigger.triggerId), queueLength: entries.length
                })
            };
        });
    }

    /**
     * Remove and return the highest-priority admissible trigger, atomically
     * making it the lane's active cycle. Held triggers are skipped, not
     * reordered: an impact-scoped blocker must stop its own scope while
     * unrelated lines keep moving (`specification-resolution.md` §3).
     *
     * Atomic **across instances and processes**, not merely within one object
     * (correction-03 F3). The selection reads the projection freshly inside the
     * lane lock and the removal is committed before the lock is released, so two
     * coordinators racing for the same lane produce exactly one winner: the
     * loser re-reads a projection that already names an active cycle and is
     * refused `QUEUE_CYCLE_ACTIVE` instead of handing out the same trigger
     * twice.
     */
    dequeue(): DequeueResult {
        return this.transact((current): ProjectionDecision<CoordinatorQueueDocument, DequeueResult> => {
            const refusal = dequeueRefusal(current, (trigger) => isHeldBy(current, trigger));
            if (refusal !== null) return {next: null, result: refusal};
            const ordered = orderedEntries(current.entries);
            const next = ordered.find((entry) => !isHeldBy(current, entry.trigger)) as QueueEntry;
            const entries = current.entries.filter((entry) => entry.triggerId !== next.triggerId);
            return {
                next: {
                    ...current, entries, activeCycleId: next.trigger.cycleId,
                    reservations: withReservation(current, reservationFor(next.trigger, this.now()))
                },
                result: Object.freeze({ok: true as const, trigger: next.trigger, queueLength: entries.length})
            };
        });
    }

    /**
     * Release the active-cycle slot and the durable reservation once the cycle
     * reached a terminal journal state.
     *
     * Both are cleared in one transaction because they answer for the same
     * claim: from here on the journal itself reports that the cycle existed, so
     * the reservation has nothing left to protect. Clearing the reservation
     * earlier — at cycle-open, say — would reopen the crash window between the
     * open and its fsync.
     */
    completeCycle(cycleId: string): void {
        this.transact((current): ProjectionDecision<CoordinatorQueueDocument, null> => {
            if (current.activeCycleId !== cycleId) {
                throw new CoordinatorQueueError('QUEUE_CYCLE_ACTIVE', cycleId,
                    `Cycle ${cycleId} is not the lane's active cycle (${current.activeCycleId ?? 'none'}).`);
            }
            return {
                next: {
                    ...current, activeCycleId: null, reservations: withoutCycle(current, cycleId)
                },
                result: null
            };
        });
    }

    /** The durable claims this lane currently holds on dequeued work. */
    reservations(): readonly OpenCycleReservation[] {
        return this.document.reservations;
    }

    /**
     * Abandon a reservation whose cycle will never be opened.
     *
     * Deliberately explicit and never automatic: a reservation with no journal
     * record is the interrupted-cycle-opening case, and the safe default is to
     * keep suppressing re-admission until a caller with the journal in hand
     * decides. Releasing one that *did* open its cycle is harmless — the journal
     * then answers on its own.
     */
    releaseReservation(cycleId: string): boolean {
        return this.transact((current): ProjectionDecision<CoordinatorQueueDocument, boolean> => {
            if (!holdsCycle(current, cycleId)) return {next: null, result: false};
            return {next: {...current, reservations: withoutCycle(current, cycleId)}, result: true};
        });
    }

    private now(): string {
        return this.options.clock.now().toISOString();
    }

    /** Record an impact-scoped hold exactly as the blocker event declared it. */
    applyHold(hold: ImpactScopedHold): void {
        this.transact((current): ProjectionDecision<CoordinatorQueueDocument, null> => ({
            next: {...current, holds: [...current.holds.filter((existing) => existing.blockerId !== hold.blockerId), hold]},
            result: null
        }));
    }

    releaseHold(blockerId: string): void {
        this.transact((current): ProjectionDecision<CoordinatorQueueDocument, null> => ({
            next: {...current, holds: current.holds.filter((hold) => hold.blockerId !== blockerId)}, result: null
        }));
    }

    activeHolds(): readonly ImpactScopedHold[] {
        return this.document.holds;
    }

    /**
     * Drop every queued trigger derived against a superseded pack revision.
     * Activation "invalidates old pack-bound envelopes/proposals/ready
     * projections" (`specification-resolution.md` §7); a queued trigger carrying
     * a stale revision is exactly such a binding and must not be dequeued into
     * a cycle that would decide against a pack that no longer exists.
     */
    invalidateSupersededRevision(activeRevision: string): readonly string[] {
        return this.transact((current): ProjectionDecision<CoordinatorQueueDocument, readonly string[]> => {
            const superseded = current.entries.filter((entry) => entry.trigger.packRevision !== activeRevision);
            if (superseded.length === 0) return {next: null, result: []};
            return {
                next: {...current, entries: current.entries.filter((entry) => entry.trigger.packRevision === activeRevision)},
                result: Object.freeze(superseded.map((entry) => entry.triggerId))
            };
        });
    }

    /**
     * Startup reconstruction: silently drop queued triggers whose event ID or
     * correlation ID already completed a cycle. A trigger enqueued before a
     * crash whose cycle completed afterwards is not new work, and re-running it
     * would be a duplicate effect rather than a recovery.
     *
     * The settled identities are supplied by `CoordinatorReplay`, which owns
     * the coordinator-journal read. The queue deliberately cannot reach a
     * journal itself — that is what keeps "what has already happened" a single
     * truth.
     */
    dropProcessedEntries(settled: SettledIdentities): readonly string[] {
        return this.transact((current): ProjectionDecision<CoordinatorQueueDocument, readonly string[]> => {
            const processed = current.entries.filter((entry) =>
                settled.correlationIds.has(entry.trigger.correlationId) || settled.eventIds.has(entry.trigger.eventId));
            if (processed.length === 0) return {next: null, result: []};
            const dropped = new Set(processed.map((entry) => entry.triggerId));
            return {
                next: {...current, entries: current.entries.filter((entry) => !dropped.has(entry.triggerId))},
                result: Object.freeze(processed.map((entry) => entry.triggerId))
            };
        });
    }

    /** Discard the persisted projection entirely; used only by an explicit lane reset. */
    reset(): void {
        this.transact((current): ProjectionDecision<CoordinatorQueueDocument, null> => ({
            next: {...emptyQueueDocument(this.options.laneId), projectionRevision: current.projectionRevision}, result: null
        }));
    }

    private load(): CoordinatorQueueDocument {
        return readQueueDocument(this.options.laneDir, this.options.laneId, this.options.files);
    }

    /**
     * Persist first, then adopt. If the durable write fails the in-memory
     * document is unchanged, so a caller that retries sees exactly the state
     * still on disk rather than a queue that silently diverged from its file.
     */
    private transact<T>(decide: (current: CoordinatorQueueDocument) => ProjectionDecision<CoordinatorQueueDocument, T>): T {
        const committed = commitProjection<CoordinatorQueueDocument, T>({
            lock: this.options.lock, read: () => this.load(), staleReason: 'QUEUE_STATE_STALE',
            subject: queuePath(this.options.laneDir),
            write: (document) => writeQueueDocument(this.options.laneDir, freeze(document), this.options.files)
        }, this.document, decide);
        this.document = freeze(committed.document);
        return committed.result;
    }
}

function freeze(document: CoordinatorQueueDocument): CoordinatorQueueDocument {
    return Object.freeze({
        ...document, entries: Object.freeze([...document.entries]), holds: Object.freeze([...document.holds]),
        reservations: Object.freeze([...document.reservations])
    });
}

export {queuePath};
