/**
 * Owner-only permission enforcement for derived SQLite files.
 *
 * The pinned commons SQLite worker creates the database and its WAL/shared-memory
 * sidecars with the process umask (observed `0644`), which does not satisfy the
 * owner-only requirement of `docs/spec/v1-contracts.md §8A.4`. No commons facade
 * exposes a permission-owner for these files, so this focused `node:fs` adapter
 * closes the gap by tightening the database and both sidecars after they exist.
 *
 * The brief residual window between worker creation and this chmod is closed in
 * deployment by the lane index directory being owner-only (`0700`), set by lane
 * bootstrap; a file that is momentarily `0644` inside a `0700` directory is not
 * reachable by another account.
 */
import {chmodSync, existsSync} from 'node:fs';

const SIDECAR_SUFFIXES = ['', '-wal', '-shm'] as const;

/** Tighten the database file and its `-wal`/`-shm` sidecars to `mode`. */
export function enforceOwnerOnlyPermissions(databaseFile: string, mode: number): void {
    for (const suffix of SIDECAR_SUFFIXES) {
        const target = `${databaseFile}${suffix}`;
        if (existsSync(target)) {
            chmodSync(target, mode);
        }
    }
}
