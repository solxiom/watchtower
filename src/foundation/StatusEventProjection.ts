import type {StatusEventView, StatusWarningCode, WorkerEventRecord} from '../contracts/index.js';
import type {RuntimeSessionNames} from './runtimeObservations.js';
import type {StatusSessionObservation} from './StatusLiveObserver.js';

const ROLE_TYPES = {
    implementer: new Set(['handoff', 'blocked']),
    reviewer: new Set(['accept', 'reject', 'blocked'])
} as const;

export interface StatusEventProjectionResult {
    readonly latest: WorkerEventRecord | undefined;
    readonly view: StatusEventView | null;
    readonly rejectedCount: number;
}

export class StatusEventProjection {
    project(records: readonly WorkerEventRecord[], laneId: string, expected: RuntimeSessionNames | undefined,
        warnings: StatusWarningCode[]): StatusEventProjectionResult {
        const qualified = records.filter(record => this.qualifies(record, laneId, expected));
        const rejectedCount = records.length - qualified.length;
        if (rejectedCount > 0) warnings.push('DURABLE_EVENT_REJECTED');
        const latest = qualified.reduce<WorkerEventRecord | undefined>((result, record) =>
            result === undefined || record.sequence > result.sequence ? record : result, undefined);
        return {latest, view: latest === undefined ? null : eventView(latest), rejectedCount};
    }

    workerWarnings(lifecycle: string, batch: string | null, latest: WorkerEventRecord | undefined,
        sessions: StatusSessionObservation, warnings: StatusWarningCode[]): void {
        if (lifecycle !== 'active' || batch === null) return;
        const matching = latest?.payload.batch === batch ? latest : undefined;
        if (matching?.type === 'accept' || matching?.type === 'blocked') {
            warnings.push('PENDING_WORKER_EVENT');
            return;
        }
        const role = matching?.type === 'handoff' ? 'reviewer' : 'implementer';
        if (!sessions.workerPresent[role]) warnings.push('WORKER_SESSION_MISSING');
    }

    private qualifies(record: WorkerEventRecord, laneId: string,
        expected: RuntimeSessionNames | undefined): boolean {
        const role = record.payload.role;
        return record.laneId === laneId && ROLE_TYPES[role].has(record.type) && expected !== undefined &&
            record.payload.session === expected.workers[role];
    }
}

function eventView(event: WorkerEventRecord): StatusEventView {
    return {eventId: event.eventId, type: event.type as StatusEventView['type'], sequence: event.sequence, at: event.at,
        role: event.payload.role, batch: event.payload.batch, session: event.payload.session};
}
