/**
 * Filesystem fixtures for the CA-16 session index specs. They are materialized
 * by the accepted CA-15 producer itself — `SessionStore.createSession`,
 * `acquireTurn`, `appendTurn`, `appendEvent`, `transitionSession` — so every
 * positive proof in this suite runs against real producer bytes rather than a
 * transcription of the format. Only the deliberate corruptions (pruning a
 * content file, symlinking one, appending raw journal bytes) are written
 * directly, and each is exercising a negative case on purpose.
 */
import {createHash} from 'node:crypto';
import {appendFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {OperatorSession, SessionJsonObject, TurnRecord} from '../../../../src/contracts/operatorSession.js';
import {jsonDocumentText, SessionStore} from '../../../../src/foundation/lane/coordinator/session/index.js';

export const LANE_ID = '9d0ee3d2-8833-4fb7-b112-8438f04f57d2';
const BASE_TIME = Date.parse('2026-08-07T12:00:00Z');

export interface TurnFixture {
    readonly turnId: string;
    readonly turn: number;
    readonly state?: TurnRecord['state'];
    readonly operator?: string;
    readonly answer?: string;
    readonly answerPresent?: boolean;
    readonly operatorPresent?: boolean;
    readonly decisionClass?: string | null;
    readonly snapshotRevision?: number;
    readonly stale?: boolean;
    readonly completedAt?: string | null;
    readonly evidenceRefs?: readonly string[];
    readonly openQuestions?: readonly string[];
    readonly proposedEffects?: readonly {readonly proposalId: string; readonly type: string}[];
    readonly quality?: string;
}

export interface SessionFixture {
    readonly id: string;
    readonly laneId?: string;
    readonly state?: 'closed';
    readonly origin?: string;
    readonly topic?: string;
    readonly parent?: string | null;
    readonly pinnedRefs?: readonly string[];
    readonly turns?: readonly TurnFixture[];
    readonly proposals?: readonly Record<string, unknown>[];
}

export interface Fixture {
    readonly root: string;
    readonly sessionsRoot: string;
    readonly indexRoot: string;
    cleanup(): void;
}

function sha256(text: string): string {
    return `sha256:${createHash('sha256').update(text, 'utf8').digest('hex')}`;
}

/** CA-15 stamps `Date.toISOString()`; its own validator refuses anything that is not that exact round-trip. */
function stamp(value: string): string { return new Date(value).toISOString(); }

export function newFixture(): Fixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-ca16-'));
    const sessionsRoot = join(root, 'coordinator', 'operator-sessions');
    const indexRoot = join(root, 'coordinator', 'index', 'sessions');
    mkdirSync(sessionsRoot, {recursive: true});
    mkdirSync(indexRoot, {recursive: true});
    return {root, sessionsRoot, indexRoot, cleanup: () => rmSync(root, {recursive: true, force: true})};
}

function laneDirOf(sessionsRoot: string): string {
    return join(sessionsRoot, '..', '..');
}

/** A store bound to one fixture session id, with a deterministic clock so every run produces identical bytes. */
function storeFor(sessionsRoot: string, sessionId: string): SessionStore {
    let tick = 0;
    return new SessionStore({
        laneDir: laneDirOf(sessionsRoot), idFactory: () => sessionId,
        now: () => new Date(BASE_TIME + (tick += 1) * 1000).toISOString()
    });
}

function turnRecord(sessionId: string, turn: TurnFixture): TurnRecord {
    const operator = turn.operator ?? 'Why was B14 rejected?';
    const answer = turn.answer ?? 'Batch B14 was rejected for three recorded findings.';
    const state = turn.state ?? 'complete';
    const response: SessionJsonObject | null = state === 'failed' ? null : {
        answer, contentPath: `turns/${turn.turnId}/coordinator.md`, sha256: sha256(answer), bytes: Buffer.byteLength(answer, 'utf8'),
        openQuestions: [...(turn.openQuestions ?? [])], proposedEffects: (turn.proposedEffects ?? []).map((effect) => ({...effect}))
    };
    return {
        schemaVersion: 1, turnId: turn.turnId, operatorSessionId: sessionId, turn: turn.turn, state,
        operatorMessage: {content: operator, contentPath: `turns/${turn.turnId}/operator.md`, sha256: sha256(operator), bytes: Buffer.byteLength(operator, 'utf8')},
        resolvedRefs: [...(turn.evidenceRefs ?? [])], unresolvedRefs: [], snapshot: {laneRevision: turn.snapshotRevision ?? 81},
        decisionClass: turn.decisionClass === undefined ? 'D2' : turn.decisionClass, routingRuleId: 'operator-tactical-v1', endpointId: 'codex-primary-medium',
        response, usage: {inputTokens: 18000, outputTokens: 2200, quality: turn.quality ?? 'reported'},
        stale: turn.stale ?? false, completedAt: turn.completedAt === undefined ? stamp('2026-08-07T12:05:00Z') : turn.completedAt === null ? null : stamp(turn.completedAt)
    };
}

/** Materialize one operator-session tree through the accepted CA-15 producer, replacing any previous tree for that id. */
export function writeSession(sessionsRoot: string, fixture: SessionFixture): void {
    rmSync(join(sessionsRoot, fixture.id), {recursive: true, force: true});
    const store = storeFor(sessionsRoot, fixture.id);
    let session: OperatorSession = store.createSession({
        laneId: fixture.laneId ?? LANE_ID, origin: (fixture.origin ?? 'operator') as OperatorSession['origin'],
        policyProfileId: 'operator-standard', topic: fixture.topic ?? 'CA-16 fixture', budgetSegmentId: 'seg-0001',
        pinnedRefs: fixture.pinnedRefs ?? [], parentOperatorSessionId: fixture.parent ?? null
    });
    for (const turn of fixture.turns ?? []) {
        session = store.acquireTurn(session, turn.turnId, 'fixture turn');
        store.appendTurn(fixture.id, turnRecord(fixture.id, turn));
        session = store.loadSession(fixture.id);
        prune(sessionsRoot, fixture.id, turn);
    }
    if (fixture.state === 'closed') store.transitionSession(session, 'closed', 'operator-session-closed', 'fixture close');
    for (const proposal of fixture.proposals ?? []) {
        writeFileSync(join(sessionsRoot, fixture.id, 'proposals', `${String(proposal.proposalId)}.json`), JSON.stringify(proposal, null, 2));
    }
}

/** Content pruning (operator-session.md 12) removes turn content while the journal record and its declared digest remain. */
function prune(sessionsRoot: string, sessionId: string, turn: TurnFixture): void {
    const turnDir = join(sessionsRoot, sessionId, 'turns', turn.turnId);
    if (turn.answerPresent === false) rmSync(join(turnDir, 'coordinator.md'), {force: true});
    if (turn.operatorPresent === false) rmSync(join(turnDir, 'operator.md'), {force: true});
}

/** Append a well-formed CA-15 metadata event through the producer, so the live journal legitimately moves past an index checkpoint. */
export function appendProducerEvent(sessionsRoot: string, sessionId: string): void {
    storeFor(sessionsRoot, sessionId).appendEvent(sessionId, 'operator-session-pinned', {ref: 'batch:B99'});
}

/** Rewrite every journal entry through `mutate`, re-serializing in place, to exercise cross-artifact identity admission. */
export function rewriteJournal(sessionsRoot: string, sessionId: string, mutate: (entry: Record<string, unknown>) => Record<string, unknown>): void {
    const path = join(sessionsRoot, sessionId, 'journal.jsonl');
    const lines = readFileSync(path, 'utf8').split('\n').filter((line) => line !== '');
    writeFileSync(path, lines.map((line) => `${JSON.stringify(mutate(JSON.parse(line) as Record<string, unknown>))}\n`).join(''));
}

/** Rewrite the turn record carried by one response-complete journal event, leaving the CA-15 envelope intact. */
export function rewriteJournalTurn(sessionsRoot: string, sessionId: string, turnId: string, mutate: (turn: Record<string, unknown>) => void): void {
    rewriteJournal(sessionsRoot, sessionId, (entry) => {
        const turn = (entry.payload as {turn?: Record<string, unknown>}).turn;
        if (turn !== undefined && turn.turnId === turnId) mutate(turn);
        return entry;
    });
}

/**
 * Rewrite a turn's sidecars from the (possibly mutated) journal record, using the producer's own byte form.
 * Lets a negative case isolate one guard instead of tripping the sidecar-agreement guard first.
 */
export function resyncSidecars(sessionsRoot: string, sessionId: string, turnId: string): void {
    const path = join(sessionsRoot, sessionId, 'journal.jsonl');
    for (const line of readFileSync(path, 'utf8').split('\n').filter((item) => item !== '')) {
        const turn = (JSON.parse(line) as {payload: {turn?: Record<string, unknown>}}).payload.turn;
        if (turn === undefined || turn.turnId !== turnId) continue;
        const dir = join(sessionsRoot, sessionId, 'turns', turnId);
        for (const [name, value] of [['response.json', turn.response], ['snapshot.json', turn.snapshot], ['usage.json', turn.usage]] as const) {
            writeFileSync(join(dir, name), jsonDocumentText(value ?? null));
        }
    }
}

/** Append raw bytes to a session journal, to exercise corrupt-predecessor admission. */
export function appendJournal(sessionsRoot: string, sessionId: string, line: string): void {
    appendFileSync(join(sessionsRoot, sessionId, 'journal.jsonl'), line);
}

/** Replace a turn file with a symlink, to exercise the symlink guard. */
export function symlinkTurnContent(sessionsRoot: string, sessionId: string, turnId: string, file: string, target: string): void {
    const path = join(sessionsRoot, sessionId, 'turns', turnId, file);
    rmSync(path, {force: true});
    symlinkSync(target, path);
}
