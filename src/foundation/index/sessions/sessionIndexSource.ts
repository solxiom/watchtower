/**
 * Reads the CA-15 operator-session tree and computes each session's journal
 * continuity checkpoint; the only owned module that touches journal, turn, and
 * proposal bytes. Predecessor bytes are `unknown` and are validated through
 * CA-15's own accepted validators — `parseSession`, `readJournalFile`
 * (complete prefix, exact envelope, event-type set, sequence continuity,
 * event-id uniqueness) and `isTurnRecord` — so this batch transcribes no
 * producer format. Everything else fails closed here: unsafe or symlinked
 * entries are refused rather than filtered, the journal prefix must decode as
 * strict UTF-8, every authoritative sidecar must exist as a regular file and
 * agree with its journal record, and the materialized turn directory set must
 * match the journal exactly. `sessionsRoot` is an authorized lane directory.
 */
import {existsSync, lstatSync, readFileSync, readdirSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import {SessionIndexError} from '../../../contracts/index.js';
import type {OperatorSession, TurnRecord} from '../../../contracts/operatorSession.js';
import {isTurnRecord, jsonDocumentText, parseSession, readJournalFile, SESSION_ID} from '../../lane/coordinator/session/index.js';

export interface SessionCheckpointEntry {readonly operatorSessionId: string; readonly checkpoint: string;}
export interface RawContent {readonly text: string; readonly present: boolean; readonly sha256: string; readonly bytes: number;}
export interface RawTurnSource {readonly record: TurnRecord; readonly operator: RawContent; readonly answer: RawContent;}
export interface RawSessionSource {
    readonly identity: OperatorSession;
    readonly checkpoint: string;
    readonly turns: readonly RawTurnSource[];
    readonly proposals: readonly unknown[];
}

const EMPTY_DIGEST = `sha256:${'0'.repeat(64)}`;

function invalid(subject: string, message: string): never {
    throw new SessionIndexError('SESSION_SOURCE_INVALID', subject, message);
}

/** Aggregate journal continuity checkpoint across every indexed session. */
export function aggregateCheckpoint(sessions: readonly SessionCheckpointEntry[]): string {
    let bytes = 0;
    const hash = createHash('sha256');
    for (const session of [...sessions].sort((left, right) => left.operatorSessionId.localeCompare(right.operatorSessionId))) {
        bytes += Number(session.checkpoint.split(':')[0]);
        hash.update(`${session.operatorSessionId}=${session.checkpoint}\n`);
    }
    return `${bytes}:sha256:${hash.digest('hex')}`;
}

/** Every child of an enumerated directory, in name order. An unsafe or symlinked entry refuses the whole source; it is never filtered away. */
function children(root: string, kind: string): string[] {
    if (!existsSync(root)) return [];
    return readdirSync(root).sort().map((name) => {
        if (!SESSION_ID.test(name) || lstatSync(join(root, name)).isSymbolicLink()) invalid(join(root, name), `${kind} holds an unsafe or symlinked entry`);
        return name;
    });
}

/** Strict UTF-8 decode; a replacement-character fallback would let tampered bytes decode into a row. */
function utf8(bytes: Buffer, path: string, what: string): string {
    try { return new TextDecoder('utf-8', {fatal: true}).decode(bytes); } catch { return invalid(path, `${what} is not valid UTF-8`); }
}

function regularFile(path: string, what: string): Buffer {
    if (!existsSync(path) || lstatSync(path).isSymbolicLink() || !lstatSync(path).isFile()) invalid(path, `${what} is missing or is not a regular file`);
    return readFileSync(path);
}

function readJsonFile(path: string, what: string): unknown {
    try { return JSON.parse(utf8(regularFile(path, what), path, what)); }
    catch (error) { return error instanceof SessionIndexError ? (() => {throw error;})() : invalid(path, `${what} is not valid JSON`); }
}

/** A turn content file (operator.md/coordinator.md). Absent-but-not-symlink is legitimate pruning; a symlink or invalid UTF-8 fails closed. */
function readContent(path: string): RawContent {
    if (!existsSync(path)) return {text: '', present: false, sha256: EMPTY_DIGEST, bytes: 0};
    const raw = regularFile(path, 'turn content file');
    return {text: utf8(raw, path, 'turn content file'), present: true, sha256: `sha256:${createHash('sha256').update(raw).digest('hex')}`, bytes: raw.byteLength};
}

/** A materialized sidecar is authoritative-by-copy: its bytes must be exactly what CA-15's own `jsonDocumentText` writes for the journal record's value. */
function sidecar(turnDir: string, name: string, authoritative: unknown, turnId: string): void {
    const path = join(turnDir, name);
    if (utf8(regularFile(path, `turn sidecar ${name}`), path, `turn sidecar ${name}`) !== jsonDocumentText(authoritative ?? null)) {
        invalid(turnId, `materialized ${name} is not byte-identical to the authoritative journal record`);
    }
}

function readTurn(turnsRoot: string, record: TurnRecord): RawTurnSource {
    const turnDir = join(turnsRoot, record.turnId);
    sidecar(turnDir, 'response.json', record.response, record.turnId);
    sidecar(turnDir, 'snapshot.json', record.snapshot, record.turnId);
    sidecar(turnDir, 'usage.json', record.usage, record.turnId);
    return {record, operator: readContent(join(turnDir, 'operator.md')), answer: readContent(join(turnDir, 'coordinator.md'))};
}

function readProposals(root: string): unknown[] {
    return children(root, 'proposals directory').map((name) => {
        if (!name.endsWith('.json')) invalid(join(root, name), 'proposals directory holds a non-JSON entry');
        return readJsonFile(join(root, name), 'proposal');
    });
}

/**
 * The authoritative journal, validated by CA-15's own reader: complete prefix to
 * the final newline, exact envelope per line, sequence continuity, event-id
 * uniqueness, and session identity. Only `operator-session-response-complete`
 * carries a turn record, and each must satisfy CA-15's `isTurnRecord`.
 */
function readJournal(sessionDir: string, operatorSessionId: string, laneId?: string): {checkpoint: string; records: TurnRecord[]} {
    const path = join(sessionDir, 'journal.jsonl');
    const bytes = regularFile(path, 'operator session journal');
    let result;
    try { result = readJournalFile(path, operatorSessionId); }
    catch (error) { return invalid(operatorSessionId, `journal is not a valid CA-15 operator-session journal: ${error instanceof Error ? error.message : String(error)}`); }
    const prefix = bytes.subarray(0, result.completeBytes);
    utf8(prefix, path, 'operator session journal');
    const records: TurnRecord[] = [];
    for (const entry of result.entries) {
        if (laneId !== undefined && entry.laneId !== laneId) invalid(operatorSessionId, 'journal event lane does not match the operator-session identity');
        if (entry.type !== 'operator-session-response-complete') continue;
        const turn = (entry.payload as {turn?: unknown}).turn;
        if (!isTurnRecord(turn) || turn.operatorSessionId !== operatorSessionId) invalid(operatorSessionId, 'journal response-complete event carries no valid CA-15 turn record');
        if (records.some((existing) => existing.turnId === (turn as TurnRecord).turnId)) invalid((turn as TurnRecord).turnId, 'journal records a duplicate completed turn');
        records.push(turn as TurnRecord);
    }
    return {checkpoint: `${prefix.byteLength}:sha256:${createHash('sha256').update(prefix).digest('hex')}`, records};
}

function readSession(sessionsRoot: string, operatorSessionId: string): RawSessionSource {
    const sessionDir = join(sessionsRoot, operatorSessionId);
    const identityPath = join(sessionDir, 'operator-session.json');
    let identity: OperatorSession;
    try { identity = parseSession(utf8(regularFile(identityPath, 'operator-session.json'), identityPath, 'operator-session.json')); }
    catch (error) { return error instanceof SessionIndexError ? (() => {throw error;})() : invalid(operatorSessionId, 'operator-session.json is not a valid CA-15 session identity'); }
    if (identity.operatorSessionId !== operatorSessionId) invalid(operatorSessionId, 'identity operatorSessionId does not match its directory');
    const {checkpoint, records} = readJournal(sessionDir, operatorSessionId, identity.laneId);
    const turnsRoot = join(sessionDir, 'turns');
    const dirs = children(turnsRoot, 'turns directory');
    const journaled = new Set(records.map((record) => record.turnId));
    if (dirs.length !== journaled.size || dirs.some((id) => !journaled.has(id))) invalid(operatorSessionId, 'materialized turn directories do not match the journal exactly');
    return {identity, checkpoint, turns: records.map((record) => readTurn(turnsRoot, record)), proposals: readProposals(join(sessionDir, 'proposals'))};
}

/** Enumerate and read every operator session under an authorized lane sessions root, in id order. */
export function readOperatorSessions(sessionsRoot: string): RawSessionSource[] {
    return children(sessionsRoot, 'operator-sessions root').map((name) => readSession(sessionsRoot, name));
}

/** Read a single operator session directory for incremental update, or null when absent. */
export function readOperatorSession(sessionsRoot: string, operatorSessionId: string): RawSessionSource | null {
    if (!SESSION_ID.test(operatorSessionId)) invalid(operatorSessionId, 'operator session id is not a safe identifier');
    const sessionDir = join(sessionsRoot, operatorSessionId);
    if (!existsSync(sessionDir) || lstatSync(sessionDir).isSymbolicLink() || !lstatSync(sessionDir).isDirectory()) return null;
    return readSession(sessionsRoot, operatorSessionId);
}

/** Recompute the aggregate journal checkpoint from the live lane sessions, for stale-index admission. */
export function liveAggregateCheckpoint(sessionsRoot: string, laneId: string): string {
    return aggregateCheckpoint(children(sessionsRoot, 'operator-sessions root')
        .map((id) => ({operatorSessionId: id, checkpoint: readJournal(join(sessionsRoot, id), id, laneId).checkpoint})));
}
