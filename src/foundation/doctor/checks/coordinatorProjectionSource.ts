/**
 * The read-only doctor view of the two CA-13 coordinator projections
 * (`coordinator/queue.json`, `coordinator/cursor.json`) and of the
 * authoritative coordinator journal's observable size.
 *
 * It exists so the queue and cursor providers share exactly one way of
 * getting at those bytes and cannot disagree about presence, bounds, or
 * validation. It re-uses CA-13's accepted `readQueueDocument`/
 * `readCursorDocument` owners verbatim rather than re-deriving projection
 * parsing here, and it hands them a `QueueFileSystem` whose mutating half is
 * structurally unavailable: `ensureDirectory` and `writeAtomic` refuse, so a
 * diagnostic path cannot create a coordinator root or replace a projection
 * even by mistake.
 */
import {join} from 'node:path';
import {CoordinatorQueueError} from '../../../contracts/index.js';
import type {CoordinatorCursorDocument, CoordinatorQueueDocument} from '../../../contracts/index.js';
import type {LaneDiscoveryFileSystem} from '../../discovery/index.js';
import {readCursorDocument, readQueueDocument, type QueueFileSystem} from '../../lane/index.js';
import {buildLaneFilePath} from '../../paths/index.js';

/** The authoritative §18 cycle-lifecycle journal the cursor addresses. */
export const COORDINATOR_JOURNAL_RELATIVE_PATH = join('coordinator', 'journal', 'coordinator-events.jsonl');
export const QUEUE_RELATIVE_PATH = join('coordinator', 'queue.json');
export const CURSOR_RELATIVE_PATH = join('coordinator', 'cursor.json');

/**
 * A projection that is absent has never been written, which is a legitimate
 * initial lane state; a projection that exists but does not validate is a
 * corruption the caller must report rather than fold into "absent".
 */
export type ProjectionRead<T> =
    | {readonly kind: 'absent'}
    | {readonly kind: 'present'; readonly document: T}
    | {readonly kind: 'invalid'; readonly error: CoordinatorQueueError};

export class DoctorCoordinatorProjectionSource {
    private readonly files: QueueFileSystem;

    constructor(private readonly fileSystem: LaneDiscoveryFileSystem) {
        this.files = readOnlyQueueFileSystem(fileSystem);
    }

    queue(laneDir: string, laneId: string): ProjectionRead<CoordinatorQueueDocument> {
        return this.read(laneDir, QUEUE_RELATIVE_PATH, () => readQueueDocument(laneDir, laneId, this.files));
    }

    cursor(laneDir: string, laneId: string): ProjectionRead<CoordinatorCursorDocument> {
        return this.read(laneDir, CURSOR_RELATIVE_PATH, () => readCursorDocument(laneDir, laneId, this.files));
    }

    /** Observed journal size in bytes, or `null` when the lane has no coordinator journal yet. */
    journalByteLength(laneDir: string): number | null {
        const info = this.fileSystem.inspect(buildLaneFilePath(laneDir, COORDINATOR_JOURNAL_RELATIVE_PATH));
        return info === undefined || info.kind !== 'file' ? null : info.size;
    }

    private read<T>(laneDir: string, relativePath: string, load: () => T): ProjectionRead<T> {
        const info = this.fileSystem.inspect(buildLaneFilePath(laneDir, relativePath));
        if (info === undefined) return {kind: 'absent'};
        try {
            return {kind: 'present', document: load()};
        } catch (error) {
            if (error instanceof CoordinatorQueueError) return {kind: 'invalid', error};
            throw error;
        }
    }
}

const MAX_READ_BYTES = 4 * 1024 * 1024;

/** A `QueueFileSystem` that can only read; every mutating primitive refuses. */
function readOnlyQueueFileSystem(fileSystem: LaneDiscoveryFileSystem): QueueFileSystem {
    return Object.freeze({
        ensureDirectory(path: string): never {
            throw refusal(path);
        },
        readText(path: string, maxBytes: number) {
            const info = fileSystem.inspect(path);
            if (info === undefined) return {kind: 'missing'} as const;
            if (info.kind !== 'file') return {kind: 'unreadable', reason: 'not-a-file'} as const;
            if (info.size > Math.min(maxBytes, MAX_READ_BYTES)) return {kind: 'unreadable', reason: 'too-large'} as const;
            try {
                return {kind: 'text', text: fileSystem.readText(path)} as const;
            } catch {
                return {kind: 'unreadable', reason: 'io-error'} as const;
            }
        },
        writeAtomic(path: string): never {
            throw refusal(path);
        }
    });
}

function refusal(path: string): CoordinatorQueueError {
    return new CoordinatorQueueError('QUEUE_STATE_WRITE_FAILED', path,
        'Doctor reads coordinator projections only; it never creates or replaces one.');
}
