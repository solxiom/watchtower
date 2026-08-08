/**
 * Validation of persisted coordinator queue and cursor bytes into the closed
 * CA-13 contracts (`docs/spec/coordinatorQueue` vocabulary;
 * `docs/spec/v1-contracts.md` §9).
 *
 * `queue.json` and `cursor.json` are predecessor bytes: they may have been
 * written by an older schema version, truncated by a crash, copied from another
 * lane, or edited by hand. Every field therefore enters as `unknown` and leaves
 * as a frozen contract value or a typed refusal. Nothing here reads or writes a
 * file — that is `queuePersistence.ts` — so the "is this shape legal?" question
 * has exactly one owner separate from the "where do these bytes live?" question.
 *
 * Shape is not identity. A structurally perfect projection carrying another
 * lane's `laneId` is *more* dangerous than a corrupt one, because it dequeues
 * cleanly: the receiving lane would open cycles for triggers that were never
 * its own. Every parser therefore takes the lane it is being loaded *for* and
 * refuses a mismatch before the value can reach a queue, a cursor, or a write
 * (correction-01 F3).
 */
import {
    CoordinatorQueueError, TRIGGER_CLASSES,
    type CoordinatorQueueDocument, type CoordinatorTrigger, type ImpactScopedHold,
    type OpenCycleReservation, type QueueEntry, type TriggerClass
} from '../../../../contracts/coordinatorQueue.js';
import {
    type CoordinatorCursorDocument
} from '../../../../contracts/coordinatorReplay.js';
import {priorityOf} from './queuePriority.js';

export type ParseReason = 'QUEUE_STATE_UNREADABLE' | 'CURSOR_STATE_UNREADABLE' | 'QUEUE_TRIGGER_INVALID';

export function parseQueueDocument(value: unknown, path: string, expectedLaneId: string): CoordinatorQueueDocument {
    const record = requireObject(value, path, 'QUEUE_STATE_UNREADABLE');
    requireSchemaVersion(record.schemaVersion, path, 'QUEUE_STATE_UNREADABLE');
    const laneId = requireLaneIdentity(record.laneId, expectedLaneId, path, 'QUEUE_STATE_UNREADABLE', 'queue projection');
    const entries = requireArray(record.entries, path, 'QUEUE_STATE_UNREADABLE', 'entries')
        .map((entry) => parseEntry(entry, path, expectedLaneId));
    const holds = requireArray(record.holds, path, 'QUEUE_STATE_UNREADABLE', 'holds').map((hold) => parseHold(hold, path));
    assertUniqueTriggerIds(entries, path);
    return Object.freeze({
        schemaVersion: 1 as const, laneId,
        nextSequenceNumber: requireCount(record.nextSequenceNumber, path, 'QUEUE_STATE_UNREADABLE', 'nextSequenceNumber'),
        entries: Object.freeze(entries), holds: Object.freeze(holds),
        activeCycleId: requireNullableString(record.activeCycleId, path, 'QUEUE_STATE_UNREADABLE', 'activeCycleId'),
        reservations: Object.freeze(requireArray(record.reservations, path, 'QUEUE_STATE_UNREADABLE', 'reservations')
            .map((reservation) => parseReservation(reservation, path))),
        // Required, not defaulted. The revision is the compare-and-swap token: a
        // projection that does not carry one cannot be safely written back,
        // because "absent" and "zero" would be indistinguishable and a second
        // writer's update would be lost silently (correction-03 F2).
        projectionRevision: requireCount(record.projectionRevision, path, 'QUEUE_STATE_UNREADABLE', 'projectionRevision')
    });
}

export function parseCursorDocument(value: unknown, path: string, expectedLaneId: string): CoordinatorCursorDocument {
    const record = requireObject(value, path, 'CURSOR_STATE_UNREADABLE');
    requireSchemaVersion(record.schemaVersion, path, 'CURSOR_STATE_UNREADABLE');
    return Object.freeze({
        schemaVersion: 1 as const,
        laneId: requireLaneIdentity(record.laneId, expectedLaneId, path, 'CURSOR_STATE_UNREADABLE', 'cursor projection'),
        journalIdentity: requireNullableString(record.journalIdentity, path, 'CURSOR_STATE_UNREADABLE', 'journalIdentity'),
        lastProcessedEventId: requireNullableString(record.lastProcessedEventId, path, 'CURSOR_STATE_UNREADABLE', 'lastProcessedEventId'),
        lastProcessedSequence: requireSequence(record.lastProcessedSequence, path, 'CURSOR_STATE_UNREADABLE', 'lastProcessedSequence'),
        lastByteOffset: requireCount(record.lastByteOffset, path, 'CURSOR_STATE_UNREADABLE', 'lastByteOffset'),
        journalByteLength: requireCount(record.journalByteLength, path, 'CURSOR_STATE_UNREADABLE', 'journalByteLength'),
        prefixDigest: requireNullableString(record.prefixDigest, path, 'CURSOR_STATE_UNREADABLE', 'prefixDigest'),
        projectionRevision: requireCount(record.projectionRevision, path, 'CURSOR_STATE_UNREADABLE', 'projectionRevision'),
        lastCursorAdvanceAt: requireNullableString(record.lastCursorAdvanceAt, path, 'CURSOR_STATE_UNREADABLE', 'lastCursorAdvanceAt')
    });
}

export function parseTrigger(value: unknown, path: string, expectedLaneId?: string): CoordinatorTrigger {
    const record = requireObject(value, path, 'QUEUE_TRIGGER_INVALID');
    requireSchemaVersion(record.schemaVersion, path, 'QUEUE_TRIGGER_INVALID');
    return Object.freeze({
        schemaVersion: 1 as const,
        triggerId: requireString(record.triggerId, path, 'QUEUE_TRIGGER_INVALID', 'triggerId'),
        cycleId: requireString(record.cycleId, path, 'QUEUE_TRIGGER_INVALID', 'cycleId'),
        eventId: requireString(record.eventId, path, 'QUEUE_TRIGGER_INVALID', 'eventId'),
        eventType: requireString(record.eventType, path, 'QUEUE_TRIGGER_INVALID', 'eventType'),
        eventSequence: requireSequence(record.eventSequence, path, 'QUEUE_TRIGGER_INVALID', 'eventSequence'),
        triggerClass: requireTriggerClass(record.triggerClass, path),
        decisionClass: requireQueuedDecisionClass(record.decisionClass, path),
        batchId: requireNullableString(record.batchId, path, 'QUEUE_TRIGGER_INVALID', 'batchId'),
        laneId: expectedLaneId === undefined
            ? requireString(record.laneId, path, 'QUEUE_TRIGGER_INVALID', 'laneId')
            : requireLaneIdentity(record.laneId, expectedLaneId, path, 'QUEUE_TRIGGER_INVALID', 'queued trigger'),
        correlationId: requireString(record.correlationId, path, 'QUEUE_TRIGGER_INVALID', 'correlationId'),
        packRevision: requireString(record.packRevision, path, 'QUEUE_TRIGGER_INVALID', 'packRevision'),
        enqueuedAt: requireString(record.enqueuedAt, path, 'QUEUE_TRIGGER_INVALID', 'enqueuedAt'),
        priorUncertainCycleId: requireNullableString(record.priorUncertainCycleId, path, 'QUEUE_TRIGGER_INVALID', 'priorUncertainCycleId')
    });
}

function parseEntry(value: unknown, path: string, expectedLaneId: string): QueueEntry {
    const record = requireObject(value, path, 'QUEUE_STATE_UNREADABLE');
    const trigger = parseTrigger(record.trigger, path, expectedLaneId);
    // The entry's own identity fields are *checked*, not normalized away
    // (correction-01 review note). Deriving them from the nested trigger would
    // silently repair an entry whose stored `triggerId` or `enqueuedAt`
    // disagrees with the trigger it wraps — exactly the tampered or
    // half-migrated projection this parser exists to refuse.
    requireIdentical(record.triggerId, trigger.triggerId, path, 'QUEUE_STATE_UNREADABLE', 'entry triggerId');
    requireIdentical(record.enqueuedAt, trigger.enqueuedAt, path, 'QUEUE_STATE_UNREADABLE', 'entry enqueuedAt');
    // `priority` is derived, never trusted: a hand-edited projection must not be
    // able to promote a routine event above a safety escalation on reload.
    return Object.freeze({
        triggerId: trigger.triggerId, trigger, priority: priorityOf(trigger.triggerClass),
        enqueuedAt: trigger.enqueuedAt,
        sequenceNumber: requireCount(record.sequenceNumber, path, 'QUEUE_STATE_UNREADABLE', 'sequenceNumber')
    });
}

/**
 * A reservation is the lane's durable claim on work that has left the queue.
 * Every field is required: a claim that cannot say which cycle, event, and
 * correlation it covers cannot suppress a re-admission, and silently repairing
 * one would reopen the crash window it exists to close.
 */
function parseReservation(value: unknown, path: string): OpenCycleReservation {
    const record = requireObject(value, path, 'QUEUE_STATE_UNREADABLE');
    return Object.freeze({
        cycleId: requireString(record.cycleId, path, 'QUEUE_STATE_UNREADABLE', 'reservation cycleId'),
        triggerId: requireString(record.triggerId, path, 'QUEUE_STATE_UNREADABLE', 'reservation triggerId'),
        eventId: requireString(record.eventId, path, 'QUEUE_STATE_UNREADABLE', 'reservation eventId'),
        correlationId: requireString(record.correlationId, path, 'QUEUE_STATE_UNREADABLE', 'reservation correlationId'),
        priorUncertainCycleId: requireNullableString(record.priorUncertainCycleId, path, 'QUEUE_STATE_UNREADABLE', 'reservation priorUncertainCycleId'),
        reservedAt: requireString(record.reservedAt, path, 'QUEUE_STATE_UNREADABLE', 'reservation reservedAt')
    });
}

function parseHold(value: unknown, path: string): ImpactScopedHold {
    const record = requireObject(value, path, 'QUEUE_STATE_UNREADABLE');
    const scope = requireString(record.scope, path, 'QUEUE_STATE_UNREADABLE', 'scope');
    if (scope !== 'impact-scoped' && scope !== 'lane') {
        throw new CoordinatorQueueError('QUEUE_STATE_UNREADABLE', path, `Hold scope ${scope} is not a recorded hold scope.`);
    }
    return Object.freeze({
        blockerId: requireString(record.blockerId, path, 'QUEUE_STATE_UNREADABLE', 'blockerId'), scope,
        batchIds: Object.freeze(requireArray(record.batchIds, path, 'QUEUE_STATE_UNREADABLE', 'batchIds')
            .map((batchId) => requireString(batchId, path, 'QUEUE_STATE_UNREADABLE', 'batchIds[]'))),
        recordedAt: requireString(record.recordedAt, path, 'QUEUE_STATE_UNREADABLE', 'recordedAt')
    });
}

function assertUniqueTriggerIds(entries: readonly QueueEntry[], path: string): void {
    const seen = new Set<string>();
    for (const entry of entries) {
        if (seen.has(entry.triggerId)) {
            throw new CoordinatorQueueError('QUEUE_STATE_UNREADABLE', path,
                `Trigger ${entry.triggerId} appears twice in the queue projection.`);
        }
        seen.add(entry.triggerId);
    }
}

/**
 * The stored lane ID must be the lane this projection is being loaded for.
 * Reported as an unreadable/invalid projection rather than a "not found": the
 * bytes exist and are well formed, but they are not this lane's authority.
 */
function requireLaneIdentity(
    value: unknown, expected: string, path: string, reason: ParseReason, subject: string
): string {
    const laneId = requireString(value, path, reason, 'laneId');
    if (laneId !== expected) {
        throw new CoordinatorQueueError(reason, path,
            `The ${subject} belongs to lane ${laneId}, not the requested lane ${expected}.`);
    }
    return laneId;
}

function requireIdentical(value: unknown, expected: string, path: string, reason: ParseReason, field: string): void {
    if (value !== expected) {
        throw new CoordinatorQueueError(reason, path,
            `Projection field ${field} is ${String(value)} but the trigger it wraps declares ${expected}.`);
    }
}

function requireObject(value: unknown, path: string, reason: ParseReason): Record<string, unknown> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) {
        throw new CoordinatorQueueError(reason, path, 'A projection member is not a JSON object.');
    }
    return value as Record<string, unknown>;
}

function requireArray(value: unknown, path: string, reason: ParseReason, field: string): readonly unknown[] {
    if (!Array.isArray(value)) throw new CoordinatorQueueError(reason, path, `Projection field ${field} is not an array.`);
    return value;
}

function requireString(value: unknown, path: string, reason: ParseReason, field: string): string {
    if (typeof value !== 'string' || value === '') {
        throw new CoordinatorQueueError(reason, path, `Projection field ${field} is not a non-empty string.`);
    }
    return value;
}

function requireNullableString(value: unknown, path: string, reason: ParseReason, field: string): string | null {
    if (value === null || value === undefined) return null;
    return requireString(value, path, reason, field);
}

function requireCount(value: unknown, path: string, reason: ParseReason, field: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < 0) {
        throw new CoordinatorQueueError(reason, path, `Projection field ${field} is not a non-negative integer.`);
    }
    return value;
}

/** `-1` is the sentinel for "no journal origin"/"nothing handled yet"; nothing below it is legal. */
function requireSequence(value: unknown, path: string, reason: ParseReason, field: string): number {
    if (typeof value !== 'number' || !Number.isSafeInteger(value) || value < -1) {
        throw new CoordinatorQueueError(reason, path, `Projection field ${field} is not a journal sequence.`);
    }
    return value;
}

function requireSchemaVersion(value: unknown, path: string, reason: ParseReason): void {
    if (value !== 1) throw new CoordinatorQueueError(reason, path, 'The projection does not declare schema version 1.');
}

function requireTriggerClass(value: unknown, path: string): TriggerClass {
    if (typeof value !== 'string' || !(TRIGGER_CLASSES as readonly string[]).includes(value)) {
        throw new CoordinatorQueueError('QUEUE_TRIGGER_INVALID', path, `Trigger class ${String(value)} is not a declared priority class.`);
    }
    return value as TriggerClass;
}

function requireQueuedDecisionClass(value: unknown, path: string): CoordinatorTrigger['decisionClass'] {
    if (value !== 'D1' && value !== 'D2' && value !== 'D3') {
        throw new CoordinatorQueueError('QUEUE_TRIGGER_INVALID', path,
            `Queued trigger decision class ${String(value)} is not a queued judgment class.`);
    }
    return value;
}
