import {latest} from './parsing/index.js';
import type {WorkerEventRecord, WorkerEventRole} from '../contracts/events.js';

export interface RuntimeSessionNames {
    readonly watcher: string;
    readonly workers: Readonly<Record<WorkerEventRole, string>>;
}

export interface RuntimeSessionObservation {
    readonly watcherPresent: boolean;
    readonly workerPresent: Readonly<Record<WorkerEventRole, boolean>>;
}

export interface LatestWorkerEvents {
    readonly implementer: WorkerEventRecord | undefined;
    readonly reviewer: WorkerEventRecord | undefined;
}

/**
 * Reads raw tmux-name facts only. The booleans returned here deliberately make
 * no claim about a worker's lifecycle, health, or authority.
 */
export function observeRuntimeSessions(
    listedSessionNames: readonly string[],
    expected: RuntimeSessionNames
): RuntimeSessionObservation {
    const sessions = new Set(listedSessionNames.filter(isSessionName));
    validateExpectedNames(expected);
    return {
        watcherPresent: sessions.has(expected.watcher),
        workerPresent: {
            implementer: sessions.has(expected.workers.implementer),
            reviewer: sessions.has(expected.workers.reviewer)
        }
    };
}

/** Return the newest already-validated durable event for each worker role. */
export function latestWorkerEvents(records: readonly WorkerEventRecord[]): LatestWorkerEvents {
    const validRecords = records.slice();
    return {
        implementer: latest(validRecords, 'implementer', 1)[0],
        reviewer: latest(validRecords, 'reviewer', 1)[0]
    };
}

/** Split bounded `tmux list-sessions` output without treating malformed lines as identities. */
export function parseTmuxSessionNames(output: string): string[] {
    return output.split(/\r?\n/).filter(isSessionName);
}

function validateExpectedNames(expected: RuntimeSessionNames): void {
    if (!isSessionName(expected.watcher)
        || !isSessionName(expected.workers.implementer)
        || !isSessionName(expected.workers.reviewer)) {
        throw new TypeError('Expected tmux session names must be non-empty single-line values.');
    }
}

function isSessionName(value: string): boolean {
    return value.length > 0 && value.length <= 256 && !/[\r\n\0]/.test(value);
}
