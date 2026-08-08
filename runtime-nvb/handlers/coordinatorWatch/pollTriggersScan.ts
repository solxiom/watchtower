/**
 * The bounded journal scan behind `wt:coordinator:poll-triggers` (CA-13
 * correction-01 F4, correction-03 F4).
 *
 * The JSONL parse is **not** reimplemented here: `readJournalWindow` is CA-03's
 * accepted reader, compiled into the packaged runtime rather than copied, so
 * "what is a durable event and is this journal intact?" keeps one answer in the
 * product and in the package.
 *
 * The scan is bounded in *bytes, records, and memory* — not merely truncated
 * after the fact. It opens the journal at the cursor's byte offset, reads at
 * most `MAX_POLL_BYTES` from there in fixed chunks, and stops at `limit`
 * records. Nothing before the offset is read, so poll cost is a function of the
 * page size and never of journal length. There is no full-history fallback: an
 * offset that does not land on the claimed sequence is one typed refusal,
 * because rescanning from zero would answer a corruption signal with an
 * unbounded read and a re-delivery of every historical event.
 *
 * The value it adds over the in-process SQLite path is the §9 checkpoint data
 * the index cannot expose: per-record byte offsets and the boundary checkpoint,
 * which is what lets a watcher poll write a complete cursor.
 *
 * The cursor's checkpoint is *carried in and validated*, never invented here
 * (correction-04 F4). The task reports no journal identity of its own: a bounded
 * reader cannot compute one for the whole file, and correction-03's fixed
 * first-4096-byte hash was worse than none — it read byte zero on every poll and
 * still could not see a valid record replacement after byte 4096.
 */
import {readJournalWindow} from '../../foundation/index/runtime/journalWindowReader.js';
import {
    isContainedLaneDir, journalPathFor, refusedPoll, MAX_POLL_BYTES,
    type PollCandidate, type PollTriggersInput, type PollTriggersResult
} from './coordinatorWatchTaskContracts.js';

export function runPollTriggers(input: PollTriggersInput): PollTriggersResult {
    if (!isContainedLaneDir(input.laneDir)) return refusedPoll('COORDINATOR_POLL_PATH_ESCAPE');
    let window;
    try {
        window = readJournalWindow(journalPathFor(input.laneDir), {
            fromSequence: input.fromSequence, fromByteOffset: input.fromByteOffset,
            expected: input.expected, limit: input.limit, maxBytes: MAX_POLL_BYTES
        });
    } catch (error) {
        // A cursor that no longer matches the journal is reported apart from a
        // missing or corrupt one: the first needs an explicit runtime-index
        // rebuild decision, the second is an integrity incident. The handler
        // never repairs or truncates either.
        return refusedPoll(reasonOf(error) === 'JOURNAL_CHECKPOINT_MISMATCH'
            ? 'COORDINATOR_POLL_CURSOR_MISMATCH' : 'COORDINATOR_POLL_JOURNAL_UNREADABLE');
    }
    const candidates: PollCandidate[] = window.events.map((event, index) => ({
        eventId: event.eventId, sequence: event.sequence, eventType: event.type,
        correlationId: event.correlationId, batchId: stringField(event, 'batchId'), at: event.at,
        byteOffset: window.offsets[index] + window.lengths[index],
        recordDigest: window.recordDigests[index]
    }));
    return {
        schemaVersion: 1, ok: true, operation: 'poll-triggers', partialTail: window.partialTail,
        endByteOffset: window.endByteOffset, journalByteLength: window.byteLength,
        readRanges: window.readRanges, exhausted: window.exhausted, candidates
    };
}

function reasonOf(error: unknown): string | null {
    const reason = (error as {reason?: unknown} | null)?.reason;
    return typeof reason === 'string' ? reason : null;
}

function stringField(event: Record<string, unknown>, field: string): string | null {
    const value = event[field];
    return typeof value === 'string' && value !== '' ? value : null;
}
