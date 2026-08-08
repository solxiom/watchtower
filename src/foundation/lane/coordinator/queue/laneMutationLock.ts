/**
 * The serialization fence every coordinator queue and cursor mutation runs
 * inside (CA-13 correction-03 F2/F3; `docs/spec/v1-contracts.md` §11,
 * `docs/spec/coordinator-automation.md` §14).
 *
 * §11 fixes one lane mutation lock and one acquisition order, and CA-10 already
 * owns both in `laneEffectLock.ts`. This module therefore mints no second lock
 * grammar, no second lock file, and no second reclaim rule — it exposes the
 * `lane` level of the accepted authority as a narrow port the queue capsule can
 * depend on, and translates CA-10's conflict into this capsule's typed reason so
 * a caller never has to catch an effect-executor error to schedule a trigger.
 *
 * The port is deliberately *not* re-entrant. An owner takes the lock exactly
 * once per mutation, decides against a projection re-read inside it, and writes
 * before releasing; a nested acquisition would deadlock against its own live
 * record, and the fact that it would is the reason the transaction shape below
 * is the only supported one.
 */
import {EffectExecutionError} from '../../../../contracts/effects.js';
import {CoordinatorQueueError} from '../../../../contracts/coordinatorQueue.js';
import {acquireEffectLocks} from '../../../effect/laneEffectLock.js';
import {nodeEffectFileSystem} from '../../../effect/nodeEffectFileSystem.js';
import type {EffectFileSystem} from '../../../effect/effectPorts.js';

/**
 * Runs one bounded mutation with the lane held. The callback is synchronous on
 * purpose: a lock held across an `await` is a lock held across arbitrary other
 * work, and §14 is explicit that the lane mutation lock is never held across a
 * model response or any other unbounded step.
 */
export interface LaneMutationLock {
    withLaneLock<T>(run: () => T): T;
}

/**
 * Bind the port to the accepted CA-10 lane lock for `laneDir`.
 *
 * `files` is a parameter so a spec can fault one filesystem primitive and still
 * exercise the real acquisition protocol; a fully mocked lock would prove that
 * the code calls *something* and nothing about mutual exclusion.
 */
export function laneMutationLockOver(laneDir: string, files: EffectFileSystem): LaneMutationLock {
    return Object.freeze({
        withLaneLock<T>(run: () => T): T {
            const held = acquire(laneDir, files);
            try {
                return run();
            } finally {
                held.release();
            }
        }
    });
}

export function nodeLaneMutationLock(laneDir: string): LaneMutationLock {
    return laneMutationLockOver(laneDir, nodeEffectFileSystem);
}

/**
 * A lock held by a live owner is `QUEUE_LANE_LOCKED`, never a silent wait and
 * never a steal. The queue's callers are automation cycles that must be able to
 * report "another writer holds this lane" as an ordinary bounded outcome rather
 * than block a poll behind an unbounded acquisition.
 */
function acquire(laneDir: string, files: EffectFileSystem): {release(): void} {
    try {
        return acquireEffectLocks(laneDir, ['lane'], files);
    } catch (error) {
        if (error instanceof EffectExecutionError) {
            throw new CoordinatorQueueError('QUEUE_LANE_LOCKED', laneDir,
                `The lane mutation lock is unavailable (${error.reason}); no queue or cursor byte was written.`);
        }
        throw error;
    }
}
