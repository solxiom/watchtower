import type {DerivedStore} from '../../storage/index.js';
import type {
    BoundedEventPage, DurableEvent, DurableEventPage, JournalCheckpoint
} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {asNumber, eventFromRow} from './journalIndexRows.js';
import {parseJournal} from './journalIndexSource.js';

export const MAX_JOURNAL_PAGE = 200;
type IndexedColumn = 'batch_id' | 'cycle_id';

export interface JournalIndexReadContext {
    readonly database: DerivedStore;
    readonly journalPath: string;
    readonly checkpoint: () => JournalCheckpoint;
    readonly ensureHealthy: () => Promise<void>;
    readonly storeCall: <T>(operation: () => Promise<T>) => Promise<T>;
    readonly markUnusable: () => void;
}

function eventFromStoredRow(context: JournalIndexReadContext, row: Readonly<Record<string, unknown>> | undefined): DurableEvent | null {
    if (row === undefined) return null;
    try { return eventFromRow(row); } catch (error) {
        if (error instanceof JournalError) context.markUnusable();
        throw error;
    }
}

async function eventsFromRows(context: JournalIndexReadContext, rows: readonly Readonly<Record<string, unknown>>[]): Promise<readonly DurableEvent[]> {
    const events: DurableEvent[] = [];
    for (const row of rows) {
        const event = eventFromStoredRow(context, row);
        if (event !== null) events.push(event);
    }
    return events;
}

export async function readEvent(context: JournalIndexReadContext, sequence: number): Promise<DurableEvent | null> {
    const row = await context.storeCall(() => context.database.getByPrimaryKey('journal_event', sequence));
    return eventFromStoredRow(context, row);
}

export async function readEvents(context: JournalIndexReadContext, fromSequence: number, limit: number): Promise<DurableEventPage> {
    if (!Number.isSafeInteger(fromSequence) || fromSequence < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_JOURNAL_PAGE) {
        throw new JournalError('JOURNAL_INVALID_RECORD', context.journalPath, `bounded page requires sequence >= 0 and limit in 1..${MAX_JOURNAL_PAGE}`);
    }
    const rows = await context.storeCall(() => context.database.listFrom('journal_event', 'sequence', fromSequence, limit + 1));
    const events = await eventsFromRows(context, rows);
    const items = events.slice(0, limit);
    return {items, fromSequence, limit, nextSequence: events.length > limit ? items[items.length - 1].sequence + 1 : null};
}

export async function readEventsByColumn(context: JournalIndexReadContext, column: IndexedColumn, value: string, limit = MAX_JOURNAL_PAGE): Promise<BoundedEventPage> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_JOURNAL_PAGE) throw new JournalError('JOURNAL_INVALID_RECORD', context.journalPath, `bounded projection requires a limit in 1..${MAX_JOURNAL_PAGE}`);
    const rows = await context.storeCall(() => context.database.listByColumn('journal_event', column, value, limit + 1));
    const events = await eventsFromRows(context, rows);
    return {items: events.slice(0, limit), hasMore: events.length > limit};
}

export async function readRecentEvents(context: JournalIndexReadContext, limit: number): Promise<readonly DurableEvent[]> {
    if (!Number.isSafeInteger(limit) || limit < 1 || limit > MAX_JOURNAL_PAGE) throw new JournalError('JOURNAL_INVALID_RECORD', context.journalPath, `recent projection requires a limit in 1..${MAX_JOURNAL_PAGE}`);
    const rows = await context.storeCall(() => context.database.listRecent('journal_event', 'sequence', limit));
    return eventsFromRows(context, rows);
}

export function countEvents(context: JournalIndexReadContext): Promise<number> {
    return context.storeCall(() => context.database.count('journal_event'));
}

export async function countEventTypes(context: JournalIndexReadContext): Promise<Readonly<Record<string, number>>> {
    const grouped = await context.storeCall(() => context.database.groupedCounts('journal_event', 'event_type'));
    const counts: Record<string, number> = {};
    for (const item of grouped) {
        if (typeof item.value !== 'string') {
            context.markUnusable();
            throw new JournalError('JOURNAL_INDEX_CORRUPT', context.journalPath, 'indexed event type is not text');
        }
        counts[item.value] = item.count;
    }
    return counts;
}

export async function readLatestEvent(context: JournalIndexReadContext): Promise<{event: DurableEvent; offset: number} | null> {
    await context.ensureHealthy();
    const checkpoint = context.checkpoint();
    if (checkpoint.lastSequence < 0) return null;
    const row = await context.storeCall(() => context.database.getByPrimaryKey('journal_event', checkpoint.lastSequence));
    const event = eventFromStoredRow(context, row);
    return event === null ? null : {event, offset: asNumber(row?.byte_offset)};
}

export async function verifyCheckpoint(context: JournalIndexReadContext): Promise<boolean> {
    await context.ensureHealthy();
    const checkpoint = context.checkpoint();
    const parsed = parseJournal(context.journalPath);
    if (parsed.partialTail || parsed.events.length - 1 !== checkpoint.lastSequence) return false;
    if (parsed.identityHash !== checkpoint.journalIdentityHash || parsed.byteLength !== checkpoint.journalByteLength) return false;
    const latest = parsed.events[parsed.events.length - 1];
    if (latest !== undefined && (latest.eventId !== checkpoint.lastEventId || checkpoint.lastByteOffset !== parsed.byteLength)) return false;
    let cursor = 0;
    for (;;) {
        const page = await readEvents(context, cursor, MAX_JOURNAL_PAGE);
        for (const event of page.items) {
            if (JSON.stringify(parsed.events[event.sequence]) !== JSON.stringify(event)) return false;
        }
        if (page.nextSequence === null) return true;
        cursor = page.nextSequence;
    }
}
