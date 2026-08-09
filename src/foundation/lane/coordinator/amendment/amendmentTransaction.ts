/**
 * The one mutation shape `coordinator/amendment-requests/amendment-requests.json`
 * is allowed to change through — the same lock/re-read/compare-and-swap/write
 * shape as `holdTransaction.ts`, reproduced under this capsule's own error
 * type for the same reason: this projection is unrelated to CA-13's closed
 * `CoordinatorQueueReason` vocabulary.
 */
import {AmendmentError, type AmendmentRequestDocument} from './amendmentContracts.js';
import {readAmendmentDocument, writeAmendmentDocument} from './amendmentPersistence.js';
import type {LaneMutationLock} from '../queue/laneMutationLock.js';
import type {QueueFileSystem} from '../queue/queuePorts.js';

export interface AmendmentDecision<T> {
    readonly next: AmendmentRequestDocument | null;
    readonly result: T;
}

export interface AmendmentTransactionOptions {
    readonly laneDir: string;
    readonly laneId: string;
    readonly files: QueueFileSystem;
    readonly lock: LaneMutationLock;
    readonly subject: string;
}

export function commitAmendmentDocument<T>(
    options: AmendmentTransactionOptions, base: AmendmentRequestDocument,
    decide: (current: AmendmentRequestDocument) => AmendmentDecision<T>
): {readonly document: AmendmentRequestDocument; readonly result: T} {
    return options.lock.withLaneLock(() => {
        const current = readAmendmentDocument(options.laneDir, options.laneId, options.files);
        if (current.projectionRevision < base.projectionRevision) {
            throw new AmendmentError('AMENDMENT_STATE_STALE', options.subject,
                `The persisted amendment-request projection is at revision ${current.projectionRevision}, behind the loaded revision ${base.projectionRevision}.`);
        }
        const decision = decide(current);
        if (decision.next === null) return {document: current, result: decision.result};
        const next = {...decision.next, projectionRevision: current.projectionRevision + 1};
        writeAmendmentDocument(options.laneDir, next, options.files);
        return {document: next, result: decision.result};
    });
}
