/**
 * Typed configuration capsule for the derived-SQLite substrate.
 *
 * The shipping defaults are the normative values from
 * `docs/spec/v1-contracts.md §8A.4`: WAL journalling, a 5,000 ms busy timeout,
 * foreign keys enabled, extension loading disabled, and owner-only file
 * permissions. Foreign-key enforcement and the disabled extension surface are
 * guaranteed by the pinned `@nirvana/commons` SQLite worker (verified at worker
 * boot); owner-only permissions are a Watchtower gap enforced by
 * `sqliteFilePermissions.ts`. Some values are non-negotiable invariants of the
 * storage contract and cannot be overridden.
 */
import {createWatchtowerError} from '../../contracts/index.js';

/** The shipping journal mode for mutable derived stores. */
export const SHIPPING_JOURNAL_MODE = 'wal' as const;
/** The shipping busy timeout in milliseconds. */
export const SHIPPING_BUSY_TIMEOUT_MS = 5000;
/** The shipping owner-only database file mode. */
export const SHIPPING_FILE_MODE = 0o600;
/** Upper bound guarding against an unbounded busy wait. */
const MAX_BUSY_TIMEOUT_MS = 600000;

export type SqliteJournalMode = typeof SHIPPING_JOURNAL_MODE;

/** A validated, frozen SQLite configuration. */
export interface SqliteConfig {
    readonly journalMode: SqliteJournalMode;
    readonly busyTimeoutMs: number;
    readonly foreignKeys: true;
    readonly allowExtensions: false;
    readonly fileMode: number;
    readonly readOnly: boolean;
}

/** Caller-supplied overrides; omitted fields take the shipping default. */
export interface SqliteConfigOverrides {
    readonly busyTimeoutMs?: number;
    readonly fileMode?: number;
    readonly readOnly?: boolean;
    readonly foreignKeys?: boolean;
    readonly allowExtensions?: boolean;
    readonly journalMode?: string;
}

function invalid(target: string, remediation: string): never {
    throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: 'construct SQLite configuration',
        target,
        remediation
    });
}

function validateBusyTimeout(value: number | undefined): number {
    if (value === undefined) {
        return SHIPPING_BUSY_TIMEOUT_MS;
    }
    if (!Number.isInteger(value) || value < 0 || value > MAX_BUSY_TIMEOUT_MS) {
        invalid('busyTimeoutMs', `Provide an integer in 0..${MAX_BUSY_TIMEOUT_MS} milliseconds.`);
    }
    return value;
}

function validateFileMode(value: number | undefined): number {
    if (value === undefined) {
        return SHIPPING_FILE_MODE;
    }
    if (!Number.isInteger(value) || value < 0 || value > 0o777) {
        invalid('fileMode', 'Provide an octal permission integer in 0..0o777.');
    }
    if ((value & 0o077) !== 0) {
        invalid('fileMode', 'Derived stores are owner-only; clear all group and other permission bits.');
    }
    return value;
}

function validateInvariants(overrides: SqliteConfigOverrides): void {
    if (overrides.foreignKeys === false) {
        invalid('foreignKeys', 'Foreign-key enforcement is mandatory and cannot be disabled.');
    }
    if (overrides.allowExtensions === true) {
        invalid('allowExtensions', 'Extension loading is forbidden for derived stores.');
    }
    if (overrides.journalMode !== undefined && overrides.journalMode !== SHIPPING_JOURNAL_MODE) {
        invalid('journalMode', `Only "${SHIPPING_JOURNAL_MODE}" journalling is supported for v1 derived stores.`);
    }
}

function isOverrideRecord(value: unknown): value is SqliteConfigOverrides {
    return value === undefined || (typeof value === 'object' && value !== null && !Array.isArray(value));
}

/**
 * Construct a validated, frozen configuration from optional overrides. Throws a
 * registered `ERR_INVALID_ARGUMENT` when an override is malformed or would
 * weaken a non-negotiable storage invariant.
 */
export function createSqliteConfig(overrides?: SqliteConfigOverrides): SqliteConfig {
    if (!isOverrideRecord(overrides)) {
        invalid('overrides', 'Provide a plain overrides object or omit it entirely.');
    }
    const resolved = overrides ?? {};
    validateInvariants(resolved);
    return Object.freeze({
        journalMode: SHIPPING_JOURNAL_MODE,
        busyTimeoutMs: validateBusyTimeout(resolved.busyTimeoutMs),
        foreignKeys: true,
        allowExtensions: false,
        fileMode: validateFileMode(resolved.fileMode),
        readOnly: resolved.readOnly === true
    });
}
