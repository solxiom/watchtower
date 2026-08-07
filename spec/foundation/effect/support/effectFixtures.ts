/**
 * Shared fixture builders for the CA-10 effect-boundary specs.
 *
 * These specs run against a **real** temporary lane directory and the real
 * `nodeEffectFileSystem`, not an in-memory double: exclusive creation, `0600`
 * modes, directory `fsync`, atomic rename, and effective-account ownership are
 * exactly the properties RT-05 will re-prove before spawning a task, so
 * simulating them would prove nothing about the artifact that actually ships.
 *
 * Proposal fixtures are CA-09's accepted ones, reused rather than rebuilt, so
 * an effect can never be planned from a proposal shape the sole validator would
 * not accept.
 */
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {LaneRuntimeContext, LaneTaskBinding, LaneTaskInvocation, LaneTaskRunResult, PinnedTaskRuntimeTarget} from '../../../../src/contracts/index.js';
import type {DecisionProposal, ProposalValidationResult} from '../../../../src/contracts/index.js';
import {ProposalValidator} from '../../../../src/foundation/proposal/ProposalValidator.js';
import {validateProposalShape} from '../../../../src/foundation/proposal/proposalSchema.js';
import type {ValidationContext} from '../../../../src/foundation/proposal/proposalValidatorContracts.js';
import {resolveDeclaredAction} from '../../../../src/foundation/effect/effectActionRegistry.js';
import {nodeEffectFileSystem} from '../../../../src/foundation/effect/nodeEffectFileSystem.js';
import type {EffectActionResolver, EffectClock, EffectIdFactory, EffectTaskRunner} from '../../../../src/foundation/effect/effectPorts.js';
import type {EffectExecutorDeps, EffectRequest} from '../../../../src/foundation/effect/EffectExecutor.js';
import {baseContext, fixtureFor, proposalFor, NOW} from '../../proposal/support/proposalFixtures.js';

export const CATALOG_SHA = `sha256:${'c'.repeat(64)}` as const;
export const LANE_UUID = '11111111-2222-4333-8444-555555555555';

export const RUNTIME_TARGET: PinnedTaskRuntimeTarget = Object.freeze({
    catalogId: 'wt-runtime-catalog',
    catalogSha256: CATALOG_SHA,
    profile: 'lane',
    configTarget: '/runtime/nvb.json',
    moduleTarget: '/runtime/nvb.js'
});

/** A lane task tree that exists for the duration of one spec and is removed after it. */
export function makeLaneDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-ca10-'));
}

export function removeLaneDir(laneDir: string): void {
    rmSync(laneDir, {recursive: true, force: true});
}

/** A catalog binding for one effect's declared action, matching the registry exactly. */
export function bindingFor(effect: Parameters<typeof resolveDeclaredAction>[0], overrides: Partial<LaneTaskBinding> = {}): LaneTaskBinding {
    const declared = resolveDeclaredAction(effect);
    return Object.freeze({
        actionId: declared.actionId,
        taskId: `wt:effect:${effect}`,
        handlerId: 'EffectTaskHandler',
        inputSchema: `watchtower://runtime/schemas/${effect}-input/v1`,
        resultSchema: `watchtower://runtime/schemas/${effect}-result/v1`,
        mutationClass: declared.mutationClass,
        requiresInvocationEnvelope: true,
        leafIds: Object.freeze([]),
        ...overrides
    });
}

export function resolverFor(binding: LaneTaskBinding): EffectActionResolver {
    return {
        resolveAction(actionId: string): LaneTaskBinding {
            if (actionId !== binding.actionId) throw new Error(`unbound action ${actionId}`);
            return binding;
        }
    };
}

export function fixedClock(start = '2026-08-06T12:00:00.000Z'): EffectClock {
    return {now: () => new Date(start)};
}

export function countingIds(prefix = 'evt'): EffectIdFactory {
    let next = 0;
    return {nextEventId: () => `${prefix}-${(next += 1)}`};
}

/** A runner that reports the planned targets as changed — the verified happy path. */
export function applyingRunner(plan: {actionId: string; taskId: string; targetIds: readonly string[]}): EffectTaskRunner & {invocations: LaneTaskInvocation[]} {
    const invocations: LaneTaskInvocation[] = [];
    return {
        invocations,
        async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> {
            invocations.push(invocation);
            return {
                outcome: 'completed', actionId: plan.actionId, taskId: plan.taskId, runId: 'run-1',
                startedAt: NOW, finishedAt: NOW, events: [],
                result: {applied: true, changed: [...plan.targetIds], unchanged: [], warnings: []}
            };
        }
    };
}

export function runnerReturning(result: LaneTaskRunResult): EffectTaskRunner & {invocations: LaneTaskInvocation[]} {
    const invocations: LaneTaskInvocation[] = [];
    return {
        invocations,
        async run(invocation: LaneTaskInvocation): Promise<LaneTaskRunResult> {
            invocations.push(invocation);
            return result;
        }
    };
}

export function runtimeContext(laneDir: string): LaneRuntimeContext {
    return Object.freeze({
        workspace: laneDir, laneId: LANE_UUID, initiativeId: 'init-1', laneSlug: 'lane', laneDir,
        homeRepositoryId: 'repo', repositoriesFile: join(laneDir, 'repositories.local.json'),
        runtimeRoot: '/runtime', runtimeVersion: '1.0.0', knowledgeRoot: '/knowledge',
        baseEnvironment: Object.freeze({path: '/usr/bin', home: '/home/kavan'})
    });
}

export interface EffectScenario {
    readonly laneDir: string;
    readonly proposal: DecisionProposal;
    readonly context: ValidationContext;
    readonly validation: ProposalValidationResult;
    readonly binding: LaneTaskBinding;
    readonly deps: EffectExecutorDeps;
    readonly request: EffectRequest;
}

/**
 * One fully wired `select-ready-batch` → `dispatch-batch` scenario, validated
 * by the real `ProposalValidator` so the executor is never handed a verdict no
 * validator would have produced.
 */
export function scenario(laneDir: string, overrides: {
    readonly runner?: EffectTaskRunner;
    readonly request?: Partial<EffectRequest>;
    readonly contextOverrides?: Partial<ValidationContext>;
} = {}): EffectScenario {
    const fixture = fixtureFor('select-ready-batch');
    const wire = proposalFor(fixture);
    // Exactly the real path: CA-09 shapes the wire bytes, then validates them.
    const proposal = validateProposalShape(wire);
    const context = baseContext({origin: fixture.origin, decisionClass: fixture.decisionClass, ...overrides.contextOverrides});
    const validation = new ProposalValidator().validateProposal(wire, context);
    const binding = bindingFor('dispatch-batch');
    const runner = overrides.runner ?? applyingRunner({actionId: binding.actionId, taskId: binding.taskId, targetIds: ['B1']});
    const deps: EffectExecutorDeps = {
        files: nodeEffectFileSystem, clock: fixedClock(), ids: countingIds(),
        runner, actions: resolverFor(binding), target: RUNTIME_TARGET
    };
    const request: EffectRequest = {
        laneDir, cycleId: 'cycle-1', proposal, validation, currentState: context,
        parameters: {batchId: 'B1'}, runtimeContext: runtimeContext(laneDir),
        revalidate: () => ({state: context, result: new ProposalValidator().validateProposal(wire, context)}),
        ...overrides.request
    };
    return {laneDir, proposal, context, validation, binding, deps, request};
}
