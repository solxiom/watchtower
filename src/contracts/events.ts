import type {WorkerEventPayloadV1, WorkerEventRole, WorkerEventType} from './types.js';

export type {WorkerEventRole, WorkerEventType};

/** A structurally valid worker event, including future event types. */
export interface WorkerEventRecord {
    schemaVersion: 1;
    eventId: string;
    type: string;
    sequence: number;
    at: string;
    laneId: string;
    producer: string;
    correlationId: string;
    causationId: string | null;
    policyVersion: string;
    payload: WorkerEventPayloadV1;
    [field: string]: unknown;
}

export const roleEventCompatibility: Readonly<Record<WorkerEventRole, readonly WorkerEventType[]>> = {
    implementer: ['handoff', 'blocked'],
    reviewer: ['accept', 'reject', 'blocked']
};

export function validateEventCompatibility(record: WorkerEventRecord): string[] {
    const knownEvents = Object.values(roleEventCompatibility).flat();
    if (!knownEvents.includes(record.type as WorkerEventType)) return [];
    return roleEventCompatibility[record.payload.role].includes(record.type as WorkerEventType)
        ? []
        : [`${record.payload.role} cannot emit ${record.type}`];
}
