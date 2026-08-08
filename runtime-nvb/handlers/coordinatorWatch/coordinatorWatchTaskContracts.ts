/**
 * Closed input/result grammar for the packaged `wt:coordinator:poll-triggers`
 * task (CA-13 correction-01 F4, correction-04 F4).
 *
 * The handler is a **mechanical, read-only bounded scan**. Everything that
 * would make it a decision — priority, routing class, cycle state, cursor
 * position, effect authority — is deliberately absent from both the input and
 * the result: those belong to the application services, and a handler that
 * could express them would be a second coordinator.
 *
 * Validation here is a closed grammar over `unknown`, not a schema reference.
 * The catalog's `inputSchema` is checked before the process starts; this is the
 * independent in-process fence that still holds if that check is ever loosened.
 */
export type PollFailureCode =
    | 'COORDINATOR_POLL_INPUT_INVALID'
    | 'COORDINATOR_POLL_PATH_ESCAPE'
    | 'COORDINATOR_POLL_JOURNAL_UNREADABLE'
    | 'COORDINATOR_POLL_CURSOR_MISMATCH';

/** Mirrors `MAX_JOURNAL_PAGE` in the accepted CA-03 reader; a poll is never unbounded. */
export const MAX_POLL_LIMIT = 200;

/**
 * The byte budget one poll may touch. With `MAX_POLL_LIMIT` records this leaves
 * ~5 KiB per record, which is generous for a coordinator event and still makes
 * the read independent of journal size (correction-03 F4).
 */
export const MAX_POLL_BYTES = 1024 * 1024;

/**
 * The durable checkpoint the cursor recorded for `fromByteOffset`.
 *
 * Carried into the task, not derived inside it (correction-04 F4). A reader that
 * computes its own notion of "which journal is this?" can only ever check the
 * journal against itself; the fence has to compare the journal against what the
 * lane durably believed last time, and only the caller holds that.
 *
 * `null` exactly when the cursor has never advanced — there is no prior record
 * to anchor to, and there is also nothing yet to protect.
 */
export interface PollCheckpoint {
    readonly anchorDigest: string;
    readonly lastEventId: string;
    readonly byteLength: number;
}

export interface PollTriggersInput {
    readonly schemaVersion: 1;
    readonly operation: 'poll-triggers';
    readonly laneDir: string;
    readonly fromSequence: number;
    /**
     * The durable cursor's byte offset for `fromSequence`. Required: without it
     * the scan would have to count records from the start of the journal, which
     * is precisely the unbounded read this task must not perform.
     */
    readonly fromByteOffset: number;
    readonly expected: PollCheckpoint | null;
    readonly limit: number;
}

export interface PollCandidate {
    readonly eventId: string;
    readonly sequence: number;
    readonly eventType: string;
    readonly correlationId: string;
    readonly batchId: string | null;
    readonly at: string;
    /** End offset of this record in the journal — a §9 checkpoint field the SQLite index cannot supply. */
    readonly byteOffset: number;
    /** Anchor digest of this record, so a cursor stopping here can fence its next poll. */
    readonly recordDigest: string;
}

export interface PollAccepted {
    readonly schemaVersion: 1;
    readonly ok: true;
    readonly operation: 'poll-triggers';
    readonly partialTail: boolean;
    /** Offset just past the last complete record returned — the next poll's start. */
    readonly endByteOffset: number;
    /** Journal size observed for this read; an append-only journal never shrinks below it. */
    readonly journalByteLength: number;
    /** Every region the reader touched, so a caller can account for all bytes read. */
    readonly readRanges: readonly {readonly offset: number; readonly length: number}[];
    /** `false` when the window stopped on its record or byte bound with more journal left. */
    readonly exhausted: boolean;
    readonly candidates: readonly PollCandidate[];
}

export interface PollRefused {
    readonly schemaVersion: 1;
    readonly ok: false;
    readonly failure: {readonly code: PollFailureCode};
}

export type PollTriggersResult = PollAccepted | PollRefused;

export function refusedPoll(code: PollFailureCode): PollRefused {
    return {schemaVersion: 1, ok: false, failure: {code}};
}

export function isPollTriggersInput(value: unknown): value is PollTriggersInput {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const input = value as Record<string, unknown>;
    if (Object.keys(input).length !== 7) return false;
    return input.schemaVersion === 1 && input.operation === 'poll-triggers'
        && typeof input.laneDir === 'string' && input.laneDir.length > 0
        && isBoundedInteger(input.fromSequence, 0, Number.MAX_SAFE_INTEGER)
        && isBoundedInteger(input.fromByteOffset, 0, Number.MAX_SAFE_INTEGER)
        && isPollCheckpoint(input.expected)
        && isBoundedInteger(input.limit, 1, MAX_POLL_LIMIT);
}

/**
 * The lane directory must be absolute and free of traversal segments, and the
 * journal path is *derived* from it rather than accepted from the caller. A
 * task that read a caller-supplied path would be an arbitrary-file-read
 * primitive wearing a coordinator's name.
 */
export function isContainedLaneDir(laneDir: string): boolean {
    if (!laneDir.startsWith('/')) return false;
    const segments = laneDir.split('/');
    return !segments.includes('..') && !segments.includes('.') && !laneDir.includes('\0');
}

export function journalPathFor(laneDir: string): string {
    const base = laneDir.endsWith('/') ? laneDir.slice(0, -1) : laneDir;
    return `${base}/coordinator/journal/coordinator-events.jsonl`;
}

/** `null` or a complete checkpoint — never a partial one, which could not fence anything. */
function isPollCheckpoint(value: unknown): value is PollCheckpoint | null {
    if (value === null) return true;
    if (typeof value !== 'object' || Array.isArray(value)) return false;
    const checkpoint = value as Record<string, unknown>;
    if (Object.keys(checkpoint).length !== 3) return false;
    return typeof checkpoint.anchorDigest === 'string' && checkpoint.anchorDigest.length > 0
        && typeof checkpoint.lastEventId === 'string' && checkpoint.lastEventId.length > 0
        && isBoundedInteger(checkpoint.byteLength, 0, Number.MAX_SAFE_INTEGER);
}

function isBoundedInteger(value: unknown, minimum: number, maximum: number): value is number {
    return typeof value === 'number' && Number.isSafeInteger(value) && value >= minimum && value <= maximum;
}
