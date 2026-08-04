import {dirname} from 'node:path';
import {openDerivedStorage, type DerivedStoreWriter} from '../../storage/index.js';
import type {CorruptionReport, DurableEvent, DurableEventPage, JournalCheckpoint} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {JOURNAL_INDEX_SCHEMA, openJournalStore, type JournalStore} from './JournalWal.js';
import {asNumber, asString, checkpointFromRow, checkpointRow, eventFromRow, rowFor} from './journalIndexRows.js';
import {isDurableEvent, parseJournal, type ParsedJournal} from './journalIndexSource.js';

const MAX_PAGE = 200;
const CHECKPOINT_ID = 1;

export class JournalIndex {
    private readonly rows = new Map<number, {event: DurableEvent; offset: number}>();
    private checkpoint: JournalCheckpoint = {
        lastSequence: -1, lastEventId: null, lastByteOffset: 0, journalIdentityHash: null,
        journalByteLength: 0, projectionRevision: 0, createdAt: null
    };
    private unusable = false;
    private rebuildRequired = false;

    private constructor(private readonly dbPath: string, private journalPath: string, private journalStore: JournalStore) {}

    static async open(dbPath: string, journalPath: string): Promise<JournalIndex> {
        const index = new JournalIndex(dbPath, journalPath, await openJournalStore(dbPath));
        await index.load();
        return index;
    }

    private async load(): Promise<void> {
        try {
            const checkpoint = await this.journalStore.database.getByPrimaryKey('journal_checkpoint', CHECKPOINT_ID);
            if (checkpoint !== undefined) this.checkpoint = checkpointFromRow(checkpoint);
            const rows = await this.journalStore.database.list('journal_event');
            for (const row of rows) this.rows.set(asNumber(row.sequence), {event: eventFromRow(row), offset: asNumber(row.byte_offset)});
        } catch (error) {
            await this.journalStore.close().catch(() => undefined);
            if (error instanceof JournalError) throw error;
            throw new JournalError('JOURNAL_INDEX_CORRUPT', this.journalPath, error instanceof Error ? error.message : String(error));
        }
    }

    private assertUsable(): void {
        if (this.unusable) throw new JournalError('JOURNAL_INDEX_CORRUPT', this.journalPath, 'runtime journal index is unusable; rebuild it from the authoritative journal');
        if (this.rebuildRequired) throw new JournalError('JOURNAL_REBUILD_REQUIRED', this.journalPath, 'runtime journal index requires a staged rebuild');
    }

    private async ensureCheckpoint(): Promise<void> {
        if (await this.journalStore.database.getByPrimaryKey('journal_checkpoint', CHECKPOINT_ID) !== undefined) return;
        await this.journalStore.database.insert('journal_checkpoint', {
            id: CHECKPOINT_ID, last_sequence: null, last_event_id: null, last_byte_offset: 0,
            journal_identity_hash: null, journal_byte_length: 0, projection_revision: 0, created_at: null
        });
    }

    private readAppendCandidates(events: readonly DurableEvent[], offsets: readonly number[]): {
        readonly parsed: ParsedJournal;
        readonly fresh: readonly DurableEvent[];
        readonly freshOffsets: readonly number[];
    } {
        let parsed: ParsedJournal;
        try {
            parsed = parseJournal(this.journalPath);
        } catch (error) {
            if (error instanceof JournalError && error.reason === 'JOURNAL_SEQUENCE_GAP') this.rebuildRequired = true;
            throw error;
        }
        if (parsed.partialTail) throw new JournalError('JOURNAL_CORRUPT_TAIL', this.journalPath, 'the authoritative journal has an incomplete final line');
        const fresh: DurableEvent[] = [], freshOffsets: number[] = [];
        for (let index = 0; index < events.length; index += 1) {
            const event = events[index];
            if (!isDurableEvent(event)) throw new JournalError('JOURNAL_INVALID_RECORD', this.journalPath, `event ${index} is invalid`);
            if (event.sequence <= this.checkpoint.lastSequence) continue;
            const authoritative = parsed.events[event.sequence];
            if (authoritative === undefined || authoritative.eventId !== event.eventId || JSON.stringify(authoritative) !== JSON.stringify(event)) {
                throw new JournalError('JOURNAL_CHECKPOINT_MISMATCH', this.journalPath, `event ${event.sequence} does not match the authoritative journal`);
            }
            const expected = this.checkpoint.lastSequence + fresh.length + 1;
            if (event.sequence !== expected) {
                this.rebuildRequired = true;
                throw new JournalError('JOURNAL_SEQUENCE_GAP', this.journalPath, `expected sequence ${expected} but found ${event.sequence}`);
            }
            fresh.push(event); freshOffsets.push(offsets[index]);
        }
        return {parsed, fresh, freshOffsets};
    }

    async appendEvents(events: readonly DurableEvent[], offsets: readonly number[]): Promise<void> {
        this.assertUsable();
        if (events.length !== offsets.length) throw new JournalError('JOURNAL_INVALID_RECORD', this.journalPath, 'event and offset counts differ');
        const {parsed, fresh, freshOffsets} = this.readAppendCandidates(events, offsets);
        await this.ensureCheckpoint();
        if (fresh.length === 0) return;
        const final = fresh[fresh.length - 1];
        const finalOffset = freshOffsets[freshOffsets.length - 1];
        const finalLength = parsed.lengths[final.sequence] ?? Buffer.byteLength(JSON.stringify(final)) + 1;
        const nextCheckpoint: JournalCheckpoint = {
            lastSequence: final.sequence, lastEventId: final.eventId, lastByteOffset: finalOffset + finalLength,
            journalIdentityHash: parsed.identityHash, journalByteLength: parsed.byteLength,
            projectionRevision: this.checkpoint.projectionRevision + 1, createdAt: final.at
        };
        await this.journalStore.database.transaction(async (tx) => {
            for (let index = 0; index < fresh.length; index += 1) {
                await tx.insert('journal_event', rowFor(fresh[index], freshOffsets[index], parsed.lengths[fresh[index].sequence] ?? finalLength));
            }
            await tx.updateByPrimaryKey('journal_checkpoint', CHECKPOINT_ID, checkpointRow(nextCheckpoint));
        });
        for (let index = 0; index < fresh.length; index += 1) this.rows.set(fresh[index].sequence, {event: fresh[index], offset: freshOffsets[index]});
        this.checkpoint = nextCheckpoint;
    }

    async readEvent(sequence: number): Promise<DurableEvent | null> {
        this.assertUsable();
        return this.rows.get(sequence)?.event ?? null;
    }

    async readEvents(fromSequence: number, limit: number): Promise<DurableEventPage> {
        this.assertUsable();
        if (!Number.isSafeInteger(fromSequence) || fromSequence < 0 || !Number.isSafeInteger(limit) || limit < 1 || limit > MAX_PAGE) {
            throw new JournalError('JOURNAL_INVALID_RECORD', this.journalPath, `bounded page requires sequence >= 0 and limit in 1..${MAX_PAGE}`);
        }
        const items: DurableEvent[] = [];
        for (let sequence = fromSequence; sequence <= this.checkpoint.lastSequence && items.length < limit; sequence += 1) {
            const item = this.rows.get(sequence);
            if (item) items.push(item.event);
        }
        const next = items.length === limit ? items[items.length - 1].sequence + 1 : null;
        return {items, fromSequence, limit, nextSequence: next};
    }

    async readLatestEvent(): Promise<{event: DurableEvent; offset: number} | null> {
        this.assertUsable();
        return this.rows.get(this.checkpoint.lastSequence) ?? null;
    }

    async latestSequence(): Promise<number> { this.assertUsable(); return this.checkpoint.lastSequence; }
    async getCheckpoint(): Promise<JournalCheckpoint> { this.assertUsable(); return this.checkpoint; }

    async verifyCheckpoint(): Promise<boolean> {
        this.assertUsable();
        const parsed = parseJournal(this.journalPath);
        if (parsed.partialTail || parsed.events.length - 1 !== this.checkpoint.lastSequence) return false;
        if (parsed.identityHash !== this.checkpoint.journalIdentityHash || parsed.byteLength !== this.checkpoint.journalByteLength) return false;
        const latest = parsed.events[parsed.events.length - 1];
        if (latest !== undefined && (latest.eventId !== this.checkpoint.lastEventId || this.checkpoint.lastByteOffset !== parsed.byteLength)) return false;
        for (const event of parsed.events) {
            const indexed = this.rows.get(event.sequence)?.event;
            if (indexed === undefined || JSON.stringify(indexed) !== JSON.stringify(event)) return false;
        }
        return true;
    }

    async detectCorruption(): Promise<CorruptionReport> {
        if (this.unusable) return {ok: false, usable: false, details: ['index was previously marked unusable']};
        const report = await this.journalStore.database.integrityCheck();
        if (!report.ok) {
            this.unusable = true;
            return {ok: false, usable: false, details: report.details};
        }
        return {ok: true, usable: true, details: []};
    }

    async rebuildIndex(journalPath = this.journalPath): Promise<void> {
        const parsed = parseJournal(journalPath);
        await this.journalStore.close();
        const rebuilt = await openDerivedStorage(dirname(this.dbPath)).rebuild(
            'runtime', JOURNAL_INDEX_SCHEMA, async (writer) => this.populateRebuild(writer, parsed)
        );
        if (!rebuilt) throw new JournalError('JOURNAL_STORE_UNAVAILABLE', journalPath, 'staged rebuild did not publish');
        this.journalPath = journalPath;
        this.journalStore = await openJournalStore(this.dbPath);
        this.rows.clear(); this.checkpoint = {
            lastSequence: -1, lastEventId: null, lastByteOffset: 0, journalIdentityHash: null,
            journalByteLength: 0, projectionRevision: 0, createdAt: null
        };
        this.unusable = false; this.rebuildRequired = false;
        await this.load();
    }

    async triggerStagedRebuild(journalPath = this.journalPath): Promise<void> { return this.rebuildIndex(journalPath); }

    private async populateRebuild(writer: DerivedStoreWriter, parsed: ParsedJournal): Promise<void> {
        for (let index = 0; index < parsed.events.length; index += 1) {
            const event = parsed.events[index];
            await writer.insert('journal_event', rowFor(event, parsed.offsets[index], parsed.lengths[index]));
        }
        const last = parsed.events[parsed.events.length - 1];
        await writer.insert('journal_checkpoint', {
            id: CHECKPOINT_ID, last_sequence: last?.sequence ?? null, last_event_id: last?.eventId ?? null,
            last_byte_offset: last ? parsed.completeByteLength : 0, journal_identity_hash: parsed.identityHash,
            journal_byte_length: parsed.byteLength, projection_revision: last ? parsed.events.length : 0,
            created_at: last?.at ?? null
        });
    }

    async close(): Promise<void> { await this.journalStore.close(); }
}
