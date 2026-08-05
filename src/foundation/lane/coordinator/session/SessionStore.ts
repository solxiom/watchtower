import {randomUUID} from 'node:crypto';
import {existsSync, mkdirSync, readdirSync, readFileSync, renameSync, rmSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {recordIsReclaimable, readLockRecord, tryCreateLockRecord, createLockRecord} from '../../../storage/writeLockRecord.js';
import {authorizePath, canonicalizePath} from '../../../paths/index.js';
import type {
    CreateSessionParams, OperatorSession, SessionFilters, SessionJournalEntry, SessionJournalEventType, SessionJournalReadResult,
    SessionJsonObject, SessionLifecycleEventType, SessionMetadataEventType, SessionMetadataPayload, SessionState, SessionStoreOptions, TurnFilters, TurnRecord
} from '../../../../contracts/operatorSession.js';
import {OperatorSessionError, type OperatorSessionErrorCode} from './SessionLifecycle.js';
import {
    appendJournalBatch, ensureDirectory, readJournalFile, recoverJournalFile, replaySession, statePayload, syncDirectory, writeJsonAtomic,
    writeTextAtomic
} from './sessionPersistence.js';
import {
    boundedLimit, decodeCursor, hasLifecycleAuthority, isJournalValue, isLifecycleEvent, isLegalTransition, isSessionValue, isTurnRecord,
    parseSession, sameIdentity, SESSION_ID, validateCreateParams, validateTurn
} from './sessionValidation.js';
export type {
    CreateSessionParams, ForkSessionParams, OperatorSession, SessionFilters, SessionJournalEntry, SessionJsonObject, SessionJsonValue,
    SessionJournalEventType, SessionLifecycleEventType, SessionMetadataEventType, SessionMetadataPayload, SessionOrigin, SessionState, SessionStoreOptions, SessionJournalReadResult, SessionPersistencePort,
    TurnFilters, TurnMessage, TurnRecord, TurnState
} from '../../../../contracts/operatorSession.js';
export {OperatorSessionError} from './SessionLifecycle.js';

export class SessionStore {
    private readonly root: string;
    private readonly now: () => string;
    private readonly idFactory: () => string;
    private readonly faultInjector?: SessionStoreOptions['faultInjector'];

    constructor(laneDirOrOptions: string | SessionStoreOptions) {
        const options = typeof laneDirOrOptions === 'string' ? {laneDir: laneDirOrOptions} : laneDirOrOptions;
        this.root = canonicalizePath(options.laneDir);
        this.now = options.now ?? (() => new Date().toISOString());
        this.idFactory = options.idFactory ?? (() => `opsess-${randomUUID()}`);
        this.faultInjector = options.faultInjector;
    }

    createSession(params: CreateSessionParams): OperatorSession {
        try { validateCreateParams(params); } catch (error) { throw sessionError('OPERATOR_SESSION_STATE_INVALID', 'validate session creation', 'session', error); }
        const session = makeSession(this.idFactory(), params, this.now());
        const finalDir = this.sessionDir(session.operatorSessionId);
        const staging = `${finalDir}.staging-${randomUUID()}`;
        try {
            ensureDirectory(staging);
            for (const child of ['turns', 'compactions', 'proposals', 'holds']) ensureDirectory(join(staging, child));
            writeJsonAtomic(join(staging, 'operator-session.json'), session);
            writeTextAtomic(join(staging, 'journal.jsonl'), '');
            appendJournalBatch(join(staging, 'journal.jsonl'), [journalFor(session, 'operator-session-opened', this.now(), {state: 'open'}, 1, 'watchtower-session-store')]);
            syncDirectory(staging); ensureDirectory(dirname(finalDir)); renameSync(staging, finalDir); syncDirectory(dirname(finalDir));
            return session;
        } catch (error) { rmSync(staging, {recursive: true, force: true}); throw sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'create operator session', session.operatorSessionId, error); }
    }

    loadSession(sessionId: string): OperatorSession {
        try {
            const base = parseSession(readFileSync(join(this.sessionDir(sessionId), 'operator-session.json'), 'utf8'));
            return replaySession(base, this.readJournalResult(sessionId).entries);
        } catch (error) { throw sessionError('OPERATOR_SESSION_NOT_FOUND', 'load operator session', sessionId, error); }
    }

    listSessions(filters: SessionFilters = {}): OperatorSession[] {
        const limit = boundedLimit(filters.limit);
        const cursor = filters.cursor === undefined ? null : decodeCursor(filters.cursor);
        const root = join(this.root, 'coordinator', 'operator-sessions');
        let ids: string[];
        try { ids = readdirSync(root, {withFileTypes: true}).filter(entry => entry.isDirectory() && SESSION_ID.test(entry.name)).map(entry => entry.name).sort(); }
        catch { ids = []; }
        return ids.map(id => this.loadSession(id)).filter(session => matchesSession(session, filters, this.sessionDir(session.operatorSessionId)))
            .filter(session => cursor === null || session.operatorSessionId > cursor).slice(0, limit);
    }

    readJournalResult(sessionId: string): SessionJournalReadResult {
        const path = join(this.sessionDir(sessionId), 'journal.jsonl');
        try { return readJournalFile(path, sessionId); }
        catch (error) { throw sessionError('OPERATOR_SESSION_JOURNAL_WRITE_FAILED', 'read session journal', sessionId, error); }
    }

    readJournal(sessionId: string, since?: string): SessionJournalEntry[] {
        const entries = [...this.readJournalResult(sessionId).entries];
        if (since === undefined) return entries;
        const index = entries.findIndex(entry => entry.eventId === since || isTurnPayload(entry.payload) && entry.payload.turn.turnId === since);
        return index < 0 ? entries : entries.slice(index + 1);
    }

    recoverJournal(sessionId: string): SessionJournalReadResult {
        return this.withLock(sessionId, () => {
            const path = join(this.sessionDir(sessionId), 'journal.jsonl');
            try { return recoverJournalFile(path, this.readJournalResult(sessionId)); }
            catch (error) { throw sessionError('OPERATOR_SESSION_JOURNAL_WRITE_FAILED', 'recover session journal', sessionId, error); }
        });
    }

    appendJournalEntry(sessionId: string, entry: SessionJournalEntry): void {
        this.withLock(sessionId, () => {
            const current = this.loadSession(sessionId);
            if (!isJournalValue(entry) || entry.operatorSessionId !== current.operatorSessionId || entry.laneId !== current.laneId) {
                throw sessionError('OPERATOR_SESSION_JOURNAL_WRITE_FAILED', 'validate journal event', sessionId);
            }
            this.validateExternalEvent(entry.type, entry.payload, sessionId);
            this.appendEntryUnlocked(sessionId, entry);
        });
    }

    appendEvent(sessionId: string, type: SessionMetadataEventType, payload: SessionMetadataPayload): SessionJournalEntry {
        return this.withLock(sessionId, () => {
            const current = this.loadSession(sessionId);
            this.validateExternalEvent(type, payload, sessionId);
            const result = this.readJournalResult(sessionId);
            const entry = journalFor(current, type, this.now(), payload, result.nextSequence, 'watchtower-session-store');
            appendJournalBatch(join(this.sessionDir(sessionId), 'journal.jsonl'), [entry]);
            return entry;
        });
    }

    acquireTurn(expected: OperatorSession, turnId: string, reason: string): OperatorSession {
        if (!SESSION_ID.test(turnId)) throw sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'validate turn id', turnId);
        return this.withLock(expected.operatorSessionId, () => {
            const current = this.loadSession(expected.operatorSessionId);
            if (current.state === 'active-turn') throw sessionError('OPERATOR_SESSION_TURN_ACTIVE', 'start session turn', expected.operatorSessionId);
            if (current.state !== 'open' || !sameIdentity(current, expected)) throw sessionError('OPERATOR_SESSION_STATE_INVALID', 'start session turn', expected.operatorSessionId);
            const next = {...current, state: 'active-turn' as const, activeTurnId: turnId};
            this.appendStateEvent(current, next, 'operator-session-turn-routed', reason);
            writeJsonAtomic(join(this.sessionDir(expected.operatorSessionId), 'operator-session.json'), next);
            return Object.freeze(next);
        });
    }

    appendTurn(sessionId: string, turn: TurnRecord): void {
        const initial = this.loadSession(sessionId);
        try { validateTurn(turn, sessionId); } catch (error) { throw sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'validate turn', turn.turnId ?? '<invalid>', error); }
        if (initial.state !== 'active-turn') throw sessionError('OPERATOR_SESSION_STATE_INVALID', 'append turn without durable active fence', turn.turnId);
        if (initial.activeTurnId !== turn.turnId) throw sessionError('OPERATOR_SESSION_TURN_ACTIVE', 'append turn without durable active fence', turn.turnId);
        this.withLock(sessionId, () => {
            const current = this.loadSession(sessionId);
            if (current.state !== 'active-turn') throw sessionError('OPERATOR_SESSION_STATE_INVALID', 'append turn', turn.turnId);
            if (current.activeTurnId !== turn.turnId) throw sessionError('OPERATOR_SESSION_TURN_ACTIVE', 'append turn', turn.turnId);
            if (this.readJournal(sessionId).some(entry => entry.type === 'operator-session-response-complete' && isTurnPayload(entry.payload) && entry.payload.turn.turnId === turn.turnId)) {
                throw sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'append duplicate turn', turn.turnId);
            }
            const turnDir = join(this.sessionDir(sessionId), 'turns', turn.turnId);
            if (existsSync(turnDir)) throw sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'append duplicate turn', turn.turnId);
            const staging = `${turnDir}.staging-${randomUUID()}`;
            let committed = false;
            try {
                ensureDirectory(staging);
                this.faultInjector?.('turn-stage-write');
                writeJsonAtomic(join(staging, 'response.json'), turn.response); writeJsonAtomic(join(staging, 'snapshot.json'), turn.snapshot); writeJsonAtomic(join(staging, 'usage.json'), turn.usage);
                writeTextAtomic(join(staging, 'operator.md'), turn.operatorMessage.content ?? ''); writeTextAtomic(join(staging, 'coordinator.md'), coordinatorText(turn.response));
                this.faultInjector?.('turn-stage-fsync'); syncDirectory(staging);
                const result = this.readJournalResult(sessionId);
                const next = {...current, state: 'open' as const, activeTurnId: null, lastTurnAt: turn.completedAt ?? this.now(), turnCount: Math.max(current.turnCount, turn.turn)};
                const transactionId = `turn-commit-${randomUUID()}`;
                const entries = [
                    journalFor(current, 'operator-session-operator-message', this.now(), {transactionId, turn: turnToJson(turn), state: current.state, activeTurnId: current.activeTurnId}, result.nextSequence, 'watchtower-session-store'),
                    journalFor(next, 'operator-session-response-complete', this.now(), {transactionId, turn: turnToJson(turn), state: next.state, activeTurnId: null, turnCount: next.turnCount, lastTurnAt: next.lastTurnAt}, result.nextSequence + 1, 'watchtower-session-store')
                ];
                appendJournalBatch(join(this.sessionDir(sessionId), 'journal.jsonl'), entries, this.faultInjector);
                committed = true;
                this.faultInjector?.('turn-materialize'); renameSync(staging, turnDir); syncDirectory(dirname(turnDir));
                this.faultInjector?.('turn-identity-write'); writeJsonAtomic(join(this.sessionDir(sessionId), 'operator-session.json'), next);
            } catch (error) {
                if (!committed) rmSync(staging, {recursive: true, force: true});
                throw error instanceof OperatorSessionError ? error : sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'append turn', turn.turnId, error);
            }
        });
    }

    readTurn(sessionId: string, turnId: string): TurnRecord {
        const entry = this.readJournal(sessionId).find(item => item.type === 'operator-session-response-complete' && isTurnPayload(item.payload) && item.payload.turn.turnId === turnId);
        if (entry === undefined || !isTurnPayload(entry.payload)) throw sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'read turn', turnId);
        return entry.payload.turn;
    }

    listTurns(sessionId: string, filters: TurnFilters = {}): TurnRecord[] {
        this.loadSession(sessionId);
        const cursor = filters.cursor === undefined ? null : decodeCursor(filters.cursor);
        const turns = this.readJournal(sessionId).filter(entry => entry.type === 'operator-session-response-complete')
            .map(entry => isTurnPayload(entry.payload) ? entry.payload.turn : null).filter((turn): turn is TurnRecord => turn !== null)
            .filter(turn => filters.state === undefined || turn.state === filters.state)
            .filter(turn => filters.stale === undefined || turn.stale === filters.stale).sort((left, right) => left.turnId.localeCompare(right.turnId));
        return turns.filter(turn => cursor === null || turn.turnId > cursor).slice(0, boundedLimit(filters.limit));
    }

    transitionSession(expected: OperatorSession, target: SessionState, event: SessionLifecycleEventType, reason: string): OperatorSession {
        if (target === 'active-turn') throw sessionError('OPERATOR_SESSION_TURN_ACTIVE', 'transition session', expected.operatorSessionId);
        return this.withLock(expected.operatorSessionId, () => {
            const current = this.loadSession(expected.operatorSessionId);
            if (!sameIdentity(current, expected) || current.state === target || !isLegalTransition(current.state, target) || !matchesLifecycleEvent(current.state, target, event)) {
                throw sessionError('OPERATOR_SESSION_STATE_INVALID', 'transition session', expected.operatorSessionId);
            }
            const next = {...current, state: target, activeTurnId: null};
            this.appendStateEvent(current, next, event, reason);
            writeJsonAtomic(join(this.sessionDir(expected.operatorSessionId), 'operator-session.json'), next);
            return Object.freeze(next);
        });
    }

    validateForkReferences(sessionId: string, turnRefs: readonly string[]): void {
        const seen = new Set<string>();
        for (const turnRef of turnRefs) {
            if (!SESSION_ID.test(turnRef) || seen.has(turnRef)) throw sessionError('OPERATOR_SESSION_REFERENCE_INVALID', 'validate fork turn reference', turnRef);
            seen.add(turnRef);
            try { this.readTurn(sessionId, turnRef); }
            catch (error) { throw sessionError('OPERATOR_SESSION_REFERENCE_INVALID', 'validate fork turn reference', turnRef, error); }
        }
    }

    private appendStateEvent(current: OperatorSession, next: OperatorSession, event: SessionJournalEventType, reason: string): void {
        const result = this.readJournalResult(current.operatorSessionId);
        const entry = journalFor(next, event, this.now(), statePayload(next, reason, {fromState: current.state}), result.nextSequence, 'watchtower-session-lifecycle');
        appendJournalBatch(join(this.sessionDir(current.operatorSessionId), 'journal.jsonl'), [entry]);
    }

    private appendEntryUnlocked(sessionId: string, entry: SessionJournalEntry): void {
        const result = this.readJournalResult(sessionId);
        if (result.status !== 'complete') throw sessionError('OPERATOR_SESSION_JOURNAL_RECOVERY_REQUIRED', 'append journal before recovery', sessionId);
        const existing = result.entries.find(item => item.eventId === entry.eventId);
        if (existing !== undefined) {
            if (JSON.stringify(existing) === JSON.stringify(entry)) return;
            throw sessionError('OPERATOR_SESSION_JOURNAL_REPLAY_CONFLICT', 'append replayed journal event', entry.eventId);
        }
        if (entry.sequence !== result.nextSequence) throw sessionError('OPERATOR_SESSION_JOURNAL_SEQUENCE_INVALID', 'append stale journal sequence', entry.eventId);
        appendJournalBatch(join(this.sessionDir(sessionId), 'journal.jsonl'), [entry]);
    }

    private validateExternalEvent(type: SessionJournalEventType, payload: SessionJsonObject, sessionId: string): void {
        if (isLifecycleEvent(type) || hasLifecycleAuthority(payload)) {
            throw sessionError('OPERATOR_SESSION_STATE_INVALID', 'append externally supplied session event', sessionId);
        }
    }

    private sessionDir(sessionId: string): string {
        if (!SESSION_ID.test(sessionId)) throw sessionError('OPERATOR_SESSION_NOT_FOUND', 'resolve operator session', sessionId);
        return authorizePath(this.root, join('coordinator', 'operator-sessions', sessionId));
    }

    private withLock<T>(sessionId: string, action: () => T): T {
        const path = join(this.sessionDir(sessionId), '.session.lock');
        const holder = createLockRecord();
        if (!tryCreateLockRecord(path, holder)) {
            const current = readLockRecord(path);
            if (current !== null && recordIsReclaimable(current)) rmSync(path, {force: true});
            if (!tryCreateLockRecord(path, holder)) throw sessionError('OPERATOR_SESSION_TURN_ACTIVE', 'acquire session write lock', sessionId);
        }
        try { return action(); } finally { if (readLockRecord(path)?.token === holder.token) rmSync(path, {force: true}); }
    }
}

function matchesLifecycleEvent(from: SessionState, target: SessionState, event: SessionLifecycleEventType): boolean {
    if (target === 'open' && from === 'suspended') return event === 'operator-session-resumed';
    if (target === 'open' && from === 'active-turn') return event === 'operator-session-response-complete';
    switch (target) {
        case 'suspended': return event === 'operator-session-suspended';
        case 'closed': return event === 'operator-session-closed';
        case 'archived': return event === 'operator-session-archived';
        case 'pruned': return event === 'operator-session-pruned';
        default: return false;
    }
}

function makeSession(id: string, params: CreateSessionParams, now: string): OperatorSession {
    if (!SESSION_ID.test(id)) throw sessionError('OPERATOR_SESSION_TURN_WRITE_FAILED', 'create operator session', id);
    return Object.freeze({schemaVersion: 1 as const, operatorSessionId: id, laneId: params.laneId, origin: params.origin ?? 'operator',
        policyProfileId: params.policyProfileId, tags: [...(params.tags ?? [])], state: 'open' as const, activeTurnId: null, topic: params.topic,
        createdAt: now, lastTurnAt: null, turnCount: 0, parentOperatorSessionId: params.parentOperatorSessionId ?? null,
        retentionPolicy: params.retentionPolicy ?? 'local-standard', budgetSegmentId: params.budgetSegmentId ?? `budget-${randomUUID()}`,
        pinnedRefs: [...(params.pinnedRefs ?? [])]});
}

function journalFor(session: OperatorSession, type: SessionJournalEventType, at: string, payload: SessionJsonObject, sequence: number, producer: string): SessionJournalEntry {
    return {schemaVersion: 1, eventId: `evt-${randomUUID()}`, sequence, type, at, laneId: session.laneId,
        operatorSessionId: session.operatorSessionId, producer, correlationId: `corr-${randomUUID()}`, causationId: null,
        policyVersion: session.policyProfileId, payload};
}

function isTurnPayload(payload: SessionJsonObject): payload is SessionJsonObject & {turn: TurnRecord} {
    return isTurnRecord(payload.turn);
}
function turnToJson(turn: TurnRecord): SessionJsonObject { return turn as unknown as SessionJsonObject; }
function coordinatorText(response: SessionJsonObject | null): string { return response !== null && typeof response.answer === 'string' ? response.answer : response === null ? '' : `${JSON.stringify(response)}\n`; }
function matchesSession(session: OperatorSession, filters: SessionFilters, sessionDir: string): boolean {
    return (filters.state === undefined || session.state === filters.state) && (filters.origin === undefined || session.origin === filters.origin)
        && (filters.policyProfileId === undefined || session.policyProfileId === filters.policyProfileId) && (filters.topic === undefined || session.topic.includes(filters.topic))
        && (filters.tags === undefined || filters.tags.every(tag => session.tags.includes(tag))) && inRange(session.createdAt, filters.createdAfter, filters.createdBefore)
        && inRange(session.lastTurnAt, filters.lastTurnAfter, filters.lastTurnBefore) && (filters.hasUnappliedProposals === undefined || hasEntries(join(sessionDir, 'proposals')) === filters.hasUnappliedProposals)
        && (filters.hasHolds === undefined || hasEntries(join(sessionDir, 'holds')) === filters.hasHolds);
}
function inRange(value: string | null, after?: string, before?: string): boolean { return value !== null && (after === undefined || value >= after) && (before === undefined || value <= before) || value === null && after === undefined && before === undefined; }
function hasEntries(path: string): boolean { try { return readdirSync(path).length > 0; } catch { return false; } }
function sessionError(code: OperatorSessionErrorCode, operation: string, target: string, cause?: unknown): OperatorSessionError { return new OperatorSessionError(code, operation, target, cause); }
