import {
    lstat,
    readFile,
    readdir,
    realpath
} from 'node:fs/promises';
import {isAbsolute, join, relative} from 'node:path';

import type {SchemaFragmentInput} from '../../../src/foundation/schemaComposition/index.js';
import {composeSchemaFragments} from '../../foundation/schemaComposition/index.js';
import type {
    SchemaCompositionTaskFailureCode,
    SchemaCompositionTaskMode,
    SchemaCompositionTaskResult
} from './schemaCompositionTaskContracts.js';
import {aggregateMode, atomicReplaceAggregate} from './SchemaAggregateWriter.js';
import {SchemaFileBoundaryError} from './SchemaFileBoundaryError.js';

const FRAGMENT_DIRECTORY = join('docs', 'spec', 'schemas', 'v1');
const AGGREGATE_PATH = join('docs', 'spec', 'schemas', 'v1.schema.json');
const FRAGMENT_NAME = /^[A-Za-z0-9][A-Za-z0-9.-]*\.schema\.json$/;

function rejected(
    code: SchemaCompositionTaskFailureCode,
    subject: string | null,
    mode: SchemaCompositionTaskMode | null
): SchemaCompositionTaskResult {
    return {schemaVersion: 1, ok: false, mode, failure: {code, subject}};
}

function isContained(root: string, target: string): boolean {
    const relation = relative(root, target);
    return relation === '' || (!relation.startsWith('..') && !isAbsolute(relation));
}

async function resolveDirectory(projectRoot: string): Promise<{fragments: string; aggregate: string}> {
    const root = await realpath(projectRoot);
    const fragments = join(root, FRAGMENT_DIRECTORY);
    const aggregate = join(root, AGGREGATE_PATH);
    const fragmentInfo = await lstat(fragments);
    if (!fragmentInfo.isDirectory() || fragmentInfo.isSymbolicLink() ||
        await realpath(fragments) !== fragments || !isContained(root, fragments)) {
        throw new SchemaFileBoundaryError('SCHEMA_FRAGMENT_DIRECTORY_INVALID', FRAGMENT_DIRECTORY);
    }
    if (!isContained(root, aggregate)) {
        throw new SchemaFileBoundaryError('SCHEMA_AGGREGATE_PATH_INVALID', AGGREGATE_PATH);
    }
    return {fragments, aggregate};
}

async function readFragments(directory: string): Promise<readonly SchemaFragmentInput[]> {
    const entries = (await readdir(directory, {withFileTypes: true}))
        .sort((left, right) => left.name.localeCompare(right.name));
    if (entries.length === 0) {
        throw new SchemaFileBoundaryError('SCHEMA_FRAGMENT_DIRECTORY_INVALID', FRAGMENT_DIRECTORY);
    }
    const fragments: SchemaFragmentInput[] = [];
    for (const entry of entries) {
        const fragmentPath = join(directory, entry.name);
        if (!FRAGMENT_NAME.test(entry.name) || !entry.isFile() || entry.isSymbolicLink() ||
            !isContained(directory, await realpath(fragmentPath))) {
            throw new SchemaFileBoundaryError('SCHEMA_FRAGMENT_FILE_INVALID', entry.name);
        }
        fragments.push({source: entry.name, bytes: await readFile(fragmentPath)});
    }
    return fragments;
}

async function readAggregate(aggregatePath: string): Promise<Uint8Array | null> {
    try {
        const info = await lstat(aggregatePath);
        if (!info.isFile() || info.isSymbolicLink()) {
            throw new SchemaFileBoundaryError('SCHEMA_AGGREGATE_PATH_INVALID', AGGREGATE_PATH);
        }
        return await readFile(aggregatePath);
    } catch (error: unknown) {
        if (error instanceof SchemaFileBoundaryError) {
            throw error;
        }
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

function parseMode(input: unknown): SchemaCompositionTaskMode | null {
    if (typeof input !== 'object' || input === null || Array.isArray(input) ||
        Object.keys(input).join(',') !== 'mode' || !('mode' in input)) {
        return null;
    }
    return input.mode === 'check' || input.mode === 'write' ? input.mode : null;
}

export async function runSchemaCompositionTask(
    projectRoot: unknown,
    input: unknown,
    tempToken: () => string
): Promise<SchemaCompositionTaskResult> {
    const mode = parseMode(input);
    if (mode === null || typeof projectRoot !== 'string' || projectRoot.length === 0) {
        return rejected('SCHEMA_TASK_INPUT_INVALID', null, mode);
    }
    try {
        return await executeSchemaCompositionTask(projectRoot, mode, tempToken);
    } catch (error: unknown) {
        if (error instanceof SchemaFileBoundaryError) {
            return rejected(error.code, error.subject, mode);
        }
        return rejected('SCHEMA_FILE_IO_FAILED', null, mode);
    }
}

async function executeSchemaCompositionTask(
    projectRoot: string,
    mode: SchemaCompositionTaskMode,
    tempToken: () => string
): Promise<SchemaCompositionTaskResult> {
    const paths = await resolveDirectory(projectRoot);
    const composition = composeSchemaFragments(await readFragments(paths.fragments));
    if (!composition.ok) {
        return rejected(composition.failure.code, composition.failure.subject, mode);
    }
    const current = await readAggregate(paths.aggregate);
    const currentMatches = bytesEqual(current, composition.aggregateBytes);
    if (mode === 'check' && !currentMatches) {
        return rejected('SCHEMA_AGGREGATE_STALE', AGGREGATE_PATH, mode);
    }
    if (mode === 'write' && !currentMatches) {
        await atomicReplaceAggregate(
            paths.aggregate, composition.aggregateBytes, tempToken(), await aggregateMode(paths.aggregate)
        );
        if (!bytesEqual(await readAggregate(paths.aggregate), composition.aggregateBytes)) {
            return rejected('SCHEMA_WRITE_VERIFICATION_FAILED', AGGREGATE_PATH, mode);
        }
    }
    return {
        schemaVersion: 1,
        ok: true,
        mode,
        semanticDigest: composition.semanticDigest,
        aggregateBytes: composition.aggregateBytes.byteLength,
        fragmentCount: composition.fragmentIds.length,
        definitionCount: composition.definitionNames.length,
        wrote: mode === 'write' && !currentMatches
    };
}
