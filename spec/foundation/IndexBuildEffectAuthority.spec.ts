import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {Ca10IndexBuildEffectAuthority} from '../../src/foundation/index/assembly/IndexBuildEffectAuthority.js';
import type {IndexBuildAuthorization, IndexBuildRequest} from '../../src/contracts/indexBuild.js';
import type {LaneTaskInvocation, LaneTaskRunResult} from '../../src/contracts/taskRuntime.js';
import {baseContext} from './proposal/support/proposalFixtures.js';
import {makeLaneDir, removeLaneDir, RUNTIME_TARGET, runtimeContext} from './effect/support/effectFixtures.js';

function wire(proposalId = 'index-proposal'): Record<string, unknown> {
    const context = baseContext({origin: 'coordinator-D3', decisionClass: 'D3', operatorSession: {
        sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set([proposalId])
    }});
    return {schemaVersion: 1, cycleId: 'index-cycle', proposalId, type: 'propose-reconciliation',
        snapshotDigest: context.laneState.snapshotDigest, expiresAt: '2099-01-01T00:00:00.000Z', evidenceRefs: ['finding:F1'],
        body: {projectionId: context.laneId, plan: 'rebuild-index'}, requestedEffects: [{effect: 'rebuild-index'}]};
}

function request(laneDir: string, authorization: IndexBuildRequest['authorization']): IndexBuildRequest {
    return {context: runtimeContext(laneDir), taskInput: {schemaVersion: 1, runtime: true, dryRun: false,
        laneDir, laneId: runtimeContext(laneDir).laneId, indexRoot: join(laneDir, 'index'),
        runtimeIndexes: [{databasePath: join(laneDir, 'index.sqlite'), journalPath: join(laneDir, 'events.jsonl')}]}, authorization};
}

function runner(): {readonly runs: {count: number}; readonly invocations: LaneTaskInvocation[]; readonly run: (value: LaneTaskInvocation) => Promise<LaneTaskRunResult>} {
    const runs = {count: 0};
    const invocations: LaneTaskInvocation[] = [];
    return {runs, invocations, async run(invocation): Promise<LaneTaskRunResult> {
        runs.count += 1;
        invocations.push(invocation);
        return {outcome: 'completed', actionId: 'coordinator.index.apply', taskId: 'wt:index:apply', runId: `run-${runs.count}`,
            startedAt: null, finishedAt: null, events: [], result: {applied: true, changed: [], unchanged: ['lane-1'], warnings: [],
                indexBuild: {schemaVersion: 1, runtime: true, dryRun: false, changed: false, indexId: null, reused: false, runtimeIndexes: 1}}};
    }};
}

function authorization(overrides: Partial<ReturnType<typeof baseContext>> = {}): IndexBuildAuthorization {
    const currentState = baseContext({origin: 'coordinator-D3', decisionClass: 'D3', operatorSession: {
        sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['index-proposal'])
    }, ...overrides});
    const proposal = wire();
    return {proposal, currentState, revalidate: () => ({proposal, state: currentState})};
}

describe('CA-30 real proposal/effect boundary', () => {
    it('rejects malformed, stale, unaccepted, and unconfirmed proposals before invoking the task', async () => {
        const cases: readonly [string, IndexBuildAuthorization][] = [
            ['malformed', {...authorization(), proposal: null}],
            ['stale', {...authorization({laneState: {snapshotDigest: 'sha256:' + 'd'.repeat(64), batches: {}}})}],
            ['unaccepted', {...authorization({predecessorEvidence: {}})}],
            ['unconfirmed', {...authorization({operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set()}})}]
        ];
        for (const [, auth] of cases) {
            const laneDir = makeLaneDir();
            try {
                const task = runner();
                const result = await new Ca10IndexBuildEffectAuthority(task, () => RUNTIME_TARGET).apply(request(laneDir, auth));
                expect(result.ok).toBeFalse();
                expect(task.runs.count).toBe(0);
                expect(readdirSync(laneDir)).toEqual([]);
            } finally { removeLaneDir(laneDir); }
        }
    });

    it('uses the real validator, invocation envelope, replay fence, and unchanged-byte result', async () => {
        const laneDir = makeLaneDir();
        try {
            const task = runner();
            const auth = authorization();
            const authority = new Ca10IndexBuildEffectAuthority(task, () => RUNTIME_TARGET, {now: () => new Date('2026-08-08T00:00:00.000Z')}, {nextEventId: () => 'event-1'});
            const first = await authority.apply(request(laneDir, auth));
            expect(first.ok).toBeTrue();
            expect(task.runs.count).toBe(1);
            expect(task.invocations[0].actionId).toBe('coordinator.index.apply');
            expect(task.invocations[0].invocationEnvelope).toBeDefined();
            const journal = join(laneDir, 'coordinator', 'journal', 'effect-events.jsonl');
            const beforeReplay = readFileSync(journal);
            const second = await authority.apply(request(laneDir, auth));
            expect(second.ok).toBeTrue();
            expect(task.runs.count).toBe(1);
            expect(readFileSync(journal)).toEqual(beforeReplay);
        } finally { removeLaneDir(laneDir); }
    });
});
