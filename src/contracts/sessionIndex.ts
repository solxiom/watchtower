/**
 * Closed contracts for the CA-16 session SQLite index (session memory
 * foundation): the bounded typed records the `session-index-v2` registry rows
 * project into, the section 9.4 result envelope, the cross-session reference
 * capsule, compaction options/results, and the closed fail-closed reason
 * vocabulary. Normative contract of record: `docs/spec/schemas/session-index-v2/`.
 * The enum arrays mirror enums.json so the foundation validates predecessor
 * bytes against one source; the union types are exported for CA-17/CA-20/CA-24.
 */

export const SESSION_INDEX_REASONS = [
    'SESSION_INDEX_MISSING', 'SESSION_INDEX_STALE', 'SESSION_INDEX_CORRUPT',
    'SESSION_INDEX_BUILD_FAILED', 'SESSION_INDEX_STORE_UNAVAILABLE', 'SESSION_INDEX_STORE_BUSY',
    'SESSION_INDEX_SCHEMA_MISMATCH', 'SESSION_SOURCE_INVALID', 'SESSION_NOT_FOUND',
    'TURN_NOT_FOUND', 'PROPOSAL_NOT_FOUND', 'OPERATOR_SESSION_REFERENCE_DENIED',
    'OPERATOR_SESSION_CONTENT_PRUNED', 'QUERY_LIMIT_INVALID', 'QUERY_CURSOR_INVALID'
] as const;

export type SessionIndexReason = typeof SESSION_INDEX_REASONS[number];

/** Every refusal the session-index facade raises; consumers branch on `reason`, never message text. */
export class SessionIndexError extends Error {
    constructor(readonly reason: SessionIndexReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'SessionIndexError';
    }
}

export const SESSION_ORIGINS = ['operator', 'system-escalation'] as const;
export const SESSION_LIFECYCLE_STATES = ['open', 'active-turn', 'suspended', 'closed', 'archived', 'pruned'] as const;
export const SESSION_TURN_STATES = ['running', 'complete', 'interrupted', 'failed', 'cancelled'] as const;
export const SESSION_DECISION_CLASSES = ['M0', 'D1', 'D2', 'D3'] as const;
export const SESSION_REF_TYPES = ['batch', 'event', 'requirement', 'finding', 'turn', 'artifact'] as const;
export const SESSION_TELEMETRY_QUALITIES = ['reported', 'estimated', 'unavailable'] as const;
export const SESSION_PROPOSAL_TYPES = [
    'hold-place', 'hold-release', 'dispatch-pause', 'dispatch-resume', 'candidate-select',
    'routing-override', 'budget-override', 'amendment-request', 'correction-supersede', 'escalation-close'
] as const;
export const SESSION_PROPOSAL_STATES = [
    'proposed', 'operator-confirmed', 'revalidated', 'rejected-stale-or-illegal', 'effect-prepared',
    'effect-verified', 'effect-uncertain', 'operator-rejected', 'expired'
] as const;
export const SESSION_CAPSULE_OMISSIONS = ['operator-message', 'full-answer', 'transitive-references', 'pruned-content'] as const;

export type SessionOrigin = typeof SESSION_ORIGINS[number];
export type SessionLifecycleState = typeof SESSION_LIFECYCLE_STATES[number];
export type SessionTurnState = typeof SESSION_TURN_STATES[number];
export type SessionDecisionClass = typeof SESSION_DECISION_CLASSES[number];
export type SessionRefType = typeof SESSION_REF_TYPES[number];
export type SessionTelemetryQuality = typeof SESSION_TELEMETRY_QUALITIES[number];
export type SessionProposalType = typeof SESSION_PROPOSAL_TYPES[number];
export type SessionProposalState = typeof SESSION_PROPOSAL_STATES[number];
export type SessionCapsuleOmission = typeof SESSION_CAPSULE_OMISSIONS[number];

/** One operator_sessions row, projected to the typed bounded record. */
export interface SessionIndexRecord {
    readonly operatorSessionId: string;
    readonly laneId: string;
    readonly origin: SessionOrigin;
    readonly policyProfileId: string;
    readonly state: SessionLifecycleState;
    readonly topic: string;
    readonly createdAt: string;
    readonly lastTurnAt: string | null;
    readonly turnCount: number;
    readonly parentOperatorSessionId: string | null;
    readonly budgetSegmentId: string;
    readonly journalCheckpoint: string;
    readonly contentRoot: string;
}

/** One turns row. Excerpts are capped; exact text stays journal-owned. */
export interface TurnIndexRecord {
    readonly turnId: string;
    readonly operatorSessionId: string;
    readonly turnNumber: number;
    readonly state: SessionTurnState;
    readonly decisionClass: SessionDecisionClass | null;
    readonly routingRuleId: string | null;
    readonly endpointId: string | null;
    readonly snapshotRevision: number | null;
    readonly stale: boolean;
    readonly completedAt: string | null;
    readonly contentExcerpt: string;
    readonly answerExcerpt: string;
    readonly inputTokens: number | null;
    readonly outputTokens: number | null;
    readonly telemetryQuality: SessionTelemetryQuality;
    readonly operatorBytes: number;
    readonly coordinatorBytes: number;
}

/** A single stored excerpt with its original byte length and derived incompleteness. */
export interface TurnExcerpt {
    readonly which: 'operator' | 'coordinator';
    readonly excerpt: string;
    readonly originalBytes: number;
    readonly excerptBytes: number;
    readonly incomplete: boolean;
}

export interface PinRecord {
    readonly operatorSessionId: string;
    readonly refType: SessionRefType;
    readonly refValue: string;
    readonly pinnedAt: string;
}

export interface ProposalRecord {
    readonly proposalId: string;
    readonly operatorSessionId: string;
    readonly sourceTurnId: string;
    readonly proposalType: SessionProposalType;
    readonly state: SessionProposalState;
    readonly createdAt: string;
    readonly expiresAt: string;
}

export interface OpenQuestionRecord {
    readonly turnId: string;
    readonly questionIndex: number;
    readonly questionText: string;
}

export interface TurnRefRecord {
    readonly turnId: string;
    readonly refType: SessionRefType;
    readonly refValue: string;
}

/** A named, never-expanded evidence reference inside a capsule (non-transitive). */
export interface CapsuleEvidenceRef {
    readonly refType: SessionRefType;
    readonly refValue: string;
    readonly stale: boolean;
}

/** A proposal named by ID and type only inside a capsule. */
export interface CapsuleProposalRef {
    readonly proposalId: string;
    readonly proposalType: string;
}

/** The bounded, non-transitive cross-session turn reference capsule (operator-session.md 10.2). */
export interface ReferenceCapsule {
    readonly capsuleVersion: 'session-index-capsule/2';
    readonly sourceOperatorSessionId: string;
    readonly sourceTurnId: string;
    readonly turnNumber: number;
    readonly laneId: string;
    readonly completedAt: string;
    readonly decisionClass: SessionDecisionClass;
    readonly routingRuleId?: string;
    readonly snapshotRevision: number;
    readonly stale: boolean;
    readonly evidenceRefs: readonly CapsuleEvidenceRef[];
    readonly openQuestions: readonly string[];
    readonly proposals: readonly CapsuleProposalRef[];
    readonly answerExcerpt: string;
    readonly answerExcerptBytes: number;
    readonly answerBytes: number;
    readonly answerDigest: string;
    readonly incomplete: boolean;
    readonly omitted: readonly SessionCapsuleOmission[];
    readonly prunedContent?: boolean;
}

/** Store identity carried on every result so a caller can prove which index answered. */
export interface SessionProvenance {
    readonly semanticRoot: string;
    readonly databaseSchemaVersion: number;
    readonly compilerVersion: string;
    readonly checkpoint: string;
}

/** The closed section 9.4 page envelope every bounded list query returns. */
export interface SessionQueryPage<T> {
    readonly items: readonly T[];
    readonly truncated: boolean;
    readonly maxRecords: number;
    readonly maxBytes: number;
    readonly returnedBytes: number;
    readonly nextCursor: string | null;
    readonly provenance: SessionProvenance;
}

export interface SessionFilters {
    readonly state?: SessionLifecycleState;
    readonly origin?: SessionOrigin;
    readonly parentOperatorSessionId?: string;
}

export interface TurnFilters {
    readonly state?: SessionTurnState;
    readonly decisionClass?: SessionDecisionClass;
    readonly stale?: boolean;
}

export interface ProposalFilters {
    readonly state?: SessionProposalState;
    readonly proposalType?: SessionProposalType;
}

/** Compaction retention policy; every dimension is finite and explicit. */
export interface CompactOptions {
    readonly keepRecentTurns: number;
    readonly keepRecentDays: number;
    readonly keepPinnedOnly: boolean;
    readonly keepProposalSourceTurns: boolean;
}

export interface CompactResult {
    readonly turnsRemoved: number;
    readonly turnsKept: number;
    readonly bytesFreed: number;
}

export interface CompactPreview {
    readonly removeTurnIds: readonly string[];
    readonly keepTurnIds: readonly string[];
    readonly turnsRemoved: number;
    readonly turnsKept: number;
}

/** Result of a full deterministic index build. */
export interface SessionBuildResult {
    readonly sessions: number;
    readonly turns: number;
    readonly pins: number;
    readonly proposals: number;
    readonly semanticRoot: string;
    readonly builtAt: string;
}

/** Result of an incremental single-session update. */
export interface SessionUpdateResult {
    readonly operatorSessionId: string;
    readonly turnsIndexed: number;
    readonly semanticRoot: string;
}
