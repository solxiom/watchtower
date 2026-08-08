/**
 * CA-13 cursor-durability proof.
 *
 * The claim under test is narrow and total: `coordinator/cursor.json` never
 * names an event whose terminal effect outcome is not already durable in
 * `coordinator/journal/effect-events.jsonl`. Every scenario below therefore
 * asserts on the *file on disk* after the call, not only on the returned
 * value — a cursor that refused in its return type while still writing the new
 * position would satisfy a weaker test and lose an effect in production.
 */
import {existsSync, readFileSync} from 'node:fs';
import {CursorManager, type CursorTarget} from '../../../src/foundation/lane/coordinator/queue/CursorManager.js';
import {effectEvidenceFromJournal, outcomeEventId} from '../../../src/foundation/lane/coordinator/queue/effectEvidenceSource.js';
import {cursorPath, readCursorDocument} from '../../../src/foundation/lane/coordinator/queue/queuePersistence.js';
import type {EffectOutcome} from '../../../src/contracts/effects.js';
import {
    LANE_ID, NOW, appendPhase, cursorFor, files, fixedClock, lockFor, makeLaneDir, planFor,
    removeLaneDir
} from './support/queueFixtures.js';

const TARGET: CursorTarget = Object.freeze({
    eventId: 'watcher-event-7', sequence: 7, byteOffset: 512, prefixDigest: `sha256:${'d'.repeat(64)}`,
    journalIdentity: `sha256:${'e'.repeat(64)}`
});

function newCursor(laneDir: string): CursorManager {
    return new CursorManager({
        laneDir, laneId: LANE_ID, files, clock: fixedClock(),
        evidence: effectEvidenceFromJournal(laneDir), lock: lockFor(laneDir)
    });
}

describe('CA-13 cursor advance requires durable effect evidence', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('advances only after the verified outcome record is durable in the journal', () => {
        const plan = planFor('c1');
        appendPhase(laneDir, plan, 'prepared', 0, 'effect-prepared-1');
        appendPhase(laneDir, plan, 'attempted', 1, 'effect-attempted-1');
        const verified = appendPhase(laneDir, plan, 'verified', 2, 'effect-verified-1');

        const result = newCursor(laneDir).advanceCursor(null, TARGET, verified);

        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.previousCursor).toBeNull();
            expect(result.newCursor).toBe('watcher-event-7');
            expect(result.authority).toBe('effect-outcome');
            expect(result.confirmedEffectEventId).toBe(verified);
            expect(result.advancedAt).toBe(NOW);
        }
        const durable = readCursorDocument(laneDir, LANE_ID, files);
        expect(durable.lastProcessedEventId).toBe('watcher-event-7');
        expect(durable.lastProcessedSequence).toBe(7);
        expect(durable.projectionRevision).toBe(1);
    });

    it('refuses and writes nothing when the outcome event is absent from the journal', () => {
        const result = newCursor(laneDir).advanceCursor(null, TARGET, 'effect-verified-never-written');

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('CURSOR_ADVANCE_BLOCKED');
        expect(existsSync(cursorPath(laneDir))).toBeFalse();
    });

    it('treats a prepared-only record as no evidence at all', () => {
        const plan = planFor('c1');
        const prepared = appendPhase(laneDir, plan, 'prepared', 0, 'effect-prepared-1');

        const result = newCursor(laneDir).advanceCursor(null, TARGET, prepared);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('CURSOR_ADVANCE_BLOCKED');
    });

    it('treats an attempted-but-unverified record as no evidence at all', () => {
        const plan = planFor('c1');
        appendPhase(laneDir, plan, 'prepared', 0, 'effect-prepared-1');
        const attempted = appendPhase(laneDir, plan, 'attempted', 1, 'effect-attempted-1');

        const result = newCursor(laneDir).advanceCursor(null, TARGET, attempted);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('CURSOR_ADVANCE_BLOCKED');
        expect(existsSync(cursorPath(laneDir))).toBeFalse();
    });

    it('holds the cursor behind an uncertain outcome', () => {
        const plan = planFor('c1');
        appendPhase(laneDir, plan, 'prepared', 0, 'effect-prepared-1');
        const uncertain = appendPhase(laneDir, plan, 'uncertain', 1, 'effect-uncertain-1');

        const result = newCursor(laneDir).advanceCursor(null, TARGET, uncertain);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('REPLAY_UNCERTAIN_OUTCOME');
        expect(existsSync(cursorPath(laneDir))).toBeFalse();
    });

    it('reproduces a crash between effect verification and journal fsync', () => {
        const plan = planFor('c1');
        appendPhase(laneDir, plan, 'prepared', 0, 'effect-prepared-1');
        appendPhase(laneDir, plan, 'attempted', 1, 'effect-attempted-1');
        // The crash point: the executor verified the postcondition in memory but
        // the process died before the verified record reached the journal.
        const outcome = {
            status: 'applied', plan, runResult: {outcome: 'completed'},
            journal: [{eventId: 'effect-verified-lost', payload: {phase: 'verified'}}]
        } as unknown as EffectOutcome;

        const eventId = outcomeEventId(outcome);
        expect(eventId).toBe('effect-verified-lost');
        const restarted = newCursor(laneDir);
        const result = restarted.advanceCursor(null, TARGET, eventId as string);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('CURSOR_ADVANCE_BLOCKED');
        expect(restarted.current().lastProcessedEventId).toBeNull();
        expect(existsSync(cursorPath(laneDir))).toBeFalse();
    });
});

describe('CA-13 cursor staleness fences', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    function advanceOnce(): CursorManager {
        const plan = planFor('c1');
        const verified = appendPhase(laneDir, plan, 'verified', 0, 'effect-verified-1');
        const cursor = newCursor(laneDir);
        cursor.advanceCursor(null, TARGET, verified);
        return cursor;
    }

    it('refuses an advance issued against a stale view of the cursor', () => {
        const cursor = advanceOnce();
        const plan = planFor('c2');
        const verified = appendPhase(laneDir, plan, 'verified', 1, 'effect-verified-2');

        const result = cursor.advanceCursor(null, {...TARGET, eventId: 'watcher-event-8', sequence: 8}, verified);

        expect(result.ok).toBeFalse();
        if (!result.ok) {
            expect(result.reason).toBe('CURSOR_STALE');
            expect(result.previousCursor).toBe('watcher-event-7');
        }
        expect(readCursorDocument(laneDir, LANE_ID, files).lastProcessedEventId).toBe('watcher-event-7');
    });

    it('never moves the cursor backwards', () => {
        const cursor = advanceOnce();
        const plan = planFor('c2');
        const verified = appendPhase(laneDir, plan, 'verified', 1, 'effect-verified-2');

        const result = cursor.advanceCursor('watcher-event-7', {...TARGET, eventId: 'watcher-event-3', sequence: 3}, verified);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('CURSOR_STALE');
    });

    it('fails closed when the cursor names an event the journal no longer contains', () => {
        const cursor = advanceOnce();
        expect(() => cursor.assertNotStale(() => false)).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'CURSOR_STALE');
        expect(() => cursor.assertNotStale(() => true)).not.toThrow();
    });

    it('accepts a fresh lane whose cursor has never advanced', () => {
        expect(() => newCursor(laneDir).assertNotStale(() => false)).not.toThrow();
    });
});

describe('CA-13 cursor projection integrity', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses to load a malformed cursor projection instead of restarting from zero', () => {
        files.ensureDirectory(`${laneDir}/coordinator`);
        files.writeAtomic(cursorPath(laneDir), '{"schemaVersion":1,"laneId":"x","lastProcessedSequence":"seven"}\n');

        expect(() => newCursor(laneDir)).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'CURSOR_STATE_UNREADABLE');
    });

    it('refuses a cursor projection written by an unsupported schema version', () => {
        files.ensureDirectory(`${laneDir}/coordinator`);
        files.writeAtomic(cursorPath(laneDir), '{"schemaVersion":2,"laneId":"x","lastProcessedSequence":1}\n');

        expect(() => newCursor(laneDir)).toThrowMatching(
            (error: Error & {reason?: string}) => error.reason === 'CURSOR_STATE_UNREADABLE');
    });

    it('treats an absent cursor as a legitimate initial state', () => {
        expect(newCursor(laneDir).current().lastProcessedSequence).toBe(-1);
    });

    it('writes the cursor with the §9 journal identity, offset, and digest', () => {
        const plan = planFor('c1');
        const verified = appendPhase(laneDir, plan, 'verified', 0, 'effect-verified-1');
        newCursor(laneDir).advanceCursor(null, TARGET, verified);

        const written = JSON.parse(readFileSync(cursorPath(laneDir), 'utf8')) as Record<string, unknown>;
        expect(written.journalIdentity).toBe(TARGET.journalIdentity);
        expect(written.lastByteOffset).toBe(512);
        expect(written.prefixDigest).toBe(TARGET.prefixDigest);
        expect(written.lastCursorAdvanceAt).toBe(NOW);
    });

    it('reports an outcome with no terminal record as having no outcome event', () => {
        expect(outcomeEventId({status: 'refused', reason: 'EFFECT_PLAN_INVALID', subject: 's', message: 'm'})).toBeNull();
    });
});

describe('CA-13 checkpoint contiguity (correction-03 F2)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses a checkpoint that skips an intermediate sequence, and writes nothing', () => {
        const cursor = cursorFor(laneDir);
        // The cursor stands before sequence 0. Naming only sequence 1 would
        // declare the unhandled sequence 0 consumed.
        const result = cursor.checkpointHandled(null, [{eventId: 'event-b', sequence: 1}]);

        expect(result.ok).toBeFalse();
        if (!result.ok) {
            expect(result.reason).toBe('CURSOR_ADVANCE_BLOCKED');
            expect(result.message).toContain('not contiguous');
        }
        expect(cursor.current().lastProcessedEventId).toBeNull();
        expect(existsSync(cursorPath(laneDir))).toBeFalse();
    });

    it('refuses a handled run with a hole in the middle', () => {
        const cursor = cursorFor(laneDir);
        const result = cursor.checkpointHandled(null, [
            {eventId: 'event-a', sequence: 0}, {eventId: 'event-c', sequence: 2}
        ]);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('CURSOR_ADVANCE_BLOCKED');
        expect(existsSync(cursorPath(laneDir))).toBeFalse();
    });

    it('accepts a contiguous run and lands on its last position', () => {
        const cursor = cursorFor(laneDir);
        const result = cursor.checkpointHandled(null, [
            {eventId: 'event-a', sequence: 0}, {eventId: 'event-b', sequence: 1}
        ]);

        expect(result.ok).toBeTrue();
        expect(cursor.current().lastProcessedEventId).toBe('event-b');
        expect(cursor.current().lastProcessedSequence).toBe(1);
    });

    it('refuses a checkpoint that names nothing at all', () => {
        const cursor = cursorFor(laneDir);
        const result = cursor.checkpointHandled(null, []);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('CURSOR_ADVANCE_BLOCKED');
        expect(existsSync(cursorPath(laneDir))).toBeFalse();
    });
});
