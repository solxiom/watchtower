/**
 * Shared fixture builders for the CA-12 Git-acceptance specs. Runs against a
 * real temporary lane directory and the real `nodeEffectFileSystem`, matching
 * CA-10's own spec convention (`spec/foundation/effect/support/effectFixtures.ts`):
 * exclusive creation, `fsync`, and atomic rename are exactly what CA-13 will
 * later re-prove, so an in-memory double would prove nothing about the shipped
 * artifact.
 */
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {LaneRuntimeContext, LaneTaskBinding, LaneTaskInvocation, LaneTaskRunResult, PinnedTaskRuntimeTarget, RepositoryBinding} from '../../../../src/contracts/index.js';
import {resolveDeclaredAction} from '../../../../src/foundation/effect/effectActionRegistry.js';
import {nodeEffectFileSystem} from '../../../../src/foundation/effect/nodeEffectFileSystem.js';
import type {EffectActionResolver, EffectClock, EffectIdFactory, EffectTaskRunner} from '../../../../src/foundation/effect/effectPorts.js';
import type {GitAcceptanceCycleContext, GitAcceptanceDeps} from '../../../../src/foundation/gitAcceptance/gitAcceptancePublication.js';
import {workerEventJournalPath} from '../../../../src/foundation/gitAcceptance/gitAcceptanceOwnership.js';
import type {AcceptanceProposal, RepositoryPublicationBinding} from '../../../../src/contracts/gitAcceptance.js';

export const CATALOG_SHA = `sha256:${'c'.repeat(64)}` as const;
export const LANE_ID = 'lane-1';
export const NOW = '2026-08-07T12:00:00.000Z';
export const REVIEWER_SESSION = 'reviewer-session-A';

export const RUNTIME_TARGET: PinnedTaskRuntimeTarget = Object.freeze({
    catalogId: 'wt-runtime-catalog', catalogSha256: CATALOG_SHA, profile: 'lane',
    configTarget: '/runtime/nvb.json', moduleTarget: '/runtime/nvb.js'
});

export function makeLaneDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-ca12-'));
}

export function removeLaneDir(laneDir: string): void {
    rmSync(laneDir, {recursive: true, force: true});
}

export function bindingFor(effect: 'record-acceptance' | 'publish-commits', overrides: Partial<LaneTaskBinding> = {}): LaneTaskBinding {
    const declared = resolveDeclaredAction(effect);
    return Object.freeze({
        actionId: declared.actionId, taskId: `wt:git:${effect}`, handlerId: 'GitAcceptanceTaskHandler',
        inputSchema: `watchtower://runtime/schemas/${effect}-input/v1`, resultSchema: `watchtower://runtime/schemas/${effect}-result/v1`,
        mutationClass: declared.mutationClass, requiresInvocationEnvelope: true, leafIds: Object.freeze(declared.scope === 'external' ? ['git.push'] : []),
        ...overrides
    });
}

export function resolverFor(...bindings: readonly LaneTaskBinding[]): EffectActionResolver {
    return {
        resolveAction(actionId: string): LaneTaskBinding {
            const found = bindings.find((binding) => binding.actionId === actionId);
            if (found === undefined) throw new Error(`unbound action ${actionId}`);
            return found;
        }
    };
}

export function fixedClock(start = NOW): EffectClock {
    return {now: () => new Date(start)};
}

export function countingIds(prefix = 'evt'): EffectIdFactory {
    let next = 0;
    return {nextEventId: () => `${prefix}-${(next += 1)}`};
}

const TASK_ID_BY_ACTION: Readonly<Record<string, string>> = Object.freeze({
    'git.record-acceptance': 'wt:git:record-acceptance',
    'git.publish-commits': 'wt:git:publish-commits'
});

/** Reports every planned target as changed — the verified happy path. */
export function applyingRunner(): EffectTaskRunner & {invocations: LaneTaskInvocation[]} {
    const invocations: LaneTaskInvocation[] = [];
    return {
        invocations,
        async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> {
            invocations.push(invocation);
            const targetId = typeof invocation.input === 'object' && invocation.input !== null && !Array.isArray(invocation.input)
                ? (invocation.input as {targetId?: unknown}).targetId : undefined;
            return {
                outcome: 'completed', actionId: invocation.actionId, taskId: TASK_ID_BY_ACTION[invocation.actionId], runId: 'run-1',
                startedAt: NOW, finishedAt: NOW, events: [],
                result: {applied: true, changed: typeof targetId === 'string' ? [targetId] : [], unchanged: [], warnings: []}
            };
        }
    };
}

/** Runs `respond` for each repository/target instead of always applying — models per-repository push outcomes. */
export function scriptedRunner(
    respond: (invocation: LaneTaskInvocation) => LaneTaskRunResult
): EffectTaskRunner & {invocations: LaneTaskInvocation[]} {
    const invocations: LaneTaskInvocation[] = [];
    return {invocations, async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> { invocations.push(invocation); return respond(invocation); }};
}

export function runtimeContext(laneDir: string): LaneRuntimeContext {
    return Object.freeze({
        workspace: laneDir, laneId: LANE_ID, initiativeId: 'init-1', laneSlug: 'lane', laneDir,
        homeRepositoryId: 'repo-a', repositoriesFile: join(laneDir, 'repositories.local.json'),
        runtimeRoot: '/runtime', runtimeVersion: '1.0.0', knowledgeRoot: '/knowledge',
        baseEnvironment: Object.freeze({path: '/usr/bin', home: '/home/kavan'})
    });
}

export function cycleContext(laneDir: string, overrides: Partial<GitAcceptanceCycleContext> = {}): GitAcceptanceCycleContext {
    return {
        laneDir, laneId: LANE_ID, cycleId: 'cycle-1', snapshotDigest: `sha256:${'a'.repeat(64)}`,
        policyVersion: 'shipping-v1', runtimeContext: runtimeContext(laneDir), ...overrides
    };
}

export function deps(runner: EffectTaskRunner, ...bindings: readonly LaneTaskBinding[]): GitAcceptanceDeps {
    return {files: nodeEffectFileSystem, clock: fixedClock(), ids: countingIds(), runner, actions: resolverFor(...bindings), target: RUNTIME_TARGET};
}

export function repositoryBinding(id: string, overrides: Partial<RepositoryBinding> = {}): RepositoryBinding {
    return {id, role: 'primary', access: 'write', path: `/repos/${id}`, branch: 'main', worktreeMode: 'dedicated', ...overrides};
}

export function publicationBinding(id: string, overrides: Partial<RepositoryPublicationBinding> = {}): RepositoryPublicationBinding {
    return {...repositoryBinding(id), remote: 'origin', ...overrides};
}

export function acceptanceProposal(overrides: Partial<AcceptanceProposal> = {}): AcceptanceProposal {
    return {laneId: LANE_ID, batchId: 'CA-12', cycleId: 'cycle-1', reviewerSessionId: REVIEWER_SESSION, ...overrides};
}

/** Durably appends a real `accept` worker event a reviewer session authored for `batchId`. */
export function seedAcceptEvent(laneDir: string, overrides: Partial<{laneId: string; batchId: string; session: string; sequence: number}> = {}): void {
    const {laneId = LANE_ID, batchId = 'CA-12', session = REVIEWER_SESSION, sequence = 0} = overrides;
    nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'journal'));
    nodeEffectFileSystem.appendLine(workerEventJournalPath(laneDir), JSON.stringify({
        schemaVersion: 1, eventId: `evt-accept-${sequence}`, type: 'accept', sequence, at: NOW,
        laneId, producer: 'coordinator-worker-event', correlationId: batchId, causationId: null, policyVersion: 'shipping-v1',
        payload: {role: 'reviewer', batch: batchId, session}
    }));
}
