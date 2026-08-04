import {createHash} from 'node:crypto';
import {lstat, readFile, readdir, realpath} from 'node:fs/promises';
import {isAbsolute, join, relative} from 'node:path';

import {isJsonObject} from '../../schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from './taskCatalogContracts.js';
import {TaskCatalogFileBoundaryError} from './TaskCatalogFileBoundaryError.js';

const LEAF_DIRECTORY = join('runtime-nvb', 'leaves');

function contained(root: string, target: string): boolean {
    const relation = relative(root, target);
    return relation === '' || (!relation.startsWith('..') && !isAbsolute(relation));
}

async function requireLeafDirectory(root: string): Promise<string> {
    const directory = join(root, LEAF_DIRECTORY);
    try {
        const status = await lstat(directory);
        if (!status.isDirectory() || status.isSymbolicLink() || await realpath(directory) !== directory) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_DIRECTORY_INVALID', LEAF_DIRECTORY);
        }
        return directory;
    } catch (error: unknown) {
        if (error instanceof TaskCatalogFileBoundaryError) throw error;
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_DIRECTORY_INVALID', LEAF_DIRECTORY);
    }
}

async function filesBelow(root: string, directory: string = root): Promise<string[]> {
    const files: string[] = [];
    for (const entry of await readdir(directory, {withFileTypes: true})) {
        const path = join(directory, entry.name);
        if (entry.isSymbolicLink()) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_ASSET_INVALID', relative(root, path));
        }
        if (entry.isDirectory()) files.push(...await filesBelow(root, path));
        else if (entry.isFile()) files.push(relative(root, path));
        else throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_ASSET_INVALID', relative(root, path));
    }
    return files.sort();
}

async function validateLeaf(directory: string, leafId: string, entry: unknown): Promise<string> {
    if (!isJsonObject(entry) || typeof entry.path !== 'string' || typeof entry.sha256 !== 'string') {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_ASSET_INVALID', leafId);
    }
    const relativePath = entry.path.replace(/^\.\/leaves\//u, '');
    const target = join(directory, relativePath);
    try {
        const status = await lstat(target);
        if (!contained(directory, target) || !status.isFile() || status.isSymbolicLink() ||
            await realpath(target) !== target) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_ASSET_INVALID', leafId);
        }
        if ((status.mode & 0o111) === 0) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_MODE_INVALID', leafId);
        }
        const digest = `sha256:${createHash('sha256').update(await readFile(target)).digest('hex')}`;
        if (digest !== entry.sha256) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_CHECKSUM_MISMATCH', leafId);
        }
        return relativePath;
    } catch (error: unknown) {
        if (error instanceof TaskCatalogFileBoundaryError) throw error;
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_ASSET_INVALID', leafId);
    }
}

export async function validateCatalogLeafAssets(projectRoot: string, taskCatalog: JsonObject): Promise<void> {
    if (!isJsonObject(taskCatalog.leaves)) {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_ASSET_INVALID', 'leaves');
    }
    const root = await realpath(projectRoot);
    const directory = await requireLeafDirectory(root);
    const declared: string[] = [];
    for (const [leafId, entry] of Object.entries(taskCatalog.leaves)) {
        declared.push(await validateLeaf(directory, leafId, entry));
    }
    const actual = await filesBelow(directory);
    const expected = declared.sort();
    const extra = actual.find((path) => !expected.includes(path));
    if (extra !== undefined) {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_LEAF_ASSET_EXTRA', extra);
    }
}
