import {lstat, open, rename, unlink} from 'node:fs/promises';
import {dirname, join} from 'node:path';

import {SchemaFileBoundaryError} from './SchemaFileBoundaryError.js';

const AGGREGATE_PATH = join('docs', 'spec', 'schemas', 'v1.schema.json');
const TEMP_TOKEN = /^[A-Za-z0-9-]{1,128}$/;

export async function aggregateMode(aggregatePath: string): Promise<number> {
    try {
        const info = await lstat(aggregatePath);
        if (!info.isFile() || info.isSymbolicLink()) {
            throw new SchemaFileBoundaryError('SCHEMA_AGGREGATE_PATH_INVALID', AGGREGATE_PATH);
        }
        return info.mode & 0o777;
    } catch (error: unknown) {
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return 0o644;
        }
        throw error;
    }
}

export async function atomicReplaceAggregate(
    path: string,
    bytes: Uint8Array,
    token: string,
    mode: number
): Promise<void> {
    if (!TEMP_TOKEN.test(token)) {
        throw new SchemaFileBoundaryError('SCHEMA_TASK_INPUT_INVALID', 'tempToken');
    }
    const directory = dirname(path);
    const tempPath = join(directory, `.v1.schema.${token}.tmp`);
    let tempCreated = false;
    try {
        const handle = await open(tempPath, 'wx', 0o644);
        tempCreated = true;
        try {
            await handle.writeFile(bytes);
            await handle.chmod(mode);
            await handle.sync();
        } finally {
            await handle.close();
        }
        await rename(tempPath, path);
        tempCreated = false;
        const directoryHandle = await open(directory, 'r');
        try {
            await directoryHandle.sync();
        } finally {
            await directoryHandle.close();
        }
    } finally {
        if (tempCreated) {
            await unlink(tempPath).catch(() => undefined);
        }
    }
}
