/**
 * The one adapter that binds the derived read-model substrate to the pinned
 * `@nirvana/commons` SQLite worker facade. It is the sole importer of that
 * facade and, with `sqliteSchemaSql`/`sqliteStoreQueries`/`sqliteStoreMutations`,
 * the only owner of SQL text. It is capsule-internal: domain consumers reach it
 * only through the `DerivedStorage` composition root (`derivedStorage.ts`), so
 * the worker service, its connection token, statement text, filesystem paths,
 * and the lock file never escape the capsule.
 *
 * A writable store holds the exclusive mutation lock for its whole lifetime, so
 * no ordinary write can bypass the lock a rebuild publication also takes
 * (§8A.4). Existing stores are integrity-verified at admission and poisoned on
 * failure so a corrupt store blocks every dependent read. Integer columns are
 * read in safe-integer mode for 64-bit identity. See the ADR.
 */
import {sqlite} from '@nirvana/commons/foundation/db';
import type {SqlExecutionContext} from '@nirvana/commons/contracts/db';
import {createWatchtowerError} from '../../contracts/index.js';
import type {SqliteConfig} from './SqliteConfig.js';
import {enforceOwnerOnlyPermissions} from './sqliteFilePermissions.js';
import {translateDatabaseError} from './sqliteErrorMapping.js';
import {acquireWriteLock} from './sqliteWriteLock.js';
import {resolveStoreFile, toCommonsConfig} from './sqliteStorePaths.js';
import {checkIntegrity, checkpoint, countRows, groupedCounts, readDiagnostics, selectAll, selectByColumn, selectFrom, selectRecent, selectByPrimaryKey, type SqlRunner} from './sqliteStoreQueries.js';
import {createIndexes, createSchema, deleteRow, insertRow, updateRow} from './sqliteStoreMutations.js';
import type {
    DerivedStore, DerivedStoreLocation, DerivedStoreSchema, DerivedStoreTransaction, IntegrityReport,
    LogicalExport, SqliteValue, StoreDiagnostics, TableDefinition, TypedRow, WriteLock
} from './sqlitePorts.js';

type Service = InstanceType<typeof sqlite.SqliteService>;
type ConnectionToken = Awaited<ReturnType<Service['connect']>>;
type ExecutionContext = SqlExecutionContext<ConnectionToken>;

export interface OpenDerivedStoreOptions {
    readonly create?: boolean;
    readonly lockTimeoutMs?: number;
}

class DerivedSqliteStore implements DerivedStore {
    private readonly tables = new Map<string, TableDefinition>();
    private readonly run: SqlRunner = (sql, params) => this.exec(sql, params);
    private poisoned = false;

    private constructor(
        private readonly service: Service,
        private readonly token: ConnectionToken,
        private readonly file: string,
        private readonly config: SqliteConfig,
        private readonly lock: WriteLock | null,
        schema: DerivedStoreSchema
    ) {
        for (const table of schema) {
            this.tables.set(table.name, table);
        }
    }

    static async open(location: DerivedStoreLocation, schema: DerivedStoreSchema, config: SqliteConfig, options: OpenDerivedStoreOptions = {}): Promise<DerivedStore> {
        const file = resolveStoreFile(location);
        const lock = config.readOnly ? null : await acquireWriteLock(`${file}.lock`, {timeoutMs: options.lockTimeoutMs});
        let service: Service | undefined;
        try {
            service = new sqlite.SqliteService(toCommonsConfig(file, config), {appRoot: location.root, allowedRoots: [location.root]});
            await service.open();
            const store = new DerivedSqliteStore(service, await service.connect(), file, config, lock, schema);
            if (options.create) {
                await store.withTransaction((run) => createSchema(run, schema));
            } else if (!(await store.integrityCheck()).ok) {
                store.poisoned = true;
            } else if (!config.readOnly) {
                await store.withTransaction((run) => createIndexes(run, schema));
            }
            store.tightenPermissions();
            return store;
        } catch (error) {
            if (service) { await service.close().catch(() => undefined); }
            if (lock) { await lock.release(); }
            throw error;
        }
    }

    /** Resolve a declared table, first asserting the store is not poisoned. */
    private tableOf(name: string): TableDefinition {
        this.assertUsable();
        const table = this.tables.get(name);
        if (!table) {
            throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'access derived table', target: name, remediation: 'Reference a table declared in the derived-store schema.'});
        }
        return table;
    }

    private assertUsable(): void {
        if (this.poisoned) {
            throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'use derived store', target: 'derived-store', remediation: 'The store failed an integrity check; rebuild it from canonical sources before use.'});
        }
    }

    private tightenPermissions(): void {
        if (!this.config.readOnly) {
            enforceOwnerOnlyPermissions(this.file, this.config.fileMode);
        }
    }

    private async exec<T extends Record<string, unknown>>(sql: string, params: readonly SqliteValue[], context: ExecutionContext = {connection: this.token}): Promise<T[]> {
        const statement = {sql, params, safeIntegers: true};
        try {
            return (await this.service.execute<T>(statement, context)).rows;
        } catch (error) {
            if ((error as {code?: string}).code === 'DB_CORRUPT') {
                this.poisoned = true;
            }
            throw translateDatabaseError(error, 'execute derived-store statement', 'derived-store');
        }
    }

    private async withTransaction<T>(body: (run: SqlRunner) => Promise<T>): Promise<T> {
        let started: Awaited<ReturnType<Service['createTransaction']>> | undefined;
        try {
            const tx = await this.service.createTransaction({immediate: true});
            started = tx;
            await tx.start();
            const result = await body((sql, params) => this.exec(sql, params, {connection: tx.client, transaction: tx.session}));
            await tx.commit();
            return result;
        } catch (error) {
            if (started) { await started.abort().catch(() => undefined); }
            throw translateDatabaseError(error, 'run derived-store transaction', 'derived-store');
        }
    }

    async insert(table: string, row: TypedRow): Promise<void> {
        await this.insertMany(table, [row]);
    }

    async insertMany(table: string, rows: Iterable<TypedRow>): Promise<void> {
        const definition = this.tableOf(table);
        await this.withTransaction(async (run) => {
            for (const row of rows) {
                await insertRow(run, definition, row);
            }
        });
        this.tightenPermissions();
    }

    async transaction<T>(body: (transaction: DerivedStoreTransaction) => Promise<T>): Promise<T> {
        return this.withTransaction(async (run) => body({
            insert: (table, row) => insertRow(run, this.tableOf(table), row),
            insertMany: async (table, rows) => {
                const definition = this.tableOf(table);
                for (const row of rows) await insertRow(run, definition, row);
            },
            updateByPrimaryKey: (table, key, changes) => updateRow(run, this.tableOf(table), key, changes),
            deleteByPrimaryKey: (table, key) => deleteRow(run, this.tableOf(table), key)
        }));
    }

    async updateByPrimaryKey(table: string, key: SqliteValue | readonly SqliteValue[], changes: TypedRow): Promise<void> {
        const definition = this.tableOf(table);
        await this.withTransaction((run) => updateRow(run, definition, key, changes));
        this.tightenPermissions();
    }

    async deleteByPrimaryKey(table: string, key: SqliteValue | readonly SqliteValue[]): Promise<void> {
        const definition = this.tableOf(table);
        await this.withTransaction((run) => deleteRow(run, definition, key));
    }

    // The readers are `async` so an admission/poison refusal always arrives as a
    // rejection, never as a synchronous throw from a `Promise`-typed port.
    async getByPrimaryKey(table: string, key: SqliteValue | readonly SqliteValue[]): Promise<TypedRow | undefined> {
        return selectByPrimaryKey(this.run, this.tableOf(table), key);
    }

    async list(table: string): Promise<readonly TypedRow[]> {
        return selectAll(this.run, this.tableOf(table));
    }

    async listByColumn(table: string, column: string, value: SqliteValue, limit: number): Promise<readonly TypedRow[]> {
        return selectByColumn(this.run, this.tableOf(table), column, value, limit);
    }

    async listFrom(table: string, column: string, fromInclusive: SqliteValue, limit: number): Promise<readonly TypedRow[]> {
        return selectFrom(this.run, this.tableOf(table), column, fromInclusive, limit);
    }

    async listRecent(table: string, column: string, limit: number): Promise<readonly TypedRow[]> {
        return selectRecent(this.run, this.tableOf(table), column, limit);
    }

    async groupedCounts(table: string, column: string) {
        return groupedCounts(this.run, this.tableOf(table), column);
    }

    async count(table: string): Promise<number> {
        return countRows(this.run, this.tableOf(table));
    }

    integrityCheck(): Promise<IntegrityReport> {
        return checkIntegrity(this.run);
    }

    diagnostics(): Promise<StoreDiagnostics> {
        return readDiagnostics(this.run);
    }

    async exportLogical(): Promise<LogicalExport> {
        this.assertUsable();
        const tables = [];
        for (const definition of this.tables.values()) {
            tables.push({name: definition.name, rows: await selectAll(this.run, definition)});
        }
        return {tables};
    }

    async close(): Promise<void> {
        try {
            await this.service.disconnect(this.token);
            await this.service.close();
        } finally {
            if (this.lock) { await this.lock.release(); }
        }
    }

    async checkpoint(): Promise<void> {
        this.assertUsable();
        await checkpoint(this.run);
    }
}

/** Internal opener used by the composition root and the rebuild owner. */
export function openDerivedStore(location: DerivedStoreLocation, schema: DerivedStoreSchema, config: SqliteConfig, options?: OpenDerivedStoreOptions): Promise<DerivedStore> {
    return DerivedSqliteStore.open(location, schema, config, options);
}
