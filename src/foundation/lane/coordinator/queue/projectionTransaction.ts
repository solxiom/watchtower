/**
 * The one mutation shape `coordinator/queue.json` and `coordinator/cursor.json`
 * are allowed to change through (CA-13 correction-03 F2/F3).
 *
 * Both projections are whole-file rewrites read once at construction and kept in
 * memory. That is fine for reading and fatal for writing: two coordinator
 * instances — two processes, or one process restarted while another still runs —
 * each hold a snapshot from their own startup, and a writer that commits its
 * snapshot plus one change silently discards every change the other made since.
 *
 * Every mutation therefore runs as: take the lane lock, **re-read the persisted
 * projection**, decide against those bytes, compare-and-swap on
 * `projectionRevision`, write, adopt. The lock is what makes the read-decide-
 * write indivisible across processes; the revision check is what still catches a
 * lost update if a lock record is ever reclaimed or bypassed. Neither alone is
 * sufficient, so this owner requires both.
 *
 * The decision function is pure and synchronous: it receives the fresh document
 * and returns the successor plus the caller's result, or `null` to commit
 * nothing. A refusal that writes no bytes is expressed as `next: null`, which is
 * why "the projection is unchanged after a refusal" is structural here rather
 * than a property each caller has to remember.
 */
import {CoordinatorQueueError} from '../../../../contracts/coordinatorQueue.js';
import type {LaneMutationLock} from './laneMutationLock.js';

/** A projection that carries the compare-and-swap token. */
export interface RevisionedProjection {
    readonly projectionRevision: number;
}

export interface ProjectionDecision<TDocument, TResult> {
    /** The successor to persist, or `null` to leave the durable bytes untouched. */
    readonly next: TDocument | null;
    readonly result: TResult;
}

export interface ProjectionTransactionOptions<TDocument extends RevisionedProjection> {
    readonly lock: LaneMutationLock;
    /** Re-read the authoritative bytes. Called inside the lock, never cached. */
    readonly read: () => TDocument;
    readonly write: (document: TDocument) => void;
    /** The typed reason a lost update is reported under. */
    readonly staleReason: 'QUEUE_STATE_STALE' | 'CURSOR_STALE';
    readonly subject: string;
}

/**
 * Runs `decide` against freshly read bytes with the lane held, then commits at
 * `revision + 1`.
 *
 * `base` is the caller's in-memory snapshot. It is passed only so the
 * compare-and-swap can detect that the persisted revision moved *backwards*
 * relative to it — a truncated, restored, or foreign projection — which is a
 * refusal rather than a rewind. A persisted revision that moved *forwards* is
 * normal concurrency and is simply what `decide` now sees.
 */
export function commitProjection<TDocument extends RevisionedProjection, TResult>(
    options: ProjectionTransactionOptions<TDocument>,
    base: TDocument,
    decide: (current: TDocument) => ProjectionDecision<TDocument, TResult>
): {readonly document: TDocument; readonly result: TResult} {
    return options.lock.withLaneLock(() => {
        const current = options.read();
        if (current.projectionRevision < base.projectionRevision) {
            throw new CoordinatorQueueError(options.staleReason, options.subject,
                `The persisted projection is at revision ${current.projectionRevision}, behind the loaded revision ${base.projectionRevision}.`);
        }
        const decision = decide(current);
        if (decision.next === null) return {document: current, result: decision.result};
        const next = {...decision.next, projectionRevision: current.projectionRevision + 1};
        options.write(next);
        return {document: next, result: decision.result};
    });
}
