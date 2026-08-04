import type {WorkerEventPayloadV1} from './types.js';

export const JOURNAL_REASONS = [
    'JOURNAL_NOT_FOUND', 'JOURNAL_CORRUPT_TAIL', 'JOURNAL_SEQUENCE_GAP',
    'JOURNAL_CHECKPOINT_MISMATCH', 'JOURNAL_INVALID_RECORD',
    'JOURNAL_ENTRY_NOT_FOUND', 'JOURNAL_REBUILD_REQUIRED',
    'JOURNAL_INDEX_CORRUPT', 'JOURNAL_STORE_UNAVAILABLE'
] as const;

export type JournalReason = typeof JOURNAL_REASONS[number];

export class JournalError extends Error {
    constructor(readonly reason: JournalReason, readonly target: string, message: string) {
        super(message);
        this.name = 'JournalError';
    }
}

export interface DurableEvent {
    readonly schemaVersion: 1;
    readonly eventId: string;
    readonly type: string;
    readonly sequence: number;
    readonly at: string;
    readonly laneId: string;
    readonly producer: string;
    readonly correlationId: string;
    readonly causationId: string | null;
    readonly policyVersion: string;
    readonly payload: Record<string, unknown> | WorkerEventPayloadV1;
    readonly cycleId?: string;
    readonly batchId?: string;
    readonly [field: string]: unknown;
}

export interface JournalCheckpoint {
    readonly lastSequence: number;
    readonly lastEventId: string | null;
    readonly lastByteOffset: number;
    readonly journalIdentityHash: string | null;
    readonly journalByteLength: number;
    readonly projectionRevision: number;
    readonly createdAt: string | null;
}

export interface DurableEventPage {
    readonly items: readonly DurableEvent[];
    readonly fromSequence: number;
    readonly limit: number;
    readonly nextSequence: number | null;
}

export interface CycleProjection {
    readonly cycleId: string;
    readonly state: string;
    readonly decisionClass: string | null;
    readonly proposalDigest: string | null;
    readonly validationResult: string | null;
    readonly effectOutcome: string | null;
    readonly startedAt: string | null;
    readonly completedAt: string | null;
    readonly eventCount: number;
}

export interface BatchProjection {
    readonly batchId: string;
    readonly state: string;
    readonly lastEventType: string | null;
    readonly implementerState: string | null;
    readonly reviewerState: string | null;
    readonly handoffs: readonly string[];
    readonly blocked: readonly string[];
    readonly accepts: readonly string[];
    readonly rejects: readonly string[];
    readonly commitReferences: Readonly<Record<string, string>>;
}

export interface LaneEventSummary {
    readonly recent: readonly DurableEvent[];
    readonly totalEvents: number;
    readonly countsByType: Readonly<Record<string, number>>;
}

export interface ReadySetProjection {
    readonly pendingBatchIds: readonly string[];
    readonly readyBatchIds: readonly string[];
    readonly blockedBatchIds: readonly string[];
}

export interface CorruptionReport {
    readonly ok: boolean;
    readonly usable: boolean;
    readonly details: readonly string[];
}
