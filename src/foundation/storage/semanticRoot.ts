/**
 * Semantic-root computation for derived SQLite stores, per
 * `docs/spec/v1-contracts.md §8A.3`.
 *
 * Identity is defined over the logical rows, never the raw SQLite bytes, page
 * order, journal files, vacuum results, or engine version. For identical
 * accepted inputs, schema, and compiler/projector version the semantic root is
 * identical even when the two databases differ byte-for-byte.
 *
 * Values are normalized into a deterministic, type-aware canonical JSON form
 * (RFC 8785 object-key ordering and string escaping for the common JSON-safe
 * case, with lossless encodings for the `bigint` and `Uint8Array` column types
 * the union admits). `node:crypto` provides SHA-256; no Nirvana facade exposes
 * canonical JSON or hashing (recorded as a documented gap in the ADR).
 */
import {createHash} from 'node:crypto';
import type {LogicalExport, SqliteValue, TableExport, TypedRow} from './sqlitePorts.js';

const ROOT_PREFIX = 'sha256:';

function canonicalString(value: string): string {
    let out = '"';
    for (const ch of value) {
        const code = ch.codePointAt(0) as number;
        if (ch === '"') {
            out += '\\"';
        } else if (ch === '\\') {
            out += '\\\\';
        } else if (code === 0x08) {
            out += '\\b';
        } else if (code === 0x09) {
            out += '\\t';
        } else if (code === 0x0a) {
            out += '\\n';
        } else if (code === 0x0c) {
            out += '\\f';
        } else if (code === 0x0d) {
            out += '\\r';
        } else if (code < 0x20) {
            out += `\\u${code.toString(16).padStart(4, '0')}`;
        } else {
            out += ch;
        }
    }
    return `${out}"`;
}

function canonicalValue(value: SqliteValue): string {
    if (value === null) {
        return 'null';
    }
    if (typeof value === 'string') {
        return canonicalString(value);
    }
    if (typeof value === 'bigint') {
        return value.toString(10);
    }
    if (typeof value === 'number') {
        if (!Number.isFinite(value)) {
            throw new TypeError('Non-finite numbers cannot participate in a semantic root.');
        }
        return Object.is(value, -0) ? '0' : value.toString();
    }
    return `"blob:${Buffer.from(value).toString('hex')}"`;
}

function canonicalRow(row: TypedRow): string {
    const keys = Object.keys(row).sort();
    const members = keys.map((key) => `${canonicalString(key)}:${canonicalValue(row[key] as SqliteValue)}`);
    return `{${members.join(',')}}`;
}

function lengthPrefixed(bytes: Buffer): Buffer {
    const prefix = Buffer.allocUnsafe(4);
    prefix.writeUInt32BE(bytes.length, 0);
    return Buffer.concat([prefix, bytes]);
}

function tableDigest(table: TableExport): Buffer {
    const hash = createHash('sha256');
    hash.update(lengthPrefixed(Buffer.from(table.name, 'utf8')));
    const countBytes = Buffer.allocUnsafe(4);
    countBytes.writeUInt32BE(table.rows.length, 0);
    hash.update(countBytes);
    for (const row of table.rows) {
        hash.update(lengthPrefixed(Buffer.from(canonicalRow(row), 'utf8')));
    }
    return hash.digest();
}

/**
 * Compute the lowercase `sha256:` semantic root of a logical export. Tables are
 * consumed in the order the export presents them (registry/schema order), and
 * rows in the order they were read (declared primary-key order).
 */
export function computeSemanticRoot(logical: LogicalExport): string {
    const root = createHash('sha256');
    for (const table of logical.tables) {
        root.update(lengthPrefixed(Buffer.from(table.name, 'utf8')));
        root.update(lengthPrefixed(tableDigest(table)));
    }
    return `${ROOT_PREFIX}${root.digest('hex')}`;
}

/** Row counts per table, for the derived-store manifest `counts` field. */
export function logicalExportCounts(logical: LogicalExport): Record<string, number> {
    const counts: Record<string, number> = {};
    for (const table of logical.tables) {
        counts[table.name] = table.rows.length;
    }
    return counts;
}
