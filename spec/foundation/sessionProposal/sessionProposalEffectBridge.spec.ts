/**
 * CA-26 acceptance proof — **sole executor handoff**.
 *
 * `coordinator-automation.md` §21 "Exactly one effect authority exists for a
 * lane" and `operator-session.md` §15.4 "The normal effect executor and
 * journals are used". These specs count executor invocations against a real
 * lane directory: the bridge must reach the executor exactly once for an
 * applied proposal, zero times for every refusal and every dry run, and zero
 * additional times for a replay.
 */
import {existsSync, readdirSync} from 'node:fs';
import {join} from 'node:path';
import {acquireEffectLocks, effectJournalPath, nodeEffectFileSystem, readEffectJournal} from '../../../src/foundation/effect/index.js';
import {
    confirmed, invocationsOf, makeLaneDir, OPERATOR_SESSION_ID, removeLaneDir, scenario, type Scenario
} from './support/sessionProposalFixtures.js';

describe('CA-26 sole executor handoff — one validated proposal, one invocation', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('reaches the sole executor exactly once and journals prepared/attempted/verified', async function () {
        confirmed(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result.status).toBe('applied');
        expect(invocationsOf(scene.runner)).toBe(1);
        const journal = readEffectJournal(laneDir, nodeEffectFileSystem);
        expect(journal.records.map((record) => record.payload.phase)).toEqual(['prepared', 'attempted', 'verified']);
    });

    it('records the executor idempotency key on the durable proposal document', async function () {
        confirmed(scene);
        const result = await scene.service.apply(scene.applyRequest);
        if (result.status === 'refused') throw new Error(`unexpected refusal: ${result.reason}`);
        const journal = readEffectJournal(laneDir, nodeEffectFileSystem);
        expect(result.effect.idempotencyKey).toBe(String(journal.records[0].payload.idempotencyKey));
        expect(result.document.state).toBe('effect-verified');
        expect(result.effect.effect).toBe('dispatch-batch');
    });

    it('never mutates lane state itself — every durable change is the executor journal', async function () {
        confirmed(scene);
        await scene.service.apply(scene.applyRequest);
        const coordinator = readdirSync(join(laneDir, 'coordinator')).sort();
        expect(coordinator).toEqual(['effects', 'journal', 'operator-sessions']);
    });

    it('replays a second apply from the durable record without invoking the executor again', async function () {
        confirmed(scene);
        await scene.service.apply(scene.applyRequest);
        const replay = await scene.service.apply(scene.applyRequest);
        expect(replay.status).toBe('replayed');
        if (replay.status === 'refused') throw new Error('replay must not refuse');
        expect(replay.outcome).toBeNull();
        expect(invocationsOf(scene.runner)).toBe(1);
    });

    it('keeps the effect journal at exactly three records across a replayed apply', async function () {
        confirmed(scene);
        await scene.service.apply(scene.applyRequest);
        await scene.service.apply(scene.applyRequest);
        expect(readEffectJournal(laneDir, nodeEffectFileSystem).records.length).toBe(3);
    });

    it('refuses without a durable rejection when another writer holds the lane lock', async function () {
        confirmed(scene);
        const held = acquireEffectLocks(laneDir, ['lane'], nodeEffectFileSystem);
        try {
            const result = await scene.service.apply(scene.applyRequest);
            expect(result).toEqual(jasmine.objectContaining({status: 'refused', recordRejected: false}));
            expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
        } finally {
            held.release();
        }
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('operator-confirmed');
    });

    it('applies successfully once the conflicting writer releases the lane lock', async function () {
        confirmed(scene);
        const held = acquireEffectLocks(laneDir, ['lane'], nodeEffectFileSystem);
        await scene.service.apply(scene.applyRequest);
        held.release();
        const result = await scene.service.apply(scene.applyRequest);
        expect(result.status).toBe('applied');
        expect(invocationsOf(scene.runner)).toBe(1);
    });
});

describe('CA-26 dry-run preview — purity', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('previews the plan for an unconfirmed proposal and says confirmation is still required', function () {
        confirmedNot(scene);
        const preview = scene.service.preview(scene.applyRequest);
        if (preview.status !== 'preview') throw new Error(`unexpected refusal: ${preview.reason}`);
        expect(preview.confirmationRequired).toBeTrue();
        expect(preview.plan.effect).toBe('dispatch-batch');
        expect(preview.revalidation.valid).toBeTrue();
    });

    it('writes nothing at all — no journal, no lock, no state change', function () {
        confirmedNot(scene);
        scene.service.preview(scene.applyRequest);
        expect(invocationsOf(scene.runner)).toBe(0);
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
        expect(existsSync(join(laneDir, 'coordinator', '.lane.lock'))).toBeFalse();
        expect(existsSync(join(laneDir, 'coordinator', 'effects'))).toBeFalse();
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('proposed');
    });

    it('reports a confirmed proposal as no longer requiring confirmation', function () {
        confirmed(scene);
        const preview = scene.service.preview(scene.applyRequest);
        expect(preview.status === 'preview' && preview.confirmationRequired).toBeFalse();
    });

    it('previews the exact plan a later apply commits', async function () {
        confirmed(scene);
        const preview = scene.service.preview(scene.applyRequest);
        if (preview.status !== 'preview') throw new Error('expected a preview');
        const applied = await scene.service.apply(scene.applyRequest);
        if (applied.status === 'refused') throw new Error('expected an apply');
        expect(applied.effect.idempotencyKey).toBe(preview.plan.idempotencyKey);
    });

    it('refuses to preview a proposal whose current state already rejects it, and still writes nothing', function () {
        confirmedNot(scene);
        const state = scene.state.get();
        scene.state.set({...state, laneState: {...state.laneState, batches: {B1: {batchId: 'B1', status: 'accepted'}}}});
        const preview = scene.service.preview(scene.applyRequest);
        expect(preview).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_STALE', recordRejected: false}));
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('proposed');
    });
});

describe('CA-26 uncertain and interrupted effects', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses to retry a proposal whose recorded effect ended uncertain', async function () {
        confirmed(scene);
        await scene.service.apply(scene.applyRequest);
        forceState(scene, 'effect-uncertain');
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECOVERY_REQUIRED'}));
        expect(invocationsOf(scene.runner)).toBe(1);
    });

    it('refuses to apply a record left mid-flight in an interrupted internal state', async function () {
        confirmed(scene);
        forceState(scene, 'effect-prepared');
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_CONFIRMATION_REQUIRED'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });
});

/** Record without confirming — the explicit counterpart of the `confirmed` fixture. */
function confirmedNot(scene: Scenario): void {
    const result = scene.service.record({
        operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001',
        proposalType: scene.sessionType, proposal: scene.wire
    });
    if (result.status !== 'recorded') throw new Error(`fixture could not record: ${result.reason}`);
}

/** Rewrite only the durable lifecycle state, exactly as an interrupted or recovered record would read. */
function forceState(scene: Scenario, state: string): void {
    const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
    if (read.kind !== 'document') throw new Error('expected a document');
    scene.store.replace({...read.document, state} as typeof read.document);
}
