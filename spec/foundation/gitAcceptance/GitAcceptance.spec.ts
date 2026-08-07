/**
 * CA-12 acceptance proof — acceptance/publication separation, successful
 * push, partial-push recovery, and idempotent replay. Runs against a real
 * temporary lane directory and `nodeEffectFileSystem`, exactly like CA-10's
 * own `EffectExecutor.spec.ts`.
 */
import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {GitAcceptanceAdapter} from '../../../src/foundation/gitAcceptance/GitAcceptance.js';
import {effectJournalPath, readEffectJournal} from '../../../src/foundation/effect/index.js';
import type {CommitSet, CommitSetValidationResult} from '../../../src/contracts/gitAcceptance.js';
import {
    acceptanceProposal, applyingRunner, bindingFor, cycleContext, deps, makeLaneDir, publicationBinding, removeLaneDir,
    scriptedRunner, seedAcceptEvent
} from './support/gitAcceptanceFixtures.js';

const VALID: CommitSetValidationResult = {ok: true, errors: []};

function commitSet(...repositoryIds: readonly string[]): CommitSet {
    return {commits: repositoryIds.map((repositoryId) => ({repositoryId, sha: `sha-${repositoryId}`, expectedBase: 'base', expectedFiles: []}))};
}

describe('GitAcceptanceAdapter — acceptance/publication separation', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('acceptProposal records a durable batch-accepted effect without touching Git, once reviewer ownership is proved', async function () {
        seedAcceptEvent(laneDir);
        const runner = applyingRunner();
        const binding = bindingFor('record-acceptance');
        const adapter = new GitAcceptanceAdapter(deps(runner, binding));
        const outcome = await adapter.acceptProposal(cycleContext(laneDir), acceptanceProposal());
        expect(outcome.status).toBe('applied');
        expect(runner.invocations.length).toBe(1);
        expect(runner.invocations[0].actionId).toBe('git.record-acceptance');
        const journal = readEffectJournal(laneDir, deps(runner, binding).files);
        expect(journal.records.map((record) => record.payload.effect)).toEqual(['record-acceptance', 'record-acceptance', 'record-acceptance']);
    });

    it('acceptProposal refuses with GIT_OWNERSHIP_MISMATCH when no durable accept event exists — CA12-R2', async function () {
        const runner = applyingRunner();
        const binding = bindingFor('record-acceptance');
        const adapter = new GitAcceptanceAdapter(deps(runner, binding));
        const outcome = await adapter.acceptProposal(cycleContext(laneDir), acceptanceProposal());
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'GIT_OWNERSHIP_MISMATCH'}));
        expect(runner.invocations).toEqual([]);
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
    });

    it('acceptProposal refuses when the claimed reviewer session does not match the durable accept event — CA12-R2', async function () {
        seedAcceptEvent(laneDir, {session: 'reviewer-session-B'});
        const runner = applyingRunner();
        const binding = bindingFor('record-acceptance');
        const adapter = new GitAcceptanceAdapter(deps(runner, binding));
        const outcome = await adapter.acceptProposal(cycleContext(laneDir), acceptanceProposal({reviewerSessionId: 'reviewer-session-A'}));
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'GIT_OWNERSHIP_MISMATCH'}));
        expect(runner.invocations).toEqual([]);
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
    });

    it('publishing succeeds and reports the pushed SHA per repository', async function () {
        const runner = applyingRunner();
        const binding = bindingFor('publish-commits');
        const adapter = new GitAcceptanceAdapter(deps(runner, binding));
        const repositories = [publicationBinding('repo-a')];
        const result = await adapter.publishCommits(cycleContext(laneDir), commitSet('repo-a'), VALID, repositories);
        expect(result).toEqual(jasmine.objectContaining({
            ok: true, partialRecovery: false,
            repositoryResults: [jasmine.objectContaining({repositoryId: 'repo-a', success: true, pushedSha: 'sha-repo-a'})]
        }));
    });

    it('acceptance is durable even when publication fails: the accept effect is never rolled back', async function () {
        seedAcceptEvent(laneDir);
        const acceptBinding = bindingFor('record-acceptance');
        const publishBinding = bindingFor('publish-commits');
        const failingRunner = scriptedRunner((invocation) => invocation.actionId === 'git.record-acceptance'
            ? {outcome: 'completed', actionId: invocation.actionId, taskId: 'wt:git:record-acceptance', runId: 'r1',
                startedAt: null, finishedAt: null, events: [], result: {applied: true, changed: ['CA-12'], unchanged: [], warnings: []}}
            : {outcome: 'failed', actionId: invocation.actionId, taskId: 'wt:git:publish-commits', runId: null,
                reason: 'TASK_RUNTIME_TASK_EXECUTION_FAILED', failedTaskId: 'wt:git:publish-commits', exitCode: 1, signal: null,
                diagnostic: 'remote unreachable', events: []});
        const shared = deps(failingRunner, acceptBinding, publishBinding);
        const adapter = new GitAcceptanceAdapter(shared);

        const accepted = await adapter.acceptProposal(cycleContext(laneDir), acceptanceProposal());
        expect(accepted.status).toBe('applied');

        const published = await adapter.publishCommits(cycleContext(laneDir), commitSet('repo-a'), VALID, [publicationBinding('repo-a')]);
        expect(published.ok).toBeFalse();

        const journal = readEffectJournal(laneDir, shared.files);
        const acceptRecords = journal.records.filter((record) => record.payload.effect === 'record-acceptance');
        expect(acceptRecords.map((record) => record.payload.phase)).toEqual(['prepared', 'attempted', 'verified']);
    });
});

describe('GitAcceptanceAdapter — partial push recovery', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('two of three repositories succeed, the third fails, and the result is a non-ok partial recovery', async function () {
        const binding = bindingFor('publish-commits');
        const runner = scriptedRunner((invocation) => {
            const targetId = (invocation.input as {targetId: string}).targetId;
            if (targetId === 'repo-c') {
                return {outcome: 'failed', actionId: invocation.actionId, taskId: binding.taskId, runId: null,
                    reason: 'TASK_RUNTIME_TASK_EXECUTION_FAILED', failedTaskId: binding.taskId, exitCode: 1, signal: null,
                    diagnostic: 'remote unavailable', events: []};
            }
            return {outcome: 'completed', actionId: invocation.actionId, taskId: binding.taskId, runId: 'r1',
                startedAt: null, finishedAt: null, events: [], result: {applied: true, changed: [targetId], unchanged: [], warnings: []}};
        });
        const shared = deps(runner, binding);
        const adapter = new GitAcceptanceAdapter(shared);
        const repositories = [publicationBinding('repo-a'), publicationBinding('repo-b'), publicationBinding('repo-c')];

        const first = await adapter.publishCommits(cycleContext(laneDir), commitSet('repo-a', 'repo-b', 'repo-c'), VALID, repositories);
        expect(first.ok).toBeFalse();
        expect(first.partialRecovery).toBeTrue();
        expect(first.repositoryResults.filter((result) => result.success).map((result) => result.repositoryId).sort()).toEqual(['repo-a', 'repo-b']);
        const failedFirst = first.repositoryResults.find((result) => result.repositoryId === 'repo-c');
        expect(failedFirst).toEqual(jasmine.objectContaining({success: false, uncertain: true}));
        expect(first.escalated).toBeTrue();
        expect(runner.invocations.length).toBe(3);

        // Retry: only repository 3 is attempted; 1 and 2 are not re-pushed.
        const retryRunner = scriptedRunner((invocation) => ({
            outcome: 'completed', actionId: invocation.actionId, taskId: binding.taskId, runId: 'r2', startedAt: null, finishedAt: null,
            events: [], result: {applied: true, changed: [(invocation.input as {targetId: string}).targetId], unchanged: [], warnings: []}
        }));
        const retryShared = {...shared, runner: retryRunner};
        const retryAdapter = new GitAcceptanceAdapter(retryShared);
        const second = await retryAdapter.publishCommits(cycleContext(laneDir, {cycleId: 'cycle-2'}), commitSet('repo-a', 'repo-b', 'repo-c'), VALID, repositories);
        expect(second.ok).toBeTrue();
        expect(retryRunner.invocations.length).toBe(1);
        expect(retryRunner.invocations[0].actionId).toBe(binding.actionId);
        expect((retryRunner.invocations[0].input as {targetId: string}).targetId).toBe('repo-c');
    });
});

describe('GitAcceptanceAdapter — idempotent replay', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('replaying an already-verified publication does not push again', async function () {
        const binding = bindingFor('publish-commits');
        const runner = applyingRunner();
        const shared = deps(runner, binding);
        const adapter = new GitAcceptanceAdapter(shared);
        const repositories = [publicationBinding('repo-a')];

        const first = await adapter.publishCommits(cycleContext(laneDir), commitSet('repo-a'), VALID, repositories);
        expect(first.ok).toBeTrue();
        expect(runner.invocations.length).toBe(1);

        const second = await adapter.publishCommits(cycleContext(laneDir), commitSet('repo-a'), VALID, repositories);
        expect(second.ok).toBeTrue();
        expect(second.repositoryResults[0]).toEqual(jasmine.objectContaining({repositoryId: 'repo-a', success: true}));
        expect(runner.invocations.length).toBe(1);
    });

    it('spends the invocation envelope and leaves no live authority behind after each push', async function () {
        const binding = bindingFor('publish-commits');
        const shared = deps(applyingRunner(), binding);
        await new GitAcceptanceAdapter(shared).publishCommits(cycleContext(laneDir), commitSet('repo-a'), VALID, [publicationBinding('repo-a')]);
        const effectsDir = join(laneDir, 'coordinator', 'effects');
        expect(existsSync(effectsDir)).toBeTrue();
        const entries = readdirSync(effectsDir);
        expect(entries.filter((name) => name.endsWith('.envelope.json'))).toEqual([]);
        expect(entries.filter((name) => name.endsWith('.consumed')).length).toBe(1);
        expect(existsSync(effectJournalPath(laneDir))).toBeTrue();
    });
});
