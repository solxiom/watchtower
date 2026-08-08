/**
 * The injected collaborators of the coordinator queue, cursor, and replay
 * owners (CA-13). Every effectful or nondeterministic dependency — durable
 * bytes, the clock, identity, the bounded event scan, the routing
 * classification, and the effect-journal evidence the cursor depends on —
 * enters through one of these ports, so no owner in this capsule contains
 * ambient `node:fs`, `Date.now()`, `randomUUID()`, or a second copy of
 * routing policy.
 *
 * `TriggerClassifier` is deliberately a port and not an algorithm: CA-05 owns
 * rule matching and class assignment, and recomputing any part of it here
 * would create a second routing authority. The two journal sources are split
 * the same way — `EffectEvidenceSource` answers only for
 * `coordinator/journal/effect-events.jsonl` (CA-10's authoritative
 * prepare/attempt/verify history) and `CycleHistorySource` only for
 * `coordinator/journal/coordinator-events.jsonl` (the §18 cycle lifecycle) —
 * because those are two different truths written by two different owners.
 */
import type {TextRead} from '../../../effect/effectPorts.js';
import type {
    ImpactScopedHold, TriggerClass
} from '../../../../contracts/coordinatorQueue.js';
import type {
    TriggerCandidate
} from '../../../../contracts/coordinatorReplay.js';
import type {RoutingDecisionClass} from '../../../../contracts/routing.js';

export type {TextRead};

/**
 * The narrow durable-bytes port. `queue.json` and `cursor.json` are whole-file
 * projections, so every write is a staged exclusive create, `fsync`, and
 * atomic rename — never an in-place rewrite that a crash could leave half
 * applied.
 */
export interface QueueFileSystem {
    ensureDirectory(path: string): void;
    readText(path: string, maxBytes: number): TextRead;
    /** Stage, `fsync`, rename over `path`, then `fsync` the containing directory. */
    writeAtomic(path: string, content: string): void;
}

/** Injected nondeterminism: the only clock and identity source this capsule sees. */
export interface QueueClock {
    now(): Date;
}

export interface QueueIdFactory {
    nextTriggerId(): string;
    nextCycleId(): string;
}

/**
 * One bounded scan window over the authoritative coordinator journal.
 *
 * `fromByteOffset` accompanies `fromSequence` because a sequence alone forces a
 * reader to count records from the start of the journal; the durable cursor
 * already records the offset for exactly this reason (§9), and passing it is
 * what keeps poll cost independent of history length (correction-03 F4). A
 * source that cannot use an offset simply ignores it.
 *
 * `expected` is the durable checkpoint the cursor recorded for that offset
 * (correction-04 F4). A source that can verify it must refuse a journal that no
 * longer matches rather than read on; a source that cannot verify it — the
 * SQLite index, which addresses events by sequence — ignores it, and a cursor
 * fed from that source simply never acquires one.
 */
export interface TriggerScanWindow {
    readonly fromSequence: number;
    readonly fromByteOffset: number;
    readonly limit: number;
    readonly expected: ScanCheckpoint | null;
}

/** The boundary a poll proves it is resuming from, and the one it hands back. */
export interface ScanCheckpoint {
    readonly anchorDigest: string;
    readonly lastEventId: string;
    readonly byteLength: number;
}

/**
 * One bounded page. Each candidate carries its own anchor digest in
 * `prefixDigest`, so a cursor that stops mid-page still records the boundary it
 * actually reached; `byteLength` is the journal size the source observed, and is
 * `null` for a source that cannot see journal bytes.
 */
export interface TriggerScanPage {
    readonly candidates: readonly TriggerCandidate[];
    readonly byteLength: number | null;
}

/**
 * A bounded scan of the authoritative coordinator journal from a cursor
 * position. Bounded by contract: an unbounded tail read is not an acceptable
 * degraded mode, so `limit` is mandatory and has no default.
 */
export interface TriggerIngestSource {
    scan(window: TriggerScanWindow): Promise<TriggerScanPage>;
}

/** CA-05's classification, injected. This capsule never matches a routing rule itself. */
export interface TriggerClassifier {
    classify(candidate: TriggerCandidate): TriggerClassification;
}

export interface TriggerClassification {
    readonly decisionClass: RoutingDecisionClass;
    readonly triggerClass: TriggerClass;
    readonly packRevision: string;
}

/**
 * What the durable effect journal says about one outcome event ID. `absent`
 * covers both "never written" and "written but not yet fsynced", because a
 * reader that cannot see the record has no evidence it is durable — and
 * "advances the cursor only after durable handling" (§14) is a claim about
 * evidence, not intent. A `prepared` or `attempted` record is also `absent`
 * here: those phases are precisely the interrupted case, never a terminal one.
 */
export type EffectEvidence =
    | {readonly kind: 'confirmed'; readonly idempotencyKey: string}
    | {readonly kind: 'uncertain'; readonly idempotencyKey: string}
    | {readonly kind: 'absent'};

export interface EffectEvidenceSource {
    confirmTerminalEvent(eventId: string): EffectEvidence;
}

/**
 * The coordinator cycle history a restart reconstructs recovery from. It is a
 * projection of `coordinator/journal/coordinator-events.jsonl`; this capsule
 * never infers a phase from tmux prose (§14).
 */
export interface CycleHistorySource {
    /** Every cycle with at least one journaled phase event, carrying its newest phase. */
    cycles(): Promise<readonly CycleHistoryEntry[]>;
    /** The cycle ID of a prior *completed* cycle for `correlationId`, or `null`. */
    completedCycleFor(correlationId: string): Promise<string | null>;
    /**
     * The cycle ID of **any** cycle already opened for the durable event
     * `eventId`, or `null`.
     *
     * Deliberately not restricted to completed cycles, unlike the correlation
     * query. A correlation may legitimately span several cycles over time, but
     * one durable event opens at most one cycle ever — so an in-flight cycle is
     * just as much a reason to refuse a re-delivery as a finished one.
     */
    cycleForTriggerEvent(eventId: string): Promise<string | null>;
    /**
     * The cycle ID of an escalation already opened for the uncertain cycle
     * `priorCycleId`, or `null`.
     *
     * This is the durable half of uncertain-replay idempotency (correction-03
     * F1). The queued half cannot answer it: once an escalation has been
     * dequeued it is no longer in the projection, and without this question a
     * restart during the escalation's own cycle would open a second one. It is
     * deliberately not restricted to completed cycles — an escalation in flight
     * is already the response to that uncertainty.
     */
    escalationCycleFor(priorCycleId: string): Promise<string | null>;
    /** `true` when the coordinator journal still contains `eventId`. */
    containsEvent(eventId: string): Promise<boolean>;
}

export interface CycleHistoryEntry {
    readonly cycleId: string;
    readonly correlationId: string;
    readonly lastPhase: string;
    readonly triggerEventId: string | null;
    /**
     * The effect-outcome event ID recorded as uncertain for this cycle, when
     * the journal says the lane already knows it cannot know the postcondition.
     */
    readonly uncertainOutcomeEventId: string | null;
    /**
     * The uncertain cycle this cycle was opened to escalate, when the journal
     * records one. Present only on escalation cycles.
     */
    readonly priorUncertainCycleId: string | null;
}

export type {ImpactScopedHold};
