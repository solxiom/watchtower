/**
 * Public capsule for the transactional lane commit boundary (`docs/spec/v1.md`
 * §11.1, `docs/spec/v1-contracts.md` §11, LC-03). `commitLane` assembles a
 * complete `LaneLayout` (LC-03 `LaneStore`) in a staging directory adjacent to
 * the final lane directory, writes every manifest last, and commits with one
 * atomic rename. Any failure before that rename rolls the whole staging tree
 * back and never touches the (never-yet-existing) final path. Once the rename
 * succeeds the lane is live and irreversible from here: a failure of the
 * subsequent best-effort parent-directory fsync is reported through
 * `WriteResult.durabilityWarning`, never as a rollback or a thrown
 * `TransactionalWriteError` — see `transactionalWriterContracts.ts`.
 */
import {dirname, isAbsolute, join, relative, sep} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import {safePathTarget} from '../paths/index.js';
import type {LaneLayout} from '../laneStore/laneStoreContracts.js';
import {stageLaneLayout} from './laneStagingWriter.js';
import {TransactionalWriteError, type WriteResult, type WriteStage} from './transactionalWriterContracts.js';
import {nodeTransactionalWriterFileSystem, type TransactionalWriterFileSystem} from './transactionalWriterFileSystem.js';

export type {WriteError, WriteResult, WriteStage} from './transactionalWriterContracts.js';
export {TransactionalWriteError} from './transactionalWriterContracts.js';

type PreCommitWriteStage = Extract<WriteStage, 'mkdir' | 'mkdtemp' | 'rename'>;

export async function commitLane(
    layout: LaneLayout, fs: TransactionalWriterFileSystem = nodeTransactionalWriterFileSystem
): Promise<WriteResult> {
    assertContainedLayout(layout);
    await assertAbsentDestination(fs, layout.laneDir);
    const lanesDir = dirname(layout.laneDir);
    await guarded('mkdir', lanesDir, () => fs.mkdir(lanesDir));
    const staging = await guarded('mkdtemp', lanesDir, () => fs.mkdtemp(join(lanesDir, '.staging-')));
    try {
        await stageLaneLayout(fs, staging, layout);
    } catch (error) {
        await rollbackStaging(staging, fs);
        throw error;
    }
    try {
        await assertAbsentDestination(fs, layout.laneDir);
        await guarded('rename', layout.laneDir, () => fs.rename(staging, layout.laneDir));
    } catch (error) {
        await rollbackStaging(staging, fs);
        throw error;
    }
    // Commit point reached: `layout.laneDir` is now live. No step below this
    // line may roll back, remove, or report the lane as uncommitted.
    const durabilityWarning = await finalParentDirectoryFsync(fs, lanesDir);
    return durabilityWarning === null
        ? {committed: true, laneDir: layout.laneDir}
        : {committed: true, laneDir: layout.laneDir, durabilityWarning};
}

async function finalParentDirectoryFsync(
    fs: TransactionalWriterFileSystem, lanesDir: string
): Promise<WriteResult['durabilityWarning'] | null> {
    try {
        await fs.syncDirectory(lanesDir);
        return null;
    } catch (error) {
        return {stage: 'fsync', path: lanesDir, cause: error instanceof Error ? error : new Error(String(error))};
    }
}

export async function rollbackStaging(stagingDir: string, fs: TransactionalWriterFileSystem = nodeTransactionalWriterFileSystem): Promise<void> {
    await fs.rm(stagingDir);
}

async function assertAbsentDestination(fs: TransactionalWriterFileSystem, laneDir: string): Promise<void> {
    if (await fs.exists(laneDir)) {
        throw new TransactionalWriteError('rename', laneDir, new Error('The lane directory already exists.'));
    }
}

async function guarded<T>(stage: PreCommitWriteStage, path: string, operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof TransactionalWriteError) throw error;
        throw new TransactionalWriteError(stage, path, error instanceof Error ? error : new Error(String(error)));
    }
}

function assertContainedLayout(layout: LaneLayout): void {
    for (const dir of layout.dirs) assertContained(layout.laneDir, dir);
    for (const file of layout.files) assertContained(layout.laneDir, file.path);
    for (const link of layout.links) {
        assertContained(layout.laneDir, link.path);
        if (!isAbsolute(link.target)) throw pathEscape(link.target);
    }
}

function assertContained(laneDir: string, candidate: string): void {
    if (candidate === laneDir) return;
    const difference = relative(laneDir, candidate);
    if (difference === '' || difference.startsWith(`..${sep}`) || difference === '..' || isAbsolute(difference)) {
        throw pathEscape(candidate);
    }
}

function pathEscape(target: string) {
    return createWatchtowerError('ERR_PATH_ESCAPE', {
        operation: 'validate lane layout', target: safePathTarget(target),
        remediation: 'Keep every lane layout path inside the lane directory.'
    });
}
