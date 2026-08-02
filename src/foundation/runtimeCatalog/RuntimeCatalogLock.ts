import {dirname, join} from 'node:path';
import type {LockRecord} from '../storage/writeLockRecord.js';
import {readLockRecord, recordIsReclaimable, tryCreateLockRecord} from '../storage/writeLockRecord.js';
import {RuntimeCatalogError} from '../../contracts/runtimeCatalog.js';
import type {ImmutableVersionFileSystem} from './ImmutableVersionFileSystem.js';

export interface RuntimeCatalogLockLease {
    readonly path: string;
    readonly record: LockRecord;
}

export interface RuntimeCatalogLockRelease {
    readonly error?: unknown;
    readonly state: 'released' | 'owned' | 'replaced' | 'unverifiable' | 'durability-uncertain';
}

const RELEASE_ATTEMPTS = 2;

export class RuntimeCatalogLock {
    constructor(
        private readonly fileSystem: ImmutableVersionFileSystem,
        private readonly lockRecord: () => LockRecord
    ) {}

    acquire(dataRoot: string): RuntimeCatalogLockLease {
        const path = join(dataRoot, '.runtime-catalog.lock');
        const record = this.lockRecord();
        try {
            if (tryCreateLockRecord(path, record)) return {path, record};
            const holder = readLockRecord(path);
            if (holder && recordIsReclaimable(holder) && this.reclaimStaleLock(path, holder, record)) {
                return this.acquire(dataRoot);
            }
            throw lockConflict(dataRoot, holder);
        } catch (error) {
            if (error instanceof RuntimeCatalogError) throw error;
            throw new RuntimeCatalogError('STAGING_IO_ERROR', dataRoot, message(error));
        }
    }

    release(lease: RuntimeCatalogLockLease | undefined): RuntimeCatalogLockRelease {
        if (!lease) return {state: 'released'};
        let failure: unknown;
        for (let attempt = 0; attempt < RELEASE_ATTEMPTS; attempt += 1) {
            const holder = readLockRecord(lease.path);
            if (!holder) {
                if (this.fileSystem.exists(lease.path)) return {state: 'unverifiable'};
                try {
                    syncDirectory(this.fileSystem, dirname(lease.path));
                    return {state: 'released'};
                } catch (error) { failure = error; }
            } else if (holder.token !== lease.record.token) {
                return {state: 'replaced'};
            } else {
                try {
                    this.fileSystem.unlink(lease.path);
                    syncDirectory(this.fileSystem, dirname(lease.path));
                    return {state: 'released'};
                } catch (error) { failure = error; }
            }
        }
        return this.releaseFailure(lease, failure);
    }

    private releaseFailure(lease: RuntimeCatalogLockLease, error: unknown): RuntimeCatalogLockRelease {
        const holder = readLockRecord(lease.path);
        if (holder?.token === lease.record.token) return {state: 'owned', error};
        if (holder) return {state: 'replaced', error};
        if (this.fileSystem.exists(lease.path)) return {state: 'unverifiable', error};
        return {state: 'durability-uncertain', error};
    }

    private reclaimStaleLock(path: string, dead: LockRecord, record: LockRecord): boolean {
        const sentinel = `${path}.reclaim`;
        if (!this.claimSentinel(sentinel, record)) return false;
        try {
            if (readLockRecord(path)?.token !== dead.token) return false;
            this.fileSystem.unlink(path);
            syncDirectory(this.fileSystem, dirname(path));
            return true;
        } finally {
            this.assertReleased(this.release({path: sentinel, record}), sentinel);
        }
    }

    private claimSentinel(sentinel: string, record: LockRecord): boolean {
        if (tryCreateLockRecord(sentinel, record)) return true;
        const owner = readLockRecord(sentinel);
        if (!owner || !recordIsReclaimable(owner)) return false;
        const cleaner = {...record, token: `${record.token.slice(0, -1)}0`};
        if (!tryCreateLockRecord(`${sentinel}.cleanup`, cleaner)) return false;
        try {
            if (readLockRecord(sentinel)?.token !== owner.token) return false;
            this.fileSystem.unlink(sentinel);
            syncDirectory(this.fileSystem, dirname(sentinel));
            return tryCreateLockRecord(sentinel, record);
        } finally {
            this.assertReleased(this.release({path: `${sentinel}.cleanup`, record: cleaner}), sentinel);
        }
    }

    private assertReleased(result: RuntimeCatalogLockRelease, subject: string): void {
        if (result.state === 'released') return;
        throw new RuntimeCatalogError(
            'STAGING_IO_ERROR', subject, `Runtime catalog recovery lock release is ${result.state}: ${message(result.error)}`
        );
    }
}

function lockConflict(dataRoot: string, holder: LockRecord | null): RuntimeCatalogError {
    return new RuntimeCatalogError(
        'STAGING_IO_ERROR',
        dataRoot,
        holder ? 'Another runtime catalog stage is in progress.' : 'Runtime catalog lock is unreadable.'
    );
}

export function syncDirectory(fileSystem: ImmutableVersionFileSystem, directory: string): void {
    const descriptor = fileSystem.open(directory, 'r');
    try {
        fileSystem.fsync(descriptor);
    } finally {
        fileSystem.close(descriptor);
    }
}

function message(error: unknown): string {
    return error instanceof Error ? error.message : 'unknown error';
}
