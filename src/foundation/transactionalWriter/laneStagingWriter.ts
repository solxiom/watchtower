/**
 * Stages one complete `LaneLayout` (directories, managed links, then files
 * with manifests written last) beneath an already-created staging root. Every
 * failure throws `TransactionalWriteError` tagged with the exact stage that
 * failed; the caller (`TransactionalWriter.commitLane`) is the sole place
 * that rolls the whole staging tree back, so this module never removes
 * anything itself.
 */
import {createHash} from 'node:crypto';
import {basename, dirname, join, relative} from 'node:path';
import type {LaneFile, LaneLayout, LaneManagedLink} from '../laneStore/laneStoreContracts.js';
import {TransactionalWriteError, type WriteStage} from './transactionalWriterContracts.js';
import type {TransactionalWriterFileSystem} from './transactionalWriterFileSystem.js';

const MANIFEST_NAMES = new Set(['lane.json', 'install.json', 'repositories.local.json', 'lane.config.env']);
const MANIFEST_ORDER = ['lane.json', 'install.json', 'repositories.local.json', 'lane.config.env'];
const DEFAULT_FILE_MODE = 0o644;

export async function stageLaneLayout(fs: TransactionalWriterFileSystem, staging: string, layout: LaneLayout): Promise<void> {
    await stageDirectories(fs, staging, layout);
    await stageLinks(fs, staging, layout);
    await stageFiles(fs, staging, layout);
}

async function stageDirectories(fs: TransactionalWriterFileSystem, staging: string, layout: LaneLayout): Promise<void> {
    for (const dir of layout.dirs) {
        const stagedRelative = relative(layout.laneDir, dir);
        if (stagedRelative === '') continue;
        await run('mkdir', dir, () => fs.mkdir(join(staging, stagedRelative)));
    }
}

async function stageLinks(fs: TransactionalWriterFileSystem, staging: string, layout: LaneLayout): Promise<void> {
    for (const link of layout.links) await stageLink(fs, staging, layout, link);
}

async function stageLink(fs: TransactionalWriterFileSystem, staging: string, layout: LaneLayout, link: LaneManagedLink): Promise<void> {
    const bytes = await run('symlink', link.target, () => fs.readFile(link.target));
    if (link.sha256 !== undefined) {
        const digest: `sha256:${string}` = `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
        if (digest !== link.sha256) {
            throw new TransactionalWriteError('symlink', link.target, new Error('Managed-link target checksum mismatch.'));
        }
    }
    const stagedPath = join(staging, relative(layout.laneDir, link.path));
    await run('symlink', link.path, () => fs.symlink(link.target, stagedPath));
    await run('fsync', link.path, () => fs.syncDirectory(dirname(stagedPath)));
}

async function stageFiles(fs: TransactionalWriterFileSystem, staging: string, layout: LaneLayout): Promise<void> {
    const [regular, manifests] = partitionFiles(layout.files);
    for (const file of regular) await stageFile(fs, staging, layout, file, false);
    for (const name of MANIFEST_ORDER) {
        const file = manifests.get(name);
        if (file !== undefined) await stageFile(fs, staging, layout, file, true);
    }
}

function partitionFiles(files: readonly LaneFile[]): [readonly LaneFile[], Map<string, LaneFile>] {
    const regular: LaneFile[] = [];
    const manifests = new Map<string, LaneFile>();
    for (const file of files) {
        const name = basename(file.path);
        if (MANIFEST_NAMES.has(name)) manifests.set(name, file);
        else regular.push(file);
    }
    return [regular, manifests];
}

async function stageFile(fs: TransactionalWriterFileSystem, staging: string, layout: LaneLayout, file: LaneFile, isManifest: boolean): Promise<void> {
    const finalStagedPath = join(staging, relative(layout.laneDir, file.path));
    const tempPath = `${finalStagedPath}.tmp-${Math.random().toString(16).slice(2)}`;
    const handle = await run('write', file.path, () => fs.open(tempPath, file.mode ?? DEFAULT_FILE_MODE));
    try {
        await run('write', file.path, () => handle.write(file.content));
        await run('fsync', file.path, () => handle.sync());
    } finally {
        await handle.close();
    }
    const renameStage = isManifest ? 'manifest' : 'write';
    await run(renameStage, file.path, () => fs.rename(tempPath, finalStagedPath));
    await run('fsync', file.path, () => fs.syncDirectory(dirname(finalStagedPath)));
}

async function run<T>(stage: WriteStage, path: string, operation: () => Promise<T>): Promise<T> {
    try {
        return await operation();
    } catch (error) {
        if (error instanceof TransactionalWriteError) throw error;
        throw new TransactionalWriteError(stage, path, asError(error));
    }
}

function asError(error: unknown): Error {
    return error instanceof Error ? error : new Error(String(error));
}
