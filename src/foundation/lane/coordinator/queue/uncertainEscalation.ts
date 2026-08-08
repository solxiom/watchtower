/**
 * Durable, idempotent escalation of an uncertain effect outcome (CA-13
 * correction-03 F1; `docs/spec/coordinator-automation.md` §14/§20,
 * batch contract §3).
 *
 * An uncertain outcome is the one case where the lane has recorded that it
 * cannot know whether an effect committed. The response is a **new D2 cycle that
 * references the uncertain one** — never a retry, never a rewrite of the
 * recorded outcome, and never a second attempt at the original effect. Nothing
 * here touches the effect journal or the effect executor; the escalation is a
 * decision request, and what actually happened stays CA-10's question to answer
 * under judgment.
 *
 * The hard requirement is that a lane restarting ten times ends with one
 * escalation, not ten. That is achieved without an "already escalated" side
 * index, which would be a second truth to keep consistent: the escalation is
 * admitted under an identity *derived* from the uncertain outcome event, so the
 * second pass presents the same identity and meets the same event-ID suppression
 * as any other re-delivery. Two halves answer it, and both are needed —
 *
 * - the **journal half** finds an escalation whose cycle already opened;
 * - the **reserved half** finds one that has been dequeued but whose
 *   cycle-opening record is not yet durable — the crash window neither of the
 *   other two can see (correction-04 F1);
 * - the **queued half** is ordinary admission, which sees one still waiting.
 *
 * Split out of `CoordinatorReplay` so that owner sequences a startup pass and
 * this one answers a single question: does this uncertainty already have its
 * escalation, and if not, what exactly is admitted?
 */
import type {
    CoordinatorTrigger
} from '../../../../contracts/coordinatorQueue.js';
import type {
    UncertainEscalation
} from '../../../../contracts/coordinatorReplay.js';
import {reservationForUncertainty} from './cycleReservations.js';
import type {CoordinatorQueue} from './CoordinatorQueue.js';
import type {CycleHistoryEntry, CycleHistorySource, QueueClock, QueueIdFactory} from './queuePorts.js';

/**
 * The durable event ID an escalation for `uncertainOutcomeEventId` is admitted
 * under. Derived, never minted — this single decision is what makes repeated
 * recovery idempotent.
 */
export function escalationEventIdFor(uncertainOutcomeEventId: string): string {
    return `uncertain-escalation:${uncertainOutcomeEventId}`;
}

export interface EscalationAdmissionOptions {
    readonly queue: CoordinatorQueue;
    readonly history: CycleHistorySource;
    readonly ids: QueueIdFactory;
    readonly clock: QueueClock;
    /**
     * The pack revision an escalation is minted against. Injected because it is
     * activation state, not a queue computation — and because an escalation
     * bound to a superseded revision would be silently discarded by the very
     * invalidation rule that protects ordinary triggers.
     */
    readonly activePackRevision: () => string;
}

export async function admitUncertainEscalation(
    options: EscalationAdmissionOptions, entry: CycleHistoryEntry, blockedCursorEventId: string
): Promise<UncertainEscalation> {
    const escalationEventId = escalationEventIdFor(blockedCursorEventId);
    const present = (cycleId: string): UncertainEscalation =>
        describe(entry, blockedCursorEventId, escalationEventId, cycleId, null, 'already-present');
    const journaled = await options.history.escalationCycleFor(entry.cycleId);
    if (journaled !== null) return present(journaled);
    // Re-read rather than trusting this owner's cache: a concurrent replay may
    // have taken the claim since. `enqueue` re-checks the same fence inside the
    // lane lock, so this pre-check sharpens the report rather than carrying the
    // guarantee on its own.
    const reserved = reservationForUncertainty(options.queue.reload(), entry.cycleId);
    if (reserved !== null) return present(reserved.cycleId);
    const cycleId = options.ids.nextCycleId();
    const trigger = escalationTrigger(options, entry, cycleId, escalationEventId);
    const outcome = options.queue.enqueue(trigger);
    return outcome.ok
        ? describe(entry, blockedCursorEventId, escalationEventId, cycleId, trigger.triggerId, 'created')
        : present(outcome.priorCycleId ?? cycleId);
}

/**
 * The escalation as an ordinary queued trigger. It is `safety-escalation` class
 * so it outranks the routine backlog, and it carries the *current* pack revision
 * so activation invalidation cannot silently discard a safety escalation minted
 * against an older one.
 */
function escalationTrigger(
    options: EscalationAdmissionOptions, entry: CycleHistoryEntry, cycleId: string, escalationEventId: string
): CoordinatorTrigger {
    return Object.freeze({
        schemaVersion: 1 as const, triggerId: options.ids.nextTriggerId(), cycleId,
        eventId: escalationEventId, eventType: 'coordinator-uncertain-escalation',
        // -1: the escalation has no journal origin of its own. It references a
        // durable event rather than being derived from a new one.
        eventSequence: -1, triggerClass: 'safety-escalation' as const, decisionClass: 'D2' as const,
        batchId: null, laneId: options.queue.snapshot().laneId, correlationId: entry.correlationId,
        packRevision: options.activePackRevision(), enqueuedAt: options.clock.now().toISOString(),
        // The link the dequeue reservation and the cycle-opening record both
        // carry, and the only identity two independent replay passes agree on.
        priorUncertainCycleId: entry.cycleId
    });
}

function describe(
    entry: CycleHistoryEntry, blockedCursorEventId: string, escalationEventId: string,
    cycleId: string, triggerId: string | null, admission: UncertainEscalation['admission']
): UncertainEscalation {
    return Object.freeze({
        cycleId, priorCycleId: entry.cycleId, correlationId: entry.correlationId,
        decisionClass: 'D2' as const, triggerClass: 'safety-escalation' as const,
        blockedCursorEventId, escalationEventId, triggerId, admission
    });
}
