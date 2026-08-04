/**
 * Lane-scoped mutation lock for `ManagedAssets` (Correction 01, finding 4).
 * Reuses the exact accepted §11 lock-record primitives (`writeLockRecord.ts`
 * — owner PID, process start identity, command, acquisition time, token)
 * rather than re-deriving lock semantics; this module owns only the narrow
 * acquire/release protocol for one lane's managed-link lock file.
 *
 * Unlike the projection/index lock's polling acquire, this lock fails
 * immediately on contention: `createLinks`/`removeLinks` are short,
 * fully-synchronous operations, so a caller either gets exclusive access now
 * or a stable `LINK_IO_UNAVAILABLE` conflict to retry, never a blocking poll.
 */
import {unlinkSync} from 'node:fs';
import {join} from 'node:path';
import {ManagedAssetsError} from '../../../contracts/manifests.js';
import {createLockRecord, readLockRecord, recordIsReclaimable, tryCreateLockRecord, type LockRecord} from '../../storage/writeLockRecord.js';

const LOCK_FILE = '.watchtower-managed-assets.lock';

export interface ManagedAssetsLockLease {
    release(): void;
}

export function acquireManagedAssetsLock(laneDir: string): ManagedAssetsLockLease {
    const path = join(laneDir, LOCK_FILE);
    const holder = createLockRecord();
    if (tryCreateLockRecord(path, holder)) return releaser(path, holder);
    const current = readLockRecord(path);
    if (current !== null && recordIsReclaimable(current) && reclaim(path, current, holder) && tryCreateLockRecord(path, holder)) {
        return releaser(path, holder);
    }
    throw new ManagedAssetsError('LINK_IO_UNAVAILABLE', laneDir,
        'Another managed-asset operation holds the lane managed-link lock.');
}

function reclaim(path: string, dead: LockRecord, holder: LockRecord): boolean {
    const sentinel = `${path}.reclaim`;
    if (!tryCreateLockRecord(sentinel, holder)) return false;
    try {
        if (readLockRecord(path)?.token !== dead.token) return false;
        unlinkSync(path);
        return true;
    } finally {
        unlinkSync(sentinel);
    }
}

function releaser(path: string, holder: LockRecord): ManagedAssetsLockLease {
    return {
        release(): void {
            if (readLockRecord(path)?.token === holder.token) {
                try { unlinkSync(path); } catch { /* best-effort release */ }
            }
        }
    };
}
