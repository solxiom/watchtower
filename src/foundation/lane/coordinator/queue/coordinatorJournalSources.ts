/**
 * Binds bounded trigger ingestion and cycle-history reconstruction to the
 * accepted CA-03 runtime journal indexes (CA-13).
 *
 * "The integration reads its output through typed indexes and events": the
 * watcher runtime is never called, and no module here opens
 * `coordinator-events.jsonl` itself. `RuntimeEventReader` is exactly the
 * subset of CA-03's `JournalIndex` this capsule needs and is structurally
 * satisfied by it, so the index stays the one owner of journal reads and this
 * file stays a projection of them.
 *
 * Every read is bounded. A history reconstruction that outgrows `maxEvents`
 * fails closed with `REPLAY_CYCLE_ORPHANED` rather than falling back to an
 * unbounded scan — the same rule that forbids full-pack scanning when an index
 * is unavailable.
 */
import {
    CoordinatorQueueError
} from '../../../../contracts/coordinatorQueue.js';
import {
    type TriggerCandidate
} from '../../../../contracts/coordinatorReplay.js';
import type {DurableEvent, DurableEventPage} from '../../../../contracts/runtimeJournal.js';
import {phaseRank} from './cycleRecovery.js';
import type {
    CycleHistoryEntry, CycleHistorySource, TriggerIngestSource, TriggerScanPage, TriggerScanWindow
} from './queuePorts.js';

/** The `JournalIndex` subset this capsule depends on (CA-03, accepted). */
export interface RuntimeEventReader {
    readEvents(fromSequence: number, limit: number): Promise<DurableEventPage>;
}

/** A lane whose coordinator history exceeds this needs compaction, not a longer scan. */
const DEFAULT_MAX_HISTORY_EVENTS = 4000;
const HISTORY_PAGE = 200;
const UNCERTAIN_PHASE_EVENT = 'coordinator-effect-attempted';

/**
 * The SQLite-index ingestion path. It ignores `fromByteOffset` because the index
 * addresses events by sequence and never exposes journal offsets — which is also
 * why candidates from this source carry no `byteOffset` and a checkpoint written
 * from them retains the cursor's previously stored offset rather than inventing
 * one.
 */
export function triggerIngestFromIndex(reader: RuntimeEventReader): TriggerIngestSource {
    return Object.freeze({
        async scan(window: TriggerScanWindow): Promise<TriggerScanPage> {
            const page = await reader.readEvents(Math.max(window.fromSequence, 0), window.limit);
            // No byte length and no per-record digest: the index addresses
            // events by sequence and cannot see journal bytes, so it can neither
            // verify the incoming boundary nor honestly describe a new one.
            return Object.freeze({candidates: Object.freeze(page.items.map(candidateFor)), byteLength: null});
        }
    });
}

/**
 * A memoized bounded projection of the lane's coordinator history.
 *
 * `readers` is a list because §18 cycle phases are published across two
 * journals — `coordinator-events.jsonl` and CA-10's `effect-events.jsonl` —
 * and a lane that indexes them separately still has exactly one cycle history.
 * Loading is memoized because startup replay asks three questions of the same
 * history, and reloading per question would let the three answers disagree.
 */
export function cycleHistoryFromIndex(
    readers: RuntimeEventReader | readonly RuntimeEventReader[], maxEvents = DEFAULT_MAX_HISTORY_EVENTS
): CycleHistorySource {
    const sources = Array.isArray(readers) ? [...readers as readonly RuntimeEventReader[]] : [readers as RuntimeEventReader];
    if (sources.length === 0) {
        throw new CoordinatorQueueError('REPLAY_CYCLE_ORPHANED', 'coordinator-events.jsonl',
            'Cycle history requires at least one journal index; there is no unindexed fallback read.');
    }
    let loaded: Promise<readonly DurableEvent[]> | null = null;
    const events = () => (loaded ??= readAllHistory(sources, maxEvents));
    return Object.freeze({
        async cycles(): Promise<readonly CycleHistoryEntry[]> {
            return projectCycles(await events());
        },
        /**
         * Resolved through the same cycle projection rather than by matching
         * the completion event's own `correlationId`: that record correlates
         * on the cycle, while duplicate suppression asks about the *trigger*
         * correlation the cycle was opened for.
         */
        async completedCycleFor(correlationId: string): Promise<string | null> {
            const completed = projectCycles(await events()).find((entry) =>
                entry.lastPhase === 'coordinator-cycle-complete' && entry.correlationId === correlationId);
            return completed?.cycleId ?? null;
        },
        /**
         * Any cycle whose recorded trigger event is `eventId`, in flight or
         * finished. One durable record opens at most one cycle (§14 step 2).
         */
        async cycleForTriggerEvent(eventId: string): Promise<string | null> {
            return projectCycles(await events()).find((entry) => entry.triggerEventId === eventId)?.cycleId ?? null;
        },
        /**
         * Any cycle the journal records as opened against `priorCycleId`, in
         * flight or finished. One uncertain outcome earns one escalation.
         */
        async escalationCycleFor(priorCycleId: string): Promise<string | null> {
            return projectCycles(await events()).find((entry) => entry.priorUncertainCycleId === priorCycleId)?.cycleId ?? null;
        },
        async containsEvent(eventId: string): Promise<boolean> {
            return (await events()).some((event) => event.eventId === eventId);
        }
    });
}

async function readAllHistory(
    sources: readonly RuntimeEventReader[], maxEvents: number
): Promise<readonly DurableEvent[]> {
    const pages = await Promise.all(sources.map((source) => readBoundedHistory(source, maxEvents)));
    return Object.freeze(pages.flat());
}

async function readBoundedHistory(reader: RuntimeEventReader, maxEvents: number): Promise<readonly DurableEvent[]> {
    const collected: DurableEvent[] = [];
    let fromSequence = 0;
    for (;;) {
        const page = await reader.readEvents(fromSequence, HISTORY_PAGE);
        collected.push(...page.items);
        if (collected.length > maxEvents) {
            throw new CoordinatorQueueError('REPLAY_CYCLE_ORPHANED', 'coordinator-events.jsonl',
                `Coordinator history exceeds the bounded ${maxEvents}-event replay window; a runtime index rebuild or compaction is required.`);
        }
        if (page.nextSequence === null) return Object.freeze(collected);
        fromSequence = page.nextSequence;
    }
}

/**
 * The furthest-advanced phase per cycle. Selection is by lifecycle progress,
 * not read order, so two independently sequenced journals cannot make a cycle
 * appear to move backwards. An event outside the phase vocabulary ranks below
 * every phase and is retained only when a cycle has nothing else — which is
 * exactly the orphaned-cycle case replay must report rather than guess at.
 */
function projectCycles(events: readonly DurableEvent[]): readonly CycleHistoryEntry[] {
    const byCycle = new Map<string, CycleHistoryEntry>();
    // The trigger correlation is carried by `coordinator-cycle-requested`.
    // CA-10's effect records legitimately correlate on the *cycle* ID instead,
    // so taking whichever record was read first would make the duplicate-
    // suppression key depend on journal interleaving.
    const triggerCorrelations = new Map<string, string>();
    for (const event of events) {
        const cycleId = cycleIdOf(event);
        if (cycleId === null) continue;
        if (event.type === 'coordinator-cycle-requested') triggerCorrelations.set(cycleId, event.correlationId);
        const previous = byCycle.get(cycleId);
        const advanced = previous === undefined || phaseRank(event.type) > phaseRank(previous.lastPhase);
        byCycle.set(cycleId, Object.freeze({
            cycleId, correlationId: previous?.correlationId ?? event.correlationId,
            lastPhase: advanced ? event.type : previous.lastPhase,
            triggerEventId: previous?.triggerEventId ?? triggerEventIdOf(event),
            uncertainOutcomeEventId: previous?.uncertainOutcomeEventId ?? uncertainEventIdOf(event),
            priorUncertainCycleId: previous?.priorUncertainCycleId ?? payloadString(event, 'priorCycleId')
        }));
    }
    return Object.freeze([...byCycle.values()].map((entry) => Object.freeze({
        ...entry, correlationId: triggerCorrelations.get(entry.cycleId) ?? entry.correlationId
    })));
}

function candidateFor(event: DurableEvent): TriggerCandidate {
    return Object.freeze({
        eventId: event.eventId, sequence: event.sequence, eventType: event.type,
        correlationId: event.correlationId, batchId: stringField(event, 'batchId'), at: event.at
    });
}

function cycleIdOf(event: DurableEvent): string | null {
    return stringField(event, 'cycleId') ?? payloadString(event, 'cycleId');
}

function triggerEventIdOf(event: DurableEvent): string | null {
    return event.type === 'coordinator-cycle-requested' ? event.eventId : null;
}

/**
 * `coordinator-effect-attempted` is the durable type CA-10 publishes for an
 * uncertain phase, so the payload's `phase` is what distinguishes an ordinary
 * attempt from an outcome the lane recorded as unknowable.
 */
function uncertainEventIdOf(event: DurableEvent): string | null {
    if (event.type !== UNCERTAIN_PHASE_EVENT) return null;
    return payloadString(event, 'phase') === 'uncertain' ? event.eventId : null;
}

function stringField(event: DurableEvent, field: string): string | null {
    const value = event[field];
    return typeof value === 'string' && value !== '' ? value : null;
}

function payloadString(event: DurableEvent, field: string): string | null {
    const value = (event.payload as Record<string, unknown>)[field];
    return typeof value === 'string' && value !== '' ? value : null;
}
