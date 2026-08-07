/**
 * CA-10 acceptance proof — one authority, lock, revalidation, idempotency.
 *
 * Runs against a real temporary lane directory so the ordering claims are
 * proved against durable bytes: nothing exists before the commit point on a
 * refusal, the journal is a real fsynced JSONL append, and the lock is a real
 * exclusively-created record.
 */
import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {EffectExecutor} from '../../../src/foundation/effect/EffectExecutor.js';
import {effectJournalPath, readEffectJournal} from '../../../src/foundation/effect/effectJournal.js';
import {acquireEffectLocks} from '../../../src/foundation/effect/laneEffectLock.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import {ProposalValidator} from '../../../src/foundation/proposal/ProposalValidator.js';
import {applyingRunner, makeLaneDir, removeLaneDir, runnerReturning, scenario} from './support/effectFixtures.js';

describe('EffectExecutor — one authority applies one validated proposal', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('applies a validated proposal through exactly one catalog task and verifies postconditions', async function () {
        const {deps, request, binding} = scenario(laneDir);
        const outcome = await new EffectExecutor(deps).apply(request);
        expect(outcome.status).toBe('applied');
        const runner = deps.runner as ReturnType<typeof applyingRunner>;
        expect(runner.invocations.length).toBe(1);
        expect(runner.invocations[0].actionId).toBe(binding.actionId);
        expect(runner.invocations[0].invocationEnvelope).toBeDefined();
    });

    it('journals prepared, attempted, and verified in that order with contiguous sequences', async function () {
        const {deps, request} = scenario(laneDir);
        await new EffectExecutor(deps).apply(request);
        const journal = readEffectJournal(laneDir, nodeEffectFileSystem);
        expect(journal.records.map((record) => record.payload.phase)).toEqual(['prepared', 'attempted', 'verified']);
        expect(journal.records.map((record) => record.sequence)).toEqual([0, 1, 2]);
        expect(journal.records.map((record) => record.type))
            .toEqual(['coordinator-effect-prepared', 'coordinator-effect-attempted', 'coordinator-effect-verified']);
        expect(new Set(journal.records.map((record) => record.payload.idempotencyKey)).size).toBe(1);
    });

    it('refuses a proposal the sole validator rejected and leaves no durable byte behind', async function () {
        const base = scenario(laneDir);
        const rejected = {valid: false, errors: [{code: 'PROPOSAL_STALE_SNAPSHOT' as const, subject: 's', message: 'stale'}], warnings: []};
        const outcome = await new EffectExecutor(base.deps).apply({...base.request, validation: rejected});
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_PROPOSAL_REJECTED'}));
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
        expect(existsSync(join(laneDir, 'coordinator', 'effects'))).toBeFalse();
    });

    it('refuses an effect that maps to no declared runtime action before any lock is taken', async function () {
        const base = scenario(laneDir);
        const proposal = {...base.proposal, requestedEffects: [{effect: 'publish-to-remote'}]} as unknown as typeof base.proposal;
        const outcome = await new EffectExecutor(base.deps).apply({...base.request, proposal});
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ACTION_UNDECLARED'}));
        expect(existsSync(join(laneDir, 'coordinator', '.lane.lock'))).toBeFalse();
    });

    it('refuses a proposal carrying more than one requested effect rather than choosing one', async function () {
        const base = scenario(laneDir);
        const proposal = {...base.proposal, requestedEffects: [{effect: 'dispatch-batch'}, {effect: 'open-escalation'}]} as unknown as typeof base.proposal;
        const outcome = await new EffectExecutor(base.deps).apply({...base.request, proposal});
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ACTION_AMBIGUOUS'}));
    });
});

describe('EffectExecutor — lock, concurrency, and release', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses with a conflict while another live writer holds the lane lock', async function () {
        const held = acquireEffectLocks(laneDir, ['lane'], nodeEffectFileSystem);
        try {
            const {deps, request} = scenario(laneDir);
            const outcome = await new EffectExecutor(deps).apply(request);
            expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'COORDINATOR_EFFECT_CONFLICT', subject: 'lane'}));
            expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
        } finally {
            held.release();
        }
    });

    it('releases the lane lock after a successful effect so a second cycle can run', async function () {
        const first = scenario(laneDir);
        expect((await new EffectExecutor(first.deps).apply(first.request)).status).toBe('applied');
        expect(existsSync(join(laneDir, 'coordinator', '.lane.lock'))).toBeFalse();
        const held = acquireEffectLocks(laneDir, ['lane'], nodeEffectFileSystem);
        held.release();
    });

    it('releases the lane lock after a refusal under the lock', async function () {
        const base = scenario(laneDir);
        const stale = {...base.context, laneState: {...base.context.laneState, snapshotDigest: `sha256:${'9'.repeat(64)}`}};
        const outcome = await new EffectExecutor(base.deps).apply({
            ...base.request,
            revalidate: () => ({state: stale, result: {valid: false, errors: [{code: 'PROPOSAL_STALE_SNAPSHOT' as const, subject: 's', message: 'stale'}], warnings: []}})
        });
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_STATE_CHANGED'}));
        expect(existsSync(join(laneDir, 'coordinator', '.lane.lock'))).toBeFalse();
    });
});

describe('EffectExecutor — revalidation immediately before commit', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses when lane state changed between planning and the commit point', async function () {
        const base = scenario(laneDir);
        const drifted = {...base.context, activeClaims: [{claimId: 'claim-9', targetIds: ['B1']}]};
        const outcome = await new EffectExecutor(base.deps).apply({
            ...base.request,
            revalidate: () => ({state: drifted, result: new ProposalValidator().validateProposal(baseWire(base), drifted)})
        });
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused'}));
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
    });

    it('refuses when the active pack seal drifted from the authorizing envelope', async function () {
        const base = scenario(laneDir);
        const drifted = {...base.context, packIndex: {...base.context.packIndex, packSealId: 'seal-other', activeSeal: 'seal-other'}};
        const outcome = await new EffectExecutor(base.deps).apply({
            ...base.request,
            revalidate: () => ({state: drifted, result: base.validation})
        });
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_PACK_SEAL_DRIFT'}));
    });

    function baseWire(base: ReturnType<typeof scenario>) {
        return {
            schemaVersion: 1, cycleId: base.proposal.cycleId, proposalId: base.proposal.proposalId, type: base.proposal.type,
            snapshotDigest: base.proposal.snapshotDigest, expiresAt: base.proposal.expiresAt,
            evidenceRefs: [...base.proposal.evidenceRefs], body: {batchId: 'B1'},
            requestedEffects: [...base.proposal.requestedEffects]
        };
    }
});

describe('EffectExecutor — idempotency, replay, and interrupted effects', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('returns the recorded outcome for a settled idempotency key without re-invoking the task', async function () {
        const first = scenario(laneDir);
        expect((await new EffectExecutor(first.deps).apply(first.request)).status).toBe('applied');
        const second = scenario(laneDir);
        const outcome = await new EffectExecutor(second.deps).apply(second.request);
        expect(outcome.status).toBe('replayed');
        expect((second.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
        expect(readEffectJournal(laneDir, nodeEffectFileSystem).records.length).toBe(3);
    });

    it('reports an interrupted effect as uncertain instead of silently retrying it', async function () {
        const base = scenario(laneDir);
        const runner = runnerReturning({
            outcome: 'failed', actionId: base.binding.actionId, taskId: base.binding.taskId, runId: null,
            reason: 'TASK_RUNTIME_TASK_EXECUTION_FAILED', failedTaskId: base.binding.taskId, exitCode: 1,
            signal: null, diagnostic: 'launch verification unavailable', events: []
        });
        const interrupted = scenario(laneDir, {runner});
        const first = await new EffectExecutor(interrupted.deps).apply(interrupted.request);
        expect(first).toEqual(jasmine.objectContaining({status: 'uncertain', reason: 'COORDINATOR_EFFECT_UNCERTAIN'}));

        const retry = scenario(laneDir);
        const second = await new EffectExecutor(retry.deps).apply(retry.request);
        expect(second.status).toBe('replayed');
        expect((retry.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    it('refuses to mutate when the journal ends in a partial record', async function () {
        const {deps, request} = scenario(laneDir);
        nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'journal'));
        writeFileSync(effectJournalPath(laneDir), '{"schemaVersion":1,"eventId":"evt-1"');
        const outcome = await new EffectExecutor(deps).apply(request);
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_JOURNAL_UNREADABLE'}));
    });

    it('treats a prepared-only key as uncertain rather than as a fresh attempt', async function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'journal'));
        writeFileSync(effectJournalPath(laneDir), `${JSON.stringify({
            schemaVersion: 1, eventId: 'evt-0', type: 'coordinator-effect-prepared', sequence: 0, at: '2026-08-06T12:00:00.000Z',
            laneId: plan.laneId, producer: 'watchtower-effect-executor', correlationId: plan.cycleId, causationId: plan.proposalId,
            policyVersion: plan.policyVersion,
            payload: {phase: 'prepared', effect: plan.effect, actionId: plan.actionId, idempotencyKey: plan.idempotencyKey,
                preconditionDigest: plan.preconditionDigest, targetIds: [...plan.targetIds], outcome: 'interrupted'}
        })}\n`);
        const outcome = await new EffectExecutor(base.deps).apply(base.request);
        expect(outcome).toEqual(jasmine.objectContaining({status: 'uncertain', reason: 'COORDINATOR_EFFECT_UNCERTAIN'}));
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });
});

describe('EffectExecutor — envelope lifecycle and dry-run purity', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('spends and removes the invocation envelope before releasing the lock', async function () {
        const {deps, request} = scenario(laneDir);
        await new EffectExecutor(deps).apply(request);
        const entries = readdirSync(join(laneDir, 'coordinator', 'effects'));
        expect(entries.filter((name) => name.endsWith('.envelope.json'))).toEqual([]);
        expect(entries.filter((name) => name.endsWith('.consumed')).length).toBe(1);
    });

    it('writes an envelope the running task can read while it is invoked', async function () {
        const base = scenario(laneDir);
        let seen: string | null = null;
        const runner = {
            invocations: [] as unknown[],
            async run(invocation: {invocationEnvelope?: string}) {
                seen = invocation.invocationEnvelope === undefined ? null : readFileSync(invocation.invocationEnvelope, 'utf8');
                return {
                    outcome: 'completed' as const, actionId: base.binding.actionId, taskId: base.binding.taskId, runId: 'run-1',
                    startedAt: null, finishedAt: null, events: [], result: {applied: true, changed: ['B1'], unchanged: [], warnings: []}
                };
            }
        };
        await new EffectExecutor({...base.deps, runner}).apply(base.request);
        expect(seen).not.toBeNull();
        expect(JSON.parse(seen ?? '{}').actionId).toBe(base.binding.actionId);
    });

    it('builds the plan without touching a single durable byte', function () {
        const {deps, request} = scenario(laneDir);
        const plan = new EffectExecutor(deps).plan(request);
        expect(plan.effect).toBe('dispatch-batch');
        expect(plan.targetIds).toEqual(['B1']);
        expect(readdirSync(laneDir)).toEqual([]);
    });
});
