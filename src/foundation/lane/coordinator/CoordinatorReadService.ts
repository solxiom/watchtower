import {join} from 'node:path';
import type {JsonObject, JsonValue} from '../../../contracts/index.js';
import {RelevantLaneDiscovery, selectLane} from '../../discovery/index.js';
import type {DiscoveredLane} from '../../discovery/index.js';
import {NodeCoordinatorReadFileStore, type CoordinatorReadFileStore} from './CoordinatorReadFileStore.js';
import {failure, hasExactShape, isJsonObject, objectField, readFailure, stringField, type ReadResult} from './coordinatorReadContracts.js';
import {parseReadySetProjection} from '../../scheduling/index.js';
import {IndexQuery, IndexStore} from '../../index/index.js';
import type {BatchIndexEntry, RequirementIndexEntry} from '../../../contracts/index.js';
import {IndexQueryError as TypedIndexQueryError} from '../../../contracts/index.js';

export interface CoordinatorReadQuery { readonly cwd: string; readonly workspace?: string; readonly lane?: string; readonly environment?: NodeJS.ProcessEnv; }
export interface CoordinatorReadTarget { readonly lane: DiscoveredLane; readonly fileStore: CoordinatorReadFileStore; }
export interface CoordinatorReadServiceOptions { readonly discovery?: RelevantLaneDiscovery; readonly fileStore?: CoordinatorReadFileStore; }
export type EventReadAction = 'tail' | 'latest';

type ReadObject = ReadResult<JsonObject>;
const POINTER_KEYS = ['indexId', 'packSealId', 'databaseSchemaVersion', 'compilerVersion', 'manifestDigest'] as const;
const EVENT_KEYS = ['schemaVersion', 'eventId', 'type', 'laneId', 'correlationId', 'producer', 'policyVersion', 'payload'] as const;
const EVENT_TYPES = new Set(['coordinator-triggered', 'coordinator-cycle-started', 'coordinator-cycle-complete', 'coordinator-route-unavailable', 'coordinator-effect-attempted', 'coordinator-effect-verified', 'publication-partial']);
const DECISION_CLASSES = new Set(['D1', 'D2', 'D3']);

function objectResult(result: ReadResult<JsonValue>): ReadObject {
    if (!result.ok) return result;
    return isJsonObject(result.value) ? {ok: true, value: result.value} : readFailure('COORDINATOR_SCHEMA_MISMATCH', 'projection');
}

function readObject(files: CoordinatorReadFileStore, laneDir: string, path: string): ReadObject { return objectResult(files.readJson(laneDir, path)); }
function unavailable(path: string, reason: 'COORDINATOR_INDEX_UNAVAILABLE' | 'COORDINATOR_CYCLE_UNAVAILABLE' | 'COORDINATOR_BATCH_NOT_FOUND' | 'COORDINATOR_REQUIREMENT_NOT_FOUND'): JsonObject { return failure(reason, path); }
function envelope(lane: string, operation: string, data: JsonValue): JsonObject { return {schemaVersion: 1, laneId: lane, operation, ok: true, data}; }
function validId(value: string): boolean { return /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u.test(value); }
function scalar(value: JsonValue | undefined): JsonValue | undefined { return value === null || typeof value === 'string' || typeof value === 'boolean' || typeof value === 'number' ? value : undefined; }
function selectScalars(value: JsonObject, keys: readonly string[]): JsonObject {
    const entries: Array<[string, JsonValue]> = [];
    for (const key of keys) { const selected = scalar(value[key]); if (selected !== undefined) entries.push([key, selected]); }
    return Object.fromEntries(entries);
}
function batchIndexValue(value: BatchIndexEntry): JsonObject { return {id: value.id, title: value.title, primaryRepository: value.primaryRepository, workBrief: value.workBrief, reviewBrief: value.reviewBrief, implementationReasoning: value.implementationReasoning, reviewReasoning: value.reviewReasoning, workload: value.workload}; }
function requirementIndexValue(value: RequirementIndexEntry): JsonObject { return {id: value.id, repository: value.repository, source: value.source}; }
function coordinatorIndexReason(error: unknown): 'COORDINATOR_INDEX_UNAVAILABLE' | 'COORDINATOR_INDEX_STALE' | 'COORDINATOR_INDEX_SCHEMA_MISMATCH' | 'COORDINATOR_INDEX_CORRUPT' {
    if (error instanceof TypedIndexQueryError) {
        if (error.reason === 'INDEX_UNAVAILABLE') return 'COORDINATOR_INDEX_UNAVAILABLE';
        if (error.reason === 'INDEX_STALE') return 'COORDINATOR_INDEX_STALE';
        if (error.reason === 'INDEX_SCHEMA_MISMATCH') return 'COORDINATOR_INDEX_SCHEMA_MISMATCH';
    }
    return 'COORDINATOR_INDEX_CORRUPT';
}
function cycleValue(value: JsonObject, path: string): ReadResult<JsonObject> {
    const cycleId = stringField(value, 'cycleId'); if (cycleId === null) return readFailure('COORDINATOR_SCHEMA_MISMATCH', path);
    const entries: Array<[string, JsonValue]> = [['cycleId', cycleId]];
    for (const key of ['routing', 'guards', 'endpoint', 'proposal', 'effect']) { const field = objectField(value, key); if (field !== null) entries.push([key, selectScalars(field, ['rule', 'decisionClass', 'endpointId', 'status', 'reason', 'verified', 'outcome', 'effectId'])]); }
    return {ok: true, value: Object.fromEntries(entries)};
}
function eventValue(value: JsonObject, path: string): ReadResult<JsonObject> {
    if (!hasExactShape(value, EVENT_KEYS, [...EVENT_KEYS, 'batchId', 'cycleId'])) return readFailure('COORDINATOR_SCHEMA_MISMATCH', path);
    const schemaVersion = value.schemaVersion; const eventId = stringField(value, 'eventId'); const type = stringField(value, 'type'); const laneId = stringField(value, 'laneId'); const correlationId = stringField(value, 'correlationId'); const producer = stringField(value, 'producer'); const policyVersion = stringField(value, 'policyVersion'); const payload = objectField(value, 'payload');
    if (schemaVersion !== 1 || eventId === null || type === null || laneId === null || correlationId === null || producer === null || policyVersion === null || payload === null || !EVENT_TYPES.has(type)) return readFailure('COORDINATOR_SCHEMA_MISMATCH', path);
    const topBatch = scalar(value.batchId);
    return {ok: true, value: {schemaVersion: 1, eventId, type, laneId, correlationId, producer, policyVersion, ...(topBatch === undefined ? {} : {batchId: topBatch}), payload: selectScalars(payload, ['batchId', 'triggerId', 'decisionClass', 'cycleId', 'outcome', 'reason'])}};
}

export function projectEvents(events: readonly JsonObject[], action: EventReadAction, batch: string | undefined, since: string | undefined, limit: number): JsonValue {
    if (action === 'tail' && batch !== undefined) return failure('COORDINATOR_ARGUMENT_INVALID', '--batch is only valid for events latest');
    if (action === 'latest' && since !== undefined) return failure('COORDINATOR_ARGUMENT_INVALID', '--since is only valid for events tail');
    let selected = [...events];
    if (action === 'latest' && batch !== undefined) selected = selected.filter(item => stringField(item, 'batchId') === batch || stringField(objectField(item, 'payload') ?? {}, 'batchId') === batch);
    if (action === 'tail' && since !== undefined) {
        const cursor = selected.findIndex(item => stringField(item, 'eventId') === since);
        if (cursor < 0) return failure('COORDINATOR_CURSOR_INVALID', since);
        selected = selected.slice(cursor + 1);
    }
    if (action === 'latest') {
        const latest = selected.at(-1);
        if (latest === undefined) return failure('COORDINATOR_EVENT_UNAVAILABLE', batch ?? 'latest');
        return {items: [latest], hasMore: false, cursor: stringField(latest, 'eventId')};
    }
    const items = selected.slice(-limit);
    return {items, hasMore: selected.length > items.length, cursor: items.length === 0 ? null : stringField(items.at(-1) as JsonObject, 'eventId')};
}

export class CoordinatorReadService {
    private readonly discovery: RelevantLaneDiscovery;
    private readonly files: CoordinatorReadFileStore;
    constructor(options: CoordinatorReadServiceOptions = {}) { this.discovery = options.discovery ?? new RelevantLaneDiscovery(); this.files = options.fileStore ?? new NodeCoordinatorReadFileStore(); }

    resolve(query: CoordinatorReadQuery): CoordinatorReadTarget {
        const relevant = this.discovery.discover(query);
        return {lane: selectLane(relevant.lanes, query), fileStore: this.files};
    }

    indexStatus(query: CoordinatorReadQuery): JsonValue {
        const {lane} = this.resolve(query); const path = 'coordinator/index/pack/current.json'; const pointer = readObject(this.files, lane.laneDir, path);
        if (!pointer.ok) return unavailable(path, 'COORDINATOR_INDEX_UNAVAILABLE');
        if (!hasExactShape(pointer.value, POINTER_KEYS, POINTER_KEYS)) return failure('COORDINATOR_SCHEMA_MISMATCH', path);
        const indexId = stringField(pointer.value, 'indexId'); const packSealId = stringField(pointer.value, 'packSealId'); const compilerVersion = stringField(pointer.value, 'compilerVersion'); const manifestDigest = stringField(pointer.value, 'manifestDigest');
        if (indexId === null || packSealId === null || compilerVersion === null || manifestDigest === null) return failure('COORDINATOR_SCHEMA_MISMATCH', path);
        return envelope(lane.laneId, 'coordinator.index.status', {available: true, indexId, packSealId, compilerVersion, manifestDigest});
    }

    async indexVerify(query: CoordinatorReadQuery): Promise<JsonValue> {
        const {lane} = this.resolve(query); const path = 'coordinator/index/pack/current.json'; const pointer = readObject(this.files, lane.laneDir, path);
        if (!pointer.ok) return unavailable(path, 'COORDINATOR_INDEX_UNAVAILABLE');
        if (!hasExactShape(pointer.value, POINTER_KEYS, POINTER_KEYS)) return failure('COORDINATOR_SCHEMA_MISMATCH', path);
        const indexId = stringField(pointer.value, 'indexId'); if (indexId === null) return failure('COORDINATOR_SCHEMA_MISMATCH', path);
        const indexPath = this.files.path(lane.laneDir, join('coordinator/index/pack', indexId));
        if (indexPath === undefined) return failure('COORDINATOR_INDEX_UNAVAILABLE', indexId);
        let store: IndexStore;
        try { store = await IndexStore.openIndex(indexPath); } catch (error: unknown) { return failure(coordinatorIndexReason(error), indexId); }
        try {
            const result = await store.verifyAndBuildTables();
            if (!result.report.ok) {
                const stale = result.report.details.some(detail => detail.includes('semantic root'));
                return failure(stale ? 'COORDINATOR_INDEX_STALE' : 'COORDINATOR_INDEX_CORRUPT', indexId);
            }
            return envelope(lane.laneId, 'coordinator.index.verify', {verified: true, indexId, reason: null});
        } finally { await store.close(); }
    }

    async indexExplain(query: CoordinatorReadQuery, subject: string): Promise<JsonValue> {
        const {lane} = this.resolve(query); if (!validId(subject)) return failure('COORDINATOR_ARGUMENT_INVALID', subject);
        const pointer = readObject(this.files, lane.laneDir, 'coordinator/index/pack/current.json');
        if (!pointer.ok) return unavailable('coordinator/index/pack/current.json', 'COORDINATOR_INDEX_UNAVAILABLE');
        if (!hasExactShape(pointer.value, POINTER_KEYS, POINTER_KEYS)) return failure('COORDINATOR_SCHEMA_MISMATCH', 'coordinator/index/pack/current.json');
        const indexId = stringField(pointer.value, 'indexId'); if (indexId === null) return failure('COORDINATOR_SCHEMA_MISMATCH', 'current.json');
        const kind = subject.startsWith('requirement:') ? 'requirement' : subject.startsWith('batch:') ? 'batch' : null;
        const id = kind === null ? subject : subject.slice(kind.length + 1);
        if (kind === null && !subject.startsWith('req-') && !subject.startsWith('batch-')) return failure('COORDINATOR_ARGUMENT_INVALID', subject);
        const resolvedKind = kind ?? (subject.startsWith('req-') ? 'requirement' : 'batch');
        if (!validId(id)) return failure('COORDINATOR_ARGUMENT_INVALID', subject);
        const indexPath = this.files.path(lane.laneDir, join('coordinator/index/pack', indexId));
        if (indexPath === undefined) return failure('COORDINATOR_INDEX_UNAVAILABLE', indexId);
        let store: IndexStore;
        try { store = await IndexStore.openIndex(indexPath); } catch (error: unknown) { return failure(coordinatorIndexReason(error), indexId); }
        try {
            const index = new IndexQuery(store);
            if (resolvedKind === 'batch') {
                const value = await index.getBatch(id);
                if (value === null) return unavailable(id, 'COORDINATOR_BATCH_NOT_FOUND');
                return envelope(lane.laneId, 'coordinator.index.explain', {subject, kind: resolvedKind, id, indexId, value: batchIndexValue(value)});
            }
            const value = await index.getRequirement(id);
            if (value === null) return unavailable(id, 'COORDINATOR_REQUIREMENT_NOT_FOUND');
            return envelope(lane.laneId, 'coordinator.index.explain', {subject, kind: resolvedKind, id, indexId, value: requirementIndexValue(value)});
        } catch (error: unknown) { return failure(coordinatorIndexReason(error), indexId); }
        finally { await store.close(); }
    }

    coordinatorStatus(query: CoordinatorReadQuery): JsonValue {
        const {lane} = this.resolve(query); const paths = ['coordinator/queue.json', 'coordinator/cursor.json', 'coordinator/projections/lane-state.json']; const data: Record<string, JsonValue> = {};
        for (const path of paths) { const result = this.files.readJson(lane.laneDir, path); if (!result.ok || !isJsonObject(result.value)) { data[path] = failure('COORDINATOR_SCHEMA_MISMATCH', path); } else data[path] = selectScalars(result.value, path.includes('queue') ? ['schemaVersion', 'queueDepth', 'activeCycle'] : path.includes('cursor') ? ['schemaVersion', 'offset', 'revision'] : ['schemaVersion', 'lifecycle', 'activeCycle', 'lastOutcome']); }
        return envelope(lane.laneId, 'coordinator.status', data);
    }

    context(query: CoordinatorReadQuery, trigger: string, decisionClass: string): JsonValue {
        const {lane} = this.resolve(query); if (!DECISION_CLASSES.has(decisionClass) || !validId(trigger)) return failure('COORDINATOR_ARGUMENT_INVALID', `${decisionClass}:${trigger}`);
        const events = this.validEvents(lane.laneDir); if (!events.ok) return failure(events.reason, events.path, events.line);
        const event = events.value.find(item => stringField(item.value, 'eventId') === trigger);
        if (event === undefined) return failure('COORDINATOR_CYCLE_UNAVAILABLE', trigger);
        const latest = this.latestCycle(lane.laneDir); if (!latest.ok) return failure(latest.reason, latest.path, latest.line);
        const cycle = cycleValue(latest.value, 'latest-cycle'); if (!cycle.ok) return failure(cycle.reason, cycle.path, cycle.line);
        return envelope(lane.laneId, 'coordinator.context', {trigger, decisionClass, bounded: true, latestCycle: cycle.value, event: event.value});
    }

    explain(query: CoordinatorReadQuery, cycle: string | undefined): JsonValue {
        const {lane} = this.resolve(query); const latest = this.latestCycle(lane.laneDir); if (!latest.ok) return failure(latest.reason, latest.path, latest.line);
        if (cycle !== undefined && (!validId(cycle) || stringField(latest.value, 'cycleId') !== cycle)) return unavailable(cycle, 'COORDINATOR_CYCLE_UNAVAILABLE');
        const explanation = cycleValue(latest.value, 'latest-cycle'); if (!explanation.ok) return failure(explanation.reason, explanation.path, explanation.line);
        return envelope(lane.laneId, 'coordinator.explain', explanation.value);
    }

    events(query: CoordinatorReadQuery, action: EventReadAction, batch: string | undefined, since: string | undefined, limit: number): JsonValue {
        const {lane} = this.resolve(query); if ((batch !== undefined && !validId(batch)) || (since !== undefined && !validId(since))) return failure('COORDINATOR_ARGUMENT_INVALID', batch ?? since ?? '');
        const events = this.validEvents(lane.laneDir); if (!events.ok) return failure(events.reason, events.path, events.line);
        return envelope(lane.laneId, `events.${action}`, projectEvents(events.value.map(item => item.value), action, batch, since, limit));
    }

    ready(query: CoordinatorReadQuery): JsonValue {
        const {lane} = this.resolve(query); const path = 'coordinator/projections/ready-set.json'; const result = readObject(this.files, lane.laneDir, path); if (!result.ok) return failure('COORDINATOR_READY_SET_INVALID', path);
        const parsed = parseReadySetProjection(result.value); if (!parsed.ok) return failure('COORDINATOR_READY_SET_INVALID', path);
        const blocked: JsonObject[] = parsed.value.blocked.map(item => ({batchId: item.batchId, reasons: item.reasons.map(reason => ({code: reason.code, detail: reason.detail}))}));
        return envelope(lane.laneId, 'batch.ready', {pendingBatchIds: parsed.value.pendingBatchIds, candidateBatchIds: parsed.value.candidateBatchIds, classification: parsed.value.classification, populationReason: parsed.value.populationReason, blocked});
    }

    private validEvents(laneDir: string): ReadResult<readonly {readonly line: number; readonly value: JsonObject}[]> {
        const result = this.files.readJsonLines(laneDir, 'coordinator/journal/coordinator-events.jsonl'); if (!result.ok) return result;
        const values: {line: number; value: JsonObject}[] = [];
        for (const record of result.value) {
            if (!isJsonObject(record.value)) return readFailure('COORDINATOR_SCHEMA_MISMATCH', 'coordinator-events.jsonl', record.line);
            const event = eventValue(record.value, 'coordinator-events.jsonl'); if (!event.ok) return readFailure(event.reason, event.path, record.line);
            values.push({line: record.line, value: event.value});
        }
        const cursorPath = 'coordinator/cursor.json';
        if (this.files.exists(laneDir, cursorPath)) {
            const cursor = readObject(this.files, laneDir, cursorPath);
            if (!cursor.ok) return readFailure(cursor.reason, cursor.path, cursor.line);
            if (Object.hasOwn(cursor.value, 'lastProcessedEventId')) {
                const cursorId = stringField(cursor.value, 'lastProcessedEventId');
                if (cursorId === null || !values.some(item => stringField(item.value, 'eventId') === cursorId)) return readFailure('COORDINATOR_CURSOR_INVALID', cursorPath);
            }
        }
        return {ok: true, value: values};
    }

    private latestCycle(laneDir: string): ReadResult<JsonObject> {
        const candidates = ['coordinator/projections/latest-cycle.json', 'coordinator/cycles/latest/outcome.json'];
        for (const path of candidates) {
            const result = readObject(this.files, laneDir, path);
            if (result.ok || this.files.exists(laneDir, path)) return result;
        }
        return readFailure('COORDINATOR_CYCLE_UNAVAILABLE', candidates[0]);
    }
}
