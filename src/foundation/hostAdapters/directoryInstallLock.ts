import {mkdirSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import {createLockRecord, tryCreateLockRecord} from '../storage/writeLockRecord.js';
import {directoryInstallPort} from './directoryInstallPort.js';

export interface DirectoryInstallLockLease {
    readonly path: string;
}

/** Serializes concurrent installs targeting the same host destination parent directory. */
export function acquireDirectoryInstallLock(destination: string): DirectoryInstallLockLease {
    const parent = dirname(destination);
    mkdirSync(parent, {recursive: true, mode: 0o755});
    const lockPath = join(parent, '.watchtower-skill-install.lock');
    if (tryCreateLockRecord(lockPath, createLockRecord())) {
        directoryInstallPort().syncDirectory(dirname(lockPath));
        return {path: lockPath};
    }
    throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {
        operation: 'install knowledge pack', target: basename(destination),
        remediation: 'Another skill install is already in progress for this host destination; wait for it to finish or remove a stale lock after verifying no install is running.'
    });
}

export function releaseDirectoryInstallLock(lease: DirectoryInstallLockLease | undefined): void {
    if (lease === undefined) return;
    const port = directoryInstallPort();
    try {
        port.rmSync(lease.path, {force: true});
        port.syncDirectory(dirname(lease.path));
    } catch {
        // Best-effort release; the next authorized install may reclaim a dead holder's lock.
    }
}
