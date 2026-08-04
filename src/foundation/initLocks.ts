/**
 * Lock scope for lane initialization mutations. The order is the normative
 * order in v1-contracts.md §11; callers never acquire these paths manually.
 */
import {mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {createWatchtowerError} from '../contracts/errors.js';
import {buildLanePath, canonicalizePath} from './paths/index.js';
import {resolveWatchtowerDataHome} from './paths/index.js';
import {acquireWriteLock} from './storage/sqliteWriteLock.js';
import type {WriteLock} from './storage/sqlitePorts.js';

const DATA_LOCK = '.membership-index.lock';
const PROJECTION_LOCK = '.publication.lock';
const SESSION_LOCK = 'session.lock';

export interface InitLockOptions {
    readonly dataHome?: string;
    readonly timeoutMs?: number;
    readonly pollMs?: number;
}

export interface InitLockLease {
    readonly paths: readonly string[];
    release(): Promise<void>;
}

let activeLease: InitLockLease | undefined;

export async function acquireInitLockLease(
    controlHome: string, slug: string, options: InitLockOptions = {}
): Promise<InitLockLease> {
    if (activeLease !== undefined) throw lockConflict('initialization locks are already held');
    const root = canonicalizePath(controlHome);
    const laneDir = buildLanePath(root, slug);
    const dataHome = options.dataHome ?? resolveWatchtowerDataHome();
    const indexDir = join(dataHome, 'index');
    await mkdir(indexDir, {recursive: true});
    const paths = [
        join(indexDir, DATA_LOCK),
        join(laneDir, 'state', 'lane.lock'),
        join(laneDir, 'coordinator', 'operator-sessions', SESSION_LOCK),
        join(indexDir, PROJECTION_LOCK)
    ];
    const locks: WriteLock[] = [];
    try {
        for (const path of paths) {
            locks.push(await acquireWriteLock(path, {timeoutMs: options.timeoutMs, pollMs: options.pollMs}));
        }
    } catch (error) {
        await releaseLocks(locks);
        throw error;
    }
    const lease: InitLockLease = {
        paths: Object.freeze(paths),
        release: async () => {
            try { await releaseLocks(locks); } finally {
                if (activeLease?.paths === lease.paths) activeLease = undefined;
            }
        }
    };
    activeLease = lease;
    return lease;
}

export async function acquireInitLocks(
    controlHome: string, slug: string, options: InitLockOptions = {}
): Promise<void> {
    await acquireInitLockLease(controlHome, slug, options);
}

export async function releaseInitLocks(): Promise<void> {
    const lease = activeLease;
    activeLease = undefined;
    if (lease !== undefined) await lease.release();
}

async function releaseLocks(locks: readonly WriteLock[]): Promise<void> {
    let failure: unknown;
    for (const lock of [...locks].reverse()) {
        try { await lock.release(); } catch (error) { failure ??= error; }
    }
    if (failure !== undefined) throw failure;
}

function lockConflict(remediation: string): never {
    throw createWatchtowerError('ERR_LOCK_CONFLICT', {
        operation: 'acquire initialization locks', target: 'lane initialization', remediation
    });
}
