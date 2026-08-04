/**
 * The durable lock record written by the projection/index publication lock, per
 * `docs/spec/v1-contracts.md §11`: "Locks contain owner PID, process start
 * identity, command, and acquisition time. A PID alone is insufficient
 * stale-lock proof."
 *
 * This module owns exactly one concern — the record itself: minting it,
 * exclusively creating it on disk, parsing and validating it back, and
 * classifying whether its owner may be reclaimed. The acquisition protocol
 * (sentinel, retry, timeout, release) lives in `sqliteWriteLock.ts`. Both the
 * lock file and the reclaim sentinel carry this same record shape.
 *
 * Validation is strict and fails closed. The file is size-bounded before it is
 * read; the parsed value must be a plain object carrying **exactly** the five
 * allowed keys; and every value is validated against its own grammar — not
 * merely checked for presence or type. A record that fails any of these is
 * reported as unreadable, and an unreadable or unverifiable record is never
 * reclaimable and never has its token compared.
 *
 * That strictness is the security boundary. A lock file is untrusted input: if
 * an arbitrary string were accepted as a `processStartIdentity`, it would
 * mismatch the real process occupying the PID, be classified as a reused PID,
 * and license reclaiming a live holder's lock. Validating the minted grammar is
 * what stops crafted text from becoming stale authority.
 *
 * Deliberate tradeoff: a record that becomes unreadable is never auto-stolen, so
 * a genuinely corrupt lock file requires operator intervention rather than
 * silent takeover. Failing closed is the required posture for a mutation lock.
 */
import {closeSync, openSync, readFileSync, statSync, writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {
    classifyRecordedProcess,
    currentProcessIdentity,
    isValidCommandIdentity,
    isValidProcessStartIdentity
} from '../observation/index.js';

/** The five distinct §11 fields carried by every lock and sentinel record. */
export interface LockRecord {
    readonly pid: number;
    readonly processStartIdentity: string;
    readonly command: string;
    readonly acquiredAt: string;
    readonly token: string;
}

/** A well-formed record is ~250 bytes; anything larger is rejected unread. */
const MAX_RECORD_BYTES = 1024;
/** Linux caps `pid_max` at 2^22. */
const MAX_PID = 4194304;
const RECORD_KEYS = ['acquiredAt', 'command', 'pid', 'processStartIdentity', 'token'] as const;
const CANONICAL_UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/;

function isValidPid(value: unknown): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value > 0 && value <= MAX_PID;
}

/** Canonical `toISOString()` form only — a value that does not round-trip fails. */
function isValidTimestamp(value: unknown): value is string {
    if (typeof value !== 'string') {
        return false;
    }
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

function isValidToken(value: unknown): value is string {
    return typeof value === 'string' && CANONICAL_UUID.test(value);
}

/** Exactly the five allowed keys — no missing key and no extra key. */
function hasExactKeys(value: object): boolean {
    const keys = Object.keys(value).sort();
    return keys.length === RECORD_KEYS.length && keys.every((key, index) => key === RECORD_KEYS[index]);
}

/** Read a size-bounded record file, or `null` when it is absent or too large. */
function readBoundedText(path: string): string | null {
    try {
        if (statSync(path).size > MAX_RECORD_BYTES) {
            return null;
        }
        return readFileSync(path, 'utf8');
    } catch {
        return null;
    }
}

/**
 * Mint this process's record for one acquisition. The process start identity
 * comes from the process itself and is deliberately separate from `acquiredAt`,
 * which is the acquisition timestamp; `token` is unique per acquisition.
 */
export function createLockRecord(): LockRecord {
    return {
        ...currentProcessIdentity(),
        acquiredAt: new Date().toISOString(),
        token: randomUUID()
    };
}

/**
 * Parse a durable record, validating size, shape, and every §11 field against
 * its own grammar. Returns `null` — meaning "unreadable, keep the current
 * holder" — for anything that is oversized, unparseable, not a plain object,
 * missing a key, carrying an extra key, or holding a value that fails its
 * grammar. Only a fully validated record is returned, so no caller can classify
 * or token-compare against untrusted text.
 */
export function readLockRecord(path: string): LockRecord | null {
    const text = readBoundedText(path);
    if (text === null) {
        return null;
    }
    let parsed: unknown;
    try {
        parsed = JSON.parse(text);
    } catch {
        return null;
    }
    if (typeof parsed !== 'object' || parsed === null || Array.isArray(parsed) || !hasExactKeys(parsed)) {
        return null;
    }
    const {pid, processStartIdentity, command, acquiredAt, token} = parsed as Record<string, unknown>;
    if (
        !isValidPid(pid)
        || !isValidProcessStartIdentity(processStartIdentity)
        || !isValidCommandIdentity(command)
        || !isValidTimestamp(acquiredAt)
        || !isValidToken(token)
    ) {
        return null;
    }
    return {pid, processStartIdentity, command, acquiredAt, token};
}

/**
 * Exclusively create `path` and write `record` into it. Returns `false` when the
 * path already exists, which is how both the lock and the sentinel serialize
 * competing callers.
 */
export function tryCreateLockRecord(path: string, record: LockRecord): boolean {
    let fd: number;
    try {
        fd = openSync(path, 'wx');
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code === 'EEXIST') {
            return false;
        }
        throw error;
    }
    try {
        writeFileSync(fd, JSON.stringify(record));
    } finally {
        closeSync(fd);
    }
    return true;
}

/**
 * A record may be reclaimed only when its owner is provably dead, or when its
 * PID is now occupied by a different process than the one that wrote the record
 * (a reused PID). An active or unverifiable owner is never reclaimable.
 */
export function recordIsReclaimable(record: LockRecord): boolean {
    const liveness = classifyRecordedProcess(record);
    return liveness === 'dead' || liveness === 'stale';
}
