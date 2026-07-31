/**
 * Private value codec between typed derived-store rows and the commons SQLite
 * worker. Bind values are passed as parameters only; blob columns cross as
 * `Buffer` and are normalized back to a plain `Uint8Array` on read so the typed
 * `SqliteValue` union and the semantic-root canonicalizer stay deterministic.
 * Integer columns are read in safe-integer mode and therefore arrive as
 * `bigint`, preserving 64-bit identity.
 */
import type {SqliteValue, TypedRow} from './sqlitePorts.js';

/** Normalize a typed value for parameter binding into the worker. */
export function bindValue(value: SqliteValue): unknown {
    return value instanceof Uint8Array ? Buffer.from(value) : value;
}

/** Normalize one raw worker column value into the typed union. */
function readValue(value: unknown): SqliteValue {
    if (value === null || typeof value === 'bigint' || typeof value === 'number' || typeof value === 'string') {
        return value;
    }
    if (value instanceof Uint8Array) {
        return Uint8Array.from(value);
    }
    throw new TypeError('Unsupported SQLite column value returned by the worker.');
}

/** Normalize one raw worker row into a typed row. */
export function readRow(raw: Record<string, unknown>): TypedRow {
    const row: Record<string, SqliteValue> = {};
    for (const key of Object.keys(raw)) {
        row[key] = readValue(raw[key]);
    }
    return row;
}
