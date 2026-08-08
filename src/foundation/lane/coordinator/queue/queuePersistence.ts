/**
 * Durable form of `coordinator/queue.json` and `coordinator/cursor.json`
 * (CA-13; `docs/spec/coordinator-automation.md` §17,
 * `docs/spec/v1-contracts.md` §9).
 *
 * Both files are *projections*, not journals: they are rewritten whole, so a
 * write is staged, fsynced, and renamed by the injected port rather than
 * patched in place. This module owns only where those bytes live and how they
 * are read and replaced; whether a decoded value is a legal contract shape is
 * `queueValidation.ts`'s question.
 *
 * An absent or empty projection is a legitimate initial state — LC-05 creates
 * the lane before any cycle runs. An unreadable, oversized, or malformed one
 * is not: it fails closed, because a queue that silently restarts empty loses
 * every unhandled trigger it was holding.
 */
import {join} from 'node:path';
import {
    CoordinatorQueueError, type CoordinatorQueueDocument
} from '../../../../contracts/coordinatorQueue.js';
import {
    type CoordinatorCursorDocument
} from '../../../../contracts/coordinatorReplay.js';
import {parseCursorDocument, parseQueueDocument} from './queueValidation.js';
import type {QueueFileSystem} from './queuePorts.js';

/** A queue or cursor projection past this is a corruption condition, not a normal read. */
const MAX_PROJECTION_BYTES = 4 * 1024 * 1024;

export function queuePath(laneDir: string): string {
    return join(laneDir, 'coordinator', 'queue.json');
}

export function cursorPath(laneDir: string): string {
    return join(laneDir, 'coordinator', 'cursor.json');
}

export function emptyQueueDocument(laneId: string): CoordinatorQueueDocument {
    return Object.freeze({
        schemaVersion: 1 as const, laneId, nextSequenceNumber: 1, entries: [], holds: [], activeCycleId: null,
        reservations: [], projectionRevision: 0
    });
}

export function emptyCursorDocument(laneId: string): CoordinatorCursorDocument {
    return Object.freeze({
        schemaVersion: 1 as const, laneId, journalIdentity: null, lastProcessedEventId: null,
        lastProcessedSequence: -1, lastByteOffset: 0, journalByteLength: 0, prefixDigest: null,
        projectionRevision: 0,
        lastCursorAdvanceAt: null
    });
}

export function readQueueDocument(laneDir: string, laneId: string, files: QueueFileSystem): CoordinatorQueueDocument {
    const path = queuePath(laneDir);
    const value = readProjection(path, files, 'QUEUE_STATE_UNREADABLE');
    return value === null ? emptyQueueDocument(laneId) : parseQueueDocument(value, path, laneId);
}

export function readCursorDocument(laneDir: string, laneId: string, files: QueueFileSystem): CoordinatorCursorDocument {
    const path = cursorPath(laneDir);
    const value = readProjection(path, files, 'CURSOR_STATE_UNREADABLE');
    return value === null ? emptyCursorDocument(laneId) : parseCursorDocument(value, path, laneId);
}

export function writeQueueDocument(laneDir: string, document: CoordinatorQueueDocument, files: QueueFileSystem): void {
    writeProjection(queuePath(laneDir), laneDir, document, files, 'QUEUE_STATE_WRITE_FAILED');
}

export function writeCursorDocument(laneDir: string, document: CoordinatorCursorDocument, files: QueueFileSystem): void {
    writeProjection(cursorPath(laneDir), laneDir, document, files, 'CURSOR_STATE_WRITE_FAILED');
}

function readProjection(
    path: string, files: QueueFileSystem, reason: 'QUEUE_STATE_UNREADABLE' | 'CURSOR_STATE_UNREADABLE'
): unknown {
    const read = files.readText(path, MAX_PROJECTION_BYTES);
    if (read.kind === 'missing') return null;
    if (read.kind === 'unreadable') {
        throw new CoordinatorQueueError(reason, path, `The projection exists but could not be read (${read.reason}).`);
    }
    if (read.text.trim() === '') return null;
    try {
        return JSON.parse(read.text) as unknown;
    } catch {
        throw new CoordinatorQueueError(reason, path, 'The projection is not a well-formed JSON document.');
    }
}

function writeProjection(
    path: string, laneDir: string, document: unknown, files: QueueFileSystem,
    reason: 'QUEUE_STATE_WRITE_FAILED' | 'CURSOR_STATE_WRITE_FAILED'
): void {
    try {
        files.ensureDirectory(join(laneDir, 'coordinator'));
        files.writeAtomic(path, `${JSON.stringify(document)}\n`);
    } catch (error) {
        throw new CoordinatorQueueError(reason, path, `The projection could not be durably written: ${(error as Error).message}`);
    }
}
