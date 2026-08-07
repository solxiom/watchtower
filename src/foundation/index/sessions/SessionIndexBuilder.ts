/**
 * Builds and incrementally updates the derived `sessions.sqlite` index and
 * exposes the bounded query and cross-session capsule facade (CA-16 brief;
 * operator-session.md 11.2, 20; coordinator-automation.md 9.3/9.7). Building
 * sequences the source reader, the row mapper, and the accepted staged rebuild +
 * atomic switch, so a reader observes the complete old or the complete new
 * store. Opening admits a published generation through the shared fail-closed
 * gate — missing/stale/corrupt/journal-drift blocks queries with no
 * full-history fallback. Store lifecycle, admission, and manifest publication
 * are owned by `SessionCompaction.ts`.
 */
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {SessionIndexError} from '../../../contracts/index.js';
import type {
    ProposalFilters, ReferenceCapsule, SessionBuildResult, SessionFilters, SessionProvenance,
    SessionUpdateResult, TurnFilters
} from '../../../contracts/index.js';
import {openDerivedStorage, type DerivedStore, type SqliteValue, type TypedRow} from '../../storage/index.js';
import {resolveCapsule} from './sessionCapsule.js';
import * as reads from './sessionIndexReads.js';
import {buildSessionRows, type SessionRows} from './sessionIndexRows.js';
import {aggregateCheckpoint, readOperatorSession, readOperatorSessions} from './sessionIndexSource.js';
import {admitGeneration, admitStore, openSessionStore, readManifest, republishManifest, writeManifest, type SessionManifest} from './SessionCompaction.js';
import {
    expectedSessionMetaRows, SESSION_INDEX_COMPILER_VERSION, SESSION_INDEX_DATABASE_SCHEMA_VERSION,
    SESSION_INDEX_SCHEMA, SESSION_STORE_KIND
} from './sessionIndexSchema.js';

function orderByParent(rows: readonly TypedRow[]): TypedRow[] {
    const byId = new Map(rows.map((row) => [row.operator_session_id as string, row]));
    const emitted = new Set<string>();
    const out: TypedRow[] = [];
    const visit = (row: TypedRow): void => {
        const id = row.operator_session_id as string;
        if (emitted.has(id)) return;
        const parent = row.parent_operator_session_id;
        if (typeof parent === 'string' && byId.has(parent) && !emitted.has(parent)) visit(byId.get(parent) as TypedRow);
        emitted.add(id);
        out.push(row);
    };
    for (const row of rows) visit(row);
    return out;
}

async function insertSessionRows(writer: {insert(table: string, row: TypedRow): Promise<void>}, all: readonly SessionRows[]): Promise<void> {
    for (const row of orderByParent(all.map((entry) => entry.operatorSession))) await writer.insert('operator_sessions', row);
    for (const set of all) {
        for (const turn of set.turns) await writer.insert('turns', turn);
        for (const pin of set.pins) await writer.insert('session_pins', pin);
        for (const ref of set.turnRefs) await writer.insert('turn_refs', ref);
        for (const question of set.openQuestions) await writer.insert('turn_open_questions', question);
        for (const capsule of set.capsules) await writer.insert('turn_reference_capsules', capsule);
        for (const proposal of set.proposals) await writer.insert('session_proposals', proposal);
    }
}

/** Read a table on the main connection and return the primary keys of rows to delete (never inside a transaction). */
async function keysToDelete(store: DerivedStore, table: string, predicate: (row: TypedRow) => boolean, keyOf: (row: TypedRow) => SqliteValue | readonly SqliteValue[]): Promise<(SqliteValue | readonly SqliteValue[])[]> {
    return (await store.list(table)).filter(predicate).map(keyOf);
}

function assertLane(all: readonly SessionRows[], laneId: string): void {
    for (const set of all) {
        if (set.operatorSession.lane_id !== laneId) {
            throw new SessionIndexError('SESSION_SOURCE_INVALID', set.operatorSession.operator_session_id as string, 'operator session belongs to a different lane');
        }
    }
}

export class SessionIndex {
    private constructor(private readonly store: DerivedStore, private readonly manifest: SessionManifest) {}

    /** Full deterministic build of every operator session in a lane, published atomically. */
    static async build(indexRoot: string, sessionsRoot: string, laneId: string): Promise<SessionBuildResult> {
        const all = readOperatorSessions(sessionsRoot).map(buildSessionRows);
        assertLane(all, laneId);
        const sessions = all.map((set) => ({operatorSessionId: set.operatorSession.operator_session_id as string, checkpoint: set.operatorSession.journal_checkpoint as string}));
        const result = await openDerivedStorage(indexRoot).rebuild(SESSION_STORE_KIND, SESSION_INDEX_SCHEMA, async (writer) => {
            for (const meta of expectedSessionMetaRows(laneId)) await writer.insert('index_meta', {key: meta[0], value: meta[1]});
            await insertSessionRows(writer, all);
        });
        writeManifest(indexRoot, {databaseSchemaVersion: SESSION_INDEX_DATABASE_SCHEMA_VERSION, compilerVersion: SESSION_INDEX_COMPILER_VERSION, laneId, checkpoint: aggregateCheckpoint(sessions), semanticRoot: result.semanticRoot}, result.counts, sessions);
        const counts = result.counts;
        return {sessions: counts.operator_sessions ?? 0, turns: counts.turns ?? 0, pins: counts.session_pins ?? 0, proposals: counts.session_proposals ?? 0, semanticRoot: result.semanticRoot, builtAt: new Date().toISOString()};
    }

    /** Open and admit a published generation for read-only queries; fails closed on missing/stale/corrupt/journal-drift. */
    static async open(indexRoot: string, sessionsRoot: string): Promise<SessionIndex> {
        const manifest = readManifest(indexRoot);
        if (manifest === null || !existsSync(join(indexRoot, `${SESSION_STORE_KIND}.sqlite`))) {
            throw new SessionIndexError('SESSION_INDEX_MISSING', indexRoot, 'no readable session index manifest or database');
        }
        if (manifest.databaseSchemaVersion !== SESSION_INDEX_DATABASE_SCHEMA_VERSION) {
            throw new SessionIndexError('SESSION_INDEX_SCHEMA_MISMATCH', indexRoot, `database schema ${manifest.databaseSchemaVersion} is unsupported`);
        }
        const store = await openSessionStore(indexRoot, true);
        try {
            await admitStore(store, manifest, sessionsRoot);
        } catch (error) {
            await store.close().catch(() => undefined);
            throw error;
        }
        return new SessionIndex(store, manifest);
    }

    /** Replace one session's rows from its journal without rebuilding the whole index. */
    static async incrementalUpdate(indexRoot: string, sessionsRoot: string, operatorSessionId: string, laneId: string): Promise<SessionUpdateResult> {
        const manifest = readManifest(indexRoot);
        if (manifest === null) throw new SessionIndexError('SESSION_INDEX_MISSING', indexRoot, 'incremental update requires an existing index');
        const store = await openSessionStore(indexRoot, false);
        try {
            await admitGeneration(store, manifest);
            const source = readOperatorSession(sessionsRoot, operatorSessionId);
            const rows = source === null ? null : buildSessionRows(source);
            if (rows !== null) assertLane([rows], laneId);
            const turnIds = new Set((await store.list('turns')).filter((row) => row.operator_session_id === operatorSessionId).map((row) => row.turn_id as string));
            const inTurn = (row: TypedRow): boolean => turnIds.has(row.turn_id as string);
            const inSession = (row: TypedRow): boolean => row.operator_session_id === operatorSessionId;
            const deletes: [string, (SqliteValue | readonly SqliteValue[])[]][] = [
                ['turn_reference_capsules', await keysToDelete(store, 'turn_reference_capsules', (row) => turnIds.has(row.source_turn_id as string), (row) => row.source_turn_id)],
                ['turn_open_questions', await keysToDelete(store, 'turn_open_questions', inTurn, (row) => [row.turn_id, row.question_index])],
                ['turn_refs', await keysToDelete(store, 'turn_refs', inTurn, (row) => [row.turn_id, row.ref_type, row.ref_value])],
                ['session_proposals', await keysToDelete(store, 'session_proposals', inSession, (row) => row.proposal_id)],
                ['session_pins', await keysToDelete(store, 'session_pins', inSession, (row) => [row.operator_session_id, row.ref_type, row.ref_value])],
                ['turns', [...turnIds]],
                ['operator_sessions', (await store.getByPrimaryKey('operator_sessions', operatorSessionId)) === undefined ? [] : [operatorSessionId]]
            ];
            await store.transaction(async (transaction) => {
                for (const [table, keys] of deletes) for (const key of keys) await transaction.deleteByPrimaryKey(table, key);
                if (rows !== null) await insertSessionRows(transaction, [rows]);
            });
            const semanticRoot = await republishManifest(store, indexRoot, laneId);
            return {operatorSessionId, turnsIndexed: rows === null ? 0 : rows.turns.length, semanticRoot};
        } finally {
            await store.close();
        }
    }

    private context(): reads.SessionReadContext {
        const provenance: SessionProvenance = {semanticRoot: this.manifest.semanticRoot, databaseSchemaVersion: this.manifest.databaseSchemaVersion, compilerVersion: this.manifest.compilerVersion, checkpoint: this.manifest.checkpoint};
        return {store: this.store, provenance: () => provenance};
    }

    get laneId(): string { return this.manifest.laneId; }
    get semanticRoot(): string { return this.manifest.semanticRoot; }
    getSession(id: string) { return reads.getSession(this.context(), id); }
    listSessions(filters: SessionFilters = {}, limit?: number, cursor?: string) { return reads.listSessions(this.context(), filters, limit, cursor); }
    getTurn(id: string) { return reads.getTurn(this.context(), id); }
    listTurns(sessionId: string, filters: TurnFilters = {}, limit?: number, cursor?: string) { return reads.listTurns(this.context(), sessionId, filters, limit, cursor); }
    getTurnExcerpt(id: string, which: 'operator' | 'coordinator') { return reads.getTurnExcerpt(this.context(), id, which); }
    getPin(sessionId: string, refType: string, refValue: string) { return reads.getPin(this.context(), sessionId, refType, refValue); }
    listPins(sessionId: string, limit?: number, cursor?: string) { return reads.listPins(this.context(), sessionId, limit, cursor); }
    getProposal(id: string) { return reads.getProposal(this.context(), id); }
    listProposals(sessionId: string, filters: ProposalFilters = {}, limit?: number, cursor?: string) { return reads.listProposals(this.context(), sessionId, filters, limit, cursor); }
    listOpenQuestions(turnId: string, limit?: number, cursor?: string) { return reads.listOpenQuestions(this.context(), turnId, limit, cursor); }

    /**
     * Resolve a cross-session capsule on behalf of a requesting operator session.
     * The requesting session must exist in this lane; its lane is compared to the
     * source turn's lane before any source content is read.
     */
    async getReferenceCapsule(requestingOperatorSessionId: string, sourceTurnId: string): Promise<ReferenceCapsule> {
        const requester = await this.store.getByPrimaryKey('operator_sessions', requestingOperatorSessionId);
        if (requester === undefined) throw new SessionIndexError('OPERATOR_SESSION_REFERENCE_DENIED', requestingOperatorSessionId, 'requesting operator session is not authorized in this lane');
        return resolveCapsule(this.store, requester.lane_id as string, sourceTurnId);
    }

    async close(): Promise<void> { await this.store.close(); }
}
