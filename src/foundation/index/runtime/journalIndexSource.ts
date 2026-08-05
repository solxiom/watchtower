import {createHash} from 'node:crypto';
import {existsSync, readFileSync} from 'node:fs';
import type {DurableEvent} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';

export interface ParsedJournal {
    readonly events: readonly DurableEvent[];
    readonly offsets: readonly number[];
    readonly lengths: readonly number[];
    readonly completeByteLength: number;
    readonly byteLength: number;
    readonly identityHash: string;
    readonly partialTail: boolean;
}

export function isDurableEvent(value: unknown): value is DurableEvent {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    return item.schemaVersion === 1 && nonEmpty(item.eventId) && nonEmpty(item.type)
        && Number.isSafeInteger(item.sequence) && (item.sequence as number) >= 0
        && nonEmpty(item.at) && nonEmpty(item.laneId) && nonEmpty(item.producer)
        && nonEmpty(item.correlationId) && (item.causationId === null || nonEmpty(item.causationId))
        && nonEmpty(item.policyVersion) && typeof item.payload === 'object' && item.payload !== null
        && !Array.isArray(item.payload);
}

function nonEmpty(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0;
}

export function parseJournal(path: string): ParsedJournal {
    if (!existsSync(path)) throw new JournalError('JOURNAL_NOT_FOUND', path, 'authoritative JSONL journal does not exist');
    const bytes = readFileSync(path);
    const events: DurableEvent[] = [], offsets: number[] = [], lengths: number[] = [];
    let cursor = 0, partialTail = false;
    const lines = bytes.toString('utf8').split('\n');
    lines.forEach((line, index) => {
        const complete = index < lines.length - 1;
        const length = Buffer.byteLength(line) + (complete ? 1 : 0);
        if (line.trim() === '') { cursor += length; return; }
        if (!complete) { partialTail = true; cursor += length; return; }
        let value: unknown;
        try { value = JSON.parse(line) as unknown; } catch { throw new JournalError('JOURNAL_INVALID_RECORD', path, `line ${index + 1} is not valid JSON`); }
        if (!isDurableEvent(value)) throw new JournalError('JOURNAL_INVALID_RECORD', path, `line ${index + 1} is not a DurableEvent`);
        events.push(value); offsets.push(cursor); lengths.push(length); cursor += length;
    });
    for (let index = 0; index < events.length; index += 1) {
        if (events[index].sequence !== index) throw new JournalError('JOURNAL_SEQUENCE_GAP', path, `expected sequence ${index} but found ${events[index].sequence}`);
    }
    const completeByteLength = events.length === 0 ? 0 : offsets[offsets.length - 1] + lengths[lengths.length - 1];
    return {
        events, offsets, lengths, completeByteLength, byteLength: bytes.byteLength,
        identityHash: `sha256:${createHash('sha256').update(bytes).digest('hex')}`, partialTail
    };
}
