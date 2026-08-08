import {randomUUID} from 'node:crypto';
import {EffectExecutor, nodeEffectFileSystem, type EffectActionResolver, type EffectClock, type EffectIdFactory} from '../../effect/index.js';
import type {EffectOutcome} from '../../../contracts/effects.js';
import type {ProposalValidationResult} from '../../../contracts/proposals.js';
import type {JsonObject} from '../../../contracts/types.js';
import type {LaneTaskBinding, PinnedTaskRuntimeTarget, LaneTaskRunResult} from '../../../contracts/taskRuntime.js';
import type {IndexBuildAuthorization, IndexBuildRequest, IndexBuildResult, IndexBuildResultData} from '../../../contracts/indexBuild.js';
import {LaneInstallTaskRuntimePinSource, nodeRuntimeFileSystem, readTaskRuntimePin} from '../../task/runtime/index.js';
import type {LaneTaskRunner} from '../../task/runtime/LaneTaskRunner.js';
import {ProposalValidator, validateProposalShape, type ValidationContext} from '../../proposal/index.js';

const ACTION_ID = 'coordinator.index.apply';
const TASK_ID = 'wt:index:apply';
const INPUT_SCHEMA = 'watchtower://runtime/schemas/index-build-apply-input/v1';
const RESULT_SCHEMA = 'watchtower://runtime/schemas/index-build-result/v1';

export interface IndexBuildEffectAuthority { apply(request: IndexBuildRequest): Promise<IndexBuildResult>; }

export class Ca10IndexBuildEffectAuthority implements IndexBuildEffectAuthority {
    constructor(private readonly runner: LaneTaskRunner, private readonly target: (request: IndexBuildRequest) => PinnedTaskRuntimeTarget,
        private readonly clock: EffectClock = {now: () => new Date()}, private readonly ids: EffectIdFactory = {nextEventId: () => randomUUID()},
        private readonly validator = new ProposalValidator()) {}

    async apply(request: IndexBuildRequest): Promise<IndexBuildResult> {
        const authorization = request.authorization;
        if (authorization === undefined) return unavailable(request, 'a typed coordinator proposal and authoritative validation context are required');
        let proposal;
        try { proposal = validateProposalShape(authorization.proposal); }
        catch (error) { return unavailable(request, error instanceof Error ? error.message : 'proposal shape is invalid'); }
        const validation = this.validator.validateProposal(authorization.proposal, authorization.currentState);
        if (!validation.valid) return unavailable(request, validation.errors[0]?.message ?? 'proposal validation failed');
        const executor = new EffectExecutor({files: nodeEffectFileSystem, clock: this.clock, ids: this.ids, runner: this.runner,
            target: this.target(request), actions: actionResolver});
        const outcome = await executor.apply({laneDir: request.context.laneDir, cycleId: proposal.cycleId, proposal,
            validation, currentState: authorization.currentState, parameters: request.taskInput as JsonObject,
            runtimeContext: request.context, revalidate: () => revalidate(authorization, this.validator)});
        return resultFor(outcome, request);
    }
}

export function pinnedTarget(laneDir: string, runtimeRoot: string): PinnedTaskRuntimeTarget {
    return readTaskRuntimePin(new LaneInstallTaskRuntimePinSource().readTaskRuntime(laneDir), runtimeRoot, nodeRuntimeFileSystem);
}

const actionResolver: EffectActionResolver = {resolveAction: (actionId) => {
    if (actionId !== ACTION_ID) throw new Error(`unexpected index effect action: ${actionId}`);
    return {actionId: ACTION_ID, taskId: TASK_ID, handlerId: 'IndexBuildTaskHandler', inputSchema: INPUT_SCHEMA,
        resultSchema: RESULT_SCHEMA, mutationClass: 'authoritative-effect', requiresInvocationEnvelope: true, leafIds: []};
}};

function revalidate(authorization: IndexBuildAuthorization, validator: ProposalValidator): {readonly state: ValidationContext; readonly result: ProposalValidationResult} {
    const next = authorization.revalidate();
    try { validateProposalShape(next.proposal); }
    catch { return {state: next.state, result: {valid: false, errors: [{code: 'PROPOSAL_SCHEMA_INVALID', subject: 'proposal', message: 'proposal shape is invalid'}], warnings: []}}; }
    return {state: next.state, result: validator.validateProposal(next.proposal, next.state)};
}

function unavailable(request: IndexBuildRequest, detail: string): IndexBuildResult {
    return {ok: false, reason: 'INDEX_BUILD_EFFECT_FAILED', target: request.context.laneDir, detail};
}

function resultFor(outcome: EffectOutcome, request: IndexBuildRequest): IndexBuildResult {
    if (outcome.status === 'applied') return completedTaskResult(outcome.runResult, request);
    if (outcome.status === 'replayed') return {ok: true, data: {schemaVersion: 1, runtime: isRuntime(request), dryRun: false, changed: false, indexId: null, reused: true, runtimeIndexes: runtimeCount(request)}};
    return {ok: false, reason: 'INDEX_BUILD_EFFECT_FAILED', target: outcome.status === 'uncertain' ? outcome.plan.actionId : outcome.subject, detail: outcome.message};
}

function completedTaskResult(run: LaneTaskRunResult, request: IndexBuildRequest): IndexBuildResult {
    if (run.outcome !== 'completed') return {ok: false, reason: 'INDEX_BUILD_EFFECT_FAILED', target: request.context.laneDir, detail: 'effect executor returned a non-completed task outcome'};
    return taskResult(run.result, request);
}

function taskResult(value: unknown, request: IndexBuildRequest): IndexBuildResult {
    const record = value as {indexBuild?: IndexBuildResultData};
    return record.indexBuild !== undefined ? {ok: true, data: record.indexBuild} : {ok: false, reason: 'INDEX_BUILD_RESULT_INVALID', target: request.context.laneDir, detail: 'effect result omitted index-build data'};
}
function isRuntime(request: IndexBuildRequest): boolean { return (request.taskInput as Record<string, unknown>).runtime === true; }
function runtimeCount(request: IndexBuildRequest): number { const value = (request.taskInput as Record<string, unknown>).runtimeIndexes; return Array.isArray(value) ? value.length : 0; }
