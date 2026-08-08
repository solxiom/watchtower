import type {LaneTaskRunResult} from '../../../contracts/taskRuntime.js';
import type {LaneTaskRunner} from '../../task/runtime/LaneTaskRunner.js';
import type {IndexBuildRequest, IndexBuildResult, IndexBuildResultData} from '../../../contracts/indexBuild.js';
import type {IndexBuildEffectAuthority} from './IndexBuildEffectAuthority.js';

export const INDEX_BUILD_ACTION = 'coordinator.index.build';

export interface IndexBuildService {
    build(request: IndexBuildRequest): Promise<IndexBuildResult>;
    apply(request: IndexBuildRequest): Promise<IndexBuildResult>;
}

export interface IndexBuildCurrentStateReader {
    read(request: IndexBuildRequest): IndexBuildCurrentState;
}

export interface IndexBuildCurrentState {
    readonly laneId: string;
    readonly laneDir: string;
    readonly runtimeVersion: string;
    readonly runtimeRoot: string;
    readonly indexRoot: string;
}

/**
 * Application bridge for the one allowlisted derived-index task.
 *
 * The public composition supplies a durable typed proposal/current-state
 * capsule. `apply()` checks the request-time state fence, then delegates the
 * proposal, lock-time revalidation, invocation envelope, and mutation to the
 * accepted CA-10 effect executor. Missing authorization still fails closed.
 */
export class CoordinatorIndexBuildService implements IndexBuildService {
    constructor(private readonly runner: LaneTaskRunner,
        private readonly currentState: IndexBuildCurrentStateReader = {read: snapshotCurrentState},
        private readonly effect?: IndexBuildEffectAuthority) {}

    async build(request: IndexBuildRequest): Promise<IndexBuildResult> {
        if (!isDryRun(request)) return {ok: false, reason: 'INDEX_BUILD_INPUT_INVALID', target: request.context.laneDir, detail: 'mutating index builds require the accepted lane effect executor'};
        return this.invoke(request);
    }

    async apply(request: IndexBuildRequest): Promise<IndexBuildResult> {
        const fence = validateCurrentState(request, this.currentState.read(request));
        if (fence !== null) return fence;
        if (this.effect === undefined) return {ok: false, reason: 'INDEX_BUILD_EFFECT_AUTHORITY_UNAVAILABLE', target: request.context.laneDir,
            detail: 'mutating index apply requires the accepted lane-local effect executor'};
        return this.effect.apply(request);
    }

    private async invoke(request: IndexBuildRequest): Promise<IndexBuildResult> {
        const result = await this.runner.run({
            actionId: INDEX_BUILD_ACTION,
            context: request.context,
            input: request.taskInput
        });
        return mapTaskResult(result, request);
    }
}

function isDryRun(request: IndexBuildRequest): boolean {
    return typeof request.taskInput === 'object' && request.taskInput !== null && !Array.isArray(request.taskInput)
        && (request.taskInput as Record<string, unknown>).dryRun === true;
}

function snapshotCurrentState(request: IndexBuildRequest): IndexBuildCurrentState {
    const taskInput = request.taskInput as Record<string, unknown>;
    return {laneId: request.context.laneId, laneDir: request.context.laneDir, runtimeVersion: request.context.runtimeVersion,
        runtimeRoot: request.context.runtimeRoot, indexRoot: typeof taskInput.indexRoot === 'string' ? taskInput.indexRoot : ''};
}

function validateCurrentState(request: IndexBuildRequest, current: IndexBuildCurrentState): IndexBuildResultFailure | null {
    const input = request.taskInput as Record<string, unknown>;
    if (current.laneId !== request.context.laneId || current.laneDir !== request.context.laneDir ||
        current.runtimeVersion !== request.context.runtimeVersion || current.runtimeRoot !== request.context.runtimeRoot ||
        current.indexRoot !== input.indexRoot) {
        return {ok: false, reason: 'INDEX_BUILD_CURRENT_STATE_STALE', target: request.context.laneDir, detail: 'lane runtime or index paths changed after proposal preparation'};
    }
    return null;
}

type IndexBuildResultFailure = Extract<IndexBuildResult, {ok: false}>;

function mapTaskResult(result: LaneTaskRunResult, request: IndexBuildRequest): IndexBuildResult {
    if (result.outcome !== 'completed') {
        return {ok: false, reason: result.outcome === 'cancelled' ? 'INDEX_BUILD_TASK_FAILED' : 'INDEX_BUILD_TASK_UNAVAILABLE',
            target: request.context.laneDir, detail: result.outcome === 'cancelled' ? 'index build was cancelled' : result.diagnostic};
    }
    const data = result.result;
    if (!isIndexBuildData(data)) {
        return {ok: false, reason: 'INDEX_BUILD_RESULT_INVALID', target: result.taskId, detail: 'the packaged task returned an invalid index-build result'};
    }
    return {ok: true, data};
}

function isIndexBuildData(value: unknown): value is IndexBuildResultData {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    const keys = ['schemaVersion', 'runtime', 'dryRun', 'changed', 'indexId', 'reused', 'runtimeIndexes'];
    return Object.keys(record).length === keys.length && keys.every((key) => Object.prototype.hasOwnProperty.call(record, key))
        && record.schemaVersion === 1 && typeof record.runtime === 'boolean' && typeof record.dryRun === 'boolean'
        && typeof record.changed === 'boolean' && (record.indexId === null || typeof record.indexId === 'string')
        && typeof record.reused === 'boolean' && Number.isSafeInteger(record.runtimeIndexes)
        && (record.runtimeIndexes as number) >= 0;
}
