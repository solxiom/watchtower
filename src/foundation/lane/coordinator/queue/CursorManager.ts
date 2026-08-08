/**
 * The lane's single watcher-event cursor authority (CA-13;
 * `docs/spec/coordinator-automation.md` §14 step 10,
 * `docs/spec/v1-contracts.md` §9).
 *
 * "A cursor advances only after the terminal outcome event is fsynced" (§9).
 * That sentence is the whole reason this owner exists, and it is enforced as
 * *evidence*, not intent: `advanceCursor` re-reads the authoritative effect
 * journal through the injected evidence source and refuses unless the named
 * outcome event is durably present there. A caller that already believes the
 * effect succeeded still cannot move the cursor, because belief is precisely
 * what a crash between verification and fsync destroys.
 *
 * No other module writes `coordinator/cursor.json`. Reading it is fine;
 * advancing it is not.
 */
import {
    CoordinatorQueueError
} from '../../../../contracts/coordinatorQueue.js';
import {
    type CoordinatorCursorDocument, type CursorAdvanceAuthority, type CursorAdvanceResult
} from '../../../../contracts/coordinatorReplay.js';
import {cursorPath, readCursorDocument, writeCursorDocument} from './queuePersistence.js';
import {commitProjection, type ProjectionDecision} from './projectionTransaction.js';
import type {LaneMutationLock} from './laneMutationLock.js';
import type {EffectEvidenceSource, QueueClock, QueueFileSystem} from './queuePorts.js';

export interface CursorManagerOptions {
    readonly laneDir: string;
    readonly laneId: string;
    readonly files: QueueFileSystem;
    readonly clock: QueueClock;
    readonly evidence: EffectEvidenceSource;
    /** The §11 lane mutation lock every cursor write is serialized behind. */
    readonly lock: LaneMutationLock;
}

/**
 * The durable position an advance moves the cursor to.
 *
 * `eventId` and `sequence` are required — they are §9's "last durably handled
 * sequence/event ID". The remaining three §9 fields are optional: a source that
 * cannot supply them (the SQLite index decodes events without their journal
 * offsets) leaves the previously stored values in place rather than writing a
 * fabricated offset or digest.
 */
export interface CursorTarget {
    readonly eventId: string;
    readonly sequence: number;
    readonly byteOffset?: number;
    readonly journalByteLength?: number;
    readonly prefixDigest?: string | null;
    readonly journalIdentity?: string | null;
}

export class CursorManager {
    private document: CoordinatorCursorDocument;

    constructor(private readonly options: CursorManagerOptions) {
        this.document = this.load();
    }

    /**
     * The last cursor document this instance read. Like the queue snapshot it is
     * a cache, not a mutation base: every advance re-reads the durable bytes
     * inside the lane lock before deciding anything.
     */
    current(): CoordinatorCursorDocument {
        return this.document;
    }

    /** Re-read the durable cursor into this instance's cache. */
    reload(): CoordinatorCursorDocument {
        this.document = this.load();
        return this.document;
    }

    /**
     * Move the cursor to `target` only after the effect outcome event is
     * confirmed durable.
     *
     * `currentCursor` is the caller's belief about where the cursor stands. It
     * is compared against the persisted document first, so a caller working
     * from a stale read is refused with `CURSOR_STALE` rather than silently
     * rewinding or skipping durable events.
     */
    advanceCursor(currentCursor: string | null, target: CursorTarget, effectOutcomeEventId: string): CursorAdvanceResult {
        return this.transact((current) => {
            const previousCursor = current.lastProcessedEventId;
            const stale = staleness(current, currentCursor, target, this.options.laneDir);
            if (stale !== null) return {next: null, result: stale};
            const evidence = this.options.evidence.confirmTerminalEvent(effectOutcomeEventId);
            if (evidence.kind === 'uncertain') {
                return {next: null, result: refuse('REPLAY_UNCERTAIN_OUTCOME', previousCursor, effectOutcomeEventId,
                    `Effect outcome ${effectOutcomeEventId} is uncertain; the cursor stays behind the trigger event pending escalation.`)};
            }
            if (evidence.kind === 'absent') {
                return {next: null, result: refuse('CURSOR_ADVANCE_BLOCKED', previousCursor, effectOutcomeEventId,
                    `Effect outcome ${effectOutcomeEventId} is not durably present in the effect journal.`)};
            }
            return advanced(current, target, 'effect-outcome', effectOutcomeEventId, this.options.clock.now().toISOString());
        });
    }

    /**
     * Check the cursor forward across events that were terminally handled
     * **without producing an effect** — a suppressed re-delivery, a recorded
     * blocker or activation consumed into queue state, an M0 observation the
     * routing layer confirmed (correction-01 F2).
     *
     * This is a separate operation from `advanceCursor`, not a relaxed mode of
     * it: the effect-outcome fence is untouched and unreachable from here, and
     * the result records `non-effect-handling` so no reader can mistake one
     * authority for the other.
     *
     * `handled` is the caller's **ordered, contiguous** run of durably handled
     * positions, and the cursor lands on its last member. Contiguity is proved
     * here rather than assumed (correction-03 F2): the run must begin at exactly
     * `lastProcessedSequence + 1` and step by one, so a caller holding events
     * 5 and 7 cannot check the cursor to 7 and declare the unhandled 6 consumed.
     * A gap is refused with no byte written.
     */
    checkpointHandled(currentCursor: string | null, handled: readonly CursorTarget[]): CursorAdvanceResult {
        return this.transact((current) => {
            const previousCursor = current.lastProcessedEventId;
            if (handled.length === 0) {
                return {next: null, result: refuse('CURSOR_ADVANCE_BLOCKED', previousCursor, cursorPath(this.options.laneDir),
                    'A checkpoint names no durably handled event.')};
            }
            const target = handled[handled.length - 1];
            const stale = staleness(current, currentCursor, target, this.options.laneDir);
            if (stale !== null) return {next: null, result: stale};
            const gap = contiguityGap(current.lastProcessedSequence, handled);
            if (gap !== null) {
                return {next: null, result: refuse('CURSOR_ADVANCE_BLOCKED', previousCursor, target.eventId,
                    `The handled run is not contiguous from the durable cursor: ${gap}.`)};
            }
            return advanced(current, target, 'non-effect-handling', null, this.options.clock.now().toISOString());
        });
    }

    /**
     * Prove the persisted cursor still names an event the journal actually
     * contains. A cursor pointing past a rebuilt or truncated journal is
     * `CURSOR_STALE`: continuing from it would skip every event between.
     */
    assertNotStale(journalContains: (eventId: string) => boolean): void {
        const eventId = this.document.lastProcessedEventId;
        if (eventId === null) return;
        if (!journalContains(eventId)) {
            throw new CoordinatorQueueError('CURSOR_STALE', cursorPath(this.options.laneDir),
                `The cursor references event ${eventId}, which is not present in the coordinator journal.`);
        }
    }

    private load(): CoordinatorCursorDocument {
        return readCursorDocument(this.options.laneDir, this.options.laneId, this.options.files);
    }

    /**
     * Every advance is decided against the cursor re-read inside the lane lock,
     * so two independent writers cannot both advance from one revision: the
     * second sees the first's position as `previousCursor` and is refused
     * `CURSOR_STALE` rather than overwriting it (correction-03 F2).
     */
    private transact(
        decide: (current: CoordinatorCursorDocument) => ProjectionDecision<CoordinatorCursorDocument, CursorAdvanceResult>
    ): CursorAdvanceResult {
        const committed = commitProjection<CoordinatorCursorDocument, CursorAdvanceResult>({
            lock: this.options.lock, read: () => this.load(), staleReason: 'CURSOR_STALE',
            subject: cursorPath(this.options.laneDir),
            write: (document) => writeCursorDocument(this.options.laneDir, Object.freeze({...document}), this.options.files)
        }, this.document, decide);
        this.document = Object.freeze({...committed.document});
        return committed.result;
    }
}

/** The two ordering fences every advance shares, in the order they must fail. */
function staleness(
    current: CoordinatorCursorDocument, currentCursor: string | null, target: CursorTarget, laneDir: string
): CursorAdvanceResult | null {
    const previousCursor = current.lastProcessedEventId;
    if (currentCursor !== previousCursor) {
        return refuse('CURSOR_STALE', previousCursor, cursorPath(laneDir),
            `The cursor is at ${previousCursor ?? 'the journal start'}, not the supplied ${currentCursor ?? 'journal start'}.`);
    }
    if (target.sequence <= current.lastProcessedSequence) {
        return refuse('CURSOR_STALE', previousCursor, target.eventId,
            `Sequence ${target.sequence} does not advance past the last durably handled sequence ${current.lastProcessedSequence}.`);
    }
    return null;
}

/**
 * Describes the first break in an ordered handled run, or `null` when the run
 * covers every sequence from the cursor to its own end with no hole.
 */
function contiguityGap(lastProcessedSequence: number, handled: readonly CursorTarget[]): string | null {
    let expected = lastProcessedSequence + 1;
    for (const position of handled) {
        if (position.sequence !== expected) {
            return `expected sequence ${expected} but the run names ${position.sequence} (${position.eventId})`;
        }
        expected += 1;
    }
    return null;
}

function advanced(
    current: CoordinatorCursorDocument, target: CursorTarget,
    authority: CursorAdvanceAuthority, confirmedEffectEventId: string | null, advancedAt: string
): ProjectionDecision<CoordinatorCursorDocument, CursorAdvanceResult> {
    return {
        next: {
            ...current, lastProcessedEventId: target.eventId, lastProcessedSequence: target.sequence,
            lastByteOffset: target.byteOffset ?? current.lastByteOffset,
            journalByteLength: target.journalByteLength ?? current.journalByteLength,
            prefixDigest: target.prefixDigest ?? current.prefixDigest,
            journalIdentity: target.journalIdentity ?? current.journalIdentity,
            lastCursorAdvanceAt: advancedAt
        },
        result: Object.freeze({
            ok: true as const, previousCursor: current.lastProcessedEventId, newCursor: target.eventId,
            authority, confirmedEffectEventId, advancedAt
        })
    };
}

function refuse(
    reason: 'CURSOR_ADVANCE_BLOCKED' | 'CURSOR_STALE' | 'REPLAY_UNCERTAIN_OUTCOME',
    previousCursor: string | null, subject: string, message: string
): CursorAdvanceResult {
    return Object.freeze({ok: false as const, reason, previousCursor, subject, message});
}
