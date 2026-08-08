/**
 * The lane's durable claims on dequeued work (CA-13 correction-04 F1;
 * `docs/spec/coordinator-automation.md` §14, `docs/spec/v1-contracts.md` §9).
 *
 * Duplicate suppression normally asks two sources: the queue projection ("is it
 * still waiting?") and the coordinator journal ("did a cycle already open for
 * it?"). Between a dequeue and the fsync of the cycle-opening record, **neither
 * can say yes** — the entry is gone from the projection and the record is not
 * yet durable. A restart in that window re-admits the work. For an
 * uncertain-outcome escalation that means two safety cycles for one uncertainty,
 * which is exactly the duplicated safety work this batch exists to prevent.
 *
 * A reservation is the third source that covers precisely that window. It is
 * written in the same lane-locked compare-and-swap transaction that removes the
 * entry, so "taken" and "claimed" cannot come apart at any crash point, and it
 * is released only when the cycle completes — by which time the journal answers
 * for itself.
 *
 * Everything here is pure: it maps a document to its successor. The transaction,
 * the lock, and the durable write stay with `CoordinatorQueue`, so a reservation
 * can never be recorded outside the write that justifies it.
 */
import type {
    CoordinatorQueueDocument, CoordinatorTrigger, OpenCycleReservation
} from '../../../../contracts/coordinatorQueue.js';

export function reservationFor(trigger: CoordinatorTrigger, reservedAt: string): OpenCycleReservation {
    return Object.freeze({
        cycleId: trigger.cycleId, triggerId: trigger.triggerId, eventId: trigger.eventId,
        correlationId: trigger.correlationId, priorUncertainCycleId: trigger.priorUncertainCycleId,
        reservedAt
    });
}

export function withReservation(
    document: CoordinatorQueueDocument, reservation: OpenCycleReservation
): readonly OpenCycleReservation[] {
    return [...document.reservations, reservation];
}

export function withoutCycle(
    document: CoordinatorQueueDocument, cycleId: string
): readonly OpenCycleReservation[] {
    return document.reservations.filter((reservation) => reservation.cycleId !== cycleId);
}

export function holdsCycle(document: CoordinatorQueueDocument, cycleId: string): boolean {
    return document.reservations.some((reservation) => reservation.cycleId === cycleId);
}

/** The reservation covering a durable event ID, or `null`. */
export function reservationForEvent(
    document: CoordinatorQueueDocument, eventId: string
): OpenCycleReservation | null {
    return document.reservations.find((reservation) => reservation.eventId === eventId) ?? null;
}

/** The reservation covering a correlation ID, or `null`. */
export function reservationForCorrelation(
    document: CoordinatorQueueDocument, correlationId: string
): OpenCycleReservation | null {
    return document.reservations.find((reservation) => reservation.correlationId === correlationId) ?? null;
}

/**
 * The reservation covering an escalation of `priorCycleId`, or `null`.
 *
 * Keyed on the uncertainty rather than on the escalation's own identity: a
 * restart mints a fresh cycle ID for the escalation it is about to admit, so
 * only the thing both passes agree on — which uncertain cycle is being answered
 * — can suppress the second one.
 */
export function reservationForUncertainty(
    document: CoordinatorQueueDocument, priorCycleId: string
): OpenCycleReservation | null {
    return document.reservations.find((reservation) => reservation.priorUncertainCycleId === priorCycleId) ?? null;
}
