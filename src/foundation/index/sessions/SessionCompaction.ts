/**
 * Derived session-store lifecycle and compaction. Owns opening the store, the
 * fail-closed admission gate (integrity, semantic root, index_meta identity,
 * journal continuity against the live lane journals), and atomic
 * `index-manifest.json` publication, which build, incremental update, and
 * compaction all admit and republish through. Compaction (operator-session.md
 * 12) prunes old turn index rows while preserving pinned, recent, and
 * proposal-referenced turns; it touches only `sessions.sqlite` (never journals
 * or turn files), admits before mutating, deletes only proposals owned by the
 * compacted session, and never removes a turn another session's proposal cites.
 */
import {closeSync, fsyncSync, openSync, readFileSync, renameSync, rmSync, writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {SessionIndexError} from '../../../contracts/index.js';
import type {CompactOptions, CompactPreview, CompactResult} from '../../../contracts/index.js';
import {
    computeSemanticRoot, logicalExportCounts, openDerivedStorage, type DerivedStore, type TypedRow
} from '../../storage/index.js';
import {aggregateCheckpoint, liveAggregateCheckpoint, type SessionCheckpointEntry} from './sessionIndexSource.js';
import {
    expectedSessionMetaRows, SESSION_INDEX_COMPILER_VERSION, SESSION_INDEX_DATABASE_SCHEMA_VERSION,
    SESSION_INDEX_SCHEMA, SESSION_STORE_KIND
} from './sessionIndexSchema.js';

export interface SessionManifest {
    readonly databaseSchemaVersion: number;
    readonly compilerVersion: string;
    readonly laneId: string;
    readonly checkpoint: string;
    readonly semanticRoot: string;
}

function fsyncPath(path: string): void { const fd = openSync(path, 'r'); try { fsyncSync(fd); } finally { closeSync(fd); } }

/** Atomically write the session index manifest: temp write, fsync, rename, directory fsync. */
export function writeManifest(indexRoot: string, manifest: SessionManifest, counts: Record<string, number>, sessions: readonly SessionCheckpointEntry[]): void {
    const document = {
        schemaVersion: 1, backend: 'sqlite', storeKind: SESSION_STORE_KIND, databaseSchemaVersion: manifest.databaseSchemaVersion,
        compilerVersion: manifest.compilerVersion, laneId: manifest.laneId, packSealId: null,
        source: {identity: 'operator-session-journals', checkpoint: manifest.checkpoint, sessions},
        semanticRoot: manifest.semanticRoot, counts, builtAt: new Date().toISOString().replace(/\.\d+Z$/, 'Z')
    };
    const staged = join(indexRoot, `.write-${randomUUID()}`);
    try {
        writeFileSync(staged, `${JSON.stringify(document, null, 2)}\n`, 'utf8');
        fsyncPath(staged);
        renameSync(staged, join(indexRoot, 'index-manifest.json'));
        fsyncPath(indexRoot);
    } finally { rmSync(staged, {force: true}); }
}

/** Read and shape-validate the manifest sidecar, or null when it is absent or malformed. */
export function readManifest(indexRoot: string): SessionManifest | null {
    let value: Record<string, unknown>;
    try {
        value = JSON.parse(readFileSync(join(indexRoot, 'index-manifest.json'), 'utf8')) as Record<string, unknown>;
    } catch {
        return null;
    }
    const source = value.source as Record<string, unknown> | undefined;
    if (value.storeKind !== SESSION_STORE_KIND || typeof value.compilerVersion !== 'string' || typeof value.laneId !== 'string'
        || typeof value.semanticRoot !== 'string' || typeof value.databaseSchemaVersion !== 'number' || source === undefined || typeof source.checkpoint !== 'string') {
        return null;
    }
    return {databaseSchemaVersion: value.databaseSchemaVersion, compilerVersion: value.compilerVersion, laneId: value.laneId, checkpoint: source.checkpoint, semanticRoot: value.semanticRoot};
}

/** Open the session store with the shared, typed store-availability error mapping. */
export async function openSessionStore(indexRoot: string, readOnly: boolean): Promise<DerivedStore> {
    try {
        return await openDerivedStorage(indexRoot).open(SESSION_STORE_KIND, SESSION_INDEX_SCHEMA, {readOnly, lockTimeoutMs: readOnly ? undefined : 5000});
    } catch (error) {
        const code = (error as {code?: string}).code;
        if (code === 'ERR_LOCK_CONFLICT') throw new SessionIndexError('SESSION_INDEX_STORE_BUSY', indexRoot, 'session index writer lock is held');
        throw new SessionIndexError('SESSION_INDEX_STORE_UNAVAILABLE', indexRoot, error instanceof Error ? error.message : String(error));
    }
}

/**
 * Admit the published generation itself: integrity, semantic-root reproduction,
 * and `index_meta` identity. Incremental update runs only this half, because it
 * exists precisely to absorb journals that have already moved past the manifest
 * checkpoint — but it must still refuse to extend a corrupt or tampered
 * generation.
 */
export async function admitGeneration(store: DerivedStore, manifest: SessionManifest): Promise<void> {
    if (!(await store.integrityCheck()).ok) throw new SessionIndexError('SESSION_INDEX_CORRUPT', manifest.laneId, 'session index failed the structural integrity check');
    const logical = await store.exportLogical();
    if (computeSemanticRoot(logical) !== manifest.semanticRoot) throw new SessionIndexError('SESSION_INDEX_STALE', manifest.laneId, 'stored rows do not reproduce the manifest semantic root');
    const meta = new Map((logical.tables.find((table) => table.name === 'index_meta')?.rows ?? []).map((row) => [row.key, row.value]));
    for (const [key, value] of expectedSessionMetaRows(manifest.laneId)) {
        if (meta.get(key) !== value) throw new SessionIndexError('SESSION_INDEX_STALE', manifest.laneId, 'stored index_meta identity does not match the manifest');
    }
}

/** Full fail-closed admission for queries and compaction: the generation must be sound *and* current with the live lane journals. */
export async function admitStore(store: DerivedStore, manifest: SessionManifest, sessionsRoot: string): Promise<void> {
    await admitGeneration(store, manifest);
    if (liveAggregateCheckpoint(sessionsRoot, manifest.laneId) !== manifest.checkpoint) throw new SessionIndexError('SESSION_INDEX_STALE', manifest.laneId, 'journal checkpoint disagrees with the live operator-session journals');
}

/** Recompute the semantic root over the current logical export and rewrite the manifest sidecar. */
export async function republishManifest(store: DerivedStore, indexRoot: string, laneId: string): Promise<string> {
    const logical = await store.exportLogical();
    const semanticRoot = computeSemanticRoot(logical);
    const sessions = (logical.tables.find((table) => table.name === 'operator_sessions')?.rows ?? [])
        .map((row) => ({operatorSessionId: row.operator_session_id as string, checkpoint: row.journal_checkpoint as string}));
    writeManifest(indexRoot, {databaseSchemaVersion: SESSION_INDEX_DATABASE_SCHEMA_VERSION, compilerVersion: SESSION_INDEX_COMPILER_VERSION, laneId, checkpoint: aggregateCheckpoint(sessions), semanticRoot}, logicalExportCounts(logical), sessions);
    return semanticRoot;
}

interface CompactionPlan {readonly remove: readonly TypedRow[]; readonly keep: readonly string[]; readonly proposalsToDelete: readonly TypedRow[];}

function requireManifest(indexRoot: string): SessionManifest {
    const manifest = readManifest(indexRoot);
    if (manifest === null) throw new SessionIndexError('SESSION_INDEX_MISSING', indexRoot, 'compaction requires an existing index');
    return manifest;
}

function withinWindow(completedAt: unknown, cutoff: number): boolean { return typeof completedAt !== 'string' || Number.isNaN(Date.parse(completedAt)) || Date.parse(completedAt) >= cutoff; }

async function planCompaction(store: DerivedStore, operatorSessionId: string, options: CompactOptions, now: number): Promise<CompactionPlan> {
    const turns = (await store.list('turns')).filter((row) => row.operator_session_id === operatorSessionId);
    const turnIds = new Set(turns.map((turn) => turn.turn_id as string));
    const proposals = await store.list('session_proposals');
    const preserve = new Set<string>();
    for (const pin of await store.list('session_pins')) {
        if (pin.operator_session_id === operatorSessionId && pin.ref_type === 'turn') preserve.add(pin.ref_value as string);
    }
    // A turn another session's proposal references must never be removed (its owner's proposal may not be deleted here); a
    // turn only this session's own proposals reference is preserved only when the option requests it.
    for (const proposal of proposals) {
        if (turnIds.has(proposal.source_turn_id as string) && (proposal.operator_session_id !== operatorSessionId || options.keepProposalSourceTurns)) preserve.add(proposal.source_turn_id as string);
    }
    if (!options.keepPinnedOnly) {
        const cutoff = now - options.keepRecentDays * 86400000;
        for (const turn of [...turns].sort((left, right) => Number(right.turn_number) - Number(left.turn_number)).slice(0, Math.max(options.keepRecentTurns, 0))) preserve.add(turn.turn_id as string);
        for (const turn of turns) if (withinWindow(turn.completed_at, cutoff)) preserve.add(turn.turn_id as string);
    }
    const remove = turns.filter((turn) => !preserve.has(turn.turn_id as string));
    const removed = new Set(remove.map((turn) => turn.turn_id as string));
    const proposalsToDelete = proposals.filter((row) => row.operator_session_id === operatorSessionId && removed.has(row.source_turn_id as string));
    return {remove, keep: turns.map((turn) => turn.turn_id as string).filter((id) => preserve.has(id)), proposalsToDelete};
}

/** Show which turns compaction would remove, without mutating the index. */
async function previewCompact(indexRoot: string, sessionsRoot: string, operatorSessionId: string, options: CompactOptions, now: number): Promise<CompactPreview> {
    const manifest = requireManifest(indexRoot);
    const store = await openSessionStore(indexRoot, true);
    try {
        await admitStore(store, manifest, sessionsRoot);
        const plan = await planCompaction(store, operatorSessionId, options, now);
        return {removeTurnIds: plan.remove.map((turn) => turn.turn_id as string), keepTurnIds: plan.keep, turnsRemoved: plan.remove.length, turnsKept: plan.keep.length};
    } finally {
        await store.close();
    }
}

/**
 * Prune non-preserved turn rows for one session and republish the manifest.
 * Only index rows change; the append-only journals and turn files are untouched.
 * The index is admitted before any mutation.
 */
async function compact(indexRoot: string, sessionsRoot: string, operatorSessionId: string, options: CompactOptions, now: number): Promise<CompactResult> {
    const manifest = requireManifest(indexRoot);
    const store = await openSessionStore(indexRoot, false);
    try {
        await admitStore(store, manifest, sessionsRoot);
        const plan = await planCompaction(store, operatorSessionId, options, now);
        const remove = new Set(plan.remove.map((turn) => turn.turn_id as string));
        const proposals = new Set(plan.proposalsToDelete.map((row) => row.proposal_id as string));
        const capsules = await store.list('turn_reference_capsules');
        const questions = await store.list('turn_open_questions');
        const refs = await store.list('turn_refs');
        const bytesFreed = plan.remove.reduce((total, turn) => total + Buffer.byteLength(String(turn.content_excerpt), 'utf8')
            + Buffer.byteLength(String(turn.answer_excerpt), 'utf8') + Buffer.byteLength(String(capsules.find((row) => row.source_turn_id === turn.turn_id)?.capsule_json ?? ''), 'utf8'), 0);
        await store.transaction(async (transaction) => {
            for (const proposalId of proposals) await transaction.deleteByPrimaryKey('session_proposals', proposalId);
            for (const row of capsules) if (remove.has(row.source_turn_id as string)) await transaction.deleteByPrimaryKey('turn_reference_capsules', row.source_turn_id);
            for (const row of questions) if (remove.has(row.turn_id as string)) await transaction.deleteByPrimaryKey('turn_open_questions', [row.turn_id, row.question_index]);
            for (const row of refs) if (remove.has(row.turn_id as string)) await transaction.deleteByPrimaryKey('turn_refs', [row.turn_id, row.ref_type, row.ref_value]);
            for (const turnId of remove) await transaction.deleteByPrimaryKey('turns', turnId);
        });
        await republishManifest(store, indexRoot, manifest.laneId);
        return {turnsRemoved: plan.remove.length, turnsKept: plan.keep.length, bytesFreed};
    } finally {
        await store.close();
    }
}

/** Compaction front door for the session index: preview and prune old turn rows, preserving pinned/recent/proposal turns. */
export class SessionCompactor {
    static previewCompact(indexRoot: string, sessionsRoot: string, operatorSessionId: string, options: CompactOptions, now = Date.now()): Promise<CompactPreview> {
        return previewCompact(indexRoot, sessionsRoot, operatorSessionId, options, now);
    }
    static compact(indexRoot: string, sessionsRoot: string, operatorSessionId: string, options: CompactOptions, now = Date.now()): Promise<CompactResult> {
        return compact(indexRoot, sessionsRoot, operatorSessionId, options, now);
    }
}
