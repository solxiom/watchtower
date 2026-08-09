/**
 * CA-25 mandatory proof: dry-run purity, normal validator/executor only, and no
 * command-local authority.
 */
import type {DecisionProposal} from '../../../src/contracts/index.js';
import type {CoordinatorMutationRequest} from '../../../src/contracts/coordinatorMutation.js';
import {Ca10CoordinatorEffectAuthority} from '../../../src/foundation/lane/coordinator/mutation/CoordinatorEffectAuthority.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import {resolveDeclaredAction} from '../../../src/foundation/effect/effectActionRegistry.js';
import {bindingFor, countingIds, fixedClock, resolverFor, RUNTIME_TARGET} from '../effect/support/effectFixtures.js';
import {
    authorizationFor, completedRun, countingRunner, escalateFixture, laneDigest, makeLaneDir, placeHoldFixture,
    removeLaneDir, requestFor, resolutionProposeFixture
} from './support/mutationFixtures.js';

const HOLD_BINDING = bindingFor('place-hold');

function authority(runner: ReturnType<typeof countingRunner>): Ca10CoordinatorEffectAuthority {
    return new Ca10CoordinatorEffectAuthority({
        runner, actions: () => resolverFor(HOLD_BINDING), target: () => RUNTIME_TARGET,
        files: nodeEffectFileSystem, clock: fixedClock(), ids: countingIds()
    });
}

function holdRequest(laneDir: string, overrides: Partial<CoordinatorMutationRequest> = {}): CoordinatorMutationRequest {
    const {wire, state} = placeHoldFixture();
    return requestFor(laneDir, 'cycle', authorizationFor(wire, state), {subject: 'trigger-1', ...overrides});
}

describe('coordinator mutation effect authority (CA-25)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('previews a cycle without invoking a task or changing one lane byte', () => {
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const before = laneDigest(laneDir);
        const result = authority(runner).preview(holdRequest(laneDir, {dryRun: true}));
        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.data.dryRun).toBeTrue();
            expect(result.data.applied).toBeFalse();
            expect(result.data.status).toBe('previewed');
            expect(result.data.actionId).toBe(resolveDeclaredAction('place-hold').actionId);
            expect(result.data.idempotencyKey).not.toBeNull();
        }
        expect(runner.invocations.length).toBe(0);
        expect(laneDigest(laneDir)).toEqual(before);
    });

    it('previews and applies from the identical plan value', async () => {
        const previewRunner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const preview = authority(previewRunner).preview(holdRequest(laneDir, {dryRun: true}));
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const applied = await authority(runner).apply(holdRequest(laneDir));
        expect(preview.ok && applied.ok).toBeTrue();
        if (preview.ok && applied.ok) {
            expect(applied.data.idempotencyKey).toBe(preview.data.idempotencyKey);
            expect(applied.data.applied).toBeTrue();
            expect(applied.data.status).toBe('applied');
        }
        expect(runner.invocations.length).toBe(1);
        expect(runner.invocations[0].actionId).toBe(HOLD_BINDING.actionId);
    });

    it('refuses a dry run on the apply entry point', async () => {
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const result = await authority(runner).apply(holdRequest(laneDir, {dryRun: true}));
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('COORDINATOR_MUTATION_INPUT_INVALID');
        expect(runner.invocations.length).toBe(0);
    });

    it('fails closed with no durable authorization and never authors one', async () => {
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const before = laneDigest(laneDir);
        const result = await authority(runner).apply(requestFor(laneDir, 'cycle', undefined, {subject: 'trigger-1'}));
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('COORDINATOR_MUTATION_AUTHORIZATION_UNAVAILABLE');
        expect(runner.invocations.length).toBe(0);
        expect(laneDigest(laneDir)).toEqual(before);
    });

    it('refuses a malformed authorized proposal before the executor', async () => {
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const {state} = placeHoldFixture();
        const request = requestFor(laneDir, 'cycle', authorizationFor(null, state), {subject: 'trigger-1'});
        const result = await authority(runner).apply(request);
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('COORDINATOR_MUTATION_AUTHORIZATION_INVALID');
        expect(runner.invocations.length).toBe(0);
    });

    it('reports the validator\'s own rejection rather than overriding it', async () => {
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const {wire, state} = placeHoldFixture();
        // The same proposal with no operator confirmation: CA-09 refuses it.
        const unconfirmed = {...state, operatorSession: undefined};
        const request = requestFor(laneDir, 'cycle', authorizationFor(wire, unconfirmed), {subject: 'trigger-1'});
        const result = await authority(runner).apply(request);
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('COORDINATOR_MUTATION_PROPOSAL_REJECTED');
        expect(runner.invocations.length).toBe(0);
    });

    it('refuses an effect the installed catalog packages no task for', async () => {
        const runner = countingRunner(completedRun('effect.openEscalation', 'wt:escalation:open', []));
        const {wire, state} = escalateFixture();
        const request = requestFor(laneDir, 'escalate', authorizationFor(wire, state), {subject: 'cycle-1', reason: 'blocked'});
        const result = await authority(runner).apply(request);
        expect(result.ok).toBeFalse();
        if (!result.ok) expect(result.reason).toBe('COORDINATOR_MUTATION_EFFECT_UNSUPPORTED');
        expect(runner.invocations.length).toBe(0);
    });

    it('previews an advisory resolution and never applies it', async () => {
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, []));
        const {wire, state} = resolutionProposeFixture();
        const authorization = authorizationFor(wire, state);
        const preview = authority(runner).preview(
            requestFor(laneDir, 'resolution-propose', authorization, {subject: 'blocker-1', dryRun: true})
        );
        expect(preview.ok).toBeTrue();
        if (preview.ok) {
            expect(preview.data.effect).toBeNull();
            expect(preview.data.applied).toBeFalse();
        }
        const applied = await authority(runner).apply(
            requestFor(laneDir, 'resolution-propose', authorization, {subject: 'blocker-1'})
        );
        expect(applied.ok).toBeFalse();
        if (!applied.ok) expect(applied.reason).toBe('COORDINATOR_MUTATION_EFFECT_UNSUPPORTED');
        expect(runner.invocations.length).toBe(0);
    });

    it('replays an already committed idempotency key without repeating the effect', async () => {
        const first = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const applied = await authority(first).apply(holdRequest(laneDir));
        expect(applied.ok).toBeTrue();
        const second = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const replay = await authority(second).apply(holdRequest(laneDir));
        expect(replay.ok).toBeTrue();
        if (replay.ok) expect(replay.data.status).toBe('replayed');
        expect(second.invocations.length).toBe(0);
    });

    it('keeps the previewed proposal identity in its typed result', () => {
        const runner = countingRunner(completedRun(HOLD_BINDING.actionId, HOLD_BINDING.taskId, ['B1']));
        const {wire} = placeHoldFixture();
        const proposal = wire as DecisionProposal;
        const result = authority(runner).preview(holdRequest(laneDir, {dryRun: true}));
        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.data.proposalId).toBe(proposal.proposalId);
            expect(result.data.proposalType).toBe('place-hold');
            const parameters = result.data.parameters as Record<string, unknown> | null;
            expect(parameters?.operation).toBe('place');
            expect(parameters?.laneId).toBe('lane-1');
            expect(parameters?.scope).toEqual(['B1']);
            expect(parameters?.origin).toBe('operator');
        }
    });
});
