import type {DurableEvent, JournalCheckpoint} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {isDurableEvent} from './journalIndexSource.js';

export function asNumber(value: unknown, fallback = 0): number {
    return typeof value === 'bigint' || typeof value === 'number' ? Number(value) : fallback;
}

export function asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

export function checkpointFromRow(row: Readonly<Record<string, unknown>>): JournalCheckpoint {
    return {
        lastSequence: asNumber(row.last_sequence, -1), lastEventId: asString(row.last_event_id),
        lastByteOffset: asNumber(row.last_byte_offset), journalIdentityHash: asString(row.journal_identity_hash),
        journalByteLength: asNumber(row.journal_byte_length), projectionRevision: asNumber(row.projection_revision),
        createdAt: asString(row.created_at)
    };
}

export function eventFromRow(row: Readonly<Record<string, unknown>>): DurableEvent {
    let payload: unknown;
    try { payload = JSON.parse(String(row.payload_json)); } catch { throw new JournalError('JOURNAL_INDEX_CORRUPT', 'journal_event', 'indexed payload is not JSON'); }
    if (!isDurableEvent(payload)) throw new JournalError('JOURNAL_INDEX_CORRUPT', 'journal_event', 'indexed payload is not a valid event envelope');
    return payload;
}

export function rowFor(event: DurableEvent, offset: number, length: number): Record<string, string | number | null> {
    const payload = event.payload as Record<string, unknown>;
    return {
        sequence: event.sequence, event_id: event.eventId, event_type: event.type,
        role: typeof payload.role === 'string' ? payload.role : null,
        batch_id: event.batchId ?? (typeof payload.batch === 'string' ? payload.batch : null),
        cycle_id: event.cycleId ?? (typeof payload.cycleId === 'string' ? payload.cycleId : null),
        correlation_id: event.correlationId, payload_json: JSON.stringify(event),
        byte_offset: offset, byte_length: length, created_at: event.at
    };
}

export function checkpointRow(value: JournalCheckpoint): Record<string, string | number | null> {
    return {
        last_sequence: value.lastSequence < 0 ? null : value.lastSequence, last_event_id: value.lastEventId,
        last_byte_offset: value.lastByteOffset, journal_identity_hash: value.journalIdentityHash,
        journal_byte_length: value.journalByteLength, projection_revision: value.projectionRevision,
        created_at: value.createdAt
    };
}
