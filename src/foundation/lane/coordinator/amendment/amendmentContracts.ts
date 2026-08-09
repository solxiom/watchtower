/**
 * Durable contracts for CA-27's amendment-request lifecycle
 * (`docs/spec/coordinator-automation.md` §11.2/§17 `coordinator/amendment-requests/`
 * "confirmed handoff evidence", `docs/spec/specification-resolution.md` §6-§7).
 *
 * `AcceptedAmendmentRecord` and `AdmittedRevisionState`
 * (`../../proposal/proposalValidatorContracts.ts`) are the accepted CA-09
 * `ProposalValidator`'s read shapes for `admit-pack-amendment`'s authority/
 * independence/seal check (`checkSpecResolutionAuthority`) and CA-09's resume
 * precondition. This module is the durable store those two projections are
 * built from, and — because both already live outside `src/contracts/` as
 * capsule-local validator-input shapes rather than wire contracts — this
 * capsule's own persisted-document types stay foundation-local alongside them
 * instead of introducing a `src/contracts/` dependency in the other direction.
 */
import type {
    AcceptedAmendmentRecord, AdmittedRevisionState
} from '../../../proposal/proposalValidatorContracts.js';

export const AMENDMENT_REASONS = [
    'AMENDMENT_PACK_ID_REQUIRED',
    'AMENDMENT_REASON_REQUIRED',
    'AMENDMENT_NOT_FOUND',
    'AMENDMENT_ALREADY_ACCEPTED',
    'AMENDMENT_INDEPENDENCE_VIOLATION',
    'AMENDMENT_NOT_ACCEPTED',
    'AMENDMENT_ALREADY_ADMITTED',
    'AMENDMENT_STATE_UNREADABLE',
    'AMENDMENT_STATE_WRITE_FAILED',
    'AMENDMENT_STATE_STALE'
] as const;
export type AmendmentReason = typeof AMENDMENT_REASONS[number];

export class AmendmentError extends Error {
    constructor(readonly reason: AmendmentReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'AmendmentError';
    }
}

export type AmendmentRequestStatus = 'pending' | 'accepted' | 'admitted';

/** `effect.createAmendmentRequest`'s durable handoff record — never a pack edit. */
export interface AmendmentRequestRecord {
    readonly amendmentRequestId: string;
    readonly packId: string;
    readonly reason: string;
    readonly requestedAt: string;
    readonly status: AmendmentRequestStatus;
}

/** `coordinator/amendment-requests/amendment-requests.json` — a whole-file projection. */
export interface AmendmentRequestDocument {
    readonly schemaVersion: 1;
    readonly laneId: string;
    readonly requests: readonly AmendmentRequestRecord[];
    /** Independently-reviewed acceptance records, keyed by `amendmentRequestId` — `ValidationContext.acceptedAmendments`'s source. */
    readonly accepted: Readonly<Record<string, AcceptedAmendmentRecord>>;
    /** Admitted pack revisions, keyed by `blockerId` — `ValidationContext.admittedRevisions`'s source. */
    readonly admitted: Readonly<Record<string, AdmittedRevisionState>>;
    readonly projectionRevision: number;
}

export function emptyAmendmentDocument(laneId: string): AmendmentRequestDocument {
    return Object.freeze({
        schemaVersion: 1 as const, laneId, requests: Object.freeze([]),
        accepted: Object.freeze({}), admitted: Object.freeze({}), projectionRevision: 0
    });
}

export type {AcceptedAmendmentRecord, AdmittedRevisionState};
