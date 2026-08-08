import {TaskHandler} from '@nirvana/builder';
import {Buffer} from 'node:buffer';
// The foundation closure is staged by dist:runtime-nvb:foundation-compile before
// this handler is compiled and is part of the relocated runtime package.
// @ts-ignore staged runtime foundation is not in the handler source root
import {loadPackSchemaValidators, nodePackFileSystem} from '../foundation/pack/index.js';
// @ts-ignore staged runtime foundation is not in the handler source root
import {runIndexBuildTask, type IndexBuildTaskInput} from '../foundation/index/assembly/IndexBuildTask.js';
// @ts-ignore staged runtime foundation is not in the handler source root
import type {PackIndexCompileDeps} from '../foundation/pack/index/PackIndexCompiler.js';

export default class IndexBuildTaskHandler extends TaskHandler {
    static readonly handlerName = 'IndexBuildTaskHandler';

    constructor({taskName}: {readonly taskName: string}) {
        super({taskName, handlerName: IndexBuildTaskHandler.handlerName, hasSyncHandler: false,
            hasAsyncHandler: true, waitForDoneSignalOnAsync: true});
    }

    async handleAsync(): Promise<void> {
        const input = readInput(this.argMap);
        if (input === null) return this.reject('INDEX_BUILD_INPUT_INVALID');
        try {
            const dependencies = input.runtime ? {} : {pack: packDependencies()};
            const result = await runIndexBuildTask(input, dependencies);
            this.onResult({structuredOutput: input.dryRun ? result : mutationResult(result, input)});
            this.doneSignal(undefined);
        } catch (error) {
            this.reject(error instanceof Error ? error.message.split(':', 1)[0] : 'INDEX_BUILD_TASK_FAILED');
        }
    }

    private reject(code: string): void {
        this.onResult({structuredOutput: {schemaVersion: 1, ok: false, failure: {code}}});
        this.doneSignal(new Error(code));
    }
}

function mutationResult(result: {readonly changed: boolean; readonly [key: string]: unknown}, input: IndexBuildTaskInput): Record<string, unknown> {
    const target = input.indexRoot ?? input.laneDir ?? 'index';
    return {applied: true, changed: result.changed ? [target] : [], unchanged: result.changed ? [] : [target], warnings: [], indexBuild: result};
}

function readInput(argMap: {get(key: string): unknown; getOriginalIndexes(key: string): readonly number[]}): IndexBuildTaskInput | null {
    if (argMap.getOriginalIndexes('--wt-task-request').length !== 1) return null;
    const value = decodeTaskRequest(argMap.get('--wt-task-request'));
    return isInput(value) ? value : null;
}

function decodeTaskRequest(token: unknown): unknown | null {
    if (typeof token !== 'string' || token.length === 0 || !/^[A-Za-z0-9_-]+$/u.test(token)) return null;
    try { return JSON.parse(Buffer.from(token, 'base64url').toString('utf8')); } catch { return null; }
}

function isInput(value: unknown): value is IndexBuildTaskInput {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    const allowed = new Set(['schemaVersion', 'runtime', 'dryRun', 'laneDir', 'packRoot', 'packPath', 'indexRoot', 'laneId', 'acceptedPack', 'runtimeIndexes']);
    if (Object.keys(item).some((key) => !allowed.has(key)) || item.schemaVersion !== 1 || typeof item.runtime !== 'boolean' || typeof item.dryRun !== 'boolean') return false;
    if (typeof item.laneDir !== 'string' || typeof item.laneId !== 'string' || typeof item.indexRoot !== 'string') return false;
    if (item.runtime) {
        return Array.isArray(item.runtimeIndexes) && item.runtimeIndexes.length > 0 && item.runtimeIndexes.every(isRuntimeIndex)
            && !('packRoot' in item) && !('packPath' in item) && !('acceptedPack' in item);
    }
    return typeof item.packRoot === 'string' && typeof item.packPath === 'string' && isConsumedPack(item.acceptedPack)
        && !('runtimeIndexes' in item);
}

function isRuntimeIndex(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    return Object.keys(item).length === 2 && typeof item.databasePath === 'string' && item.databasePath.length > 0
        && typeof item.journalPath === 'string' && item.journalPath.length > 0;
}

function isConsumedPack(value: unknown): boolean {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const item = value as Record<string, unknown>;
    const strings = ['packId', 'initiativeId', 'packRepository', 'manifestDigest', 'acceptanceDigest', 'sealId', 'reviewedCommit'];
    if (Object.keys(item).some((key) => !['packId', 'initiativeId', 'packRepository', 'manifestDigest', 'acceptanceDigest', 'sealId', 'reviewedCommit', 'repositories', 'sealedFiles', 'acceptedInputs', 'sourceBaselines', 'claimPaths'].includes(key))
        || strings.some((key) => typeof item[key] !== 'string')) return false;
    return arrays(item.repositories, isNonEmptyString) && arrays(item.sealedFiles, isSealedFile)
        && arrays(item.acceptedInputs, isAcceptedInput) && arrays(item.sourceBaselines, isSourceBaseline) && arrays(item.claimPaths, isClaimPath);
}

function arrays(value: unknown, predicate: (value: unknown) => boolean): boolean { return Array.isArray(value) && value.every(predicate); }
function isNonEmptyString(value: unknown): boolean { return typeof value === 'string' && value.length > 0; }
function isDigest(value: unknown): boolean { return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value); }
function isSealedFile(value: unknown): boolean { return recordWithKeys(value, ['path', 'sha256', 'bytes']) && isNonEmptyString((value as Record<string, unknown>).path) && isDigest((value as Record<string, unknown>).sha256) && Number.isSafeInteger((value as Record<string, unknown>).bytes) && (value as Record<string, unknown>).bytes as number >= 0; }
function isAcceptedInput(value: unknown): boolean { return recordWithKeys(value, ['repository', 'path', 'sha256', 'acceptanceRef']) && isNonEmptyString((value as Record<string, unknown>).repository) && isNonEmptyString((value as Record<string, unknown>).path) && isDigest((value as Record<string, unknown>).sha256) && isNonEmptyString((value as Record<string, unknown>).acceptanceRef); }
function isSourceBaseline(value: unknown): boolean { return recordWithKeys(value, ['repository', 'revision', 'dirty']) && isNonEmptyString((value as Record<string, unknown>).repository) && isNonEmptyString((value as Record<string, unknown>).revision) && typeof (value as Record<string, unknown>).dirty === 'boolean'; }
function isClaimPath(value: unknown): boolean { return recordWithKeys(value, ['repository', 'path', 'writable']) && isNonEmptyString((value as Record<string, unknown>).repository) && isNonEmptyString((value as Record<string, unknown>).path) && typeof (value as Record<string, unknown>).writable === 'boolean'; }
function recordWithKeys(value: unknown, keys: readonly string[]): boolean { return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.keys(value).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(value, key)); }

function packDependencies(): PackIndexCompileDeps {
    const validators = loadPackSchemaValidators();
    if (!validators.ok) throw new Error('INDEX_BUILD_PREDECESSOR_UNAVAILABLE:pack-schema');
    return {fs: nodePackFileSystem, validators: validators.validators};
}
