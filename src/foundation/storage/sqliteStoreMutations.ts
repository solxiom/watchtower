/**
 * Private typed write operations for the derived-store adapter, covering the
 * one-time schema creation and the typed row mutations. Each function takes the
 * adapter's transaction-bound statement runner, so this module never touches the
 * commons facade directly; it pairs the private SQL renderers with validated
 * column handling. Nothing here is exported from the capsule barrel.
 */
import {createWatchtowerError} from '../../contracts/index.js';
import {renderCreateTable, renderDeleteByPrimaryKey, renderInsert, renderUpdateByPrimaryKey} from './sqliteSchemaSql.js';
import type {SqlRunner} from './sqliteStoreQueries.js';
import type {DerivedStoreSchema, SqliteValue, TableDefinition, TypedRow} from './sqlitePorts.js';

/** Create every declared table in registry order inside the caller's transaction. */
export async function createSchema(run: SqlRunner, schema: DerivedStoreSchema): Promise<void> {
    for (const table of schema) {
        await run(renderCreateTable(table), []);
    }
}

function keyValues(key: SqliteValue | readonly SqliteValue[]): SqliteValue[] {
    return Array.isArray(key) ? [...key] : [key as SqliteValue];
}

export async function insertRow(run: SqlRunner, table: TableDefinition, row: TypedRow): Promise<void> {
    const plan = renderInsert(table);
    const params = plan.columns.map((column) => (column in row ? (row[column] as SqliteValue) : null));
    await run(plan.sql, params);
}

export async function updateRow(
    run: SqlRunner,
    table: TableDefinition,
    key: SqliteValue | readonly SqliteValue[],
    changes: TypedRow
): Promise<void> {
    const primaryKey = new Set(table.primaryKey);
    const columns = new Set(table.columns.map((column) => column.name));
    const changeColumns = Object.keys(changes);
    for (const column of changeColumns) {
        if (!columns.has(column) || primaryKey.has(column)) {
            throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
                operation: 'update derived-store row',
                target: `${table.name}.${column}`,
                remediation: 'Update only declared non-primary-key columns of the schema.'
            });
        }
    }
    if (changeColumns.length === 0) {
        return;
    }
    const params = [...changeColumns.map((column) => changes[column] as SqliteValue), ...keyValues(key)];
    await run(renderUpdateByPrimaryKey(table, changeColumns), params);
}

export async function deleteRow(run: SqlRunner, table: TableDefinition, key: SqliteValue | readonly SqliteValue[]): Promise<void> {
    await run(renderDeleteByPrimaryKey(table), keyValues(key));
}
