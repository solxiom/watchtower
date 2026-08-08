/**
 * The sole owner of coordinator-queue ordering (CA-13).
 *
 * `v1-contracts.md` §9 fixes the key order — safety integrity, then
 * system/operator escalation, then durable worker event sequence, then a
 * lexicographic event-ID tie-break — and the batch contract adds FIFO by
 * `enqueuedAt` within a class plus a monotonic insertion tie-break. Those two
 * texts are reconciled here, once, as a single total order:
 *
 *   1. priority class          (§9 keys 1–2, batch contract "priority class")
 *   2. `enqueuedAt`            (batch contract "FIFO within class")
 *   3. `eventSequence`         (§9 key 3)
 *   4. `eventId` lexicographic (§9 key 4)
 *   5. `sequenceNumber`        (batch contract stable insertion tie-break)
 *
 * Keys 3–5 are never reached for two triggers of the same class enqueued at
 * different instants; they exist so that identical timestamps — a replayed
 * batch, a coarse clock, or two synthesized triggers — still produce one
 * deterministic order rather than whatever order the array happened to hold.
 * The comparator is total: no two distinct entries ever compare equal, because
 * `sequenceNumber` is unique within a queue document.
 */
import {TRIGGER_CLASS_PRIORITY, type QueueEntry, type TriggerClass} from '../../../../contracts/coordinatorQueue.js';

export function priorityOf(triggerClass: TriggerClass): 0 | 1 | 2 {
    return TRIGGER_CLASS_PRIORITY[triggerClass];
}

/** Negative when `left` dequeues before `right`. */
export function compareQueueEntries(left: QueueEntry, right: QueueEntry): number {
    if (left.priority !== right.priority) return left.priority - right.priority;
    if (left.enqueuedAt !== right.enqueuedAt) return left.enqueuedAt < right.enqueuedAt ? -1 : 1;
    if (left.trigger.eventSequence !== right.trigger.eventSequence) {
        return left.trigger.eventSequence - right.trigger.eventSequence;
    }
    if (left.trigger.eventId !== right.trigger.eventId) return left.trigger.eventId < right.trigger.eventId ? -1 : 1;
    return left.sequenceNumber - right.sequenceNumber;
}

/**
 * A new array in dequeue order. The input is never mutated: the persisted
 * document keeps insertion order, and ordering stays a pure function of it, so
 * reconstructing the queue from `queue.json` cannot drift from the live order.
 */
export function orderedEntries(entries: readonly QueueEntry[]): readonly QueueEntry[] {
    return [...entries].sort(compareQueueEntries);
}

/**
 * The 1-based dequeue position `triggerId` currently holds, or `0` when it is
 * not queued. Reported by `enqueue` so a caller sees where a safety escalation
 * actually landed rather than assuming it went last.
 */
export function positionOf(entries: readonly QueueEntry[], triggerId: string): number {
    return orderedEntries(entries).findIndex((entry) => entry.triggerId === triggerId) + 1;
}
