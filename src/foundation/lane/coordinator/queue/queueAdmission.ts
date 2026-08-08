/**
 * The admission fences one trigger must clear before it can join the queue
 * (CA-13; `docs/spec/coordinator-automation.md` §14 step 2).
 *
 * Split out of `CoordinatorQueue` so that owner sequences queue state and this
 * one answers a single question: may this trigger be admitted, and if not, with
 * which typed reason? The order below is the failure order the batch contract
 * fixes — identity first, then duplicate suppression, then capacity — so a
 * foreign-lane trigger is never merely "a duplicate" and a full queue never
 * masks a re-delivery.
 *
 * Suppression is by **event ID and correlation ID** (correction-01 F1). They
 * are different identities and neither implies the other: one durable record
 * re-delivered under a fresh correlation is the same event and must not open a
 * second cycle, while two distinct records sharing a correlation are one
 * logical unit of work.
 *
 * Both identities are checked against the queued entries **and** the open
 * reservations (correction-04 F1). A trigger that has been dequeued is no longer
 * an entry, but the lane still holds a durable claim on it until its cycle
 * settles, and admitting it again in that window is the same duplicate as
 * admitting one that is still waiting.
 */
import {
    CoordinatorQueueError,
    type CoordinatorQueueDocument, type CoordinatorTrigger, type EnqueueRefused
} from '../../../../contracts/coordinatorQueue.js';
import {reservationForCorrelation, reservationForEvent} from './cycleReservations.js';

/**
 * `null` when the trigger may be admitted. A refusal is a returned value, not
 * an exception: a duplicate or a full queue is an ordinary scheduling outcome
 * the caller must answer for.
 */
export function refuseAdmission(
    trigger: CoordinatorTrigger, document: CoordinatorQueueDocument, laneId: string, maxQueueLength: number
): EnqueueRefused | null {
    assertOwnedTrigger(trigger, laneId);
    const entries = document.entries;
    const queuedEvent = entries.find((entry) => entry.trigger.eventId === trigger.eventId);
    if (queuedEvent !== undefined) {
        return refused('QUEUE_DUPLICATE_EVENT', queuedEvent.trigger.cycleId,
            `Event ${trigger.eventId} is already queued as cycle ${queuedEvent.trigger.cycleId}.`);
    }
    const claimedEvent = reservationForEvent(document, trigger.eventId);
    if (claimedEvent !== null) {
        return refused('QUEUE_DUPLICATE_EVENT', claimedEvent.cycleId,
            `Event ${trigger.eventId} is already claimed by open cycle ${claimedEvent.cycleId}.`);
    }
    const queuedCorrelation = entries.find((entry) => entry.trigger.correlationId === trigger.correlationId);
    if (queuedCorrelation !== undefined) {
        return refused('QUEUE_DUPLICATE_EVENT', queuedCorrelation.trigger.cycleId,
            `Correlation ${trigger.correlationId} is already queued as cycle ${queuedCorrelation.trigger.cycleId}.`);
    }
    const claimedCorrelation = reservationForCorrelation(document, trigger.correlationId);
    if (claimedCorrelation !== null) {
        return refused('QUEUE_DUPLICATE_EVENT', claimedCorrelation.cycleId,
            `Correlation ${trigger.correlationId} is already claimed by open cycle ${claimedCorrelation.cycleId}.`);
    }
    if (entries.length >= maxQueueLength) {
        return refused('QUEUE_FULL', null, `The coordinator queue holds its configured maximum of ${maxQueueLength} triggers.`);
    }
    return null;
}

/**
 * A trigger built for another lane never reaches the projection. This is a
 * pre-commit identity fault rather than a scheduling outcome, so it throws
 * instead of returning a refusal: there is no state under which the caller
 * should retry it against this queue (correction-01 F3).
 */
export function assertOwnedTrigger(trigger: CoordinatorTrigger, laneId: string): void {
    if (trigger.laneId !== laneId) {
        throw new CoordinatorQueueError('QUEUE_TRIGGER_INVALID', trigger.triggerId,
            `Trigger ${trigger.triggerId} belongs to lane ${trigger.laneId}, not this queue's lane ${laneId}.`);
    }
}

function refused(
    code: 'QUEUE_DUPLICATE_EVENT' | 'QUEUE_FULL', priorCycleId: string | null, message: string
): EnqueueRefused {
    return Object.freeze({
        ok: false as const, reason: code === 'QUEUE_FULL' ? 'queue-full' as const : 'duplicate-event' as const,
        code, priorCycleId, message
    });
}
