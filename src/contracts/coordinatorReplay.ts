/**
 * Closed public contracts for the watcher event cursor and for
 * interrupted/duplicate/uncertain replay (CA-13;
 * `docs/spec/coordinator-automation.md` §14/§18/§20,
 * `docs/spec/v1-contracts.md` §9/§11).
 *
 * Split from `coordinatorQueue.ts` because these are a different reason to
 * change: that module is the vocabulary of *what is waiting* — a trigger, its
 * queue slot, the hold and the enqueue/dequeue outcome — while this one is the
 * vocabulary of *how far the lane has durably got* and what a restart owes.
 * The dependency runs one way, from here to the queue vocabulary, and never
 * back.
 *
 * Nothing here reads, writes, classifies, or advances anything; every value
 * crossing this boundary from durable bytes enters as `unknown` and leaves as
 * one of these shapes.
 */
import type {RoutingDecisionClass} from './routing.js';
import type {CoordinatorQueueReason, TriggerClass} from './coordinatorQueue.js';

/**
 * `coordinator/cursor.json` — "journal identity, last durably handled
 * sequence/event ID, byte offset, prefix digest, and projection revision" (§9).
 */
export interface CoordinatorCursorDocument {
    readonly schemaVersion: 1;
    readonly laneId: string;
    readonly journalIdentity: string | null;
    readonly lastProcessedEventId: string | null;
    readonly lastProcessedSequence: number;
    readonly lastByteOffset: number;
    /**
     * Journal size observed at the last advance. An append-only journal never
     * shrinks below it, so a smaller one is a rewrite the next poll must refuse
     * rather than read (correction-04 F4).
     */
    readonly journalByteLength: number;
    /** Anchor digest of the record ending at `lastByteOffset`. */
    readonly prefixDigest: string | null;
    readonly projectionRevision: number;
    readonly lastCursorAdvanceAt: string | null;
}

/**
 * How an advance was authorized.
 *
 * `effect-outcome` is the §9 rule: the cursor crossed an event whose cycle
 * committed an effect, and a terminal outcome record was confirmed durable
 * first. `non-effect-handling` covers the events that legitimately produce no
 * effect at all — a suppressed re-delivery, a recorded blocker or activation
 * consumed into queue state, an M0 observation the routing layer confirmed —
 * whose durable handling record is the queue projection write that preceded
 * the checkpoint. The two are named apart so no caller can present one as the
 * other.
 */
export type CursorAdvanceAuthority = 'effect-outcome' | 'non-effect-handling';

export interface CursorAdvanced {
    readonly ok: true;
    readonly previousCursor: string | null;
    readonly newCursor: string;
    readonly authority: CursorAdvanceAuthority;
    /** The terminal effect outcome that authorized the advance; `null` for `non-effect-handling`. */
    readonly confirmedEffectEventId: string | null;
    readonly advancedAt: string;
}

export interface CursorAdvanceRefused {
    readonly ok: false;
    readonly reason: Extract<CoordinatorQueueReason, 'CURSOR_ADVANCE_BLOCKED' | 'CURSOR_STALE' | 'REPLAY_UNCERTAIN_OUTCOME'>;
    readonly previousCursor: string | null;
    readonly subject: string;
    readonly message: string;
}

export type CursorAdvanceResult = CursorAdvanced | CursorAdvanceRefused;

/**
 * The incomplete cycle states a restart may find, named by the §18 durable
 * event that last committed for the cycle. `complete` is terminal and never
 * yields recovery work.
 */
export const CYCLE_PHASE_EVENTS = [
    'coordinator-cycle-requested',
    'coordinator-routed',
    'coordinator-proposal-received',
    'coordinator-effect-prepared',
    'coordinator-effect-attempted',
    'coordinator-effect-verified',
    'coordinator-cycle-complete'
] as const;

export type CyclePhaseEvent = typeof CYCLE_PHASE_EVENTS[number];

/**
 * What a restart must do for one interrupted cycle. `escalate` is reserved for
 * an outcome that is genuinely unknown; it never means "retry harder".
 */
export type CycleRecoveryAction =
    | 'reroute' | 'reinvoke' | 'revalidate' | 'reattempt-idempotent'
    | 'verify' | 'mark-complete' | 'escalate';

export interface CycleRecoveryPlan {
    readonly cycleId: string;
    readonly correlationId: string;
    readonly lastPhase: CyclePhaseEvent;
    readonly action: CycleRecoveryAction;
    readonly reason: CoordinatorQueueReason | null;
    readonly priorUncertainCycleId: string | null;
}

/**
 * How a replay pass disposed of one uncertain outcome.
 *
 * `created` means this pass admitted the escalation into the durable queue;
 * `already-present` means an escalation for the same uncertain outcome was
 * already queued or had already opened a cycle, so this pass admitted nothing.
 * A restart loop must produce exactly one of the former and any number of the
 * latter (correction-03 F1).
 */
export type EscalationAdmission = 'created' | 'already-present';

/**
 * The escalation cycle replay creates for a prior `COORDINATOR_EFFECT_UNCERTAIN`
 * outcome. The original uncertain outcome is never rewritten; this is a new
 * cycle that *references* it and routes to D2 (batch contract §3).
 *
 * `escalationEventId` is the durable identity the escalation is admitted under
 * and is **derived from the uncertain outcome event**, not minted fresh. That is
 * what makes repeated recovery idempotent: the second pass presents the same
 * event ID and is refused by the same event-ID suppression that refuses any
 * other re-delivery, with no separate "already escalated" side index to keep
 * consistent.
 */
export interface UncertainEscalation {
    readonly cycleId: string;
    readonly priorCycleId: string;
    readonly correlationId: string;
    readonly decisionClass: Extract<RoutingDecisionClass, 'D2'>;
    readonly triggerClass: Extract<TriggerClass, 'safety-escalation'>;
    readonly blockedCursorEventId: string;
    readonly escalationEventId: string;
    readonly triggerId: string | null;
    readonly admission: EscalationAdmission;
}

/** What one startup replay pass found and decided. */
export interface ReplayRecoveryReport {
    readonly plans: readonly CycleRecoveryPlan[];
    readonly escalations: readonly UncertainEscalation[];
    readonly orphanedCycleIds: readonly string[];
    readonly cursorHeld: boolean;
    readonly droppedTriggerIds: readonly string[];
    /**
     * Cycles the lane durably claimed at dequeue whose cycle-opening record is
     * not in the journal — the interrupted crash window (correction-04 F1).
     *
     * Reported, never auto-resolved. The claim keeps suppressing re-admission,
     * so the safe action is for the caller to re-issue the cycle-opening record
     * for each of these; abandoning one is an explicit
     * `CoordinatorQueue.releaseReservation` decision made with the journal in
     * hand, not a default this owner may take.
     */
    readonly unopenedCycleIds: readonly string[];
}

/**
 * One candidate durable event a bounded ingestion scan returned.
 *
 * `sequence` and `eventId` are the authoritative §9 cursor position and are
 * always present. `byteOffset`, `prefixDigest`, and `journalIdentity` are the
 * remaining §9 checkpoint fields and are **optional** because not every source
 * can supply them: the SQLite index exposes decoded events without their
 * journal offsets, while the packaged JSONL scan does. A checkpoint refreshes
 * whichever of the three the source provided and retains the previously stored
 * value for the rest rather than inventing one.
 */
export interface TriggerCandidate {
    readonly eventId: string;
    readonly sequence: number;
    readonly eventType: string;
    readonly correlationId: string;
    readonly batchId: string | null;
    readonly at: string;
    readonly byteOffset?: number;
    readonly prefixDigest?: string | null;
    readonly journalIdentity?: string | null;
}

/**
 * What one bounded watcher poll ingested, bypassed, or suppressed.
 *
 * `cursorAdvancedTo` is the durable outcome of the poll: the event ID the
 * cursor was checkpointed to, or `null` when the poll checkpointed nothing
 * because its first unhandled event opened a cycle. `highWaterSequence` is the
 * last sequence *scanned* and is diagnostic only — it is deliberately not a
 * position any caller may resume from, because resuming from a scan rather
 * than from the durable cursor is what lets an unhandled event be skipped.
 */
export interface WatcherPollReport {
    readonly ok: boolean;
    readonly reason: Extract<CoordinatorQueueReason, 'WATCHER_NO_EVENTS'> | null;
    readonly fromSequence: number;
    readonly scanned: number;
    readonly enqueuedTriggerIds: readonly string[];
    readonly m0EventIds: readonly string[];
    readonly m0UnhandledEventIds: readonly string[];
    readonly duplicateEventIds: readonly string[];
    readonly holdsApplied: readonly string[];
    readonly invalidatedTriggerIds: readonly string[];
    readonly highWaterSequence: number;
    readonly cursorAdvancedTo: string | null;
}

/** What the routing layer (CA-05) reports back for one M0 candidate. */
export interface M0Disposition {
    readonly handled: boolean;
}
