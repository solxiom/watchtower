/**
 * The one mutation shape `coordinator/holds/holds.json` is allowed to change
 * through — the same lock/re-read/compare-and-swap/write shape
 * `projectionTransaction.ts` fixes for `queue.json`/`cursor.json` (CA-13
 * correction-03 F2/F3), reproduced here under this capsule's own error type so
 * CA-27 does not widen CA-13's closed `CoordinatorQueueReason` vocabulary for
 * an unrelated projection.
 */
import {ScopedHoldError, type ScopedHoldDocument} from './holdContracts.js';
import {readHoldDocument, writeHoldDocument} from './holdPersistence.js';
import type {LaneMutationLock} from '../queue/laneMutationLock.js';
import type {QueueFileSystem} from '../queue/queuePorts.js';

export interface HoldDecision<T> {
    /** The successor to persist, or `null` to leave the durable bytes untouched. */
    readonly next: ScopedHoldDocument | null;
    readonly result: T;
}

export interface HoldTransactionOptions {
    readonly laneDir: string;
    readonly laneId: string;
    readonly files: QueueFileSystem;
    readonly lock: LaneMutationLock;
    readonly subject: string;
}

export function commitHoldDocument<T>(
    options: HoldTransactionOptions, base: ScopedHoldDocument, decide: (current: ScopedHoldDocument) => HoldDecision<T>
): {readonly document: ScopedHoldDocument; readonly result: T} {
    return options.lock.withLaneLock(() => {
        const current = readHoldDocument(options.laneDir, options.laneId, options.files);
        if (current.projectionRevision < base.projectionRevision) {
            throw new ScopedHoldError('HOLD_STATE_STALE', options.subject,
                `The persisted holds projection is at revision ${current.projectionRevision}, behind the loaded revision ${base.projectionRevision}.`);
        }
        const decision = decide(current);
        if (decision.next === null) return {document: current, result: decision.result};
        const next = {...decision.next, projectionRevision: current.projectionRevision + 1};
        writeHoldDocument(options.laneDir, next, options.files);
        return {document: next, result: decision.result};
    });
}
