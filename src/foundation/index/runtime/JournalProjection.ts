import type {
    BatchProjection, CycleProjection, DurableEvent, LaneEventSummary, ReadySetProjection
} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {JournalIndex} from './JournalIndex.js';

const DEFAULT_RECENT = 50;

function payloadValue(event: DurableEvent, key: string): string | null {
    const value = (event.payload as Record<string, unknown>)[key];
    return typeof value === 'string' ? value : null;
}

function eventIdentity(event: DurableEvent): string {
    return event.eventId;
}

function stateFor(type: string): string {
    if (type.endsWith('complete') || type === 'accept') return 'complete';
    if (type.endsWith('rejected') || type === 'reject') return 'rejected';
    if (type.endsWith('blocked') || type === 'blocked') return 'blocked';
    if (type.endsWith('attempted')) return 'attempted';
    if (type.endsWith('prepared')) return 'prepared';
    return 'observed';
}

export class JournalProjection {
    constructor(private readonly index: JournalIndex, private readonly recentLimit = DEFAULT_RECENT) {
        if (!Number.isSafeInteger(recentLimit) || recentLimit < 1 || recentLimit > 200) {
            throw new JournalError('JOURNAL_INVALID_RECORD', 'projection', 'recent projection limit must be in 1..200');
        }
    }

    private async allEvents(): Promise<DurableEvent[]> {
        const events: DurableEvent[] = [];
        let cursor = 0;
        for (;;) {
            const page = await this.index.readEvents(cursor, 200);
            events.push(...page.items);
            if (page.nextSequence === null) return events;
            cursor = page.nextSequence;
        }
    }

    async projectCycleStatus(cycleId: string): Promise<CycleProjection> {
        const events = (await this.allEvents()).filter((event) => event.cycleId === cycleId || payloadValue(event, 'cycleId') === cycleId);
        let state = 'unknown', decisionClass: string | null = null, proposalDigest: string | null = null;
        let validationResult: string | null = null, effectOutcome: string | null = null;
        let startedAt: string | null = null, completedAt: string | null = null;
        for (const event of events) {
            state = stateFor(event.type);
            startedAt ??= event.at;
            if (event.type === 'coordinator-routed') decisionClass = payloadValue(event, 'decisionClass');
            proposalDigest = payloadValue(event, 'proposalDigest') ?? proposalDigest;
            validationResult = payloadValue(event, 'validationResult') ?? validationResult;
            effectOutcome = payloadValue(event, 'effectOutcome') ?? effectOutcome;
            if (event.type === 'coordinator-cycle-complete') completedAt = event.at;
        }
        return {cycleId, state, decisionClass, proposalDigest, validationResult, effectOutcome, startedAt, completedAt, eventCount: events.length};
    }

    async projectBatchStatus(batchId: string): Promise<BatchProjection> {
        const events = (await this.allEvents()).filter((event) => event.batchId === batchId || payloadValue(event, 'batch') === batchId);
        let state = 'unknown', lastEventType: string | null = null;
        let implementerState: string | null = null, reviewerState: string | null = null;
        const handoffs: string[] = [], blocked: string[] = [], accepts: string[] = [], rejects: string[] = [];
        const commitReferences: Record<string, string> = {};
        for (const event of events) {
            state = stateFor(event.type); lastEventType = event.type;
            const role = payloadValue(event, 'role');
            if (role === 'implementer') implementerState = state;
            if (role === 'reviewer') reviewerState = state;
            const id = eventIdentity(event);
            if (event.type === 'handoff') handoffs.push(id);
            if (event.type === 'blocked') blocked.push(id);
            if (event.type === 'accept') accepts.push(id);
            if (event.type === 'reject') rejects.push(id);
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
        const events = await this.allEvents();
        const counts: Record<string, number> = {};
        for (const event of events) counts[event.type] = (counts[event.type] ?? 0) + 1;
        return {recent: events.slice(-this.recentLimit), totalEvents: events.length, countsByType: counts};
    }

    async projectReadySet(acceptedBatchIds: readonly string[], allBatchIds: readonly string[]): Promise<ReadySetProjection> {
        const accepted = new Set(acceptedBatchIds);
        const pendingBatchIds = [...new Set(allBatchIds)].filter((id) => !accepted.has(id)).sort();
        return {pendingBatchIds, readyBatchIds: pendingBatchIds, blockedBatchIds: []};
    }
}
