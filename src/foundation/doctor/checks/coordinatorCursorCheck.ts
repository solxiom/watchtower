import type {CoordinatorCursorDocument} from '../../../contracts/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip, warn} from '../DoctorCheckResult.js';
import {DoctorCoordinatorProjectionSource, type ProjectionRead} from './coordinatorProjectionSource.js';

const ID = 'coordinator-cursor' as const;

export interface CoordinatorCursorCheckOptions {
    readonly projections?: DoctorCoordinatorProjectionSource;
}

/**
 * Reports whether the CA-13 watcher cursor (`coordinator/cursor.json`) is
 * still a truthful description of how far this lane has durably got.
 *
 * The cursor is only meaningful relative to the append-only journal it
 * addresses, so this provider compares the recorded state against the
 * journal's observed size — never against a re-parse of journal records, which
 * remains the CA-03 index's single ownership.
 *
 * The durable checkpoint is `journalByteLength`, not `lastByteOffset`. The two
 * are different facts: `lastByteOffset` is how far the cursor has *consumed*,
 * while `journalByteLength` is how long the journal *was* when that advance was
 * recorded, and CA-13's contract states an append-only journal never shrinks
 * below it (`coordinatorReplay.ts`). Comparing only against the anchor would
 * classify a journal that was rewritten down to somewhere between the two as
 * ordinary lag, so the shrink test is against the checkpoint and subsumes the
 * anchor (`firstContradiction` has already refused a cursor whose anchor is
 * past its own checkpoint). Below the checkpoint is the rewrite CA-13 refuses
 * to read past, and is `fail`; a missing journal under a cursor claiming
 * progress is likewise `fail`. Unconsumed tail bytes at or above the
 * checkpoint are ordinary lag and `warn`, so a merely-behind watcher never
 * produces the corruption exit family.
 */
export function createCoordinatorCursorCheck(options: CoordinatorCursorCheckOptions = {}): DoctorCheckProvider {
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const projections = options.projections ?? new DoctorCoordinatorProjectionSource(context.fileSystem);
            const read = projections.cursor(context.lane.laneDir, context.lane.laneId);
            return reportCursor(read, () => projections.journalByteLength(context.lane.laneDir));
        }
    };
}

export const coordinatorCursorCheck: DoctorCheckProvider = createCoordinatorCursorCheck();

function reportCursor(read: ProjectionRead<CoordinatorCursorDocument>, journalBytes: () => number | null) {
    if (read.kind === 'absent') {
        return skip(ID, 'No coordinator cursor projection (coordinator/cursor.json) exists; this lane has not consumed a durable event.');
    }
    if (read.kind === 'invalid') {
        return fail(ID, `The coordinator cursor projection is present but invalid (${read.error.reason}): ${read.error.message}`,
            'ERR_INTEGRITY_FAILURE');
    }
    const document = read.document;
    const contradiction = firstContradiction(document);
    if (contradiction !== null) return fail(ID, contradiction, 'ERR_INTEGRITY_FAILURE');
    return reportAgainstJournal(document, journalBytes());
}

/** Self-contradictions inside the cursor record itself, before the journal is observed at all. */
function firstContradiction(document: CoordinatorCursorDocument): string | null {
    const anchored = document.lastProcessedEventId !== null;
    if (anchored !== (document.journalIdentity !== null)) {
        return 'The coordinator cursor names a processed event without a journal identity, or a journal identity without a processed event.';
    }
    if (anchored !== (document.prefixDigest !== null)) {
        return 'The coordinator cursor names a processed event without an anchor prefix digest, or an anchor digest without a processed event.';
    }
    if (anchored && document.lastProcessedSequence < 0) {
        return `The coordinator cursor claims processed event ${document.lastProcessedEventId} at sequence ${document.lastProcessedSequence}, which is not a durable sequence.`;
    }
    if (!anchored && (document.lastByteOffset !== 0 || document.journalByteLength !== 0)) {
        return 'The coordinator cursor has processed no event yet still records a non-zero journal offset or length.';
    }
    if (document.lastByteOffset > document.journalByteLength) {
        return `The coordinator cursor anchor offset ${document.lastByteOffset} is past the journal length ${document.journalByteLength} it was recorded against.`;
    }
    return null;
}

function reportAgainstJournal(document: CoordinatorCursorDocument, observed: number | null) {
    if (document.lastProcessedEventId === null) {
        return pass(ID, 'The coordinator cursor is at its initial state; no durable event has been consumed yet.');
    }
    if (observed === null) {
        return fail(ID, `The coordinator cursor claims durable progress to event ${document.lastProcessedEventId}, but the coordinator journal it addresses is absent.`,
            'ERR_INTEGRITY_FAILURE');
    }
    if (observed < document.journalByteLength) {
        return fail(ID, `The coordinator journal is ${observed} bytes, shorter than the ${document.journalByteLength}-byte length recorded at the last cursor advance (anchor offset ${
            document.lastByteOffset}); the append-only journal was truncated or rewritten.`,
            'ERR_INTEGRITY_FAILURE');
    }
    if (observed > document.lastByteOffset) {
        return warn(ID, `The coordinator cursor is behind the journal: ${observed - document.lastByteOffset} byte(s) after the anchor at sequence ${
            document.lastProcessedSequence} have not been consumed yet.`);
    }
    return pass(ID, `The coordinator cursor is consistent with the journal at sequence ${document.lastProcessedSequence} (event ${document.lastProcessedEventId}).`);
}
