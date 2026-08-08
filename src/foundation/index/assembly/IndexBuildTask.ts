import type {ConsumedPack} from '../../../contracts/pack.js';
import type {IndexBuildResultData} from '../../../contracts/indexBuild.js';
import {existsSync, lstatSync, realpathSync} from 'node:fs';
import {isAbsolute, relative, sep} from 'node:path';
import {buildPackIndexRows} from '../../pack/index/packIndexRowBuilder.js';
import {readPackIndexSource} from '../../pack/index/packIndexManifestFile.js';
import type {PackFileSystem, PackSchemaValidators} from '../../pack/index.js';
import {PackIndexCompiler, type PackIndexCompileDeps} from '../../pack/index/PackIndexCompiler.js';
import {JournalIndex} from '../runtime/JournalIndex.js';
import {parseJournal} from '../runtime/journalIndexSource.js';

export interface IndexBuildTaskInput {
    readonly schemaVersion: 1;
    readonly runtime: boolean;
    readonly dryRun: boolean;
    readonly laneDir?: string;
    readonly packRoot?: string;
    readonly packPath?: string;
    readonly indexRoot?: string;
    readonly laneId?: string;
    readonly acceptedPack?: ConsumedPack;
    readonly runtimeIndexes?: readonly {readonly databasePath: string; readonly journalPath: string}[];
}

export interface IndexBuildTaskDependencies {
    readonly pack?: PackIndexCompileDeps;
    readonly rebuildRuntime?: (databasePath: string, journalPath: string) => Promise<void>;
}

export async function runIndexBuildTask(
    input: IndexBuildTaskInput, dependencies: IndexBuildTaskDependencies
): Promise<IndexBuildResultData> {
    if (input.runtime) return rebuildRuntimeIndexes(input, dependencies.rebuildRuntime);
    const pack = requirePackInput(input);
    const source = readPackIndexSource(input.packRoot ?? '', pack, requirePackFileSystem(dependencies), requirePackValidators(dependencies));
    if ('reason' in source) throw new Error(`${source.reason}:${source.target}`);
    const rows = buildPackIndexRows(source.document, pack);
    if ('reason' in rows) throw new Error(`${rows.reason}:${rows.target}`);
    if (input.dryRun) return result(false, true, null, false, 0, false);
    const compiled = await new PackIndexCompiler(requirePackDependencies(dependencies)).compile({
        pack, packRoot: requirePath(input.packRoot, 'packRoot'), packPath: requirePath(input.packPath, 'packPath'),
        laneId: requirePath(input.laneId, 'laneId'), indexRoot: requirePath(input.indexRoot, 'indexRoot')
    });
    if (!compiled.ok) throw new Error(`${compiled.reason}:${compiled.target}`);
    return result(true, false, compiled.indexId, compiled.reused, 0, false);
}

function rebuildRuntimeIndexes(
    input: IndexBuildTaskInput, rebuild: ((databasePath: string, journalPath: string) => Promise<void>) | undefined
): Promise<IndexBuildResultData> {
    const indexes = input.runtimeIndexes ?? [];
    if (input.dryRun) {
        for (const index of indexes) validateRuntimeIndex(input, index);
        return Promise.resolve(result(false, true, null, false, indexes.length, true));
    }
    for (const index of indexes) validateRuntimeIndex(input, index);
    const operation = rebuild ?? defaultRuntimeRebuild;
    return Promise.all(indexes.map((index) => operation(
        requirePath(index.databasePath, 'databasePath'), requirePath(index.journalPath, 'journalPath')
    ))).then(() => result(indexes.length > 0, false, null, false, indexes.length, true));
}

async function defaultRuntimeRebuild(databasePath: string, journalPath: string): Promise<void> {
    const index = await JournalIndex.open(databasePath, journalPath);
    try { await index.rebuildIndex(journalPath); } finally { await index.close(); }
}

function requirePackInput(input: IndexBuildTaskInput): ConsumedPack {
    if (input.acceptedPack === undefined) throw new Error('INDEX_BUILD_PREDECESSOR_UNAVAILABLE:acceptedPack');
    return input.acceptedPack;
}

function requirePackDependencies(dependencies: IndexBuildTaskDependencies): PackIndexCompileDeps {
    if (dependencies.pack === undefined) throw new Error('INDEX_BUILD_PREDECESSOR_UNAVAILABLE:pack-dependencies');
    return dependencies.pack;
}

function requirePackFileSystem(dependencies: IndexBuildTaskDependencies): PackFileSystem {
    return requirePackDependencies(dependencies).fs;
}

function requirePackValidators(dependencies: IndexBuildTaskDependencies): PackSchemaValidators {
    return requirePackDependencies(dependencies).validators;
}

function requirePath(value: string | undefined, subject: string): string {
    if (typeof value !== 'string' || value.length === 0) throw new Error(`INDEX_BUILD_INPUT_INVALID:${subject}`);
    return value;
}

function validateRuntimeIndex(input: IndexBuildTaskInput, index: {readonly databasePath: string; readonly journalPath: string}): void {
    const laneDir = requirePath(input.laneDir, 'laneDir');
    const databasePath = canonicalLanePath(laneDir, index.databasePath, 'databasePath');
    const journalPath = canonicalLanePath(laneDir, index.journalPath, 'journalPath');
    if (!existsSync(journalPath) || !regularFile(journalPath)) throw new Error(`INDEX_BUILD_CURRENT_STATE_STALE:${journalPath}`);
    const parsed = parseJournal(journalPath);
    if (parsed.partialTail || parsed.events.some((event) => event.laneId !== input.laneId)) {
        throw new Error(`INDEX_BUILD_CURRENT_STATE_STALE:${journalPath}`);
    }
    // A pre-existing database must itself be canonically addressed; a missing
    // database is the normal staged-rebuild input and is allowed.
    if (existsSync(databasePath) && !regularFile(databasePath)) throw new Error(`INDEX_BUILD_CURRENT_STATE_STALE:${databasePath}`);
}

function canonicalLanePath(laneDir: string, value: string, subject: string): string {
    if (!isAbsolute(value)) throw new Error(`INDEX_BUILD_INPUT_INVALID:${subject}`);
    const difference = relative(laneDir, value);
    if (difference === '..' || difference.startsWith(`..${sep}`) || isAbsolute(difference)) {
        throw new Error(`INDEX_BUILD_INPUT_INVALID:${subject}`);
    }
    try {
        const canonicalLane = realpathSync(laneDir);
        const parent = realpathSync(requireParent(value));
        const canonical = existsSync(value) ? realpathSync(value) : `${parent}/${value.slice(requireParent(value).length + 1)}`;
        const inside = relative(canonicalLane, canonical);
        if (inside === '..' || inside.startsWith(`..${sep}`) || isAbsolute(inside)) throw new Error();
        if (existsSync(value) && realpathSync(value) !== value) throw new Error();
        return canonical;
    } catch { throw new Error(`INDEX_BUILD_INPUT_INVALID:${subject}`); }
}

function requireParent(value: string): string {
    const index = value.lastIndexOf(sep);
    if (index <= 0) throw new Error('missing parent');
    return value.slice(0, index);
}

function regularFile(value: string): boolean {
    try { return lstatSync(value).isFile() && realpathSync(value) === value; } catch { return false; }
}

function result(changed: boolean, dryRun: boolean, indexId: string | null, reused: boolean, runtimeIndexes: number, runtime: boolean): IndexBuildResultData {
    return {schemaVersion: 1, runtime, dryRun, changed, indexId, reused, runtimeIndexes};
}
