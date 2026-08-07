/**
 * Correction-04 regression proof — a cleanup failure is never swallowed, and a
 * surviving unspent envelope never permanently wedges an effect that never ran.
 *
 * The defect: `discardUnusedEnvelope` caught and ignored `remove` failures, so
 * a post-create write/fsync or directory-sync failure *combined with* a removal
 * failure left an unspent envelope while the refusal claimed a plain write
 * failure. Every later retry then hit a conflict forever.
 *
 * These specs run both faults at once — either alone leaves a recoverable path
 * that hides the defect — and pin the three properties the recovery contract
 * needs: the refusal names the orphan with its own typed reason, no consumed
 * receipt is written for an effect that never ran, and the next retry has a
 * deterministic outcome (refuse while the orphan exists; apply exactly once
 * after reconciliation).
 */
import {readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {EffectExecutionError} from '../../../src/contracts/effects.js';
import {EffectExecutor} from '../../../src/foundation/effect/EffectExecutor.js';
import {readEffectJournal} from '../../../src/foundation/effect/effectJournal.js';
import {envelopePath, writeInvocationEnvelope} from '../../../src/foundation/effect/invocationEnvelopeWriter.js';
import {discardUnusedEnvelope} from '../../../src/foundation/effect/envelopeRecovery.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import {applyingRunner, fixedClock, makeLaneDir, removeLaneDir, RUNTIME_TARGET, scenario} from './support/effectFixtures.js';
import {faultingFileSystem, journalBytes, seedSettledHistory} from './support/effectFaults.js';

const ENVELOPE = (path: string) => path.endsWith('.envelope.json');
const EFFECTS_DIR = (path: string) => path.endsWith(join('coordinator', 'effects'));

describe('correction-04 — cleanup failure is reported, never swallowed', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    /** Both faults live at once: the create fails after the file exists, and removal fails too. */
    function createAndCleanupFail() {
        return faultingFileSystem({op: 'createThenFail', match: ENVELOPE}, {op: 'remove', match: ENVELOPE});
    }

    function syncAndCleanupFail() {
        return faultingFileSystem({op: 'syncDirectory', match: EFFECTS_DIR}, {op: 'remove', match: ENVELOPE});
    }

    it('reports the orphan with its own typed reason, not a plain write failure', async function () {
        const base = scenario(laneDir);
        const outcome = await new EffectExecutor({...base.deps, files: createAndCleanupFail()}).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED'}));
        expect((outcome as {message: string}).message).toContain('could not be removed');
        expect((outcome as {message: string}).message).toContain('never ran');
    });

    it('distinguishes a recovered cleanup from a failed one', async function () {
        const recovered = scenario(laneDir);
        const recoveredOutcome = await new EffectExecutor({
            ...recovered.deps, files: faultingFileSystem({op: 'createThenFail', match: ENVELOPE})
        }).apply(recovered.request);
        expect(recoveredOutcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_WRITE_FAILED'}));

        removeLaneDir(laneDir);
        laneDir = makeLaneDir();
        const stuck = scenario(laneDir);
        const stuckOutcome = await new EffectExecutor({...stuck.deps, files: createAndCleanupFail()}).apply(stuck.request);
        expect(stuckOutcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED'}));
    });

    it('reports the orphan when the directory sync and the cleanup both fail', async function () {
        const base = scenario(laneDir);
        const outcome = await new EffectExecutor({...base.deps, files: syncAndCleanupFail()}).apply(base.request);
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED'}));
    });

    it('names the exact artifact an operator must remove', async function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        const outcome = await new EffectExecutor({...base.deps, files: createAndCleanupFail()}).apply(base.request);
        expect((outcome as {subject: string}).subject).toBe(envelopePath(laneDir, plan));
    });

    it('leaves the journal byte-identical and never invokes the task', async function () {
        const before = await seedSettledHistory(laneDir);
        const base = scenario(laneDir);
        await new EffectExecutor({...base.deps, files: createAndCleanupFail()}).apply(base.request);

        expect(journalBytes(laneDir)).toBe(before);
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    it('writes no consumed receipt for an effect that never ran', async function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        await new EffectExecutor({...base.deps, files: createAndCleanupFail()}).apply(base.request);

        expect(nodeEffectFileSystem.fileExists(`${envelopePath(laneDir, plan)}.consumed`)).toBeFalse();
        expect(nodeEffectFileSystem.fileExists(envelopePath(laneDir, plan))).toBeTrue();
    });

    it('also writes no consumed receipt when the prepare append and the cleanup both fail', async function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        const files = faultingFileSystem(
            {op: 'appendLine', match: (path) => path.endsWith('effect-events.jsonl')},
            {op: 'remove', match: ENVELOPE}
        );

        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED'}));
        expect(nodeEffectFileSystem.fileExists(`${envelopePath(laneDir, plan)}.consumed`)).toBeFalse();
        expect(journalBytes(laneDir)).toBeNull();
    });
});

describe('correction-04 — deterministic retry behaviour after an orphan', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    async function strandAnOrphan() {
        const base = scenario(laneDir);
        const files = faultingFileSystem({op: 'createThenFail', match: ENVELOPE}, {op: 'remove', match: ENVELOPE});
        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);
        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED'}));
        return new EffectExecutor(base.deps).plan(base.request);
    }

    /**
     * The specified retry behaviour: the next attempt reconciles the provable
     * orphan under the lane lock and applies exactly once. This is what stops a
     * failed cleanup from permanently wedging an effect that never ran.
     */
    it('reconciles the orphan on the next retry and applies exactly once', async function () {
        await strandAnOrphan();

        const retry = scenario(laneDir);
        const outcome = await new EffectExecutor(retry.deps).apply(retry.request);

        expect(outcome.status).toBe('applied');
        expect((retry.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(1);
        expect(readEffectJournal(laneDir, nodeEffectFileSystem).records.map((record) => record.payload.phase))
            .toEqual(['prepared', 'attempted', 'verified']);
    });

    /** Repeated retries stay deterministic: the second one replays, never re-invokes. */
    it('replays rather than re-invoking on a further retry after recovery', async function () {
        await strandAnOrphan();
        expect((await new EffectExecutor(scenario(laneDir).deps).apply(scenario(laneDir).request)).status).toBe('applied');

        const third = scenario(laneDir);
        const outcome = await new EffectExecutor(third.deps).apply(third.request);
        expect(outcome.status).toBe('replayed');
        expect((third.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    /** While the orphan cannot be removed at all, the refusal stays the same typed state — never a silent success. */
    it('keeps refusing with the same typed state while removal keeps failing', async function () {
        const plan = await strandAnOrphan();
        const again = scenario(laneDir);
        const outcome = await new EffectExecutor({
            ...again.deps, files: faultingFileSystem({op: 'remove', match: ENVELOPE})
        }).apply(again.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED'}));
        expect(nodeEffectFileSystem.fileExists(envelopePath(laneDir, plan))).toBeTrue();
        expect(nodeEffectFileSystem.fileExists(`${envelopePath(laneDir, plan)}.consumed`)).toBeFalse();
        expect((again.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });
});

describe('correction-04 — discardUnusedEnvelope reports its own outcome', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    function writeOne() {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        return writeInvocationEnvelope(
            {laneDir, plan, binding: base.binding, target: RUNTIME_TARGET, lockId: 'lock-1', laneLockHeld: true},
            {files: nodeEffectFileSystem, clock: fixedClock()}
        );
    }

    it('reports removed when the artifact is really gone', function () {
        const written = writeOne();
        expect(discardUnusedEnvelope(written.path, nodeEffectFileSystem)).toEqual({kind: 'removed'});
        expect(nodeEffectFileSystem.fileExists(written.path)).toBeFalse();
    });

    it('reports orphaned, not removed, when removal throws', function () {
        const written = writeOne();
        const result = discardUnusedEnvelope(written.path, faultingFileSystem({op: 'remove', match: ENVELOPE}));
        expect(result.kind).toBe('orphaned');
        expect(readFileSync(written.path, 'utf8').length).toBeGreaterThan(0);
    });

    /** A port that silently no-ops must not be able to claim a cleanup it never performed. */
    it('reports orphaned when removal returns cleanly but the artifact survives', function () {
        const written = writeOne();
        const lyingPort = {...nodeEffectFileSystem, remove(): void { /* claims success, does nothing */ }};
        const result = discardUnusedEnvelope(written.path, lyingPort);
        expect(result.kind).toBe('orphaned');
        expect(nodeEffectFileSystem.fileExists(written.path)).toBeTrue();
    });

    it('never writes a consumed receipt for a discarded envelope', function () {
        const written = writeOne();
        discardUnusedEnvelope(written.path, nodeEffectFileSystem);
        expect(nodeEffectFileSystem.fileExists(`${written.path}.consumed`)).toBeFalse();
    });

    it('refuses to reuse a path whose envelope survived, without touching it', function () {
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        writeOne();
        const bytes = readFileSync(envelopePath(laneDir, plan), 'utf8');
        expect(() => writeInvocationEnvelope(
            {laneDir, plan, binding: base.binding, target: RUNTIME_TARGET, lockId: 'lock-2', laneLockHeld: false},
            {files: nodeEffectFileSystem, clock: fixedClock()}
        )).toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'COORDINATOR_EFFECT_CONFLICT');
        expect(readFileSync(envelopePath(laneDir, plan), 'utf8')).toBe(bytes);
    });
});
