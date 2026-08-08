/**
 * CA-13 correction-04 F4 — the packaged scan's durable checkpoint fence.
 *
 * Correction-03 made the read bounded; the re-review showed bounded was not the
 * same as *fenced*. Its identity anchor was a fixed hash of the first 4096
 * bytes, so a valid same-length replacement of any record after that point was
 * accepted at the old offset, and the hash was recomputed from byte zero on
 * every poll regardless of where the cursor stood.
 *
 * These scenarios drive the real packaged handler against real journal files.
 * They prove the fence rejects replacement, truncation, and divergence with a
 * typed reason, and they account for **every byte the reader touches** using the
 * reader's own reported ranges rather than a claim about them.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {isPollTriggersInput} from '../../../runtime-nvb/handlers/coordinatorWatch/coordinatorWatchTaskContracts.js';
import {runPollTriggers} from '../../../runtime-nvb/handlers/coordinatorWatch/pollTriggersScan.js';
import {LANE_ID, makeLaneDir, removeLaneDir} from './support/queueFixtures.js';

function baseInput(laneDir: string, overrides: Record<string, unknown> = {}) {
    return {
        schemaVersion: 1, operation: 'poll-triggers', laneDir, fromSequence: 0, fromByteOffset: 0,
        expected: null, limit: 128, ...overrides
    };
}

function writeJournal(laneDir: string, lines: readonly string[]): void {
    const directory = join(laneDir, 'coordinator', 'journal');
    mkdirSync(directory, {recursive: true});
    writeFileSync(join(directory, 'coordinator-events.jsonl'), lines.map((line) => `${line}\n`).join(''));
}

function event(sequence: number, overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        schemaVersion: 1, eventId: `event-${sequence}`, type: 'handoff', sequence,
        at: '2026-08-08T00:00:00.000Z', laneId: LANE_ID, producer: 'watchtower-watcher',
        correlationId: `correlation-${sequence}`, causationId: null, policyVersion: 'policy-1',
        payload: {}, ...overrides
    });
}

describe('CA-13 packaged scan validates the durable checkpoint (correction-04 F4)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    /** A record long enough that a journal of 60 of them runs well past 4 KiB. */
    function paddedEvent(sequence: number, eventId = `event-${sequence}`): string {
        return JSON.stringify({
            schemaVersion: 1, eventId, type: 'handoff', sequence, at: '2026-08-08T00:00:00.000Z',
            laneId: LANE_ID, producer: 'watchtower-watcher', correlationId: `correlation-${sequence}`,
            causationId: null, policyVersion: 'policy-1', payload: {pad: 'p'.repeat(64)}
        });
    }

    /** Poll once from the start and return the checkpoint a cursor would store at `stopAfter`. */
    function checkpointAfter(lines: readonly string[], stopAfter: number) {
        const result = runPollTriggers(baseInput(laneDir, {limit: stopAfter + 1}) as never);
        if (!result.ok) throw new Error(`setup poll refused: ${result.failure.code}`);
        const candidate = result.candidates[stopAfter];
        return {
            fromSequence: candidate.sequence + 1,
            fromByteOffset: candidate.byteOffset,
            expected: {
                anchorDigest: candidate.recordDigest, lastEventId: candidate.eventId,
                byteLength: result.journalByteLength
            }
        };
    }

    it('refuses a same-length valid replacement of a record far beyond any bounded head', () => {
        const lines = Array.from({length: 60}, (_unused, sequence) => paddedEvent(sequence));
        writeJournal(laneDir, lines);
        // Record 50 starts well past byte 4096, which correction-03's fixed head
        // hash could not see at all.
        const boundary = Buffer.byteLength(lines.slice(0, 50).map((line) => `${line}\n`).join(''));
        expect(boundary).toBeGreaterThan(4096);
        const resume = checkpointAfter(lines, 49);
        expect(resume.fromByteOffset).toBe(boundary);
        expect(runPollTriggers(baseInput(laneDir, resume) as never).ok).toBeTrue();

        // Replace the consumed record 49 with a different, equally valid record
        // of exactly the same length. Every byte count is preserved.
        const replaced = [...lines];
        replaced[49] = paddedEvent(49, 'event-49'.replace('event', 'xvent'));
        expect(Buffer.byteLength(replaced[49])).toBe(Buffer.byteLength(lines[49]));
        writeJournal(laneDir, replaced);

        const result = runPollTriggers(baseInput(laneDir, resume) as never);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_CURSOR_MISMATCH');
    });

    it('refuses a replacement that keeps the same event ID but changes the record bytes', () => {
        const lines = Array.from({length: 60}, (_unused, sequence) => paddedEvent(sequence));
        writeJournal(laneDir, lines);
        const resume = checkpointAfter(lines, 49);

        const replaced = [...lines];
        replaced[49] = JSON.stringify({
            schemaVersion: 1, eventId: 'event-49', type: 'blocked', sequence: 49,
            at: '2026-08-08T00:00:00.000Z', laneId: LANE_ID, producer: 'watchtower-watcher',
            correlationId: 'correlation-49', causationId: null, policyVersion: 'policy-1',
            payload: {pad: 'q'.repeat(64)}
        });
        writeJournal(laneDir, replaced);

        const result = runPollTriggers(baseInput(laneDir, resume) as never);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_CURSOR_MISMATCH');
    });

    it('refuses a journal that shrank below the recorded byte length', () => {
        const lines = Array.from({length: 60}, (_unused, sequence) => paddedEvent(sequence));
        writeJournal(laneDir, lines);
        const resume = checkpointAfter(lines, 49);

        writeJournal(laneDir, lines.slice(0, 55));

        const result = runPollTriggers(baseInput(laneDir, resume) as never);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_CURSOR_MISMATCH');
    });

    it('accepts an ordinary append against the same checkpoint', () => {
        const lines = Array.from({length: 60}, (_unused, sequence) => paddedEvent(sequence));
        writeJournal(laneDir, lines);
        const resume = checkpointAfter(lines, 49);

        writeJournal(laneDir, [...lines, paddedEvent(60)]);

        const result = runPollTriggers(baseInput(laneDir, resume) as never);

        expect(result.ok).toBeTrue();
        if (result.ok) expect(result.candidates[0].sequence).toBe(50);
    });

    it('reads no byte before the cursor beyond one bounded anchor lookback, and reports every range', () => {
        const lines = Array.from({length: 60}, (_unused, sequence) => paddedEvent(sequence));
        writeJournal(laneDir, lines);
        const resume = checkpointAfter(lines, 49);

        const result = runPollTriggers(baseInput(laneDir, {...resume, limit: 2}) as never);

        expect(result.ok).toBeTrue();
        if (!result.ok) return;
        // Every byte read is accounted for by the reader itself rather than by a
        // claim about it. Exactly one region precedes the cursor — the anchor
        // lookback — it is bounded by one chunk, and it ends exactly at the
        // cursor. On a journal shorter than the lookback bound that region does
        // begin at zero; the next scenario proves it does not once the journal
        // is larger, which is what disproves the fixed head-hash behaviour.
        const before = result.readRanges.filter((range) => range.offset < resume.fromByteOffset);
        expect(before.length).toBe(1);
        expect(before[0].length).toBeLessThanOrEqual(64 * 1024);
        expect(before[0].offset + before[0].length).toBe(resume.fromByteOffset);
        expect(result.readRanges.every((range) => range.length <= 64 * 1024)).toBeTrue();
    });

    it('never reads byte zero once the cursor is further into the journal than the lookback bound', () => {
        // ~600 padded records puts the cursor well past the 64 KiB anchor bound.
        const lines = Array.from({length: 600}, (_unused, sequence) => paddedEvent(sequence));
        writeJournal(laneDir, lines);
        const setup = runPollTriggers(baseInput(laneDir, {limit: 200}) as never);
        if (!setup.ok) throw new Error('setup poll refused');
        const anchorAt = setup.candidates[199];
        expect(anchorAt.byteOffset).toBeGreaterThan(64 * 1024);

        const result = runPollTriggers(baseInput(laneDir, {
            fromSequence: anchorAt.sequence + 1, fromByteOffset: anchorAt.byteOffset, limit: 2,
            expected: {
                anchorDigest: anchorAt.recordDigest, lastEventId: anchorAt.eventId,
                byteLength: setup.journalByteLength
            }
        }) as never);

        expect(result.ok).toBeTrue();
        if (!result.ok) return;
        expect(result.readRanges.filter((range) => range.offset === 0).length).toBe(0);
        const lowest = Math.min(...result.readRanges.map((range) => range.offset));
        expect(lowest).toBe(anchorAt.byteOffset - 64 * 1024);
        // Total bytes touched stay a function of the page, not of the 600-record
        // history behind the cursor.
        const total = result.readRanges.reduce((sum, range) => sum + range.length, 0);
        expect(total).toBeLessThanOrEqual(2 * 64 * 1024);
    });

    it('reads from byte zero only for a virgin cursor, which has nothing before it', () => {
        writeJournal(laneDir, [event(0), event(1)]);

        const result = runPollTriggers(baseInput(laneDir) as never);

        expect(result.ok).toBeTrue();
        if (result.ok) {
            // Offset 0: the anchor is a constant and no lookback is read at all.
            expect(result.readRanges.every((range) => range.offset >= 0)).toBeTrue();
            expect(result.readRanges.filter((range) => range.offset === 0).length).toBe(1);
        }
    });

    it('refuses a checkpoint whose anchor does not match at an otherwise valid offset', () => {
        const lines = Array.from({length: 60}, (_unused, sequence) => paddedEvent(sequence));
        writeJournal(laneDir, lines);
        const resume = checkpointAfter(lines, 49);

        const result = runPollTriggers(baseInput(laneDir, {
            ...resume, expected: {...resume.expected, anchorDigest: `sha256-anchor:${'0'.repeat(64)}`}
        }) as never);

        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.failure.code).toBe('COORDINATOR_POLL_CURSOR_MISMATCH');
    });

    it('rejects a partial checkpoint at the input grammar rather than fencing on half of one', () => {
        expect(isPollTriggersInput(baseInput('/lanes/demo', {
            expected: {anchorDigest: 'sha256-anchor:x', lastEventId: 'e'}
        }))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {
            expected: {anchorDigest: '', lastEventId: 'e', byteLength: 1}
        }))).toBeFalse();
        expect(isPollTriggersInput(baseInput('/lanes/demo', {
            expected: {anchorDigest: 'sha256-anchor:x', lastEventId: 'e', byteLength: 1}
        }))).toBeTrue();
    });
});
