import {lstat, readFile, readdir, realpath} from 'node:fs/promises';
import {isAbsolute, join, relative} from 'node:path';

import {composeTaskCatalog, type CatalogSourceInput} from './index.js';
import type {TaskCatalogCompositionInput} from './taskCatalogContracts.js';
import {replaceCatalogAggregates} from './catalogAggregatePairWriter.js';
import type {CatalogAggregateFileSystem} from './catalogAggregateFileSystem.js';
import {TaskCatalogFileBoundaryError} from './TaskCatalogFileBoundaryError.js';
import {validateCatalogLeafAssets} from './catalogLeafAssetValidator.js';
import type {
    TaskCatalogTaskFailureCode,
    TaskCatalogTaskMode,
    TaskCatalogTaskResult
} from './taskCatalogTaskContracts.js';

const CATALOG_DIRECTORY = join('runtime-nvb', 'catalog', 'capabilities');
const PROFILE_DIRECTORY = join('runtime-nvb', 'profiles');
const SCHEMA_DIRECTORY = join('runtime-nvb', 'schemas');
const RUNTIME_CONFIG = join('runtime-nvb', 'runtime-nvb.json');
const TASK_CATALOG = join('runtime-nvb', 'task-catalog.json');
const CATALOG_NAME = /^[A-Za-z0-9][A-Za-z0-9.-]*\.catalog\.json$/;
const PROFILE_NAME = /^[A-Za-z0-9][A-Za-z0-9.-]*\.profile\.json$/;
const SCHEMA_NAME = /^[A-Za-z0-9][A-Za-z0-9.-]*\.schema\.json$/;
interface CatalogPaths {
    readonly catalogDirectory: string;
    readonly profileDirectory: string;
    readonly schemaDirectory: string;
    readonly runtimeConfig: string;
    readonly taskCatalog: string;
}
export interface TaskCatalogCompositionRuntimeOptions {
    readonly tempToken: () => string;
    readonly aggregateFileSystem?: CatalogAggregateFileSystem;
}

function rejected(
    code: TaskCatalogTaskFailureCode,
    subject: string | null,
    mode: TaskCatalogTaskMode | null
): TaskCatalogTaskResult {
    return {schemaVersion: 1, ok: false, mode, failure: {code, subject}};
}

function contained(root: string, target: string): boolean {
    const relation = relative(root, target);
    return relation === '' || (!relation.startsWith('..') && !isAbsolute(relation));
}

async function validateDirectory(root: string, relativePath: string, code: TaskCatalogTaskFailureCode):
    Promise<string> {
    const path = join(root, relativePath);
    const info = await lstat(path);
    if (!info.isDirectory() || info.isSymbolicLink() || await realpath(path) !== path || !contained(root, path)) {
        throw new TaskCatalogFileBoundaryError(code, relativePath);
    }
    return path;
}

async function resolvePaths(projectRoot: string): Promise<CatalogPaths> {
    const root = await realpath(projectRoot);
    const catalogDirectory = await validateDirectory(
        root, CATALOG_DIRECTORY, 'TASK_CATALOG_FRAGMENT_DIRECTORY_INVALID'
    );
    const profileDirectory = await validateDirectory(
        root, PROFILE_DIRECTORY, 'TASK_PROFILE_DIRECTORY_INVALID'
    );
    const schemaDirectory = await validateDirectory(
        root, SCHEMA_DIRECTORY, 'TASK_CATALOG_SCHEMA_DIRECTORY_INVALID'
    );
    const runtimeConfig = join(root, RUNTIME_CONFIG);
    const taskCatalog = join(root, TASK_CATALOG);
    await rejectPartialArtifacts(join(root, 'runtime-nvb'));
    if (!contained(root, runtimeConfig) || !contained(root, taskCatalog)) {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_AGGREGATE_PATH_INVALID', null);
    }
    return {catalogDirectory, profileDirectory, schemaDirectory, runtimeConfig, taskCatalog};
}

async function rejectPartialArtifacts(directory: string): Promise<void> {
    const entries = await readdir(directory);
    const partial = entries.find((name) =>
        /^\.(?:runtime-nvb|task-catalog)\.[A-Za-z0-9-]+\.(?:tmp|bak)$/.test(name));
    if (partial !== undefined) {
        throw new TaskCatalogFileBoundaryError('TASK_CATALOG_PARTIAL_ARTIFACT', partial);
    }
}

async function readSources(
    directory: string,
    namePattern: RegExp,
    emptyCode: TaskCatalogTaskFailureCode
): Promise<readonly CatalogSourceInput[]> {
    const entries = (await readdir(directory, {withFileTypes: true}))
        .sort((left, right) => left.name.localeCompare(right.name));
    if (entries.length === 0) throw new TaskCatalogFileBoundaryError(emptyCode, directory);
    const sources: CatalogSourceInput[] = [];
    for (const entry of entries) {
        const path = join(directory, entry.name);
        if (!namePattern.test(entry.name) || !entry.isFile() || entry.isSymbolicLink() ||
            !contained(directory, await realpath(path))) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_SOURCE_FILE_INVALID', entry.name);
        }
        sources.push({source: entry.name, bytes: await readFile(path)});
    }
    return sources;
}

async function readAggregate(path: string): Promise<Uint8Array | null> {
    try {
        const info = await lstat(path);
        if (!info.isFile() || info.isSymbolicLink()) {
            throw new TaskCatalogFileBoundaryError('TASK_CATALOG_AGGREGATE_PATH_INVALID', path);
        }
        return await readFile(path);
    } catch (error: unknown) {
        if (error instanceof TaskCatalogFileBoundaryError) throw error;
        if (typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT') {
            return null;
        }
        throw error;
    }
}

function bytesEqual(left: Uint8Array | null, right: Uint8Array): boolean {
    return left !== null && left.byteLength === right.byteLength &&
        left.every((value, index) => value === right[index]);
}

function parseMode(input: unknown): TaskCatalogTaskMode | null {
    if (typeof input !== 'object' || input === null || Array.isArray(input) ||
        Object.keys(input).join(',') !== 'mode' || !('mode' in input)) {
        return null;
    }
    return input.mode === 'check' || input.mode === 'write' ? input.mode : null;
}

async function readCompositionSources(paths: CatalogPaths): Promise<TaskCatalogCompositionInput> {
    return {
        fragments: await readSources(
            paths.catalogDirectory, CATALOG_NAME, 'TASK_CATALOG_FRAGMENT_DIRECTORY_INVALID'
        ),
        profiles: await readSources(paths.profileDirectory, PROFILE_NAME, 'TASK_PROFILE_DIRECTORY_INVALID'),
        schemas: await readSources(
            paths.schemaDirectory, SCHEMA_NAME, 'TASK_CATALOG_SCHEMA_DIRECTORY_INVALID'
        )
    };
}

export async function runTaskCatalogCompositionTask(
    projectRoot: unknown,
    input: unknown,
    options: TaskCatalogCompositionRuntimeOptions
): Promise<TaskCatalogTaskResult> {
    const mode = parseMode(input);
    if (mode === null || typeof projectRoot !== 'string' || projectRoot.length === 0) {
        return rejected('TASK_CATALOG_TASK_INPUT_INVALID', null, mode);
    }
    try {
        return await executeTask(projectRoot, mode, options);
    } catch (error: unknown) {
        return error instanceof TaskCatalogFileBoundaryError ? rejected(error.code, error.subject, mode) :
            rejected('TASK_CATALOG_FILE_IO_FAILED', null, mode);
    }
}

async function executeTask(
    projectRoot: string,
    mode: TaskCatalogTaskMode,
    options: TaskCatalogCompositionRuntimeOptions
): Promise<TaskCatalogTaskResult> {
    const paths = await resolvePaths(projectRoot);
    const composition = composeTaskCatalog(await readCompositionSources(paths));
    if (!composition.ok) return rejected(composition.failure.code, composition.failure.subject, mode);
    await validateCatalogLeafAssets(projectRoot, composition.taskCatalog);
    const currentRuntime = await readAggregate(paths.runtimeConfig);
    const currentCatalog = await readAggregate(paths.taskCatalog);
    const matches = bytesEqual(currentRuntime, composition.runtimeConfigBytes) &&
        bytesEqual(currentCatalog, composition.taskCatalogBytes);
    if (mode === 'check' && !matches) {
        return rejected('TASK_CATALOG_AGGREGATE_STALE', 'runtime-nvb aggregates', mode);
    }
    if (mode === 'write' && !matches) {
        await replaceCatalogAggregates([
            {path: paths.runtimeConfig, label: 'runtime-nvb', bytes: composition.runtimeConfigBytes},
            {path: paths.taskCatalog, label: 'task-catalog', bytes: composition.taskCatalogBytes}
        ], options.tempToken(), options.aggregateFileSystem);
        if (!bytesEqual(await readAggregate(paths.runtimeConfig), composition.runtimeConfigBytes) ||
            !bytesEqual(await readAggregate(paths.taskCatalog), composition.taskCatalogBytes)) {
            return rejected('TASK_CATALOG_WRITE_VERIFICATION_FAILED', 'runtime-nvb aggregates', mode);
        }
    }
    return {
        schemaVersion: 1, ok: true, mode, catalogSha256: composition.catalogSha256,
        runtimeConfigBytes: composition.runtimeConfigBytes.byteLength,
        taskCatalogBytes: composition.taskCatalogBytes.byteLength,
        fragmentCount: composition.fragmentIds.length, profileCount: composition.profileIds.length,
        taskCount: composition.taskIds.length, groupCount: composition.groupIds.length,
        wrote: mode === 'write' && !matches
    };
}
