/**
 * The bounded window read over the authoritative JSONL journal (CA-13;
 * `docs/spec/v1-contracts.md` §9).
 *
 * Kept apart from `journalIndexSource.ts` on purpose. That module is CA-03's
 * accepted whole-journal reader and answers "what does this entire journal
 * contain?"; this one answers "what are the next few records after the position
 * my cursor durably recorded, and is that position still valid?" — a different
 * question with a hard cost constraint, since a coordinator polls it forever
 * while the journal grows without bound.
 *
 * The record grammar is *not* reimplemented: `isDurableEvent` is CA-03's and is
 * imported, so "what is a durable event?" keeps one answer, and the window holds
 * the same per-record validation and sequence-contiguity rule over its page that
 * `parseJournal` holds over the file. A bounded read is never a weaker read.
 */
import {createHash} from 'node:crypto';
import {closeSync, existsSync, fstatSync, openSync, readSync} from 'node:fs';
import type {DurableEvent} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {isDurableEvent} from './journalIndexSource.js';

/**
 * A bounded window request over the authoritative JSONL journal (CA-13
 * correction-03 F4, correction-04 F4).
 *
 * `fromByteOffset` is the durable cursor's `lastByteOffset` and is what makes
 * the read bounded at all: sequence alone would require counting records from
 * the start of the file on every poll, which is the full-history read this
 * request type exists to remove. The offset is *verified*, never trusted.
 *
 * `expected` is the checkpoint the cursor durably recorded for that offset. When
 * present it is a hard fence, not a hint: the window refuses unless the journal
 * still presents the same boundary record, has not shrunk below the checkpoint's
 * byte length, and still carries `fromSequence` at the offset.
 */
export interface JournalCheckpointExpectation {
    /** Digest of the record ending exactly at `fromByteOffset`. */
    readonly anchorDigest: string;
    /** Event ID of that same boundary record. */
    readonly lastEventId: string;
    /** Journal byte length when the checkpoint was written; the journal may only grow. */
    readonly byteLength: number;
}

export interface JournalWindowRequest {
    readonly fromSequence: number;
    readonly fromByteOffset: number;
    readonly limit: number;
    readonly maxBytes: number;
    /** `null` only for a cursor that has never advanced (offset 0). */
    readonly expected: JournalCheckpointExpectation | null;
}

/** One contiguous region the reader actually touched. */
export interface JournalReadRange {
    readonly offset: number;
    readonly length: number;
}

export interface JournalWindow {
    readonly events: readonly DurableEvent[];
    /** Absolute start offset of each returned record. */
    readonly offsets: readonly number[];
    readonly lengths: readonly number[];
    /**
     * Anchor digest of each returned record, positionally aligned with `events`.
     *
     * Per record, not per page: a cursor stops wherever its own handling stopped,
     * which is often mid-page, and it must store the anchor for *that* boundary.
     * A single page-level digest would only ever be valid for a cursor that
     * consumed the whole page.
     */
    readonly recordDigests: readonly string[];
    /** Absolute offset just past the last complete record returned. */
    readonly endByteOffset: number;
    /** Journal size observed for this read; an append-only journal never shrinks below it. */
    readonly byteLength: number;
    /** The window stopped mid-record, so a later poll must re-read from `endByteOffset`. */
    readonly partialTail: boolean;
    /** The window reached end of file rather than a limit or byte budget. */
    readonly exhausted: boolean;
    /**
     * Every region read, in order. Present so a caller — and a test — can account
     * for all bytes touched rather than trust a claim about them.
     */
    readonly readRanges: readonly JournalReadRange[];
}

/** Read granularity; also the largest single record the window will assemble. */
const WINDOW_CHUNK_BYTES = 64 * 1024;
/** The anchor of a virgin cursor: there is no record before offset 0. */
const ORIGIN_ANCHOR = 'sha256-anchor:origin';

/**
 * Records every region read so the caller can account for all bytes touched.
 * A reader that reports its own boundaries can be *checked*; one that only
 * claims them cannot.
 */
class BoundedReader {
    readonly ranges: JournalReadRange[] = [];

    constructor(private readonly fd: number) {}

    /** `readSync` may return a short read; a partially filled buffer would decode as corruption. */
    read(target: Buffer, position: number): void {
        if (target.byteLength === 0) return;
        this.ranges.push({offset: position, length: target.byteLength});
        let filled = 0;
        while (filled < target.byteLength) {
            const read = readSync(this.fd, target, filled, target.byteLength - filled, position + filled);
            if (read === 0) return;
            filled += read;
        }
    }
}

/**
 * The digest identifying the record that ends exactly at `offset`.
 *
 * This replaces correction-03's fixed first-4096-byte hash, which had two
 * defects the re-review found: it read byte 0 on every poll regardless of the
 * cursor, and being anchored to the head it could not detect a valid
 * same-length replacement of any record after byte 4096. The anchor is instead
 * taken at the cursor's own boundary, so it moves with the cursor, reads only a
 * bounded lookback, and changes whenever the record the cursor last consumed
 * changes — which is exactly the append-only violation that must block a poll.
 *
 * A cursor at offset 0 has consumed nothing, so its anchor is a constant and no
 * byte is read at all.
 */
function anchorAt(reader: BoundedReader, offset: number): {digest: string; eventId: string | null} {
    if (offset === 0) return {digest: ORIGIN_ANCHOR, eventId: null};
    const span = Math.min(WINDOW_CHUNK_BYTES, offset);
    const window = Buffer.alloc(span);
    reader.read(window, offset - span);
    const previousNewline = window.subarray(0, span - 1).lastIndexOf(0x0a);
    const record = window.subarray(previousNewline + 1);
    return {digest: digestOf(record), eventId: anchorEventId(record)};
}

function digestOf(record: Buffer): string {
    return `sha256-anchor:${createHash('sha256').update(record).digest('hex')}`;
}

function anchorEventId(record: Buffer): string | null {
    try {
        const value = JSON.parse(record.toString('utf8')) as unknown;
        return isDurableEvent(value) ? value.eventId : null;
    } catch {
        return null;
    }
}

/**
 * Read at most `limit` records, and at most `maxBytes` bytes, starting at the
 * cursor's byte offset — after proving the cursor still describes this journal.
 *
 * There is deliberately **no fallback**. If the checkpoint or the offset does
 * not match, the journal was rebuilt, truncated, or rewritten beneath the lane,
 * and the answer is `JOURNAL_CHECKPOINT_MISMATCH` — not a rescan from zero,
 * which would answer a corruption signal with an unbounded read and re-deliver
 * every historical event.
 */
export function readJournalWindow(path: string, request: JournalWindowRequest): JournalWindow {
    assertRequest(path, request);
    if (!existsSync(path)) throw new JournalError('JOURNAL_NOT_FOUND', path, 'authoritative JSONL journal does not exist');
    const fd = openSync(path, 'r');
    try {
        const size = fstatSync(fd).size;
        const reader = new BoundedReader(fd);
        if (request.fromByteOffset > size) {
            throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', path,
                `cursor byte offset ${request.fromByteOffset} is past the journal end ${size}`);
        }
        const anchor = anchorAt(reader, request.fromByteOffset);
        assertCheckpoint(path, request, anchor, size);
        return collectWindow(reader, path, size, request);
    } finally {
        closeSync(fd);
    }
}

/**
 * The append-only fence. A journal may only grow, and the record the cursor last
 * consumed may never change; either violation is reported rather than absorbed.
 */
function assertCheckpoint(
    path: string, request: JournalWindowRequest, anchor: {digest: string; eventId: string | null}, size: number
): void {
    const expected = request.expected;
    if (expected === null) return;
    if (size < expected.byteLength) {
        throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', path,
            `journal shrank from ${expected.byteLength} to ${size} bytes; an append-only journal never does`);
    }
    if (anchor.digest !== expected.anchorDigest) {
        throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', path,
            `the record ending at offset ${request.fromByteOffset} is not the one the cursor recorded`);
    }
    if (anchor.eventId !== expected.lastEventId) {
        throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', path,
            `the record ending at offset ${request.fromByteOffset} is ${anchor.eventId ?? 'unreadable'}, not the recorded ${expected.lastEventId}`);
    }
}

function assertRequest(path: string, request: JournalWindowRequest): void {
    const legal = Number.isSafeInteger(request.fromSequence) && request.fromSequence >= 0
        && Number.isSafeInteger(request.fromByteOffset) && request.fromByteOffset >= 0
        && Number.isSafeInteger(request.limit) && request.limit >= 1
        && Number.isSafeInteger(request.maxBytes) && request.maxBytes >= 1
        && (request.expected === null || Number.isSafeInteger(request.expected.byteLength));
    if (!legal) throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', path, 'journal window request is not a bounded window');
}

/**
 * The scan loop. Memory is bounded by one chunk plus one in-progress record, and
 * the total bytes touched are bounded by `maxBytes` — neither grows with the
 * journal.
 */
function collectWindow(
    reader: BoundedReader, path: string, size: number, request: JournalWindowRequest
): JournalWindow {
    const events: DurableEvent[] = [], offsets: number[] = [], lengths: number[] = [], recordDigests: string[] = [];
    let position = request.fromByteOffset, pending = Buffer.alloc(0), consumed = 0, expected = request.fromSequence;
    while (events.length < request.limit && position + pending.byteLength < size && consumed < request.maxBytes) {
        const chunk = Buffer.alloc(Math.min(WINDOW_CHUNK_BYTES, request.maxBytes - consumed, size - position - pending.byteLength));
        if (chunk.byteLength === 0) break;
        reader.read(chunk, position + pending.byteLength);
        consumed += chunk.byteLength;
        pending = Buffer.concat([pending, chunk]);
        let newline = pending.indexOf(0x0a);
        while (newline !== -1 && events.length < request.limit) {
            const line = pending.subarray(0, newline);
            const length = newline + 1;
            if (line.toString('utf8').trim() !== '') {
                events.push(decodeRecord(line.toString('utf8'), path, expected));
                offsets.push(position);
                lengths.push(length);
                recordDigests.push(digestOf(pending.subarray(0, length)));
                expected += 1;
            }
            position += length;
            pending = pending.subarray(length);
            newline = pending.indexOf(0x0a);
        }
        if (events.length < request.limit && pending.byteLength > WINDOW_CHUNK_BYTES) {
            throw new JournalError('JOURNAL_INVALID_RECORD', path, `a single record exceeds the ${WINDOW_CHUNK_BYTES}-byte window record bound`);
        }
    }
    // Both flags are about `position` — the end of the last *complete* record
    // returned — never about how much happened to be buffered. A window that
    // stopped on its record bound leaves whole records behind and is simply not
    // exhausted; only bytes after the final newline are a partial tail, and
    // reporting a mid-page stop as one would make every bounded page look like a
    // damaged journal.
    const bufferedToEnd = position + pending.byteLength === size;
    return {
        events, offsets, lengths, recordDigests, endByteOffset: position, byteLength: size,
        partialTail: bufferedToEnd && pending.byteLength > 0 && pending.indexOf(0x0a) === -1,
        exhausted: position >= size,
        readRanges: Object.freeze([...reader.ranges])
    };
}

/**
 * One line into one validated event at exactly the sequence the window expects.
 * The contiguity check is the same rule `parseJournal` enforces globally, held
 * over the window instead of the file, so a bounded read is never a weaker read.
 */
function decodeRecord(line: string, path: string, expectedSequence: number): DurableEvent {
    let value: unknown;
    try { value = JSON.parse(line) as unknown; } catch { throw new JournalError('JOURNAL_INVALID_RECORD', path, 'window record is not valid JSON'); }
    if (!isDurableEvent(value)) throw new JournalError('JOURNAL_INVALID_RECORD', path, 'window record is not a DurableEvent');
    if (value.sequence !== expectedSequence) {
        throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', path,
            `expected sequence ${expectedSequence} at the cursor offset but found ${value.sequence}`);
    }
    return value;
}
