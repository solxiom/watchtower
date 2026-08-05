import type {
    BatchProjection, CycleProjection, DurableEvent, LaneEventSummary, ReadyBatchDescriptor, ReadySetProjection
} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {JournalIndex} from './JournalIndex.js';

const DEFAULT_RECENT = 50;
const MAX_PROJECTION_EVENTS = 200;
type ReadyInput = readonly string[] | readonly ReadyBatchDescriptor[];

function payloadValue(event: DurableEvent, key: string): string | null {
    const value = (event.payload as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
}

function stateFor(type: string): string {
    if (type.endsWith('complete') || type === 'accept') return 'complete';
    if (type.endsWith('rejected') || type === 'reject') return 'rejected';
    if (type.endsWith('blocked') || type === 'blocked') return 'blocked';
    if (type.endsWith('attempted')) return 'attempted';
    if (type.endsWith('prepared')) return 'prepared';
    return 'observed';
}

function assertComplete(id: string, hasMore: boolean): void {
    if (hasMore) throw new JournalError('JOURNAL_PROJECTION_BOUNDED', id, `projection exceeds the bounded ${MAX_PROJECTION_EVENTS}-event query limit`);
}

function readyDescriptors(input: ReadyInput): readonly ReadyBatchDescriptor[] {
    return input.map((item) => {
        if (typeof item === 'string') return {id: item, dependsOn: []};
        if (typeof item !== 'object' || item === null || typeof item.id !== 'string' || !Array.isArray(item.dependsOn) || item.dependsOn.some((dependency) => typeof dependency !== 'string')) {
            throw new JournalError('JOURNAL_INVALID_RECORD', 'ready-set', 'ready-set batches require an id and dependency list');
        }
        return {id: item.id, dependsOn: [...item.dependsOn]};
    });
}

export class JournalProjection {
    constructor(private readonly index: JournalIndex, private readonly recentLimit = DEFAULT_RECENT) {
        if (!Number.isSafeInteger(recentLimit) || recentLimit < 1 || recentLimit > MAX_PROJECTION_EVENTS) {
            throw new JournalError('JOURNAL_INVALID_RECORD', 'projection', `recent projection limit must be in 1..${MAX_PROJECTION_EVENTS}`);
        }
    }

    async projectCycleStatus(cycleId: string): Promise<CycleProjection> {
        const page = await this.index.readEventsByColumn('cycle_id', cycleId);
        assertComplete(cycleId, page.hasMore);
        let state = 'unknown', decisionClass: string | null = null, proposalDigest: string | null = null;
        let validationResult: string | null = null, effectOutcome: string | null = null;
        let startedAt: string | null = null, completedAt: string | null = null;
        for (const event of page.items) {
            state = stateFor(event.type);
            startedAt ??= event.at;
            if (event.type === 'coordinator-routed') decisionClass = payloadValue(event, 'decisionClass');
            proposalDigest = payloadValue(event, 'proposalDigest') ?? proposalDigest;
            validationResult = payloadValue(event, 'validationResult') ?? validationResult;
            effectOutcome = payloadValue(event, 'effectOutcome') ?? effectOutcome;
            if (event.type === 'coordinator-cycle-complete') completedAt = event.at;
        }
        return {cycleId, state, decisionClass, proposalDigest, validationResult, effectOutcome, startedAt, completedAt, eventCount: page.items.length};
    }

    async projectBatchStatus(batchId: string): Promise<BatchProjection> {
        const page = await this.index.readEventsByColumn('batch_id', batchId);
        assertComplete(batchId, page.hasMore);
        let state = 'unknown', lastEventType: string | null = null;
        let implementerState: string | null = null, reviewerState: string | null = null;
        const handoffs: string[] = [], blocked: string[] = [], accepts: string[] = [], rejects: string[] = [];
        const commitReferences: Record<string, string> = {};
        for (const event of page.items) {
            state = stateFor(event.type); lastEventType = event.type;
            const role = payloadValue(event, 'role');
            if (role === 'implementer') implementerState = state;
            if (role === 'reviewer') reviewerState = state;
            if (event.type === 'handoff') handoffs.push(event.eventId);
            if (event.type === 'blocked') blocked.push(event.eventId);
            if (event.type === 'accept') accepts.push(event.eventId);
            if (event.type === 'reject') rejects.push(event.eventId);
            const commits = (event.payload as Record<string, unknown>).commits;
            if (commits !== null && typeof commits === 'object' && !Array.isArray(commits)) {
                for (const [repository, commit] of Object.entries(commits as Record<string, unknown>)) {
                    if (typeof commit === 'string') commitReferences[repository] = commit;
                }
            }
        }
        return {batchId, state, lastEventType, implementerState, reviewerState, handoffs, blocked, accepts, rejects, commitReferences};
    }

    async projectLaneSummary(): Promise<LaneEventSummary> {
        const [recent, totalEvents, countsByType] = await Promise.all([
            this.index.readRecentEvents(this.recentLimit), this.index.countEvents(), this.index.countEventTypes()
        ]);
        return {recent, totalEvents, countsByType};
    }

    async projectReadySet(acceptedBatchIds: readonly string[], allBatchIds: ReadyInput): Promise<ReadySetProjection> {
        const accepted = new Set(acceptedBatchIds);
        const descriptors = readyDescriptors(allBatchIds);
        const pendingBatchIds = [...new Set(descriptors.map((batch) => batch.id))].filter((id) => !accepted.has(id)).sort();
        const byId = new Map(descriptors.map((batch) => [batch.id, batch]));
        const readyBatchIds = pendingBatchIds.filter((id) => (byId.get(id)?.dependsOn ?? []).every((dependency) => accepted.has(dependency)));
        const ready = new Set(readyBatchIds);
        const blockedBatchIds = pendingBatchIds.filter((id) => !ready.has(id));
        return {pendingBatchIds, readyBatchIds, blockedBatchIds};
    }
}
