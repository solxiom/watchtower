import type {DerivedStore, DerivedStoreTransaction} from '../../storage/index.js';
import type {DurableEvent, JournalCheckpoint} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {checkpointRow, rowFor} from './journalIndexRows.js';
import {isDurableEvent, parseJournal, type ParsedJournal} from './journalIndexSource.js';

export interface JournalIndexAppendContext {
    readonly database: DerivedStore;
    readonly journalPath: () => string;
    readonly checkpoint: () => JournalCheckpoint;
    readonly ensureHealthy: () => Promise<void>;
    readonly ensureCheckpoint: () => Promise<void>;
    readonly storeCall: <T>(operation: () => Promise<T>) => Promise<T>;
    readonly requireRebuild: () => void;
    readonly setCheckpoint: (checkpoint: JournalCheckpoint) => void;
}

function appendCandidates(context: JournalIndexAppendContext, events: readonly DurableEvent[], offsets: readonly number[]): {
    readonly parsed: ParsedJournal;
    readonly fresh: readonly DurableEvent[];
    readonly freshOffsets: readonly number[];
} {
    let parsed: ParsedJournal;
    try {
        parsed = parseJournal(context.journalPath());
    } catch (error) {
        if (error instanceof JournalError && error.reason === 'JOURNAL_SEQUENCE_GAP') context.requireRebuild();
        throw error;
    }
    if (parsed.partialTail) throw new JournalError('JOURNAL_CORRUPT_TAIL', context.journalPath(), 'the authoritative journal has an incomplete final line');
    const fresh: DurableEvent[] = [], freshOffsets: number[] = [];
    for (let index = 0; index < events.length; index += 1) {
        const event = events[index];
        if (!isDurableEvent(event)) throw new JournalError('JOURNAL_INVALID_RECORD', context.journalPath(), `event ${index} is invalid`);
        if (event.sequence <= context.checkpoint().lastSequence) continue;
        const authoritative = parsed.events[event.sequence];
        if (authoritative === undefined || authoritative.eventId !== event.eventId || JSON.stringify(authoritative) !== JSON.stringify(event)) {
            throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', context.journalPath(), `event ${event.sequence} does not match the authoritative journal`);
        }
        const expected = context.checkpoint().lastSequence + fresh.length + 1;
        if (event.sequence !== expected) {
            context.requireRebuild();
            throw new JournalError('JOURNAL_SEQUENCE_GAP', context.journalPath(), `expected sequence ${expected} but found ${event.sequence}`);
        }
        fresh.push(event); freshOffsets.push(offsets[index]);
    }
    return {parsed, fresh, freshOffsets};
}

export async function appendEvents(context: JournalIndexAppendContext, events: readonly DurableEvent[], offsets: readonly number[]): Promise<void> {
    await context.ensureHealthy();
    if (events.length !== offsets.length) throw new JournalError('JOURNAL_INVALID_RECORD', context.journalPath(), 'event and offset counts differ');
    const {parsed, fresh, freshOffsets} = appendCandidates(context, events, offsets);
    await context.ensureCheckpoint();
    if (fresh.length === 0) return;
    const final = fresh[fresh.length - 1];
    const finalOffset = freshOffsets[freshOffsets.length - 1];
    const finalLength = parsed.lengths[final.sequence] ?? Buffer.byteLength(JSON.stringify(final)) + 1;
    const current = context.checkpoint();
    const nextCheckpoint: JournalCheckpoint = {
        lastSequence: final.sequence, lastEventId: final.eventId, lastByteOffset: finalOffset + finalLength,
        journalIdentityHash: parsed.identityHash, journalByteLength: parsed.byteLength,
        projectionRevision: current.projectionRevision + 1, createdAt: final.at
    };
    await context.storeCall(() => context.database.transaction(async (tx: DerivedStoreTransaction) => {
        for (let index = 0; index < fresh.length; index += 1) {
            await tx.insert('journal_event', rowFor(fresh[index], freshOffsets[index], parsed.lengths[fresh[index].sequence] ?? finalLength));
        }
        await tx.updateByPrimaryKey('journal_checkpoint', 1, checkpointRow(nextCheckpoint));
    }));
    context.setCheckpoint(nextCheckpoint);
}
