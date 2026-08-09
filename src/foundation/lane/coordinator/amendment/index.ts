/**
 * Public capsule surface for CA-27's amendment-request lifecycle.
 * `AmendmentRequestStore` is the sole durable owner of
 * `coordinator/amendment-requests/`; `AmendmentAdmissionService` is the sole
 * caller of `activatePackRevision` for an `admit-pack-amendment` effect.
 */
export {AmendmentRequestStore} from './AmendmentRequestStore.js';
export type {AmendmentRequestStoreOptions} from './AmendmentRequestStore.js';
export {AmendmentAdmissionService} from './AmendmentAdmissionService.js';
export type {AdmissionRequest, AmendmentAdmissionServiceOptions} from './AmendmentAdmissionService.js';
export {assertAdmissionAuthority} from './amendmentAuthority.js';
export type {AdmissionAuthorityContext} from './amendmentAuthority.js';
export {runAmendmentEffectTask} from './amendmentEffectTask.js';
export type {
    AdmitAmendmentTaskInput, AdmitAmendmentTaskResult, AmendmentTaskInput, AmendmentTaskResult,
    CreateAmendmentRequestTaskInput, CreateAmendmentRequestTaskResult
} from './amendmentEffectTask.js';
export {
    AMENDMENT_REASONS, AmendmentError, emptyAmendmentDocument
} from './amendmentContracts.js';
export type {
    AcceptedAmendmentRecord, AdmittedRevisionState, AmendmentReason, AmendmentRequestDocument,
    AmendmentRequestRecord, AmendmentRequestStatus
} from './amendmentContracts.js';
export {
    amendmentRequestsDir, amendmentRequestsPath, readAmendmentDocument, writeAmendmentDocument
} from './amendmentPersistence.js';
export {commitAmendmentDocument} from './amendmentTransaction.js';
export type {AmendmentDecision, AmendmentTransactionOptions} from './amendmentTransaction.js';
export {nodeAmendmentIdFactory} from './amendmentIdFactory.js';
export type {AmendmentIdFactory} from './amendmentIdFactory.js';
