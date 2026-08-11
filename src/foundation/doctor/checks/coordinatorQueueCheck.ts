import type {CoordinatorQueueDocument} from '../../../contracts/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip, warn} from '../DoctorCheckResult.js';
import {DoctorCoordinatorProjectionSource, type ProjectionRead} from './coordinatorProjectionSource.js';

const ID = 'coordinator-queue' as const;

export interface CoordinatorQueueCheckOptions {
    readonly projections?: DoctorCoordinatorProjectionSource;
}

/**
 * Reports the integrity of the CA-13 trigger queue projection
 * (`coordinator/queue.json`) without touching it.
 *
 * Presence is the skip/report boundary: a lane that has never run a cycle has
 * no projection at all and is `skip`, while a projection that exists and does
 * not validate is `fail` — CA-13's own rule that a queue must never silently
 * restart empty. Beyond CA-13's validation (which already refuses a duplicate
 * trigger ID, so this provider does not restate that rule) it proves the
 * cross-record invariants a per-record schema cannot state: one durable event
 * produced one trigger, insertion sequence numbers are unique and below the
 * lane's next sequence, and a durable open-cycle reservation never coexists
 * with the queue entry it claimed. Outstanding reservations and recorded holds are real work
 * in flight, not corruption, so they `warn`; §11.7 reserves the failing exit
 * family for corruption and mismatch.
 */
export function createCoordinatorQueueCheck(options: CoordinatorQueueCheckOptions = {}): DoctorCheckProvider {
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const projections = options.projections ?? new DoctorCoordinatorProjectionSource(context.fileSystem);
            const read = projections.queue(context.lane.laneDir, context.lane.laneId);
            return reportQueue(read);
        }
    };
}

export const coordinatorQueueCheck: DoctorCheckProvider = createCoordinatorQueueCheck();

function reportQueue(read: ProjectionRead<CoordinatorQueueDocument>) {
    if (read.kind === 'absent') {
        return skip(ID, 'No coordinator queue projection (coordinator/queue.json) exists; this lane has not run a judgment cycle.');
    }
    if (read.kind === 'invalid') {
        return fail(ID, `The coordinator queue projection is present but invalid (${read.error.reason}): ${read.error.message}`,
            'ERR_INTEGRITY_FAILURE');
    }
    const document = read.document;
    const inconsistency = firstInconsistency(document);
    if (inconsistency !== null) return fail(ID, inconsistency, 'ERR_INTEGRITY_FAILURE');
    const pending = describePending(document);
    if (pending !== null) return warn(ID, pending);
    return pass(ID, `The coordinator queue projection is consistent at revision ${document.projectionRevision} with ${
        document.entries.length} queued trigger(s).`);
}

/** The first stable structural contradiction, in a fixed order so the reported reason is deterministic. */
function firstInconsistency(document: CoordinatorQueueDocument): string | null {
    const triggerIds = document.entries.map(entry => entry.triggerId);
    const duplicateEvent = firstDuplicate(document.entries.map(entry => entry.trigger.eventId));
    if (duplicateEvent !== null) return `Durable event ${duplicateEvent} produced more than one queued trigger.`;
    const duplicateSequence = firstDuplicate(document.entries.map(entry => String(entry.sequenceNumber)));
    if (duplicateSequence !== null) return `Queue insertion sequence ${duplicateSequence} is used by more than one entry.`;
    const overrun = document.entries.find(entry => entry.sequenceNumber >= document.nextSequenceNumber);
    if (overrun !== undefined) {
        return `Queued trigger ${overrun.triggerId} carries insertion sequence ${overrun.sequenceNumber}, which is not below the lane's next sequence ${document.nextSequenceNumber}.`;
    }
    const queued = new Set(triggerIds);
    const claimed = document.reservations.find(reservation => queued.has(reservation.triggerId));
    if (claimed !== undefined) {
        return `Trigger ${claimed.triggerId} is both queued and claimed by open-cycle reservation ${claimed.cycleId}.`;
    }
    const duplicateReservation = firstDuplicate(document.reservations.map(reservation => reservation.cycleId));
    if (duplicateReservation !== null) return `Cycle ${duplicateReservation} holds more than one open-cycle reservation.`;
    if (document.activeCycleId !== null && !document.reservations.some(item => item.cycleId === document.activeCycleId)) {
        return `Active cycle ${document.activeCycleId} has no durable open-cycle reservation.`;
    }
    return null;
}

/** In-flight state that an operator should see but that is not a corruption condition. */
function describePending(document: CoordinatorQueueDocument): string | null {
    const notes: string[] = [];
    if (document.reservations.length > 0) {
        notes.push(`${document.reservations.length} open-cycle reservation(s) are still unsettled (${
            document.reservations.map(item => item.cycleId).join(', ')})`);
    }
    if (document.holds.length > 0) {
        notes.push(`${document.holds.length} impact-scoped hold(s) are recorded (${
            document.holds.map(item => item.blockerId).join(', ')})`);
    }
    return notes.length === 0 ? null : `The coordinator queue projection is structurally consistent, but ${notes.join(' and ')}.`;
}

function firstDuplicate(values: readonly string[]): string | null {
    const seen = new Set<string>();
    for (const value of values) {
        if (seen.has(value)) return value;
        seen.add(value);
    }
    return null;
}
