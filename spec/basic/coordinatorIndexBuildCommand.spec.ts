import {makeArgMap} from '@nirvana/base/utils/argUtil';
import {join} from 'node:path';
import CoordinatorCommand from '../../src/commands/coordinator/CoordinatorCommand.js';
import {CoordinatorIndexBuildService} from '../../src/foundation/index/assembly/IndexBuildService.js';
import {Ca10IndexBuildEffectAuthority} from '../../src/foundation/index/assembly/IndexBuildEffectAuthority.js';
import type {IndexBuildRequest} from '../../src/contracts/indexBuild.js';
import type {LaneTaskRunResult} from '../../src/contracts/taskRuntime.js';
import {baseContext} from '../foundation/proposal/support/proposalFixtures.js';
import {makeLaneDir, removeLaneDir, RUNTIME_TARGET, runtimeContext} from '../foundation/effect/support/effectFixtures.js';

function request(laneDir: string, malformed = false): IndexBuildRequest {
    const context = baseContext({origin: 'coordinator-D3', decisionClass: 'D3', operatorSession: {
        sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['public-index-proposal'])
    }});
    const proposal = {schemaVersion: 1, cycleId: 'public-index-cycle', proposalId: 'public-index-proposal', type: 'propose-reconciliation',
        snapshotDigest: context.laneState.snapshotDigest, expiresAt: '2099-01-01T00:00:00.000Z', evidenceRefs: ['finding:F1'],
        body: {projectionId: context.laneId, plan: 'rebuild-index'}, requestedEffects: [{effect: 'rebuild-index'}]};
    const laneContext = {...runtimeContext(laneDir), laneId: context.laneId};
    const authorization = {proposal: malformed ? null : proposal, currentState: context, revalidate: () => ({proposal, state: context})};
    return {context: laneContext, taskInput: {schemaVersion: 1, runtime: true, dryRun: false, laneDir,
        laneId: laneContext.laneId, indexRoot: join(laneDir, 'index'),
        runtimeIndexes: [{databasePath: join(laneDir, 'index.sqlite'), journalPath: join(laneDir, 'events.jsonl')}]}, authorization};
}

function commandFor(requestValue: IndexBuildRequest, runs: {count: number}): CoordinatorCommand {
    const runner = {async run(): Promise<LaneTaskRunResult> {
        runs.count += 1;
        return {outcome: 'completed', actionId: 'coordinator.index.apply', taskId: 'wt:index:apply', runId: 'public-run',
            startedAt: null, finishedAt: null, events: [], result: {applied: true, changed: [], unchanged: [requestValue.context.laneId], warnings: [],
                indexBuild: {schemaVersion: 1, runtime: true, dryRun: false, changed: false, indexId: null, reused: false, runtimeIndexes: 1}}};
    }};
    const authority = new Ca10IndexBuildEffectAuthority(runner, () => RUNTIME_TARGET, {now: () => new Date('2026-08-08T00:00:00.000Z')}, {nextEventId: () => 'public-event'});
    const operation = new CoordinatorIndexBuildService(runner, undefined, authority);
    const requestSource = {resolve: async () => requestValue};
    const command = new CoordinatorCommand(undefined, {operation, requestSource});
    command.args = makeArgMap(['coordinator', 'index', 'build', '--runtime']);
    command.originalCwd = requestValue.context.workspace;
    return command;
}

describe('public coordinator index build mutation path', () => {
    it('passes the real authorization capsule through --runtime to the sole effect executor', async () => {
        const laneDir = makeLaneDir(); const runs = {count: 0};
        try {
            await commandFor(request(laneDir), runs).run();
            expect(runs.count).toBe(1);
        } finally { removeLaneDir(laneDir); }
    });

    it('refuses malformed authorization through the public command before task invocation', async () => {
        const laneDir = makeLaneDir(); const runs = {count: 0};
        try {
            let failure: unknown;
            try { await commandFor(request(laneDir, true), runs).run(); } catch (error) { failure = error; }
            expect(failure).toBeDefined();
            expect(runs.count).toBe(0);
        } finally { removeLaneDir(laneDir); }
    });

    it('documents the mutating index-build surface in command metadata', () => {
        const command = new CoordinatorCommand();
        expect(command.description).toContain('validated effect boundary');
        expect(command.usage).toContain('build [--runtime] [--dry-run]');
        expect(command.keywords).toContain('mutation');
    });
});
