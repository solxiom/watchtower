/**
 * Cross-process **projection/index publication lock** for one derived store —
 * lock 4 in the `docs/spec/v1-contracts.md §11` order.
 *
 * §8A.4 requires exactly one writer, and §8A.5 requires rebuild publication to
 * switch the store atomically under that same exclusion, so this is the single
 * lock every writable store handle and every rebuild publication acquires. It is
 * taken outside SQLite (acquire → open/transact → release), which satisfies the
 * §11 rule that SQLite transactions nest inside the projection-lock scope.
 *
 * **Scope limit.** This adapter is the projection/index lock only. It is not the
 * lane lock (§11 lock 2) and proves nothing about it. A caller that also needs
 * lane authority must hold the lane lock *outside* this one; a later
 * lane-lifecycle batch owns that integration. No pinned Nirvana facade exposes
 * cross-process file locking, which
 * `nirvana-integration-architecture.md §4.3` names as a dedicated adapter.
 *
 * **Durable record (§11).** The record shape, its validation, and owner
 * classification belong to `writeLockRecord.ts`; this module owns only the
 * acquisition protocol. Every lock and reclaim-sentinel record carries five
 * distinct validated fields: owner `pid`, `processStartIdentity` (the actual
 * boot-anchored process start marker, never the acquisition time), a bounded
 * redacted `command`, the `acquiredAt` timestamp, and a per-acquisition UUID
 * `token`. §11 states a PID alone is insufficient stale-lock proof, so:
 *
 * - liveness matches **both** PID and process start identity, so a reused PID
 *   is detected as a stale owner and reclaimed rather than blocking forever;
 * - a record whose PID and start identity both match is an active holder even
 *   when its token is foreign to the contender;
 * - anything unproven — another platform, an unreadable `/proc`, a malformed or
 *   unverifiable record — keeps the current holder and yields a bounded
 *   `ERR_LOCK_CONFLICT`, so a lock is never stolen on missing evidence;
 * - competing reclaimers are serialized by an exclusive `wx` reclaim sentinel,
 *   and the stale holder's token is re-verified while that sentinel is held, so
 *   a lock recreated by a new live holder in between is never removed;
 * - release removes the file only while its token still matches this
 *   acquisition, so one holder can never delete another holder's lock;
 * - a sentinel leaked by a killed reclaimer is itself reclaimed by the same
 *   liveness rule, so no crash can wedge the lock permanently.
 */
import {rmSync} from 'node:fs';
import {basename} from 'node:path';
import {createWatchtowerError} from '../../contracts/index.js';
import {createLockRecord, readLockRecord, recordIsReclaimable, tryCreateLockRecord, type LockRecord} from './writeLockRecord.js';
import type {WriteLock} from './sqlitePorts.js';

export interface WriteLockOptions {
    readonly timeoutMs?: number;
    readonly pollMs?: number;
}

const DEFAULT_TIMEOUT_MS = 5000;
const DEFAULT_POLL_MS = 25;

function delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
}

/**
 * Take the exclusive reclaim sentinel, or clear one abandoned by a reclaimer
 * that is dead or whose PID was reused. Returns `true` only when this call owns
 * the sentinel. The sentinel carries the same durable §11 record as the lock.
 */
function claimSentinel(sentinel: string, holder: LockRecord): boolean {
    if (tryCreateLockRecord(sentinel, holder)) {
        return true;
    }
    const owner = readLockRecord(sentinel);
    if (owner && recordIsReclaimable(owner)) {
        rmSync(sentinel, {force: true});
    }
    return false;
}

/**
 * Remove a lock whose recorded holder is dead or a reused PID, under the reclaim
 * sentinel and only while that holder's token is still the one recorded.
 */
function reclaimStaleLock(lockPath: string, dead: LockRecord, holder: LockRecord): boolean {
    const sentinel = `${lockPath}.reclaim`;
    if (!claimSentinel(sentinel, holder)) {
        return false;
    }
    try {
        if (readLockRecord(lockPath)?.token !== dead.token) {
            return false;
        }
        rmSync(lockPath, {force: true});
        return true;
    } finally {
        rmSync(sentinel, {force: true});
    }
}

function lockConflict(lockPath: string): never {
    throw createWatchtowerError('ERR_LOCK_CONFLICT', {
        operation: 'acquire the derived-store mutation lock',
        target: basename(lockPath),
        remediation: 'Close the active writable store or wait for the in-flight rebuild before writing or publishing.'
    });
}

function releaserFor(lockPath: string, holder: LockRecord): WriteLock {
    let released = false;
    return {
        release: async () => {
            if (released) {
                return;
            }
            released = true;
            if (readLockRecord(lockPath)?.token === holder.token) {
                rmSync(lockPath, {force: true});
            }
        }
    };
}

/**
 * Acquire the exclusive projection/index publication lock at `lockPath`.
 * Reclaims only a record whose owner is provably dead or whose PID has been
 * reused by a different process. Throws a registered `ERR_LOCK_CONFLICT` when
 * the lock cannot be taken within the timeout, including when the current
 * record cannot be verified.
 */
export async function acquireWriteLock(lockPath: string, options: WriteLockOptions = {}): Promise<WriteLock> {
    const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    const pollMs = options.pollMs ?? DEFAULT_POLL_MS;
    const deadline = Date.now() + timeoutMs;
    const holder = createLockRecord();
    for (;;) {
        if (tryCreateLockRecord(lockPath, holder)) {
            return releaserFor(lockPath, holder);
        }
        const current = readLockRecord(lockPath);
        if (current && recordIsReclaimable(current) && reclaimStaleLock(lockPath, current, holder)) {
            continue;
        }
        if (Date.now() >= deadline) {
            lockConflict(lockPath);
        }
        await delay(pollMs);
    }
}
