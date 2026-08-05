import {closeSync, fsyncSync, ftruncateSync, mkdirSync, openSync, readFileSync, renameSync, rmSync, writeSync} from 'node:fs';
import {dirname} from 'node:path';
import type {OperatorSession, SessionJournalEntry, SessionJournalReadResult, SessionJsonObject, SessionState, SessionWriteStage} from '../../../../contracts/operatorSession.js';
import {isLifecycleEvent, isLegalTransition, isRecord, isState, parseJournal} from './sessionValidation.js';

export type FaultInjector = (stage: SessionWriteStage) => void;

export function writeJsonAtomic(path: string, value: unknown): void { writeTextAtomic(path, `${JSON.stringify(value)}\n`); }

export function writeTextAtomic(path: string, text: string): void {
    const temp = `${path}.tmp-${Math.random().toString(16).slice(2)}`;
    try {
        const fd = openSync(temp, 'wx', 0o600);
        try {
            const bytes = Buffer.from(text, 'utf8');
            if (writeSync(fd, bytes, 0, bytes.length) !== bytes.length) throw new Error('short write');
            fsyncSync(fd);
        } finally { closeSync(fd); }
        renameSync(temp, path);
        syncDirectory(dirname(path));
    } catch (error) { rmSync(temp, {force: true}); throw error; }
}

export function syncDirectory(path: string): void {
    const fd = openSync(path, 'r');
    try { fsyncSync(fd); } finally { closeSync(fd); }
}

export function readJournalFile(path: string, sessionId: string): SessionJournalReadResult {
    const bytes = readFileSync(path);
    let completeBytes = bytes.length;
    while (completeBytes > 0 && bytes[completeBytes - 1] !== 0x0a) completeBytes--;
    const status = completeBytes === bytes.length ? 'complete' : 'recoverable-incomplete-final-line';
    const text = bytes.subarray(0, completeBytes).toString('utf8');
    const lines = text.split('\n').filter(line => line.trim() !== '');
    const entries = lines.map((line, index) => parseJournal(line, sessionId, index + 1));
    const ids = new Set<string>();
    entries.forEach((entry, index) => {
        if (entry.sequence !== index + 1) throw new Error(`journal sequence gap at ${index + 1}`);
        if (ids.has(entry.eventId)) throw new Error(`duplicate journal event ${entry.eventId}`);
        ids.add(entry.eventId);
    });
    return {entries, status, nextSequence: entries.length + 1, completeBytes};
}

export function recoverJournalFile(path: string, result: SessionJournalReadResult): SessionJournalReadResult {
    if (result.status === 'complete') return result;
    const fd = openSync(path, 'r+');
    try { ftruncateSync(fd, result.completeBytes); fsyncSync(fd); } finally { closeSync(fd); }
    syncDirectory(dirname(path));
    return {...result, status: 'complete'};
}

export function appendJournalBatch(path: string, entries: readonly SessionJournalEntry[], fault?: FaultInjector): void {
    if (entries.length === 0) return;
    const current = readJournalFile(path, entries[0].operatorSessionId);
    if (current.status !== 'complete') throw new Error('journal recovery required before append');
    entries.forEach((entry, index) => {
        if (entry.sequence !== current.nextSequence + index) throw new Error(`journal sequence must be ${current.nextSequence + index}`);
        if (current.entries.some(existing => existing.eventId === entry.eventId)) throw new Error(`journal event replay ${entry.eventId}`);
    });
    fault?.('turn-journal-append');
    const bytes = Buffer.from(entries.map(entry => `${JSON.stringify(entry)}\n`).join(''), 'utf8');
    const fd = openSync(path, 'a', 0o600);
    try {
        if (writeSync(fd, bytes, 0, bytes.length) !== bytes.length) throw new Error('journal short write');
        fsyncSync(fd);
    } finally { closeSync(fd); }
}

export function replaySession(base: OperatorSession, entries: readonly SessionJournalEntry[]): OperatorSession {
    // operator-session.json is a materialized latest snapshot, not the replay
    // origin. Replaying from it makes historical events appear to move
    // backwards (for example, a closed snapshot followed by the opening event).
    // Lifecycle authority comes only from the ordered journal.
    let session: OperatorSession = {...base, state: 'open', activeTurnId: null, turnCount: 0, lastTurnAt: null};
    for (const entry of entries) {
        if (isLifecycleEvent(entry.type)) session = applyLifecycleEntry(session, entry);
    }
    return Object.freeze(session);
}

function applyLifecycleEntry(session: OperatorSession, entry: SessionJournalEntry): OperatorSession {
    const payload = entry.payload;
    const target = lifecycleTarget(entry.type);
    if (target === null) throw new Error(`unsupported lifecycle event ${entry.type}`);
    if (payload.state !== target || !isState(payload.state)) throw new Error(`lifecycle event ${entry.type} has mismatched state`);
    if (target === 'active-turn' && typeof payload.activeTurnId !== 'string') throw new Error(`active turn event ${entry.type} lacks activeTurnId`);
    if (target !== 'active-turn' && payload.activeTurnId !== undefined && payload.activeTurnId !== null) throw new Error(`non-active event ${entry.type} carries activeTurnId`);
    if (!isLegalTransition(session.state, target)) throw new Error(`illegal lifecycle transition ${session.state} -> ${target}`);
    const turnCount = payload.turnCount;
    if (turnCount !== undefined && (typeof turnCount !== 'number' || !Number.isSafeInteger(turnCount) || turnCount < session.turnCount)) throw new Error(`invalid turnCount for ${entry.type}`);
    const lastTurnAt = payload.lastTurnAt;
    if (lastTurnAt !== undefined && lastTurnAt !== null && (typeof lastTurnAt !== 'string' || !Number.isFinite(Date.parse(lastTurnAt)))) throw new Error(`invalid lastTurnAt for ${entry.type}`);
    return {...session, state: target, activeTurnId: target === 'active-turn' ? payload.activeTurnId as string : null,
        turnCount: turnCount === undefined ? session.turnCount : turnCount, lastTurnAt: lastTurnAt === undefined ? session.lastTurnAt : lastTurnAt as string | null};
}

function lifecycleTarget(type: SessionJournalEntry['type']): SessionState | null {
    switch (type) {
        case 'operator-session-opened': case 'operator-session-resumed': case 'operator-session-response-complete':
        case 'operator-session-turn-interrupted': case 'operator-session-turn-failed': case 'operator-session-turn-cancelled-before-invocation': return 'open';
        case 'operator-session-turn-routed': return 'active-turn';
        case 'operator-session-suspended': return 'suspended';
        case 'operator-session-closed': return 'closed';
        case 'operator-session-archived': return 'archived';
        case 'operator-session-pruned': return 'pruned';
        default: return null;
    }
}

export function statePayload(session: OperatorSession, reason: string, extra: SessionJsonObject = {}): SessionJsonObject {
    return {reason, state: session.state, activeTurnId: session.activeTurnId, turnCount: session.turnCount, lastTurnAt: session.lastTurnAt, ...extra};
}

export function ensureDirectory(path: string): void { mkdirSync(path, {recursive: true, mode: 0o700}); }
