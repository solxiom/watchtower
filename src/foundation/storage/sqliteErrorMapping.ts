/**
 * Translate the commons SQLite worker's failures into the accepted RM-01 error
 * taxonomy so the facade's `NirvanaDatabaseError` type never crosses the typed
 * store boundary. Diagnostics are constraint/operation identifiers only; no raw
 * SQL, value, path, or driver internal is propagated.
 */
import {WatchtowerError, createWatchtowerError, type ErrorCode} from '../../contracts/index.js';

const INTEGRITY_CODES = new Set([
    'DB_FOREIGN_KEY_CONSTRAINT',
    'DB_UNIQUE_CONSTRAINT',
    'DB_NOT_NULL_CONSTRAINT',
    'DB_CHECK_CONSTRAINT',
    'DB_CORRUPT',
    'DB_SCHEMA_DRIFT'
]);
const CONFLICT_CODES = new Set(['DB_BUSY', 'DB_TIMEOUT', 'DB_READ_ONLY', 'DB_TRANSACTION_STATE']);
const INVALID_CODES = new Set(['DB_CONFIG_INVALID', 'DB_IDENTIFIER_INVALID', 'DB_QUERY_INVALID', 'DB_VALUE_ENCODING_FAILED']);

function reasonFor(code: string | undefined): ErrorCode {
    if (code !== undefined && INTEGRITY_CODES.has(code)) {
        return 'ERR_INTEGRITY_FAILURE';
    }
    if (code !== undefined && CONFLICT_CODES.has(code)) {
        return 'ERR_LOCK_CONFLICT';
    }
    if (code !== undefined && INVALID_CODES.has(code)) {
        return 'ERR_INVALID_ARGUMENT';
    }
    return 'ERR_INTERNAL';
}

/**
 * Rethrow a `WatchtowerError` unchanged; otherwise map a worker failure to a
 * registered reason code with a safe, actionable diagnostic.
 */
export function translateDatabaseError(error: unknown, operation: string, target: string): WatchtowerError {
    if (error instanceof WatchtowerError) {
        return error;
    }
    const code = typeof (error as {code?: unknown})?.code === 'string' ? (error as {code: string}).code : undefined;
    return createWatchtowerError(reasonFor(code), {
        operation,
        target: code ? `${target} (${code})` : target,
        remediation: 'Rebuild the derived store from canonical sources; it is non-authoritative and disposable.'
    });
}
