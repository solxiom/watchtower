import type {CreateSessionParams, OperatorSession, SessionJournalEntry, SessionJournalEventType, SessionJsonObject, SessionJsonValue, SessionState, TurnRecord} from '../../../../contracts/operatorSession.js';

export const SESSION_ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
export const MAX_PAGE_SIZE = 100;
const EVENT_TYPES = new Set<SessionJournalEventType>([
    'operator-session-opened', 'operator-session-operator-message', 'operator-session-turn-routed', 'operator-session-response-complete',
    'operator-session-turn-interrupted', 'operator-session-turn-failed', 'operator-session-turn-cancelled-before-invocation',
    'operator-session-suspended', 'operator-session-resumed', 'operator-session-closed', 'operator-session-archived', 'operator-session-forked',
    'operator-session-pinned', 'operator-session-compacted', 'operator-session-budget-warning', 'operator-session-budget-exceeded',
    'operator-session-budget-granted', 'operator-session-proposal-confirmed', 'operator-session-proposal-rejected', 'operator-session-stale-response',
    'operator-session-pruned', 'amendment-requested', 'hold-placed', 'hold-released', 'escalation-opened'
]);
const IDENTITY_KEYS = ['activeTurnId', 'budgetSegmentId', 'createdAt', 'laneId', 'lastTurnAt', 'operatorSessionId', 'origin', 'parentOperatorSessionId', 'pinnedRefs', 'policyProfileId', 'retentionPolicy', 'schemaVersion', 'state', 'tags', 'topic', 'turnCount'];
const JOURNAL_KEYS = ['at', 'causationId', 'correlationId', 'eventId', 'laneId', 'operatorSessionId', 'payload', 'policyVersion', 'producer', 'schemaVersion', 'sequence', 'type'];
const LIFECYCLE_EVENTS = new Set<SessionJournalEventType>([
    'operator-session-opened', 'operator-session-turn-routed', 'operator-session-response-complete',
    'operator-session-suspended', 'operator-session-resumed', 'operator-session-closed',
    'operator-session-archived', 'operator-session-pruned'
]);

export function parseSession(text: string): OperatorSession {
    const value: unknown = JSON.parse(text);
    if (!isRecord(value) || !sameKeys(value, IDENTITY_KEYS) || !isSessionValue(value)) throw new Error('invalid operator-session.json');
    return Object.freeze({...value, tags: [...value.tags], pinnedRefs: [...value.pinnedRefs]}) as OperatorSession;
}

export function isSessionValue(value: Record<string, unknown>): value is Record<string, unknown> & OperatorSession {
    const turnCount = value.turnCount;
    return value.schemaVersion === 1 && SESSION_ID.test(asString(value.operatorSessionId)) && typeof value.laneId === 'string'
        && (value.origin === 'operator' || value.origin === 'system-escalation') && typeof value.policyProfileId === 'string'
        && Array.isArray(value.tags) && value.tags.every(item => typeof item === 'string') && isState(value.state)
        && (value.activeTurnId === null || SESSION_ID.test(asString(value.activeTurnId))) && typeof value.topic === 'string' && isDate(value.createdAt)
        && (value.lastTurnAt === null || isDate(value.lastTurnAt)) && typeof turnCount === 'number' && Number.isSafeInteger(turnCount) && turnCount >= 0
        && (value.parentOperatorSessionId === null || SESSION_ID.test(asString(value.parentOperatorSessionId)))
        && typeof value.retentionPolicy === 'string' && typeof value.budgetSegmentId === 'string'
        && Array.isArray(value.pinnedRefs) && value.pinnedRefs.every(item => typeof item === 'string');
}

export function validateCreateParams(params: CreateSessionParams): void {
    if (!isRecord(params) || typeof params.laneId !== 'string' || typeof params.policyProfileId !== 'string' || typeof params.topic !== 'string'
        || (params.origin !== undefined && params.origin !== 'operator' && params.origin !== 'system-escalation') || !isStringArray(params.tags) || !isStringArray(params.pinnedRefs)) {
        throw new Error('invalid session creation parameters');
    }
}

export function parseJournal(line: string, sessionId: string, lineNumber: number): SessionJournalEntry {
    const value: unknown = JSON.parse(line);
    if (!isRecord(value) || !isJournalValue(value) || value.operatorSessionId !== sessionId) throw new Error(`invalid journal line ${lineNumber}`);
    return value as unknown as SessionJournalEntry;
}

export function isJournalValue(value: unknown): value is Record<string, unknown> & SessionJournalEntry {
    if (!isRecord(value)) return false;
    const sequence = value.sequence;
    return sameKeys(value, JOURNAL_KEYS) && value.schemaVersion === 1 && SESSION_ID.test(asString(value.eventId))
        && typeof sequence === 'number' && Number.isSafeInteger(sequence) && sequence > 0 && EVENT_TYPES.has(value.type as SessionJournalEventType) && isDate(value.at)
        && typeof value.laneId === 'string' && SESSION_ID.test(asString(value.operatorSessionId)) && typeof value.producer === 'string'
        && SESSION_ID.test(asString(value.correlationId)) && (value.causationId === null || SESSION_ID.test(asString(value.causationId)))
        && typeof value.policyVersion === 'string' && isJsonObject(value.payload);
}

export function isLifecycleEvent(type: SessionJournalEventType): boolean { return LIFECYCLE_EVENTS.has(type); }

export function isLegalTransition(from: SessionState, to: SessionState): boolean {
    if (from === to) return to === 'open';
    const allowed: Readonly<Record<SessionState, readonly SessionState[]>> = {
        open: ['active-turn', 'suspended', 'closed'], 'active-turn': ['open'], suspended: ['open', 'closed'],
        closed: ['archived'], archived: ['pruned'], pruned: []
    };
    return allowed[from].includes(to);
}

export function hasLifecycleAuthority(value: SessionJsonObject): boolean {
    return Object.hasOwn(value, 'state') || Object.hasOwn(value, 'activeTurnId') || Object.hasOwn(value, 'turnCount') || Object.hasOwn(value, 'lastTurnAt');
}

export function validateTurn(turn: TurnRecord, sessionId: string): void {
    if (!isTurnRecord(turn) || turn.operatorSessionId !== sessionId || !SESSION_ID.test(turn.turnId)) throw new Error(`invalid turn ${turn.turnId ?? '<invalid>'}`);
}

export function isTurnRecord(value: unknown): value is TurnRecord {
    if (!isRecord(value)) return false;
    const turnNumber = value.turn;
    return value.schemaVersion === 1 && SESSION_ID.test(asString(value.turnId)) && SESSION_ID.test(asString(value.operatorSessionId))
        && typeof turnNumber === 'number' && Number.isSafeInteger(turnNumber) && turnNumber > 0 && ['running', 'complete', 'interrupted', 'failed', 'cancelled'].includes(asString(value.state))
        && isRecord(value.operatorMessage) && validTurnMessage(value.operatorMessage) && Array.isArray(value.resolvedRefs) && value.resolvedRefs.every(item => typeof item === 'string')
        && Array.isArray(value.unresolvedRefs) && value.unresolvedRefs.every(item => typeof item === 'string') && isJsonObject(value.snapshot)
        && (value.decisionClass === null || typeof value.decisionClass === 'string') && (value.routingRuleId === null || typeof value.routingRuleId === 'string')
        && (value.endpointId === null || typeof value.endpointId === 'string') && (value.response === null || isJsonObject(value.response))
        && isJsonObject(value.usage) && typeof value.stale === 'boolean' && (value.completedAt === null || isDate(value.completedAt));
}

function validTurnMessage(value: Record<string, unknown>): boolean {
    return Object.keys(value).every(key => ['content', 'contentPath', 'sha256', 'bytes'].includes(key))
        && (value.content === undefined || typeof value.content === 'string') && (value.contentPath === undefined || typeof value.contentPath === 'string')
        && (value.sha256 === undefined || typeof value.sha256 === 'string') && (value.bytes === undefined || Number.isSafeInteger(value.bytes));
}

export function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
export function isJsonObject(value: unknown): value is SessionJsonObject { return isRecord(value) && Object.values(value).every(isJsonValue); }
export function isJsonValue(value: unknown): value is SessionJsonValue { return value === null || typeof value === 'string' || typeof value === 'number' || typeof value === 'boolean' || isJsonObject(value) || Array.isArray(value) && value.every(isJsonValue); }
export function isDate(value: unknown): value is string { return typeof value === 'string' && Number.isFinite(Date.parse(value)) && new Date(value).toISOString() === value; }
export function asString(value: unknown): string { return typeof value === 'string' ? value : ''; }
export function sameKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).sort().join('|') === [...keys].sort().join('|'); }
export function sameIdentity(left: OperatorSession, right: OperatorSession): boolean { return JSON.stringify(left) === JSON.stringify(right); }
export function boundedLimit(limit?: number): number { return limit === undefined ? 50 : Number.isSafeInteger(limit) && limit > 0 && limit <= MAX_PAGE_SIZE ? limit : MAX_PAGE_SIZE; }
export function decodeCursor(cursor: string): string { const value = Buffer.from(cursor, 'base64url').toString('utf8'); if (!SESSION_ID.test(value)) throw new Error('invalid cursor'); return value; }
export function isState(value: unknown): value is OperatorSession['state'] { return ['open', 'active-turn', 'suspended', 'closed', 'archived', 'pruned'].includes(asString(value)); }
export function isStringArray(value: unknown): value is readonly string[] | undefined { return value === undefined || Array.isArray(value) && value.every(item => typeof item === 'string'); }
