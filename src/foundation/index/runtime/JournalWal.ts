import {existsSync} from 'node:fs';
import {basename, dirname} from 'node:path';
import {openDerivedStorage, type DerivedStore, type DerivedStoreSchema} from '../../storage/index.js';
import {JournalError} from '../../../contracts/runtimeJournal.js';

const DATABASE_NAME = 'runtime.sqlite';

export const JOURNAL_INDEX_SCHEMA: DerivedStoreSchema = [
    {
        name: 'journal_event',
        columns: [
            {name: 'sequence', type: 'integer', notNull: true}, {name: 'event_id', type: 'text', notNull: true},
            {name: 'event_type', type: 'text', notNull: true}, {name: 'role', type: 'text'},
            {name: 'batch_id', type: 'text'}, {name: 'cycle_id', type: 'text'},
            {name: 'correlation_id', type: 'text'}, {name: 'payload_json', type: 'text', notNull: true},
            {name: 'byte_offset', type: 'integer', notNull: true}, {name: 'byte_length', type: 'integer', notNull: true},
            {name: 'created_at', type: 'text', notNull: true}
        ],
        primaryKey: ['sequence']
    },
    {
        name: 'journal_checkpoint',
        columns: [
            {name: 'id', type: 'integer', notNull: true}, {name: 'last_sequence', type: 'integer'},
            {name: 'last_event_id', type: 'text'}, {name: 'last_byte_offset', type: 'integer'},
            {name: 'journal_identity_hash', type: 'text'}, {name: 'journal_byte_length', type: 'integer'},
            {name: 'projection_revision', type: 'integer'}, {name: 'created_at', type: 'text'}
        ],
        primaryKey: ['id']
    }
];

export interface JournalStore {
    readonly database: DerivedStore;
    checkpointWAL(): Promise<void>;
    close(): Promise<void>;
}

function validateDatabasePath(dbPath: string): void {
    if (basename(dbPath) !== DATABASE_NAME) {
        throw new JournalError('JOURNAL_STORE_UNAVAILABLE', dbPath, `runtime journal indexes must use ${DATABASE_NAME}`);
    }
}

/** Opens the one mutable runtime store with WAL readers and one typed writer. */
export async function openJournalStore(dbPath: string): Promise<JournalStore> {
    validateDatabasePath(dbPath);
    try {
        const database = await openDerivedStorage(dirname(dbPath)).open(
            'runtime', JOURNAL_INDEX_SCHEMA, {create: !existsSync(dbPath)}
        );
        const diagnostics = await database.diagnostics();
        if (diagnostics.journalMode.toLowerCase() !== 'wal' || !diagnostics.foreignKeys || diagnostics.busyTimeoutMs < 5000) {
            await database.close();
            throw new JournalError('JOURNAL_STORE_UNAVAILABLE', dbPath, 'runtime SQLite store did not open with WAL, foreign keys, and bounded busy handling');
        }
        return {database, checkpointWAL: () => database.checkpoint(), close: () => database.close()};
    } catch (error) {
        if (error instanceof JournalError) throw error;
        throw new JournalError('JOURNAL_STORE_UNAVAILABLE', dbPath, error instanceof Error ? error.message : String(error));
    }
}

/** Opens a read-only WAL handle without participating in the single-writer lock. */
export async function openJournalReader(dbPath: string): Promise<JournalStore> {
    validateDatabasePath(dbPath);
    try {
        const database = await openDerivedStorage(dirname(dbPath)).open('runtime', JOURNAL_INDEX_SCHEMA, {readOnly: true});
        return {database, checkpointWAL: async () => undefined, close: () => database.close()};
    } catch (error) {
        throw new JournalError('JOURNAL_STORE_UNAVAILABLE', dbPath, error instanceof Error ? error.message : String(error));
    }
}

export async function closeJournalStore(store: JournalStore): Promise<void> {
    await store.checkpointWAL();
    await store.close();
}

export class JournalWAL {
    constructor(readonly store: JournalStore) {}

    checkpointWAL(): Promise<void> {
        return this.store.checkpointWAL();
    }

    closeJournalStore(): Promise<void> {
        return closeJournalStore(this.store);
    }
}
