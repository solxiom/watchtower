/**
 * Typed, backend-neutral ports for the Watchtower derived read-model substrate.
 *
 * These contracts intentionally expose no SQL, no prepared/arbitrary statement,
 * no database path, no journal/extension control, and no selected-driver type.
 * The pinned `@nirvana/commons` SQLite worker facade and every statement string
 * stay private to the one adapter (`derivedSqliteStore.ts`) and the rebuild
 * owner. Domain consumers work only with declarative schemas and typed rows;
 * the later `PackIndexStore` / `RuntimeProjectionStore` / `SessionIndexStore`
 * capabilities specialize this boundary rather than a raw connection.
 */

/** A typed scalar value stored in, or read from, one column. */
export type SqliteValue = null | bigint | number | string | Uint8Array;

/** A single typed row keyed by column name. */
export type TypedRow = Readonly<Record<string, SqliteValue>>;

/** The affinity of one column in the closed schema registry. */
export type ColumnType = 'integer' | 'text' | 'blob' | 'real';

/** One column in a table definition. */
export interface ColumnDefinition {
    readonly name: string;
    readonly type: ColumnType;
    readonly notNull?: boolean;
}

/** A declared foreign-key edge; enforcement is mandatory and always on. */
export interface ForeignKeyDefinition {
    readonly columns: readonly string[];
    readonly references: {
        readonly table: string;
        readonly columns: readonly string[];
    };
}

/**
 * One table in the closed registry. `primaryKey` names the declared
 * primary-key columns in the order rows are read for semantic identity.
 */
export interface TableDefinition {
    readonly name: string;
    readonly columns: readonly ColumnDefinition[];
    readonly primaryKey: readonly string[];
    readonly foreignKeys?: readonly ForeignKeyDefinition[];
}

/** The closed table registry in schema order. */
export type DerivedStoreSchema = readonly TableDefinition[];

/** The rows of one table, read in declared primary-key order. */
export interface TableExport {
    readonly name: string;
    readonly rows: readonly TypedRow[];
}

/** A versioned logical export used to compute the semantic root. */
export interface LogicalExport {
    readonly tables: readonly TableExport[];
}

/** Result of a structural integrity check. */
export interface IntegrityReport {
    readonly ok: boolean;
    readonly details: readonly string[];
}

/** Bounded runtime diagnostics for status/doctor, read without raw SQL. */
export interface StoreDiagnostics {
    readonly journalMode: string;
    readonly busyTimeoutMs: number;
    readonly foreignKeys: boolean;
}

/** The three §8A derived stores, addressed by kind rather than by path. */
export type DerivedStoreKind = 'pack' | 'runtime' | 'sessions';

/**
 * Authorized location of one derived store, resolved privately by the
 * composition-root factory. `root` is an already-authorized directory; `name`
 * is a validated identifier. This type is capsule-internal — it is never
 * exported from the barrel, so no domain consumer selects a filesystem path.
 */
export interface DerivedStoreLocation {
    readonly root: string;
    readonly name: string;
}

/** Typed write surface handed to a rebuild's populate step. No SQL. */
export interface DerivedStoreWriter {
    insert(table: string, row: TypedRow): Promise<void>;
    insertMany(table: string, rows: Iterable<TypedRow>): Promise<void>;
}

/** A typed derived store over the closed schema; the only downstream API. */
export interface DerivedStore extends DerivedStoreWriter {
    updateByPrimaryKey(table: string, key: SqliteValue | readonly SqliteValue[], changes: TypedRow): Promise<void>;
    deleteByPrimaryKey(table: string, key: SqliteValue | readonly SqliteValue[]): Promise<void>;
    getByPrimaryKey(table: string, key: SqliteValue | readonly SqliteValue[]): Promise<TypedRow | undefined>;
    list(table: string): Promise<readonly TypedRow[]>;
    count(table: string): Promise<number>;
    integrityCheck(): Promise<IntegrityReport>;
    diagnostics(): Promise<StoreDiagnostics>;
    exportLogical(): Promise<LogicalExport>;
    close(): Promise<void>;
}

/**
 * Options for opening a store through the composition-root factory. A writable
 * open acquires the store's exclusive mutation lock for the handle's whole
 * lifetime; `lockTimeoutMs` bounds that wait before `ERR_LOCK_CONFLICT`.
 */
export interface DerivedStorageOpenOptions {
    readonly readOnly?: boolean;
    readonly create?: boolean;
    readonly lockTimeoutMs?: number;
}

/**
 * Composition-root capability for one authorized lane index root. It owns all
 * path and lock-file selection; domain consumers address stores by kind and
 * never see a filesystem path, lock path, or driver.
 */
export interface DerivedStorage {
    open(kind: DerivedStoreKind, schema: DerivedStoreSchema, options?: DerivedStorageOpenOptions): Promise<DerivedStore>;
    rebuild(kind: DerivedStoreKind, schema: DerivedStoreSchema, populate: (writer: DerivedStoreWriter) => Promise<void>, lockTimeoutMs?: number): Promise<RebuildResult>;
}

/** Outcome of a staged rebuild that atomically replaced the active store. */
export interface RebuildResult {
    readonly semanticRoot: string;
    readonly counts: Readonly<Record<string, number>>;
}

/**
 * An acquired exclusive writer/publication lock. A single writer and a rebuild
 * publication both hold this so they can never overlap (the single-writer
 * invariant of `v1-contracts.md §8A.4`).
 */
export interface WriteLock {
    release(): Promise<void>;
}
