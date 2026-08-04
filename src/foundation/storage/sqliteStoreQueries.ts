/**
 * Private typed read operations for the derived-store adapter. Each function
 * takes an opaque statement runner supplied by `derivedSqliteStore.ts`, so this
 * module never touches the commons facade or a connection directly; it only
 * pairs the private SQL renderers with the row codec. Nothing here is exported
 * from the capsule barrel.
 */
import {readRow} from './sqliteRowCodec.js';
import {renderCount, renderSelectAll, renderSelectByPrimaryKey} from './sqliteSchemaSql.js';
import type {IntegrityReport, SqliteValue, StoreDiagnostics, TableDefinition, TypedRow} from './sqlitePorts.js';

export type SqlRunner = <T extends Record<string, unknown>>(sql: string, params: readonly SqliteValue[]) => Promise<T[]>;

export async function selectByPrimaryKey(
    run: SqlRunner,
    table: TableDefinition,
    key: SqliteValue | readonly SqliteValue[]
): Promise<TypedRow | undefined> {
    const values = Array.isArray(key) ? key : [key as SqliteValue];
    const rows = await run(renderSelectByPrimaryKey(table), values);
    return rows.length > 0 ? readRow(rows[0]) : undefined;
}

export async function selectAll(run: SqlRunner, table: TableDefinition): Promise<readonly TypedRow[]> {
    const rows = await run(renderSelectAll(table), []);
    return rows.map(readRow);
}

export async function countRows(run: SqlRunner, table: TableDefinition): Promise<number> {
    const rows = await run<{count: bigint | number}>(renderCount(table), []);
    return Number(rows[0]?.count ?? 0);
}

export async function checkIntegrity(run: SqlRunner): Promise<IntegrityReport> {
    try {
        const rows = await run<{integrity_check: string}>('PRAGMA integrity_check', []);
        const details = rows.map((row) => String(row.integrity_check));
        return {ok: details.length === 1 && details[0] === 'ok', details};
    } catch (error) {
        return {ok: false, details: [error instanceof Error ? error.message : String(error)]};
    }
}

export async function checkpoint(run: SqlRunner): Promise<void> {
    await run('PRAGMA wal_checkpoint(PASSIVE)', []);
}

export async function readDiagnostics(run: SqlRunner): Promise<StoreDiagnostics> {
    const [journal] = await run<{journal_mode: string}>('PRAGMA journal_mode', []);
    const [busy] = await run<{timeout: bigint | number}>('PRAGMA busy_timeout', []);
    const [fk] = await run<{foreign_keys: bigint | number}>('PRAGMA foreign_keys', []);
    return {
        journalMode: String(journal?.journal_mode ?? ''),
        busyTimeoutMs: Number(busy?.timeout ?? 0),
        foreignKeys: Number(fk?.foreign_keys ?? 0) === 1
    };
}
