/**
 * Private SQL rendering for the derived-store adapter.
 *
 * This module is the only place that turns a declarative `TableDefinition` into
 * parameterized SQLite text, and it is imported solely by `derivedSqliteStore.ts`
 * and the rebuild owner. Identifiers are validated against a strict grammar and
 * quoted structurally; values are always bound as parameters, never
 * interpolated. Nothing here is re-exported from the capsule barrel, so no raw
 * SQL surface reaches a domain consumer.
 */
import type {ColumnType, IndexDefinition, TableDefinition} from './sqlitePorts.js';

const IDENTIFIER = /^[A-Za-z_][A-Za-z0-9_]*$/;

const COLUMN_SQL_TYPE: Readonly<Record<ColumnType, string>> = Object.freeze({
    integer: 'INTEGER',
    text: 'TEXT',
    blob: 'BLOB',
    real: 'REAL'
});

export interface InsertPlan {
    readonly sql: string;
    readonly columns: readonly string[];
}

function ident(name: string): string {
    if (!IDENTIFIER.test(name)) {
        throw new TypeError(`Unsafe SQLite identifier rejected: ${name}`);
    }
    return `"${name}"`;
}

function columnClause(table: TableDefinition): string {
    const columns = table.columns.map((column) => {
        const nullability = column.notNull ? ' NOT NULL' : '';
        return `${ident(column.name)} ${COLUMN_SQL_TYPE[column.type]}${nullability}`;
    });
    const primaryKey = `PRIMARY KEY (${table.primaryKey.map(ident).join(', ')})`;
    const foreignKeys = (table.foreignKeys ?? []).map((fk) => {
        const local = fk.columns.map(ident).join(', ');
        const foreign = fk.references.columns.map(ident).join(', ');
        return `FOREIGN KEY (${local}) REFERENCES ${ident(fk.references.table)} (${foreign})`;
    });
    return [...columns, primaryKey, ...foreignKeys].join(', ');
}

/** `CREATE TABLE` for one declared table, with primary and foreign keys. */
export function renderCreateTable(table: TableDefinition): string {
    return `CREATE TABLE ${ident(table.name)} (${columnClause(table)})`;
}

/** Parameterized single-row `INSERT`; `columns` fixes the bind order. */
export function renderInsert(table: TableDefinition): InsertPlan {
    const columns = table.columns.map((column) => column.name);
    const placeholders = columns.map(() => '?').join(', ');
    const sql = `INSERT INTO ${ident(table.name)} (${columns.map(ident).join(', ')}) VALUES (${placeholders})`;
    return {sql, columns};
}

/** `SELECT *` in declared primary-key order for a deterministic export. */
export function renderSelectAll(table: TableDefinition): string {
    const order = table.primaryKey.map(ident).join(', ');
    return `SELECT * FROM ${ident(table.name)} ORDER BY ${order}`;
}

/** Parameterized primary-key lookup; bind values follow `primaryKey` order. */
export function renderSelectByPrimaryKey(table: TableDefinition): string {
    const predicate = table.primaryKey.map((column) => `${ident(column)} = ?`).join(' AND ');
    return `SELECT * FROM ${ident(table.name)} WHERE ${predicate}`;
}

function columnOrder(column: string, descending: boolean): string {
    return `${ident(column)} ${descending ? 'DESC' : 'ASC'}`;
}

function validateIndex(index: IndexDefinition): void {
    if (!IDENTIFIER.test(index.name) || index.columns.length === 0) throw new TypeError(`Unsafe SQLite index rejected: ${index.name}`);
}

/** Bounded lookup by one declared column, ordered by the table primary key. */
export function renderSelectByColumn(table: TableDefinition, column: string, descending: boolean): string {
    return `SELECT * FROM ${ident(table.name)} WHERE ${ident(column)} = ? ORDER BY ${columnOrder(table.primaryKey[0], descending)} LIMIT ?`;
}

/** Bounded primary-key range read used for cursor pagination. */
export function renderSelectFrom(table: TableDefinition, column: string): string {
    return `SELECT * FROM ${ident(table.name)} WHERE ${ident(column)} >= ? ORDER BY ${columnOrder(column, false)} LIMIT ?`;
}

/** Bounded newest-first read for recent projections. */
export function renderSelectRecent(table: TableDefinition, column: string): string {
    return `SELECT * FROM ${ident(table.name)} ORDER BY ${columnOrder(column, true)} LIMIT ?`;
}

/** Aggregate event-type counts without materializing every event row. */
export function renderGroupedCount(table: TableDefinition, column: string): string {
    return `SELECT ${ident(column)} AS value, COUNT(*) AS count FROM ${ident(table.name)} GROUP BY ${ident(column)} ORDER BY ${ident(column)} ASC`;
}

/** Declarative index creation kept inside the storage query owner. */
export function renderCreateIndex(table: TableDefinition, index: IndexDefinition): string {
    validateIndex(index);
    const uniqueness = index.unique ? 'UNIQUE ' : '';
    return `CREATE ${uniqueness}INDEX IF NOT EXISTS ${ident(index.name)} ON ${ident(table.name)} (${index.columns.map(ident).join(', ')})`;
}

/** `SELECT COUNT(*)` for one table. */
export function renderCount(table: TableDefinition): string {
    return `SELECT COUNT(*) AS count FROM ${ident(table.name)}`;
}

/**
 * Parameterized primary-key `UPDATE` for the given change columns. Bind order is
 * the change values followed by the primary-key values. Primary-key columns
 * cannot be updated (rejected as an invalid argument by the caller).
 */
export function renderUpdateByPrimaryKey(table: TableDefinition, changeColumns: readonly string[]): string {
    const assignments = changeColumns.map((column) => `${ident(column)} = ?`).join(', ');
    const predicate = table.primaryKey.map((column) => `${ident(column)} = ?`).join(' AND ');
    return `UPDATE ${ident(table.name)} SET ${assignments} WHERE ${predicate}`;
}

/** Parameterized primary-key `DELETE`; bind values follow `primaryKey` order. */
export function renderDeleteByPrimaryKey(table: TableDefinition): string {
    const predicate = table.primaryKey.map((column) => `${ident(column)} = ?`).join(' AND ');
    return `DELETE FROM ${ident(table.name)} WHERE ${predicate}`;
}
