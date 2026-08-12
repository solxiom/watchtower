/**
 * The durable lane-lifecycle projection `state/coordinator-lane-state.txt`
 * (`docs/spec/v1.md` §7.2/§9.2, `docs/spec/v1-contracts.md` §2).
 *
 * `wt init` "commits the lane initially as `bootstrap` … then atomically
 * projects `active`" (§2), so exactly two writes exist: the bootstrap file
 * staged inside LC-03's transactional layout, and one atomic post-commit
 * replace to `active`. No accepted batch owned this file — LC-03's layout
 * planner owns manifests, LC-05's baseline owns coordinator policy — so this
 * module is its single writer. It emits nothing but the recognized
 * `lane_status` scalar and re-reads its own bytes through the accepted
 * `parseLaneState` reader before publishing, so a projection this module
 * writes always round-trips.
 */
import {dirname, join} from 'node:path';
import {createWatchtowerError} from '../../../contracts/errors.js';
import {parseLaneState} from '../../parsing/index.js';
import {buildLaneFilePath, safePathTarget} from '../../paths/index.js';
import type {LaneFile} from '../store/index.js';
import {nodeTransactionalWriterFileSystem, type TransactionalWriterFileSystem} from '../writer/index.js';
import type {InitLaneLifecycle} from './initEffectContracts.js';

export const LANE_STATE_RELATIVE_PATH = 'state/coordinator-lane-state.txt';
const FILE_MODE = 0o644;

/** The staged bootstrap projection, composed into the lane layout before the commit rename. */
export function buildLaneStateFile(laneDir: string, lifecycle: InitLaneLifecycle): LaneFile {
    return Object.freeze({
        path: join(laneDir, 'state', 'coordinator-lane-state.txt'),
        content: renderLaneState(lifecycle),
        mode: FILE_MODE
    });
}

/**
 * Atomically replaces the committed projection. Used only after the commit
 * point, so it never creates a lane directory and never removes one: the
 * temporary file is written and fsynced inside the lane's own `state/`
 * directory and renamed over the previous value.
 */
export async function projectLaneState(
    laneDir: string, lifecycle: InitLaneLifecycle, fs: TransactionalWriterFileSystem = nodeTransactionalWriterFileSystem
): Promise<void> {
    const target = buildLaneFilePath(laneDir, LANE_STATE_RELATIVE_PATH);
    const content = renderLaneState(lifecycle);
    const temporary = `${target}.tmp-${process.pid.toString(16)}-${Date.now().toString(16)}`;
    const handle = await fs.open(temporary, FILE_MODE);
    try {
        await handle.write(content);
        await handle.sync();
    } finally {
        await handle.close();
    }
    try {
        await fs.rename(temporary, target);
        await fs.syncDirectory(dirname(target));
    } catch (error) {
        await fs.rm(temporary);
        throw projectionFailure(target, error);
    }
}

function renderLaneState(lifecycle: InitLaneLifecycle): string {
    const content = `lane_status=${lifecycle}\n`;
    const parsed = parseLaneState(content);
    if (!parsed.valid || parsed.lifecycle !== lifecycle) {
        throw projectionFailure('coordinator-lane-state.txt', new Error('The rendered lane state does not read back.'));
    }
    return content;
}

function projectionFailure(target: string, error: unknown) {
    const detail = error instanceof Error ? error.message : 'unknown filesystem failure';
    return createWatchtowerError('ERR_UNSAFE_MUTATION', {
        operation: `project lane lifecycle state (${detail.slice(0, 80)})`,
        target: safePathTarget(target),
        remediation: 'Restore a writable lane state/ directory and re-run the lane activation.'
    });
}
