/**
 * The bounded typed queries the CA-16 brief names, over the verified session
 * store: no SQL in or out, no journal fallback, the section 9.4 envelope on
 * every result, and the accepted CA-02 cursor (`index/query/queryCursor.ts`)
 * for pagination, whose refusals become QUERY_CURSOR_INVALID/QUERY_LIMIT_INVALID.
 * Bounded means bounded *work*, never a narrowed search population: filters run
 * over the complete table through chunked key ranges, and a population past the
 * declared maximum refuses rather than truncating a valid query silently.
 */
import {IndexQueryError, SessionIndexError} from '../../../contracts/index.js';
import type {
    OpenQuestionRecord, PinRecord, ProposalFilters, ProposalRecord, SessionFilters, SessionIndexRecord,
    SessionIndexReason, SessionProvenance, SessionQueryPage, TurnExcerpt, TurnFilters, TurnIndexRecord
} from '../../../contracts/index.js';
import type {DerivedStore, SqliteValue, TypedRow} from '../../storage/index.js';
import {digest, paginateIds} from '../query/index.js';

export const MAX_RECORDS = 100;
export const DEFAULT_MAX_BYTES = 65536;
/** A query is complete over at most this many examined rows, then refuses; it never narrows its search population and never scans past its own bound. */
export const MAX_POPULATION = 10000;
const POPULATION_CHUNK = 200;

export interface SessionReadContext {readonly store: DerivedStore; readonly provenance: () => SessionProvenance;}

const num = (value: unknown): number => Number(value);
const text = (value: unknown): string => String(value);
const absent = (value: unknown): boolean => value === null || value === undefined;
const optText = (value: unknown): string | null => (absent(value) ? null : String(value));
const optNum = (value: unknown): number | null => (absent(value) ? null : Number(value));

const toSession = (row: TypedRow): SessionIndexRecord => ({
    operatorSessionId: text(row.operator_session_id), laneId: text(row.lane_id), origin: text(row.origin) as SessionIndexRecord['origin'],
    policyProfileId: text(row.policy_profile_id), state: text(row.state) as SessionIndexRecord['state'], topic: text(row.topic),
    createdAt: text(row.created_at), lastTurnAt: optText(row.last_turn_at), turnCount: num(row.turn_count),
    parentOperatorSessionId: optText(row.parent_operator_session_id), budgetSegmentId: text(row.budget_segment_id),
    journalCheckpoint: text(row.journal_checkpoint), contentRoot: text(row.content_root)
});

const toTurn = (row: TypedRow): TurnIndexRecord => ({
    turnId: text(row.turn_id), operatorSessionId: text(row.operator_session_id), turnNumber: num(row.turn_number),
    state: text(row.state) as TurnIndexRecord['state'], decisionClass: optText(row.decision_class) as TurnIndexRecord['decisionClass'],
    routingRuleId: optText(row.routing_rule_id), endpointId: optText(row.endpoint_id), snapshotRevision: optNum(row.snapshot_revision),
    stale: num(row.stale) === 1, completedAt: optText(row.completed_at), contentExcerpt: text(row.content_excerpt),
    answerExcerpt: text(row.answer_excerpt), inputTokens: optNum(row.input_tokens), outputTokens: optNum(row.output_tokens),
    telemetryQuality: text(row.telemetry_quality) as TurnIndexRecord['telemetryQuality'],
    operatorBytes: num(row.operator_bytes), coordinatorBytes: num(row.coordinator_bytes)
});

const toPin = (row: TypedRow): PinRecord => ({operatorSessionId: text(row.operator_session_id),
    refType: text(row.ref_type) as PinRecord['refType'], refValue: text(row.ref_value), pinnedAt: text(row.pinned_at)});

const toProposal = (row: TypedRow): ProposalRecord => ({
    proposalId: text(row.proposal_id), operatorSessionId: text(row.operator_session_id), sourceTurnId: text(row.source_turn_id),
    proposalType: text(row.proposal_type) as ProposalRecord['proposalType'], state: text(row.state) as ProposalRecord['state'],
    createdAt: text(row.created_at), expiresAt: text(row.expires_at)
});

const tooMany = (subject: string, max: number): never => {throw new SessionIndexError('QUERY_LIMIT_INVALID', subject, `the examined population exceeds the bounded maximum of ${max}`);};

/**
 * Complete population read over a unique-key table: fixed-size key ranges rather than a recent window, so a
 * filter never loses an older match. The bound is on rows *examined*, not rows kept, so a large nonmatching
 * table refuses at the declared maximum instead of being traversed to its end.
 */
async function scan(ctx: SessionReadContext, table: string, key: string, subject: string, keep: (row: TypedRow) => boolean): Promise<TypedRow[]> {
    const kept: TypedRow[] = [];
    let scanned = 0;
    for (let from = '';;) {
        const chunk = await ctx.store.listFrom(table, key, from, POPULATION_CHUNK);
        const fresh = chunk.filter((row) => from === '' || String(row[key]) > from);
        scanned += fresh.length;
        if (scanned > MAX_POPULATION) tooMany(subject, MAX_POPULATION);
        kept.push(...fresh.filter(keep));
        if (chunk.length < POPULATION_CHUNK) return kept;
        from = String(chunk[chunk.length - 1][key]);
    }
}

/** A keyed bounded read that refuses rather than silently truncating when its population saturates the bound. */
async function keyed(ctx: SessionReadContext, table: string, column: string, value: string, subject: string): Promise<readonly TypedRow[]> {
    const rows = await ctx.store.listByColumn(table, column, value, MAX_RECORDS + 1);
    return rows.length > MAX_RECORDS ? tooMany(subject, MAX_RECORDS) : rows;
}

function validLimit(limit: number | undefined, subject: string): number {
    const resolved = limit ?? MAX_RECORDS;
    if (!Number.isInteger(resolved) || resolved < 1 || resolved > MAX_RECORDS) throw new SessionIndexError('QUERY_LIMIT_INVALID', subject, `limit must be within 1..${MAX_RECORDS}`);
    return resolved;
}
/** A single primary-key lookup that refuses with the table's own typed not-found reason. */
async function one(ctx: SessionReadContext, table: string, key: SqliteValue | readonly SqliteValue[], reason: SessionIndexReason, subject: string, what: string): Promise<TypedRow> {
    const row = await ctx.store.getByPrimaryKey(table, key);
    if (row === undefined) throw new SessionIndexError(reason, subject, `no such ${what} in this lane`);
    return row;
}
/** Slice an ordered id list by cursor/limit and byte cap, then resolve ids to typed items with the 9.4 envelope. */
function page<T>(ctx: SessionReadContext, ids: string[], resolve: (id: string) => T, opts: {limit?: number; cursor?: string; maxBytes?: number; queryKey: string; subject: string}): SessionQueryPage<T> {
    const maxRecords = validLimit(opts.limit, opts.subject);
    const maxBytes = opts.maxBytes ?? DEFAULT_MAX_BYTES;
    const queryDigest = digest(opts.queryKey);
    const revision = ctx.provenance().semanticRoot;
    const first = slice(ids, {limit: maxRecords, cursor: opts.cursor, queryDigest, revision, subject: opts.subject});
    let items = first.pageIds.map(resolve);
    let returnedBytes = Buffer.byteLength(JSON.stringify(items), 'utf8');
    let result = first;
    if (returnedBytes > maxBytes && items.length > 1) {
        const kept = byteCap(items, maxBytes);
        result = slice(ids, {limit: Math.max(kept, 1), cursor: opts.cursor, queryDigest, revision, subject: opts.subject});
        items = result.pageIds.map(resolve);
        returnedBytes = Buffer.byteLength(JSON.stringify(items), 'utf8');
    }
    return {items, truncated: result.truncated, maxRecords, maxBytes, returnedBytes, nextCursor: result.nextCursor, provenance: ctx.provenance()};
}

function byteCap<T>(items: readonly T[], maxBytes: number): number {
    let total = 2;
    for (let index = 0; index < items.length; index += 1) {
        total += Buffer.byteLength(JSON.stringify(items[index]), 'utf8') + 1;
        if (total > maxBytes) return Math.max(index, 1);
    }
    return items.length;
}
/** Deduplicate the ordered records into the id list the shared cursor pages over, and resolve each page id back to its record. */
function byKey<T>(rows: readonly T[], keyOf: (item: T) => string): {ids: string[]; resolve: (id: string) => T} {
    const map = new Map(rows.map((item) => [keyOf(item), item]));
    return {ids: [...map.keys()], resolve: (id) => map.get(id) as T};
}
function slice(ids: string[], input: {limit: number; cursor?: string; queryDigest: string; revision: string; subject: string}) {
    try { return paginateIds({ids, ...input}); } catch (error) {
        if (!(error instanceof IndexQueryError)) throw error;
        throw new SessionIndexError(error.reason === 'INDEX_LIMIT_EXCEEDED' ? 'QUERY_LIMIT_INVALID' : 'QUERY_CURSOR_INVALID', input.subject, error.message);
    }
}

export const getSession = async (ctx: SessionReadContext, operatorSessionId: string): Promise<SessionIndexRecord> =>
    toSession(await one(ctx, 'operator_sessions', operatorSessionId, 'SESSION_NOT_FOUND', operatorSessionId, 'operator session'));

export async function listSessions(ctx: SessionReadContext, filters: SessionFilters, limit?: number, cursor?: string): Promise<SessionQueryPage<SessionIndexRecord>> {
    const rows = (await scan(ctx, 'operator_sessions', 'operator_session_id', 'listSessions', (row) =>
        (filters.state === undefined || row.state === filters.state)
        && (filters.origin === undefined || row.origin === filters.origin)
        && (filters.parentOperatorSessionId === undefined || row.parent_operator_session_id === filters.parentOperatorSessionId))).map(toSession);
    rows.sort((left, right) => (right.lastTurnAt ?? '').localeCompare(left.lastTurnAt ?? '') || left.operatorSessionId.localeCompare(right.operatorSessionId));
    const paged = byKey(rows, (session) => session.operatorSessionId);
    return page(ctx, paged.ids, paged.resolve, {limit, cursor, queryKey: `listSessions:${JSON.stringify(filters)}`, subject: 'listSessions'});
}

export const getTurn = async (ctx: SessionReadContext, turnId: string): Promise<TurnIndexRecord> =>
    toTurn(await one(ctx, 'turns', turnId, 'TURN_NOT_FOUND', turnId, 'turn'));

export async function listTurns(ctx: SessionReadContext, operatorSessionId: string, filters: TurnFilters, limit?: number, cursor?: string): Promise<SessionQueryPage<TurnIndexRecord>> {
    const rows = (await scan(ctx, 'turns', 'turn_id', 'listTurns', (row) => row.operator_session_id === operatorSessionId
        && (filters.state === undefined || row.state === filters.state)
        && (filters.decisionClass === undefined || row.decision_class === filters.decisionClass)
        && (filters.stale === undefined || (row.stale === 1) === filters.stale))).map(toTurn);
    rows.sort((left, right) => left.turnNumber - right.turnNumber);
    const paged = byKey(rows, (turn) => turn.turnId);
    return page(ctx, paged.ids, paged.resolve, {limit, cursor, queryKey: `listTurns:${operatorSessionId}:${JSON.stringify(filters)}`, subject: 'listTurns'});
}

export async function getTurnExcerpt(ctx: SessionReadContext, turnId: string, which: 'operator' | 'coordinator'): Promise<TurnExcerpt> {
    const turn = await getTurn(ctx, turnId);
    const [excerpt, originalBytes] = which === 'operator' ? [turn.contentExcerpt, turn.operatorBytes] : [turn.answerExcerpt, turn.coordinatorBytes];
    const excerptBytes = Buffer.byteLength(excerpt, 'utf8');
    return {which, excerpt, originalBytes, excerptBytes, incomplete: excerptBytes < originalBytes};
}

export async function getPin(ctx: SessionReadContext, operatorSessionId: string, refType: string, refValue: string): Promise<PinRecord | null> {
    const row = await ctx.store.getByPrimaryKey('session_pins', [operatorSessionId, refType, refValue]);
    return row === undefined ? null : toPin(row);
}

export async function listPins(ctx: SessionReadContext, operatorSessionId: string, limit?: number, cursor?: string): Promise<SessionQueryPage<PinRecord>> {
    const rows = (await keyed(ctx, 'session_pins', 'operator_session_id', operatorSessionId, 'listPins')).map(toPin);
    rows.sort((left, right) => left.pinnedAt.localeCompare(right.pinnedAt) || left.refType.localeCompare(right.refType) || left.refValue.localeCompare(right.refValue));
    const paged = byKey(rows, (pin) => `${pin.refType} ${pin.refValue}`);
    return page(ctx, paged.ids, paged.resolve, {limit, cursor, queryKey: `listPins:${operatorSessionId}`, subject: 'listPins'});
}

export const getProposal = async (ctx: SessionReadContext, proposalId: string): Promise<ProposalRecord> =>
    toProposal(await one(ctx, 'session_proposals', proposalId, 'PROPOSAL_NOT_FOUND', proposalId, 'proposal'));

export async function listProposals(ctx: SessionReadContext, operatorSessionId: string, filters: ProposalFilters, limit?: number, cursor?: string): Promise<SessionQueryPage<ProposalRecord>> {
    const rows = (await scan(ctx, 'session_proposals', 'proposal_id', 'listProposals', (row) => row.operator_session_id === operatorSessionId
        && (filters.state === undefined || row.state === filters.state)
        && (filters.proposalType === undefined || row.proposal_type === filters.proposalType))).map(toProposal);
    rows.sort((left, right) => left.createdAt.localeCompare(right.createdAt) || left.proposalId.localeCompare(right.proposalId));
    const paged = byKey(rows, (proposal) => proposal.proposalId);
    return page(ctx, paged.ids, paged.resolve, {limit, cursor, queryKey: `listProposals:${operatorSessionId}:${JSON.stringify(filters)}`, subject: 'listProposals'});
}

export async function listOpenQuestions(ctx: SessionReadContext, turnId: string, limit?: number, cursor?: string): Promise<SessionQueryPage<OpenQuestionRecord>> {
    const rows = (await keyed(ctx, 'turn_open_questions', 'turn_id', turnId, 'listOpenQuestions')).map((row) => ({turnId: text(row.turn_id), questionIndex: num(row.question_index), questionText: text(row.question_text)}));
    rows.sort((left, right) => left.questionIndex - right.questionIndex);
    const paged = byKey(rows, (question) => String(question.questionIndex));
    return page(ctx, paged.ids, paged.resolve, {limit, cursor, queryKey: `listOpenQuestions:${turnId}`, subject: 'listOpenQuestions'});
}
