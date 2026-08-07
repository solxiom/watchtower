/**
 * Correction-03 regression proof — an envelope create that fails *after* the
 * file exists must leave no unspent artifact behind.
 *
 * Creation is not atomic: `createExclusive` can open the file and then fail
 * while writing or fsyncing it, and the directory sync happens after the file
 * is already on disk. Before correction 03 either case left the
 * idempotency-key envelope in `coordinator/effects/` even though no journal
 * record was appended and no task ran, so every later retry hit a conflict and
 * the key was permanently wedged.
 *
 * Split out of `effectFailureRecovery.spec.ts` by contract family to keep both
 * scenario matrices inside the test-module size band.
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {EffectExecutor} from '../../../src/foundation/effect/EffectExecutor.js';
import {readEffectJournal} from '../../../src/foundation/effect/effectJournal.js';
import {envelopePath, writeInvocationEnvelope} from '../../../src/foundation/effect/invocationEnvelopeWriter.js';
import {EffectExecutionError} from '../../../src/contracts/effects.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import {applyingRunner, fixedClock, makeLaneDir, removeLaneDir, RUNTIME_TARGET, scenario} from './support/effectFixtures.js';
import {faultingFileSystem, journalBytes, seedSettledHistory} from './support/effectFaults.js';

describe('correction-03 — a failed envelope create leaves no unspent artifact', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    /**
     * The core correction-03 case: the envelope file is really created and the
     * operation then fails. Before the fix the artifact survived, so the
     * idempotency key could never be retried even though nothing had run.
     */
    it('removes a partially created envelope when the create fails after the file exists', async function () {
        const before = await seedSettledHistory(laneDir);
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        const files = faultingFileSystem({op: 'createThenFail', match: (path) => path.endsWith('.envelope.json')});

        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_WRITE_FAILED'}));
        expect(journalBytes(laneDir)).toBe(before);
        expect(nodeEffectFileSystem.fileExists(envelopePath(laneDir, plan))).toBeFalse();
        expect(nodeEffectFileSystem.fileExists(`${envelopePath(laneDir, plan)}.consumed`)).toBeFalse();
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    it('removes the envelope when the directory sync fails after a complete create', async function () {
        const before = await seedSettledHistory(laneDir);
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        const files = faultingFileSystem({op: 'syncDirectory', match: (path) => path.endsWith(join('coordinator', 'effects'))});

        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_WRITE_FAILED'}));
        expect(journalBytes(laneDir)).toBe(before);
        expect(nodeEffectFileSystem.fileExists(envelopePath(laneDir, plan))).toBeFalse();
        expect(nodeEffectFileSystem.fileExists(`${envelopePath(laneDir, plan)}.consumed`)).toBeFalse();
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    it('lets a later retry apply exactly once after a post-create failure', async function () {
        const base = scenario(laneDir);
        const files = faultingFileSystem({op: 'createThenFail', match: (path) => path.endsWith('.envelope.json')});
        expect((await new EffectExecutor({...base.deps, files}).apply(base.request)).status).toBe('refused');

        const retry = scenario(laneDir);
        const outcome = await new EffectExecutor(retry.deps).apply(retry.request);

        expect(outcome.status).toBe('applied');
        expect((retry.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(1);
        expect(readEffectJournal(laneDir, nodeEffectFileSystem).records.map((record) => record.payload.phase))
            .toEqual(['prepared', 'attempted', 'verified']);
    });

    it('lets a later retry apply exactly once after a directory-sync failure', async function () {
        const base = scenario(laneDir);
        const files = faultingFileSystem({op: 'syncDirectory', match: (path) => path.endsWith(join('coordinator', 'effects'))});
        expect((await new EffectExecutor({...base.deps, files}).apply(base.request)).status).toBe('refused');

        const retry = scenario(laneDir);
        const outcome = await new EffectExecutor(retry.deps).apply(retry.request);

        expect(outcome.status).toBe('applied');
        expect((retry.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(1);
    });

    /**
     * Correction-04 reconciliation. An envelope is created *and* consumed inside
     * one lane-lock hold, and `classifyReplay` has already proved this key has
     * no journal record — so an envelope found here under our own lane lock is
     * provably the residue of a crashed or failed earlier attempt, never a live
     * writer's authority. Removing it and proceeding is what stops an orphan
     * from wedging the key forever.
     */
    it('reconciles a provable orphan under the lane lock and applies exactly once', async function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'effects'));
        writeFileSync(envelopePath(laneDir, plan), '{"orphan":"from-a-crashed-attempt"}', {mode: 0o600});

        const outcome = await new EffectExecutor(base.deps).apply(base.request);

        expect(outcome.status).toBe('applied');
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(1);
        expect(readEffectJournal(laneDir, nodeEffectFileSystem).records.map((record) => record.payload.phase))
            .toEqual(['prepared', 'attempted', 'verified']);
    });

    /**
     * Without the lane lock that ownership proof does not hold, so the writer
     * must refuse rather than delete an artifact whose owner is unknown.
     */
    it('refuses without removing an existing envelope when the lane lock is not held', function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'effects'));
        writeFileSync(envelopePath(laneDir, plan), '{"held":"by-another-writer"}', {mode: 0o600});

        expect(() => writeInvocationEnvelope(
            {laneDir, plan, binding: base.binding, target: RUNTIME_TARGET, lockId: 'lock-x', laneLockHeld: false},
            {files: nodeEffectFileSystem, clock: fixedClock()}
        )).toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'COORDINATOR_EFFECT_CONFLICT');
        expect(readFileSync(envelopePath(laneDir, plan), 'utf8')).toBe('{"held":"by-another-writer"}');
    });

    it('never removes an existing consumed receipt while refusing a spent key', async function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'effects'));
        writeFileSync(`${envelopePath(laneDir, plan)}.consumed`, 'spent\n', {mode: 0o600});

        const outcome = await new EffectExecutor(base.deps).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'COORDINATOR_EFFECT_CONFLICT'}));
        expect(nodeEffectFileSystem.fileExists(`${envelopePath(laneDir, plan)}.consumed`)).toBeTrue();
    });
});
