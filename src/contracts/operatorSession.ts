export type SessionState = 'open' | 'active-turn' | 'suspended' | 'closed' | 'archived' | 'pruned';
export type SessionOrigin = 'operator' | 'system-escalation';
export type SessionJournalEventType =
    | 'operator-session-opened' | 'operator-session-operator-message' | 'operator-session-turn-routed' | 'operator-session-response-complete'
    | 'operator-session-turn-interrupted' | 'operator-session-turn-failed' | 'operator-session-turn-cancelled-before-invocation'
    | 'operator-session-suspended' | 'operator-session-resumed' | 'operator-session-closed' | 'operator-session-archived'
    | 'operator-session-forked' | 'operator-session-pinned' | 'operator-session-compacted' | 'operator-session-budget-warning'
    | 'operator-session-budget-exceeded' | 'operator-session-budget-granted' | 'operator-session-proposal-confirmed'
    | 'operator-session-proposal-rejected' | 'operator-session-stale-response' | 'operator-session-pruned' | 'amendment-requested'
    | 'hold-placed' | 'hold-released' | 'escalation-opened';

/** Events that callers may append as metadata; lifecycle authority is internal-only. */
export type SessionMetadataEventType =
    | 'operator-session-forked' | 'operator-session-pinned' | 'operator-session-compacted'
    | 'operator-session-budget-warning' | 'operator-session-budget-exceeded' | 'operator-session-budget-granted'
    | 'operator-session-proposal-confirmed' | 'operator-session-proposal-rejected' | 'operator-session-stale-response'
    | 'amendment-requested' | 'hold-placed' | 'hold-released' | 'escalation-opened';
export type SessionLifecycleEventType =
    | 'operator-session-opened' | 'operator-session-turn-routed' | 'operator-session-response-complete'
    | 'operator-session-suspended' | 'operator-session-resumed' | 'operator-session-closed'
    | 'operator-session-archived' | 'operator-session-pruned';

export type SessionJsonValue = string | number | boolean | null | SessionJsonObject | readonly SessionJsonValue[];
export interface SessionJsonObject {[key: string]: SessionJsonValue;}
export type SessionMetadataPayload = Readonly<Record<string, SessionJsonValue>> & {
    readonly state?: never; readonly activeTurnId?: never; readonly turnCount?: never; readonly lastTurnAt?: never;
};

export interface OperatorSession {
    readonly schemaVersion: 1; readonly operatorSessionId: string; readonly laneId: string; readonly origin: SessionOrigin;
    readonly policyProfileId: string; readonly tags: readonly string[]; readonly state: SessionState; readonly activeTurnId: string | null;
    readonly topic: string; readonly createdAt: string; readonly lastTurnAt: string | null; readonly turnCount: number;
    readonly parentOperatorSessionId: string | null; readonly retentionPolicy: string; readonly budgetSegmentId: string;
    readonly pinnedRefs: readonly string[];
}
export interface CreateSessionParams {
    readonly laneId: string; readonly origin?: SessionOrigin; readonly policyProfileId: string; readonly tags?: readonly string[];
    readonly topic: string; readonly retentionPolicy?: string; readonly budgetSegmentId?: string; readonly pinnedRefs?: readonly string[];
    readonly parentOperatorSessionId?: string | null;
}
export interface SessionFilters {
    readonly state?: SessionState; readonly origin?: SessionOrigin; readonly policyProfileId?: string; readonly tags?: readonly string[];
    readonly topic?: string; readonly createdAfter?: string; readonly createdBefore?: string; readonly lastTurnAfter?: string;
    readonly lastTurnBefore?: string; readonly hasHolds?: boolean; readonly hasUnappliedProposals?: boolean; readonly limit?: number; readonly cursor?: string;
}
export interface SessionJournalEntry {
    readonly schemaVersion: 1; readonly eventId: string; readonly sequence: number; readonly type: SessionJournalEventType; readonly at: string;
    readonly laneId: string; readonly operatorSessionId: string; readonly producer: string; readonly correlationId: string;
    readonly causationId: string | null; readonly policyVersion: string; readonly payload: SessionJsonObject;
}
export interface TurnMessage {readonly content?: string; readonly contentPath?: string; readonly sha256?: string; readonly bytes?: number;}
export type TurnState = 'running' | 'complete' | 'interrupted' | 'failed' | 'cancelled';
export interface TurnRecord {
    readonly schemaVersion: 1; readonly turnId: string; readonly operatorSessionId: string; readonly turn: number; readonly state: TurnState;
    readonly operatorMessage: TurnMessage; readonly resolvedRefs: readonly string[]; readonly unresolvedRefs: readonly string[];
    readonly snapshot: SessionJsonObject; readonly decisionClass: string | null; readonly routingRuleId: string | null; readonly endpointId: string | null;
    readonly response: SessionJsonObject | null; readonly usage: SessionJsonObject; readonly stale: boolean; readonly completedAt: string | null;
}
export interface TurnFilters {readonly state?: TurnState; readonly stale?: boolean; readonly limit?: number; readonly cursor?: string;}
export interface ForkSessionParams {readonly topic?: string; readonly policyProfileId?: string; readonly tags?: readonly string[]; readonly pinnedRefs?: readonly string[]; readonly turnRefs?: readonly string[];}

export type SessionWriteStage = 'turn-stage-write' | 'turn-stage-fsync' | 'turn-journal-append' | 'turn-materialize' | 'turn-identity-write';
export interface SessionStoreOptions {
    readonly laneDir: string; readonly now?: () => string; readonly idFactory?: () => string;
    readonly faultInjector?: (stage: SessionWriteStage) => void;
}
export type JournalRecoveryStatus = 'complete' | 'recoverable-incomplete-final-line';
export interface SessionJournalReadResult {
    readonly entries: readonly SessionJournalEntry[]; readonly status: JournalRecoveryStatus; readonly nextSequence: number;
    readonly completeBytes: number;
}
export interface SessionPersistencePort {
    createSession(params: CreateSessionParams): OperatorSession;
    transitionSession(expected: OperatorSession, target: SessionState, event: SessionLifecycleEventType, reason: string): OperatorSession;
    acquireTurn(expected: OperatorSession, turnId: string, reason: string): OperatorSession;
    appendEvent(sessionId: string, type: SessionMetadataEventType, payload: SessionMetadataPayload): SessionJournalEntry;
    validateForkReferences(sessionId: string, turnRefs: readonly string[]): void;
}
export interface ValidationResult {
    readonly valid: boolean; readonly code?: 'OPERATOR_SESSION_STATE_INVALID' | 'OPERATOR_SESSION_TURN_ACTIVE'; readonly reason?: string;
}
export interface SessionLifecycleOptions {readonly store?: SessionPersistencePort; readonly now?: () => string;}
