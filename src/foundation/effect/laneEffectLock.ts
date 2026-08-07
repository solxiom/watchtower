/**
 * The bounded lane mutation lock the sole effect executor holds (CA-10;
 * `docs/spec/v1-contracts.md` §11, `docs/spec/nirvana-integration-architecture.md`
 * §7 steps 2 and 9).
 *
 * §11 fixes the acquisition order: data-root catalog/membership index, then
 * lane, then operator session, then projection/index publication. This module
 * acquires only the levels an effect actually needs, always ascending, and
 * refuses a descending or repeated request outright rather than silently
 * reordering it — "lock-order inversion is invalid".
 *
 * The durable record itself (owner PID, process start identity, command,
 * acquisition time, and the §11 rule that a PID alone is insufficient
 * stale-lock proof) is LC-owned in `storage/writeLockRecord.ts`; this capsule
 * reuses that owner rather than minting a second lock-record grammar. The lock
 * is held only for the bounded effect and is always released — including on a
 * refusal path — never across a model response.
 */
import {join} from 'node:path';
import {EffectExecutionError} from '../../contracts/effects.js';
import {createLockRecord, readLockRecord, recordIsReclaimable, tryCreateLockRecord, type LockRecord} from '../storage/writeLockRecord.js';
import type {EffectFileSystem} from './effectPorts.js';

/** The §11 order, lowest level first. An acquisition may only ever ascend it. */
export const LOCK_ORDER = ['data-root', 'lane', 'operator-session', 'publication'] as const;
export type LockLevel = typeof LOCK_ORDER[number];

const LOCK_FILES: Readonly<Record<LockLevel, string>> = Object.freeze({
    'data-root': join('coordinator', '.data-root.lock'),
    lane: join('coordinator', '.lane.lock'),
    'operator-session': join('coordinator', '.operator-session.lock'),
    publication: join('coordinator', '.publication.lock')
});

export interface HeldEffectLock {
    /** Stable identity recorded in the invocation envelope's `lockId`. */
    readonly lockId: string;
    readonly levels: readonly LockLevel[];
    release(): void;
}

/**
 * Acquire `levels` in §11 order for the bounded effect. Any level already held
 * by a live owner is a `COORDINATOR_EFFECT_CONFLICT`; a record whose owner is
 * provably dead or whose PID has been reused is reclaimed. Every level already
 * taken is released before the refusal propagates, so a failed acquisition
 * never leaves a partial hold behind.
 */
export function acquireEffectLocks(
    laneDir: string, levels: readonly LockLevel[], files: EffectFileSystem
): HeldEffectLock {
    const ordered = assertAscending(levels);
    const holder = createLockRecord();
    const taken: string[] = [];
    files.ensureDirectory(join(laneDir, 'coordinator'));
    for (const level of ordered) {
        const path = join(laneDir, LOCK_FILES[level]);
        if (!claim(path, holder, files)) {
            releaseAll(taken, holder.token, files);
            throw new EffectExecutionError('COORDINATOR_EFFECT_CONFLICT', level,
                `The "${level}" lock is held by a live owner; this effect does not steal it.`);
        }
        taken.push(path);
    }
    return {
        lockId: holder.token,
        levels: ordered,
        release: () => releaseAll(taken, holder.token, files)
    };
}

/**
 * A caller that already holds a later lock must release it before taking an
 * earlier one, so a descending or repeated level is rejected rather than
 * normalized into a legal-looking order.
 */
function assertAscending(levels: readonly LockLevel[]): readonly LockLevel[] {
    if (levels.length === 0) {
        throw new EffectExecutionError('EFFECT_LOCK_ORDER_INVALID', 'levels',
            'A bounded effect must acquire at least one lock level.');
    }
    let previous = -1;
    for (const level of levels) {
        const rank = LOCK_ORDER.indexOf(level);
        if (rank <= previous) {
            throw new EffectExecutionError('EFFECT_LOCK_ORDER_INVALID', level,
                `Lock level "${level}" does not follow the required ascending order ${LOCK_ORDER.join(' → ')}.`);
        }
        previous = rank;
    }
    return Object.freeze([...levels]);
}

function claim(path: string, holder: LockRecord, files: EffectFileSystem): boolean {
    if (tryCreateLockRecord(path, holder)) return true;
    const current = readLockRecord(path);
    if (current === null || !recordIsReclaimable(current)) return false;
    releaseIfHeldBy(path, current.token, files);
    return tryCreateLockRecord(path, holder);
}

/** Release in reverse acquisition order, and only levels this holder still owns. */
function releaseAll(paths: readonly string[], token: string, files: EffectFileSystem): void {
    for (const path of [...paths].reverse()) releaseIfHeldBy(path, token, files);
}

function releaseIfHeldBy(path: string, token: string, files: EffectFileSystem): void {
    if (readLockRecord(path)?.token === token) files.remove(path);
}
