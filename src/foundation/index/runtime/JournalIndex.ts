import {dirname} from 'node:path';
import {openDerivedStorage, type DerivedStoreWriter} from '../../storage/index.js';
import type {CorruptionReport, DurableEvent, JournalCheckpoint} from '../../../contracts/runtimeJournal.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';
import {JOURNAL_INDEX_SCHEMA, openJournalStore, type JournalStore} from './JournalWal.js';
import {checkpointFromRow, rowFor} from './journalIndexRows.js';
import {parseJournal, type ParsedJournal} from './journalIndexSource.js';
import {appendEvents} from './journalIndexAppend.js';
import {
    countEventTypes, countEvents, readEvent, readEvents, readEventsByColumn, readLatestEvent,
    readRecentEvents, type JournalIndexReadContext, verifyCheckpoint
} from './journalIndexReads.js';

const CHECKPOINT_ID = 1;

export class JournalIndex {
    private checkpoint: JournalCheckpoint = {
        lastSequence: -1, lastEventId: null, lastByteOffset: 0, journalIdentityHash: null,
        journalByteLength: 0, projectionRevision: 0, createdAt: null
    };
    private unusable = false;
    private rebuildRequired = false;

    private constructor(private readonly dbPath: string, private journalPath: string, private journalStore: JournalStore) {}

    static async open(dbPath: string, journalPath: string): Promise<JournalIndex> {
        const index = new JournalIndex(dbPath, journalPath, await openJournalStore(dbPath));
        try {
            await index.load();
        } catch (error) {
            if (error instanceof JournalError && error.reason === 'JOURNAL_INDEX_CORRUPT') {
                index.unusable = true;
            } else {
                await index.journalStore.close().catch(() => undefined);
                throw error;
            }
        }
        return index;
    }

    private async load(): Promise<void> {
        try {
            const checkpoint = await this.journalStore.database.getByPrimaryKey('journal_checkpoint', CHECKPOINT_ID);
            if (checkpoint !== undefined) this.checkpoint = checkpointFromRow(checkpoint);
        } catch (error) {
            if (error instanceof JournalError) throw error;
            throw new JournalError('JOURNAL_INDEX_CORRUPT', this.journalPath, error instanceof Error ? error.message : String(error));
        }
    }

    private assertUsable(): void {
        if (this.unusable) throw new JournalError('JOURNAL_INDEX_CORRUPT', this.journalPath, 'runtime journal index is unusable; rebuild it from the authoritative journal');
        if (this.rebuildRequired) throw new JournalError('JOURNAL_REBUILD_REQUIRED', this.journalPath, 'runtime journal index requires a staged rebuild');
    }

    private poison(details: readonly string[]): never {
        this.unusable = true;
        throw new JournalError('JOURNAL_INDEX_CORRUPT', this.journalPath, details.join('; ') || 'runtime journal index failed integrity verification');
    }

    private async ensureHealthy(): Promise<void> {
        this.assertUsable();
        try {
            const report = await this.journalStore.database.integrityCheck();
            if (!report.ok) this.poison(report.details);
        } catch (error) {
            if (error instanceof JournalError) throw error;
            this.poison([error instanceof Error ? error.message : String(error)]);
        }
    }

    private async storeCall<T>(operation: () => Promise<T>): Promise<T> {
        await this.ensureHealthy();
        try {
            return await operation();
        } catch (error) {
            if (error instanceof JournalError) {
                if (error.reason === 'JOURNAL_INDEX_CORRUPT') this.unusable = true;
                throw error;
            }
            this.poison([error instanceof Error ? error.message : String(error)]);
        }
    }

    private async ensureCheckpoint(): Promise<void> {
        await this.storeCall(async () => {
            if (await this.journalStore.database.getByPrimaryKey('journal_checkpoint', CHECKPOINT_ID) !== undefined) return;
            await this.journalStore.database.insert('journal_checkpoint', {
                id: CHECKPOINT_ID, last_sequence: null, last_event_id: null, last_byte_offset: 0,
                journal_identity_hash: null, journal_byte_length: 0, projection_revision: 0, created_at: null
            });
        });
    }

    private readContext(): JournalIndexReadContext {
        return {
            database: this.journalStore.database, journalPath: this.journalPath,
            checkpoint: () => this.checkpoint, ensureHealthy: () => this.ensureHealthy(),
            storeCall: (operation) => this.storeCall(operation), markUnusable: () => { this.unusable = true; }
        };
    }

    private appendContext() {
        return {
            database: this.journalStore.database, journalPath: () => this.journalPath,
            checkpoint: () => this.checkpoint, ensureHealthy: () => this.ensureHealthy(),
            ensureCheckpoint: () => this.ensureCheckpoint(), storeCall: <T>(operation: () => Promise<T>) => this.storeCall(operation),
            requireRebuild: () => { this.rebuildRequired = true; }, setCheckpoint: (value: JournalCheckpoint) => { this.checkpoint = value; }
        };
    }

    async appendEvents(events: readonly DurableEvent[], offsets: readonly number[]): Promise<void> {
        return appendEvents(this.appendContext(), events, offsets);
    }

    async readEvent(sequence: number): Promise<DurableEvent | null> {
        return readEvent(this.readContext(), sequence);
    }

    async readEvents(fromSequence: number, limit: number) {
        return readEvents(this.readContext(), fromSequence, limit);
    }

    async readEventsByColumn(column: 'batch_id' | 'cycle_id', value: string, limit?: number) {
        return readEventsByColumn(this.readContext(), column, value, limit);
    }

    async readRecentEvents(limit: number) {
        return readRecentEvents(this.readContext(), limit);
    }

    async countEvents(): Promise<number> { return countEvents(this.readContext()); }

    async countEventTypes() { return countEventTypes(this.readContext()); }

    async readLatestEvent() { return readLatestEvent(this.readContext()); }

    async latestSequence(): Promise<number> { await this.ensureHealthy(); return this.checkpoint.lastSequence; }
    async getCheckpoint(): Promise<JournalCheckpoint> { await this.ensureHealthy(); return this.checkpoint; }

    async verifyCheckpoint(): Promise<boolean> { return verifyCheckpoint(this.readContext()); }

    async detectCorruption(): Promise<CorruptionReport> {
        if (this.unusable) return {ok: false, usable: false, details: ['index was previously marked unusable']};
        try {
            const report = await this.journalStore.database.integrityCheck();
            if (!report.ok) {
                this.unusable = true;
                return {ok: false, usable: false, details: report.details};
            }
            return {ok: true, usable: true, details: []};
        } catch (error) {
            this.unusable = true;
            return {ok: false, usable: false, details: [error instanceof Error ? error.message : String(error)]};
        }
    }

    async rebuildIndex(journalPath = this.journalPath, lockTimeoutMs?: number): Promise<void> {
        const parsed = parseJournal(journalPath);
        await this.journalStore.close();
        const rebuilt = await openDerivedStorage(dirname(this.dbPath)).rebuild(
            'runtime', JOURNAL_INDEX_SCHEMA, async (writer) => this.populateRebuild(writer, parsed), lockTimeoutMs
        );
        if (!rebuilt) throw new JournalError('JOURNAL_STORE_UNAVAILABLE', journalPath, 'staged rebuild did not publish');
        this.journalPath = journalPath;
        this.journalStore = await openJournalStore(this.dbPath);
        this.checkpoint = {
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
