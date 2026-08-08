import type {LaneTaskRunResult} from '../../src/contracts/taskRuntime.js';
import {CoordinatorIndexBuildService, INDEX_BUILD_ACTION} from '../../src/foundation/index/assembly/index.js';
import type {IndexBuildRequest} from '../../src/contracts/indexBuild.js';
import type {IndexBuildResultData} from '../../src/contracts/indexBuild.js';
import type {LaneTaskRunner} from '../../src/foundation/task/runtime/LaneTaskRunner.js';
import type {IndexBuildEffectAuthority} from '../../src/foundation/index/assembly/IndexBuildEffectAuthority.js';

const request: IndexBuildRequest = {
    context: {
        workspace: '/repo', laneId: 'lane', initiativeId: 'initiative', laneSlug: 'lane', laneDir: '/repo/.watchtower/lanes/lane',
        homeRepositoryId: 'main', repositoriesFile: '/repo/.watchtower/lanes/lane/repositories.local.json', runtimeRoot: '/runtime',
        runtimeVersion: '1.0.0', knowledgeRoot: '/knowledge', baseEnvironment: {path: '/bin', home: '/home/kavan'}
    },
    taskInput: {schemaVersion: 1, runtime: false, dryRun: true}
};

describe('CoordinatorIndexBuildService', () => {
    it('uses exactly the allowlisted action with no invocation envelope', async () => {
        let invocation: {actionId: string; invocationEnvelope?: string} | undefined;
        const data: IndexBuildResultData = {schemaVersion: 1, runtime: false, dryRun: true, changed: false, indexId: null, reused: false, runtimeIndexes: 0};
        const result: LaneTaskRunResult = {outcome: 'completed', actionId: INDEX_BUILD_ACTION, taskId: 'wt:index:build', runId: 'run',
            startedAt: null, finishedAt: null, result: data, events: []};
        const runner: LaneTaskRunner = {run: async (value) => { invocation = value; return result; }};
        const built = await new CoordinatorIndexBuildService(runner).build(request);
        expect(invocation).toEqual(jasmine.objectContaining({actionId: 'coordinator.index.build'}));
        expect(invocation?.invocationEnvelope).toBeUndefined();
        expect(built.ok).toBeTrue();
        if (built.ok) {
            expect(built.data.schemaVersion).toBe(1);
            expect(built.data.dryRun).toBeTrue();
            expect(built.data.changed).toBeFalse();
        }
    });

    it('refuses a mutating request through build without invoking the runner', async () => {
        let runs = 0;
        const runner: LaneTaskRunner = {run: async () => { runs += 1; throw new Error('must not run'); }};
        const input = {...request, taskInput: {schemaVersion: 1, runtime: true, dryRun: false, laneDir: request.context.laneDir,
            laneId: request.context.laneId, indexRoot: `${request.context.laneDir}/coordinator/index/runtime`, runtimeIndexes: [{databasePath: '/repo/db', journalPath: '/repo/events'}]}};
        const service = new CoordinatorIndexBuildService(runner);
        const result = await service.build(input);
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('INDEX_BUILD_INPUT_INVALID');
        expect(runs).toBe(0);
    });

    it('routes apply through the accepted effect authority after current-state validation', async () => {
        let runs = 0;
        const runner: LaneTaskRunner = {run: async () => { runs += 1; throw new Error('must not run'); }};
        const input = {...request, taskInput: {schemaVersion: 1, runtime: true, dryRun: false, laneDir: request.context.laneDir,
            laneId: request.context.laneId, indexRoot: `${request.context.laneDir}/coordinator/index/runtime`, runtimeIndexes: [{databasePath: '/repo/db', journalPath: '/repo/events'}]}};
        let applied = 0;
        const effect: IndexBuildEffectAuthority = {apply: async () => { applied += 1; return {ok: true, data: {schemaVersion: 1, runtime: true, dryRun: false, changed: true, indexId: null, reused: false, runtimeIndexes: 1}}; }};
        const service = new CoordinatorIndexBuildService(runner, undefined, effect);
        const first = await service.apply(input);
        expect(first.ok).toBeTrue();
        expect(applied).toBe(1);
        expect(runs).toBe(0);
    });

    it('refuses an effect when the current lane state changed after preparation, before the effect-authority check, without invoking the runner', async () => {
        let runs = 0;
        const runner: LaneTaskRunner = {run: async () => { runs += 1; throw new Error('must not run'); }};
        const input = {...request, taskInput: {schemaVersion: 1, runtime: true, dryRun: false, laneDir: request.context.laneDir,
            laneId: request.context.laneId, indexRoot: `${request.context.laneDir}/coordinator/index/runtime`, runtimeIndexes: [{databasePath: '/repo/db', journalPath: '/repo/events'}]}};
        const service = new CoordinatorIndexBuildService(runner, {read: () => ({laneId: 'stale', laneDir: request.context.laneDir,
            runtimeVersion: request.context.runtimeVersion, runtimeRoot: request.context.runtimeRoot, indexRoot: '/stale'})});
        const result = await service.apply(input);
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('INDEX_BUILD_CURRENT_STATE_STALE');
        expect(runs).toBe(0);
    });
});
