import {randomUUID} from 'node:crypto';
import type {
    CreateSessionParams, ForkSessionParams, OperatorSession, SessionJournalEventType, SessionLifecycleEventType, SessionLifecycleOptions, SessionPersistencePort,
    SessionState, SessionJsonObject, ValidationResult
} from '../../../../contracts/operatorSession.js';
export type {
    CreateSessionParams, ForkSessionParams, OperatorSession, SessionFilters, SessionJournalEntry, SessionJsonObject, SessionJsonValue,
    SessionJournalEventType, SessionLifecycleEventType, SessionOrigin, SessionState, SessionStoreOptions, SessionJournalReadResult, SessionPersistencePort,
    SessionLifecycleOptions, TurnFilters, TurnMessage, TurnRecord, TurnState, ValidationResult
} from '../../../../contracts/operatorSession.js';

export type OperatorSessionErrorCode =
    | 'OPERATOR_SESSION_NOT_FOUND' | 'OPERATOR_SESSION_STATE_INVALID' | 'OPERATOR_SESSION_TURN_ACTIVE'
    | 'OPERATOR_SESSION_JOURNAL_WRITE_FAILED' | 'OPERATOR_SESSION_JOURNAL_REPLAY_CONFLICT'
    | 'OPERATOR_SESSION_JOURNAL_RECOVERY_REQUIRED' | 'OPERATOR_SESSION_JOURNAL_SEQUENCE_INVALID'
    | 'OPERATOR_SESSION_TURN_WRITE_FAILED' | 'OPERATOR_SESSION_REFERENCE_INVALID';

export class OperatorSessionError extends Error {
    constructor(readonly code: OperatorSessionErrorCode, operation: string, target: string, cause?: unknown) {
        super(`${code}: ${operation} failed for ${target}.`);
        this.name = 'OperatorSessionError';
        if (cause !== undefined) this.cause = cause;
    }
}

const TRANSITIONS: Readonly<Record<SessionState, readonly SessionState[]>> = {
    open: ['active-turn', 'suspended', 'closed'], 'active-turn': ['open'], suspended: ['open', 'closed'],
    closed: ['archived'], archived: ['pruned'], pruned: []
};
const EVENTS: Readonly<Partial<Record<SessionState, SessionLifecycleEventType>>> = {
    'active-turn': 'operator-session-turn-routed', suspended: 'operator-session-suspended', closed: 'operator-session-closed',
    archived: 'operator-session-archived', pruned: 'operator-session-pruned'
};

export class SessionLifecycle {
    private readonly store?: SessionPersistencePort;
    private readonly now: () => string;

    constructor(options: SessionLifecycleOptions = {}) {
        this.store = options.store;
        this.now = options.now ?? (() => new Date().toISOString());
    }

    transition(session: OperatorSession, target: SessionState, reason: string): OperatorSession {
        if (session.state === target) {
            if (target === 'active-turn') throw new OperatorSessionError('OPERATOR_SESSION_TURN_ACTIVE', 'repeat active turn', session.operatorSessionId);
            return session;
        }
        const validation = this.validateTransition(session.state, target);
        if (!validation.valid) throw new OperatorSessionError('OPERATOR_SESSION_STATE_INVALID', reason, session.operatorSessionId);
        if (target === 'active-turn') throw new OperatorSessionError('OPERATOR_SESSION_TURN_ACTIVE', reason, session.operatorSessionId);
        const next = {...session, state: target, activeTurnId: null};
        const event = eventFor(session.state, target);
        return this.store === undefined ? next : this.store.transitionSession(session, target, event, reason);
    }

    validateTransition(from: SessionState, to: SessionState): ValidationResult {
        if (from === to) return from === 'active-turn'
            ? {valid: false, code: 'OPERATOR_SESSION_TURN_ACTIVE', reason: 'one turn is already active'}
            : {valid: true};
        const valid = TRANSITIONS[from].includes(to);
        return valid ? {valid: true} : {valid: false, code: 'OPERATOR_SESSION_STATE_INVALID', reason: `${from} cannot become ${to}`};
    }

    validateTurnStart(session: OperatorSession): ValidationResult {
        if (session.state === 'active-turn') return {valid: false, code: 'OPERATOR_SESSION_TURN_ACTIVE', reason: 'one turn is already active'};
        if (session.state !== 'open') return {valid: false, code: 'OPERATOR_SESSION_STATE_INVALID', reason: 'session is not open'};
        return {valid: true};
    }

    getNextValidTransitions(state: SessionState): SessionState[] { return [...TRANSITIONS[state]]; }

    startTurn(session: OperatorSession, turnId = `turn-${randomUUID()}`, reason = 'turn started'): OperatorSession {
        const validation = this.validateTurnStart(session);
        if (!validation.valid) throw new OperatorSessionError(validation.code!, reason, session.operatorSessionId);
        if (this.store !== undefined) return this.store.acquireTurn(session, turnId, reason);
        return {...session, state: 'active-turn', activeTurnId: turnId};
    }

    completeTurn(session: OperatorSession, reason = 'turn completed'): OperatorSession { return this.transition(session, 'open', reason); }

    forkSession(parent: OperatorSession, params: ForkSessionParams): OperatorSession {
        if (parent.state === 'pruned') throw new OperatorSessionError('OPERATOR_SESSION_STATE_INVALID', 'fork session', parent.operatorSessionId);
        const turnRefs = [...(params.turnRefs ?? [])];
        if (this.store !== undefined) this.store.validateForkReferences(parent.operatorSessionId, turnRefs);
        else if (turnRefs.length > 0) throw new OperatorSessionError('OPERATOR_SESSION_REFERENCE_INVALID', 'validate fork turn references', parent.operatorSessionId);
        const create: CreateSessionParams = {
            laneId: parent.laneId, origin: 'operator', policyProfileId: params.policyProfileId ?? parent.policyProfileId,
            tags: params.tags ?? [], topic: params.topic ?? parent.topic, parentOperatorSessionId: parent.operatorSessionId,
            pinnedRefs: params.pinnedRefs ?? [], retentionPolicy: parent.retentionPolicy, budgetSegmentId: `budget-${randomUUID()}`
        };
        if (this.store === undefined) return localFork(parent, create, this.now());
        const child = this.store.createSession(create);
        this.store.appendEvent(child.operatorSessionId, 'operator-session-forked', {
            parentOperatorSessionId: parent.operatorSessionId, turnRefs
        });
        return child;
    }
}

function eventFor(from: SessionState, target: SessionState): SessionLifecycleEventType {
    if (target === 'open' && from === 'suspended') return 'operator-session-resumed';
    if (target === 'open' && from === 'active-turn') return 'operator-session-response-complete';
    return EVENTS[target] ?? 'operator-session-response-complete';
}

function localFork(parent: OperatorSession, create: CreateSessionParams, now: string): OperatorSession {
    return Object.freeze({schemaVersion: 1 as const, operatorSessionId: `opsess-${randomUUID()}`, laneId: create.laneId,
        origin: 'operator' as const, policyProfileId: create.policyProfileId, tags: [...(create.tags ?? [])], state: 'open' as const,
        activeTurnId: null, topic: create.topic, createdAt: now, lastTurnAt: null, turnCount: 0,
        parentOperatorSessionId: parent.operatorSessionId, retentionPolicy: create.retentionPolicy ?? 'local-standard',
        budgetSegmentId: create.budgetSegmentId ?? `budget-${randomUUID()}`, pinnedRefs: [...(create.pinnedRefs ?? [])]});
}
