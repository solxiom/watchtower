/**
 * Focused builders for the CA-31 coordinator queue/cursor doctor evidence.
 * They write only the exact durable artifacts CA-13 owns, so a provider spec
 * asserts against real bytes rather than a mocked projection.
 */
import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {
    CoordinatorCursorDocument, CoordinatorQueueDocument, CoordinatorTrigger, OpenCycleReservation, QueueEntry
} from '../../../../src/contracts/index.js';

export const LANE_ID = '11111111-1111-4111-8111-111111111111';

export function coordinatorDir(laneDir: string): string {
    const dir = join(laneDir, 'coordinator');
    mkdirSync(dir, {recursive: true});
    return dir;
}

export function writeQueue(laneDir: string, document: unknown): void {
    writeFileSync(join(coordinatorDir(laneDir), 'queue.json'), `${JSON.stringify(document)}\n`);
}

export function writeCursor(laneDir: string, document: unknown): void {
    writeFileSync(join(coordinatorDir(laneDir), 'cursor.json'), `${JSON.stringify(document)}\n`);
}

export function writeJournal(laneDir: string, content: string): void {
    const dir = join(coordinatorDir(laneDir), 'journal');
    mkdirSync(dir, {recursive: true});
    writeFileSync(join(dir, 'coordinator-events.jsonl'), content);
}

export function trigger(overrides: Partial<CoordinatorTrigger> = {}): CoordinatorTrigger {
    return {
        schemaVersion: 1, triggerId: 'trig-1', cycleId: 'cycle-1', eventId: 'event-1',
        eventType: 'batch-handoff-recorded', eventSequence: 4, triggerClass: 'routine-event',
        decisionClass: 'D1', batchId: 'CA-31', laneId: LANE_ID, correlationId: 'corr-1',
        packRevision: 'rev-1', enqueuedAt: '2026-08-11T10:00:00.000Z', priorUncertainCycleId: null,
        ...overrides
    };
}

export function entry(source: CoordinatorTrigger, sequenceNumber: number): QueueEntry {
    return {
        triggerId: source.triggerId, trigger: source, priority: 2,
        enqueuedAt: source.enqueuedAt, sequenceNumber
    };
}

export function reservation(overrides: Partial<OpenCycleReservation> = {}): OpenCycleReservation {
    return {
        cycleId: 'cycle-9', triggerId: 'trig-9', eventId: 'event-9', correlationId: 'corr-9',
        priorUncertainCycleId: null, reservedAt: '2026-08-11T10:05:00.000Z', ...overrides
    };
}

export function queueDocument(overrides: Partial<CoordinatorQueueDocument> = {}): CoordinatorQueueDocument {
    return {
        schemaVersion: 1, laneId: LANE_ID, nextSequenceNumber: 1, entries: [], holds: [],
        activeCycleId: null, reservations: [], projectionRevision: 3, ...overrides
    };
}

export function cursorDocument(overrides: Partial<CoordinatorCursorDocument> = {}): CoordinatorCursorDocument {
    return {
        schemaVersion: 1, laneId: LANE_ID, journalIdentity: 'journal-1', lastProcessedEventId: 'event-1',
        lastProcessedSequence: 4, lastByteOffset: 16, journalByteLength: 16, prefixDigest: 'sha256:abc',
        projectionRevision: 2, lastCursorAdvanceAt: '2026-08-11T10:06:00.000Z', ...overrides
    };
}
