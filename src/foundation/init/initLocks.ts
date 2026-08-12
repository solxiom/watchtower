/**
 * Lock scope for lane initialization mutations. The order is the normative
 * order in v1-contracts.md §11; callers never acquire these paths manually.
 *
 * Two scopes exist because two of the four §11 locks live *inside* the lane
 * directory. Before the init commit point that directory does not exist yet
 * (§11: "the commit point is atomic rename of the complete staged lane to its
 * final previously absent path"), so a pre-commit caller takes the data-root
 * scope — lock 1 and lock 4 — through {@link acquireInitStagingLockLease}. The
 * full four-lock scope in {@link acquireInitLockLease} applies once the lane
 * exists. Both scopes are acquired in the same normative order and share one
 * active-lease guard, so no caller can invert or nest them.
 */
import {mkdir} from 'node:fs/promises';
import {dirname, join} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import {buildLanePath, canonicalizePath} from '../paths/index.js';
import {resolveWatchtowerDataHome} from '../paths/index.js';
import {acquireWriteLock} from '../storage/sqliteWriteLock.js';
import type {WriteLock} from '../storage/sqlitePorts.js';

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
    const root = canonicalizePath(controlHome);
    const laneDir = buildLanePath(root, slug);
    const indexDir = await prepareIndexDirectory(options);
    return takeLease([
        join(indexDir, DATA_LOCK),
        join(laneDir, 'state', 'lane.lock'),
        join(laneDir, 'coordinator', 'operator-sessions', SESSION_LOCK),
        join(indexDir, PROJECTION_LOCK)
    ], options);
}

/**
 * The pre-commit init scope: the data-root membership-index lock (1) and the
 * projection/index publication lock (4). The lane and operator-session locks
 * are deliberately absent because their paths live inside a lane directory
 * that must still be absent at the commit rename.
 */
export async function acquireInitStagingLockLease(options: InitLockOptions = {}): Promise<InitLockLease> {
    const indexDir = await prepareIndexDirectory(options);
    return takeLease([join(indexDir, DATA_LOCK), join(indexDir, PROJECTION_LOCK)], options);
}

async function prepareIndexDirectory(options: InitLockOptions): Promise<string> {
    const indexDir = join(options.dataHome ?? resolveWatchtowerDataHome(), 'index');
    await mkdir(indexDir, {recursive: true});
    return indexDir;
}

async function takeLease(paths: readonly string[], options: InitLockOptions): Promise<InitLockLease> {
    if (activeLease !== undefined) throw lockConflict('initialization locks are already held');
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
