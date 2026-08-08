/**
 * Translation between the durable cursor and one poll's boundaries (CA-13
 * correction-04 F4; `docs/spec/v1-contracts.md` §9).
 *
 * A poll has two boundaries and they are not the same value. Going *in*, it
 * presents the fence for the position the cursor already holds, so a source that
 * can see journal bytes may refuse a journal that no longer presents it. Coming
 * *out*, it checkpoints to wherever handling actually stopped — often mid-page —
 * which is why each candidate carries its own anchor digest rather than the page
 * carrying one: a single page-level digest would only ever be valid for a cursor
 * that consumed the whole page.
 *
 * Split out of `WatcherPoller` so that owner sequences §14 steps 1–5 and 10 and
 * this one answers what a boundary *is*. Both functions are pure.
 */
import type {CoordinatorCursorDocument, TriggerCandidate} from '../../../../contracts/coordinatorReplay.js';
import type {CursorTarget} from './CursorManager.js';
import type {ScanCheckpoint} from './queuePorts.js';

/**
 * The fence a poll presents for the position the cursor durably holds.
 *
 * `null` for a cursor that has never advanced: there is no prior record to
 * anchor to, and nothing consumed yet to protect. A cursor that advanced through
 * a source which cannot supply a digest — the SQLite index, which addresses
 * events by sequence and never sees journal bytes — also yields `null` rather
 * than a fabricated anchor.
 */
export function scanFenceOf(cursor: CoordinatorCursorDocument): ScanCheckpoint | null {
    if (cursor.lastProcessedEventId === null || cursor.prefixDigest === null) return null;
    return {
        anchorDigest: cursor.prefixDigest, lastEventId: cursor.lastProcessedEventId,
        byteLength: cursor.journalByteLength
    };
}

/**
 * The ordered positions a checkpoint moves the cursor across. Each carries the
 * anchor for its own record, so the position the cursor lands on always has the
 * digest that fences the next poll from exactly there.
 */
export function checkpointTargets(
    settled: readonly TriggerCandidate[], journalByteLength: number | null
): readonly CursorTarget[] {
    return settled.map((candidate) => ({
        eventId: candidate.eventId, sequence: candidate.sequence, byteOffset: candidate.byteOffset,
        prefixDigest: candidate.prefixDigest, journalIdentity: candidate.journalIdentity,
        journalByteLength: journalByteLength ?? undefined
    }));
}
