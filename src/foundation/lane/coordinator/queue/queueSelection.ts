/**
 * Which queued entry may become the lane's active cycle, and if none may, why
 * (CA-13; `docs/spec/coordinator-automation.md` §14,
 * `docs/spec/specification-resolution.md` §3).
 *
 * Split out of `CoordinatorQueue` so that owner sequences queue state and this
 * one answers a single question about a *given* projection. Everything here is
 * pure: it reads a document and returns a decision, holds no state, and writes
 * nothing — which is what lets the queue call it twice inside one lane-locked
 * transaction without any risk of the two answers disagreeing.
 *
 * A hold skips its own scope rather than reordering the queue: an impact-scoped
 * blocker must stop the batches it names while unrelated lines keep moving, and
 * a lane-scoped hold stops everything including triggers that carry no batch.
 */
import type {
    CoordinatorQueueDocument, CoordinatorTrigger, DequeueResult
} from '../../../../contracts/coordinatorQueue.js';
import {orderedEntries} from './queuePriority.js';

/**
 * The refusals that leave the projection untouched, in the exact order §14
 * fixes them: an active cycle first, then an empty queue, then a fully held one.
 * Order matters — a lane with an active cycle and a fully held backlog must
 * report the active cycle, because that is the condition a caller can wait out.
 */
export function dequeueRefusal(
    current: CoordinatorQueueDocument, isHeld: (trigger: CoordinatorTrigger) => boolean
): DequeueResult | null {
    if (current.activeCycleId !== null) {
        return Object.freeze({ok: false as const, reason: 'cycle-active' as const, code: 'QUEUE_CYCLE_ACTIVE' as const, heldTriggerIds: []});
    }
    const ordered = orderedEntries(current.entries);
    if (ordered.length === 0) {
        return Object.freeze({ok: false as const, reason: 'queue-empty' as const, code: null, heldTriggerIds: []});
    }
    if (ordered.every((entry) => isHeld(entry.trigger))) {
        return Object.freeze({
            ok: false as const, reason: 'impact-scoped-hold' as const, code: null,
            heldTriggerIds: Object.freeze(ordered.map((entry) => entry.triggerId))
        });
    }
    return null;
}

export function isHeldBy(document: CoordinatorQueueDocument, trigger: CoordinatorTrigger): boolean {
    return document.holds.some((hold) =>
        hold.scope === 'lane' || (trigger.batchId !== null && hold.batchIds.includes(trigger.batchId)));
}
