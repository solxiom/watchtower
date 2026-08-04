/**
 * A crash-safe exclusive lock guarding the read-check-switch of `current.json`,
 * the one piece of cross-invocation shared mutable state this capsule owns
 * (each generation's SQLite build happens in its own fresh `<index-id>/`
 * directory and needs no cross-invocation exclusion). `O_EXCL` create is the
 * mutual-exclusion primitive.
 *
 * Reclaim is liveness-based, not age-based. The durable record carries exactly
 * the five fields `docs/spec/v1-contracts.md §11` names: owner `pid`,
 * `processStartIdentity`, `command`, `acquiredAt`, and a per-acquisition
 * `token` (mirroring DB-01's already-accepted `writeLockRecord.ts` record
 * shape, which this batch cannot import directly — it is not exported from the
 * `storage/` barrel — but reuses the shared, already cross-capsule-reused
 * `processIdentity.ts` liveness primitive for the pid/start-identity/command
 * fields). Validation is strict and fails closed: the file is size-bounded
 * before it is read, the parsed value must carry **exactly** these five keys —
 * no missing key and no extra key — and every value is checked against its own
 * grammar, never merely its type. A record that fails any of that is
 * unreadable and therefore never reclaimable, so an extra-key or malformed
 * record can never license reclaiming what might be a live holder.
 *
 * A record is reclaimed only when its owner is provably dead or its PID has
 * been reused by a different process — never merely because it is old — so a
 * long-running live compile can never be evicted regardless of duration. An
 * exclusive reclaim sentinel serializes competing reclaimers and re-verifies
 * the lock's token is unchanged immediately before deleting it, so a lock
 * recreated by a new live holder mid-reclaim is never removed. A sentinel
 * leaked by a killed reclaimer is itself subject to the same liveness check,
 * so no crash can wedge the lock permanently.
 */
import {closeSync, openSync, readFileSync, rmSync, statSync, writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
import {join} from 'node:path';
import {
    classifyRecordedProcess,
    currentProcessIdentity,
    isValidCommandIdentity,
    isValidProcessStartIdentity
} from '../../observation/index.js';
import {packIndexRejection, type PackIndexRejection} from '../../../contracts/packIndex.js';

const LOCK_FILE = '.current.lock';
const RETRY_DELAY_MS = 20;
/** A well-formed record is well under 400 bytes; anything larger is rejected unread. */
const MAX_RECORD_BYTES = 768;
const MAX_PID = 4194304;
const TOKEN_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/;
/** Exactly the five §11 fields, in sorted order — no missing key and no extra key. */
const RECORD_KEYS = ['acquiredAt', 'command', 'pid', 'processStartIdentity', 'token'] as const;

interface PointerLockRecord {
    readonly pid: number;
    readonly processStartIdentity: string;
    readonly command: string;
    readonly acquiredAt: string;
    readonly token: string;
}

export interface PointerLock {
    release(): void;
}

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => { setTimeout(resolve, ms); });
}

/** Canonical `toISOString()` form only — a value that does not round-trip fails. */
function isValidTimestamp(value: unknown): value is string {
    if (typeof value !== 'string') return false;
    const parsed = Date.parse(value);
    return Number.isFinite(parsed) && new Date(parsed).toISOString() === value;
}

/** Exactly the five allowed keys — no missing key and no extra key. */
function hasExactKeys(value: object): boolean {
    const keys = Object.keys(value).sort();
    return keys.length === RECORD_KEYS.length && keys.every((key, index) => key === RECORD_KEYS[index]);
}

function isValidRecord(value: unknown): value is PointerLockRecord {
    if (typeof value !== 'object' || value === null || Array.isArray(value) || !hasExactKeys(value)) return false;
    const {pid, processStartIdentity, command, acquiredAt, token} = value as Record<string, unknown>;
    return typeof pid === 'number' && Number.isInteger(pid) && pid > 0 && pid <= MAX_PID
        && isValidProcessStartIdentity(processStartIdentity)
        && isValidCommandIdentity(command)
        && isValidTimestamp(acquiredAt)
        && typeof token === 'string' && TOKEN_PATTERN.test(token);
}

/**
 * A size-bounded, strictly validated read. An oversized, unparseable, missing-
 * key, extra-key, or grammar-invalid record is never a reclaim target — it is
 * reported as unreadable, and an unreadable record keeps the current holder.
 */
function readRecord(path: string): PointerLockRecord | null {
    try {
        if (statSync(path).size > MAX_RECORD_BYTES) return null;
        const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
        return isValidRecord(parsed) ? parsed : null;
    } catch {
        return null;
    }
}

function tryCreate(path: string, record: PointerLockRecord): boolean {
    try {
        const fd = openSync(path, 'wx');
        try {
            writeFileSync(fd, JSON.stringify(record));
        } finally {
            closeSync(fd);
        }
        return true;
    } catch {
        return false;
    }
}

/** The owner is provably gone: no process occupies its PID, or a different process now does (a reused PID). */
function isReclaimable(record: PointerLockRecord): boolean {
    const liveness = classifyRecordedProcess({pid: record.pid, processStartIdentity: record.processStartIdentity});
    return liveness === 'dead' || liveness === 'stale';
}

/**
 * Remove a lock (or sentinel) whose recorded holder is dead or a reused PID,
 * serialized by an exclusive sentinel and re-verified by token immediately
 * before deletion so a holder that re-acquires between the liveness check and
 * the delete is never evicted.
 */
function reclaim(path: string, dead: PointerLockRecord, contender: PointerLockRecord): boolean {
    const sentinel = `${path}.reclaim`;
    if (tryCreate(sentinel, contender)) {
        try {
            const current = readRecord(path);
            if (current === null || current.token !== dead.token) return false;
            rmSync(path, {force: true});
            return true;
        } finally {
            rmSync(sentinel, {force: true});
        }
    }
    const sentinelHolder = readRecord(sentinel);
    if (sentinelHolder !== null && isReclaimable(sentinelHolder)) {
        rmSync(sentinel, {force: true});
    }
    return false;
}

export async function acquirePointerLock(indexRoot: string, timeoutMs = 5000): Promise<PointerLock | PackIndexRejection> {
    const path = join(indexRoot, LOCK_FILE);
    const deadline = Date.now() + timeoutMs;
    const identity = currentProcessIdentity();
    const myToken = randomUUID();
    const myRecord: PointerLockRecord = {
        pid: identity.pid, processStartIdentity: identity.processStartIdentity, command: identity.command,
        acquiredAt: new Date().toISOString(), token: myToken
    };
    while (true) {
        if (tryCreate(path, myRecord)) {
            return {
                release: () => {
                    try {
                        const current = readRecord(path);
                        if (current !== null && current.token === myToken) rmSync(path, {force: true});
                    } catch { /* already released */ }
                }
            };
        }
        const existing = readRecord(path);
        if (existing !== null && isReclaimable(existing) && reclaim(path, existing, myRecord)) {
            continue;
        }
        if (Date.now() >= deadline) {
            return packIndexRejection('PACK_INDEX_LOCK_CONFLICT', indexRoot, 'the pack-index pointer lock is held');
        }
        await delay(RETRY_DELAY_MS);
    }
}
