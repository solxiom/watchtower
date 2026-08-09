/** Public surface of the session-proposal lifecycle and effect bridge (CA-26). */
export {SessionProposalService} from './SessionProposalService.js';
export type {
    ApplySessionProposalRequest, RecordSessionProposalRequest, SessionProposalRef, SessionProposalServiceDeps
} from './sessionProposalServiceContracts.js';
export {loadShapedProposal, SessionProposalStore} from './SessionProposalStore.js';
export type {SessionProposalRead} from './SessionProposalStore.js';
export {computeConfirmationBinding, confirmationFor} from './sessionProposalBinding.js';
export type {ConfirmationBinding, ConfirmationBindingInput} from './sessionProposalBinding.js';
// The durable-document validators are this capsule's contract of record for its
// own bytes. CA-16R's session index projects the same files and validates
// through its own accepted source reader, so neither side transcribes the other.
export {
    isEffectBearingCategory, isSessionConfirmableType, parseSessionProposalDocument, requiredCoordinatorType,
    SessionProposalDocumentError, withPublication
} from './sessionProposalDocument.js';
export {APPLY_ENTRY_STATE, canTransition, isTerminalState, nextStates} from './sessionProposalStates.js';
export {settledEffectOf, settledOutcome} from './sessionProposalOutcome.js';
export {isRetryableEffectReason, isSessionProposalRefusal, sessionReasonFor} from './sessionProposalRefusals.js';
export {SessionProposalRecorder} from './sessionProposalRecorder.js';
export {buildEffectRequest, candidateDocument, candidateFor, effectRequestFor} from './sessionProposalRequests.js';
export type {ApplyRequestFields, CandidateDocumentInput, EffectRequestInput} from './sessionProposalRequests.js';
export type {
    SessionProposalClock, SessionProposalEffectPort, SessionProposalJournalPort, SessionProposalStatePort,
    SessionProposalValidatorPort
} from './sessionProposalPorts.js';
