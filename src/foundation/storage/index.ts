/**
 * Local surface of the Watchtower derived-SQLite capsule.
 *
 * Domain consumers get exactly one entry point, `openDerivedStorage`, plus the
 * typed store capability and pure identity helpers. The barrel exports no
 * filesystem path, lock path, connection, worker service, raw SQL, prepared or
 * arbitrary statement, extension control, or selected-driver class/type. Path
 * and lock selection live only in the composition root; the pinned commons
 * SQLite facade and all statement text stay private to the adapter and its
 * query/mutation/rebuild owners.
 */
export {openDerivedStorage} from './derivedStorage.js';
export {computeSemanticRoot, logicalExportCounts} from './semanticRoot.js';
export {
    SHIPPING_BUSY_TIMEOUT_MS,
    SHIPPING_FILE_MODE,
    SHIPPING_JOURNAL_MODE,
    createSqliteConfig
} from './SqliteConfig.js';
export type {SqliteConfig, SqliteConfigOverrides, SqliteJournalMode} from './SqliteConfig.js';
export type {
    ColumnDefinition,
    ColumnType,
    DerivedStorage,
    DerivedStorageOpenOptions,
    DerivedStore,
    DerivedStoreTransaction,
    DerivedStoreKind,
    DerivedStoreSchema,
    DerivedStoreWriter,
    ForeignKeyDefinition,
    GroupedCount,
    IntegrityReport,
    IndexDefinition,
    LogicalExport,
    RebuildResult,
    SqliteValue,
    StoreDiagnostics,
    TableDefinition,
    TableExport,
    TypedRow
} from './sqlitePorts.js';
