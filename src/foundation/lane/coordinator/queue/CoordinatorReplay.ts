/**
 * The lane's interrupted/duplicate/uncertain replay authority (CA-13;
 * `docs/spec/coordinator-automation.md` §14/§20,
 * `docs/spec/v1-contracts.md` §9/§11).
 *
 * On restart the lane must answer three questions from durable state alone:
 * which cycles were interrupted and what each one owes, which incoming
 * triggers are re-deliveries of work that already settled, and which prior
 * outcome is genuinely unknown. This owner answers exactly those three and
 * nothing else — the phase→action mapping lives in `cycleRecovery.ts`, queue
 * mutation in `CoordinatorQueue`, cursor advance in `CursorManager`, and the
 * effect authority stays entirely with CA-10.
 *
 * It never repairs. Every method returns a plan or a refusal; applying a plan
 * is the caller's cycle work through the normal validated path.
 */
import {
    type CoordinatorTrigger, type EnqueueResult
} from '../../../../contracts/coordinatorQueue.js';
import {
    type CycleRecoveryPlan, type ReplayRecoveryReport, type UncertainEscalation
} from '../../../../contracts/coordinatorReplay.js';
import type {CoordinatorQueue, SettledIdentities} from './CoordinatorQueue.js';
import type {CursorManager} from './CursorManager.js';
import {escalateUncertain, planCycleRecovery} from './cycleRecovery.js';
import {admitUncertainEscalation} from './uncertainEscalation.js';
import type {CycleHistoryEntry, CycleHistorySource, QueueClock, QueueIdFactory} from './queuePorts.js';

export interface CoordinatorReplayOptions {
    readonly queue: CoordinatorQueue;
    readonly cursor: CursorManager;
    readonly history: CycleHistorySource;
    readonly ids: QueueIdFactory;
    readonly clock: QueueClock;
    /**
     * The pack revision an escalation is minted against. Injected because it is
     * activation state, not a queue computation — and because an escalation
     * bound to a superseded revision would be silently dropped by the very
     * invalidation rule that protects ordinary triggers.
     */
    readonly activePackRevision: () => string;
}

export class CoordinatorReplay {
    constructor(private readonly options: CoordinatorReplayOptions) {}

    /**
     * One startup replay pass.
     *
     * The cursor is *held* — deliberately not advanced — whenever any cycle
     * carries an uncertain outcome. "Do not advance the cursor past the
     * trigger event" is what makes the uncertain effect stay visible as
     * outstanding work instead of being consumed by a cursor that moved on.
     *
     * Each uncertain outcome is escalated **durably**: the D2 escalation is
     * admitted into the persisted queue through the same authority every other
     * trigger uses, so it survives the restart that produced it (correction-03
     * F1). Admission is idempotent by derived event ID, so a lane that restarts
     * ten times ends with one escalation, not ten, and never re-opens one whose
     * cycle already ran.
     *
     * The pass also reports the reservations whose cycle never reached the
     * journal (correction-04 F1). Those claims are left standing: they are the
     * only thing suppressing a duplicate while the cycle-opening record is
     * missing, so replay names them and lets the caller re-issue the record.
     */
    async recover(): Promise<ReplayRecoveryReport> {
        const cycles = await this.options.history.cycles();
        const plans: CycleRecoveryPlan[] = [];
        const escalations: UncertainEscalation[] = [];
        const droppedTriggerIds = this.options.queue.dropProcessedEntries(settledIdentities(cycles));
        for (const entry of cycles) {
            const plan = planCycleRecovery(entry);
            if (plan === null) continue;
            if (entry.uncertainOutcomeEventId === null) {
                plans.push(plan);
                continue;
            }
            plans.push(escalateUncertain(plan, entry.cycleId));
            escalations.push(await admitUncertainEscalation(this.options, entry, entry.uncertainOutcomeEventId));
        }
        const journaledCycleIds = new Set(cycles.map((entry) => entry.cycleId));
        return Object.freeze({
            plans: Object.freeze(plans), escalations: Object.freeze(escalations),
            orphanedCycleIds: Object.freeze(plans.filter((plan) => plan.reason === 'REPLAY_CYCLE_ORPHANED').map((plan) => plan.cycleId)),
            unopenedCycleIds: Object.freeze(this.options.queue.reload().reservations
                .filter((reservation) => !journaledCycleIds.has(reservation.cycleId))
                .map((reservation) => reservation.cycleId)),
            cursorHeld: escalations.length > 0, droppedTriggerIds
        });
    }

    /**
     * Admit a trigger only when neither its durable event ID nor its
     * correlation ID has already been taken by a cycle.
     *
     * This is the journal-backed half of duplicate suppression; the queue owns
     * the "already queued" half, and neither recomputes the other. The event-ID
     * check runs first and is the stricter one: it refuses even while the prior
     * cycle is still in flight, because one durable record must never open two
     * cycles (correction-01 F1).
     */
    async admit(trigger: CoordinatorTrigger): Promise<EnqueueResult> {
        const eventCycleId = await this.options.history.cycleForTriggerEvent(trigger.eventId);
        if (eventCycleId !== null) {
            return duplicate(eventCycleId,
                `Event ${trigger.eventId} already opened cycle ${eventCycleId}; the trigger is a re-delivery.`);
        }
        const priorCycleId = await this.options.history.completedCycleFor(trigger.correlationId);
        if (priorCycleId !== null) {
            return duplicate(priorCycleId,
                `Correlation ${trigger.correlationId} already completed as cycle ${priorCycleId}; the trigger is a re-delivery.`);
        }
        return this.options.queue.enqueue(trigger);
    }

    /**
     * Prove the persisted cursor still names an event the coordinator journal
     * contains, before any poll uses it as a starting point.
     */
    async assertCursorUsable(): Promise<void> {
        const contains = await this.eventPresenceProbe();
        this.options.cursor.assertNotStale(contains);
    }

    /**
     * Resolve journal membership once, then answer synchronously. The cursor
     * owner's staleness check must stay synchronous — it guards a durable write
     * — so the asynchronous journal read happens here, before that guard runs,
     * rather than being hidden inside it as a cosmetic `await`.
     */
    private async eventPresenceProbe(): Promise<(eventId: string) => boolean> {
        const cursorEventId = this.options.cursor.current().lastProcessedEventId;
        if (cursorEventId === null) return () => true;
        const present = await this.options.history.containsEvent(cursorEventId);
        return (eventId: string) => eventId === cursorEventId ? present : true;
    }
}

/**
 * The identities a completed cycle has consumed. Both are returned because a
 * trigger left queued across a crash may match on either one: the correlation
 * when the same work completed under another event, the event ID when the very
 * record it was derived from already opened its cycle.
 */
function settledIdentities(cycles: readonly CycleHistoryEntry[]): SettledIdentities {
    const completed = cycles.filter((entry) => entry.lastPhase === 'coordinator-cycle-complete');
    return {
        correlationIds: new Set(completed.map((entry) => entry.correlationId)),
        eventIds: new Set(completed.map((entry) => entry.triggerEventId).filter((id): id is string => id !== null))
    };
}

function duplicate(priorCycleId: string, message: string): EnqueueResult {
    return Object.freeze({
        ok: false as const, reason: 'duplicate-event' as const,
        code: 'QUEUE_DUPLICATE_EVENT' as const, priorCycleId, message
    });
}
