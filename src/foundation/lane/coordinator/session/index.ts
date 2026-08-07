/** Public operator-session persistence/lifecycle capsule. */
export {SessionLifecycle, OperatorSessionError} from './SessionLifecycle.js';
export {SessionStore} from './SessionStore.js';
// The accepted operator-session validators are this capsule's contract of
// record for its own durable bytes. Sibling capsules that consume the journal
// (CA-16's derived session index) validate through them rather than
// transcribing the envelope, so there is exactly one producer-format authority.
export {isTurnRecord, parseSession, SESSION_ID} from './sessionValidation.js';
export {jsonDocumentText, readJournalFile} from './sessionPersistence.js';
export type {
    CreateSessionParams, ForkSessionParams, OperatorSession, SessionFilters, SessionJournalEntry, SessionJsonObject, SessionJsonValue,
    SessionJournalEventType, SessionLifecycleEventType, SessionMetadataEventType, SessionMetadataPayload, SessionOrigin, SessionState, SessionStoreOptions, SessionJournalReadResult, SessionPersistencePort,
    SessionLifecycleOptions, TurnFilters, TurnMessage, TurnRecord, TurnState, ValidationResult
} from '../../../../contracts/operatorSession.js';
export type {OperatorSessionErrorCode} from './SessionLifecycle.js';
