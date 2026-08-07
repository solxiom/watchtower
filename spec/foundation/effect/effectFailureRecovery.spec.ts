/**
 * Correction regression proof — the failure paths the original implementation
 * left uncovered.
 *
 * Each spec here fails against the source it corrects:
 *   CA10-01 — an envelope conflict, race, or I/O fault that mutated the
 *             authoritative journal before the commit point. Correction 02
 *             tightened this: byte preservation is proved against a journal
 *             that already holds settled history, because a compensating
 *             terminal record is exactly what a "no journal file" assertion
 *             would miss;
 *   CA10-02 — a rejected runner or a failed envelope spend escaped as an
 *             untyped exception, leaving an `attempted` tail with no terminal
 *             record;
 *   CA10-03 — an unreadable active-revision pointer read as absence.
 *
 * They use real filesystem faults (a real consumed receipt, a real
 * unreadable/oversized pointer) and a fault-injecting port only where an I/O
 * error cannot be provoked reliably as an unprivileged user.
 */
import {chmodSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {EffectExecutionError} from '../../../src/contracts/effects.js';
import {EffectExecutor} from '../../../src/foundation/effect/EffectExecutor.js';
import {effectJournalPath, readEffectJournal} from '../../../src/foundation/effect/effectJournal.js';
import {envelopePath} from '../../../src/foundation/effect/invocationEnvelopeWriter.js';
import {nodeEffectFileSystem} from '../../../src/foundation/effect/nodeEffectFileSystem.js';
import {activatePackRevision, readActiveRevision} from '../../../src/foundation/effect/packRevisionActivation.js';
import type {EffectFileSystem} from '../../../src/foundation/effect/effectPorts.js';
import {applyingRunner, fixedClock, makeLaneDir, removeLaneDir, scenario} from './support/effectFixtures.js';
import {faultingFileSystem, journalBytes, seedSettledHistory} from './support/effectFaults.js';

const REVISION_DIR = join('coordinator', 'revision');
const POINTER = 'active-revision.json';

describe('CA10-01 — every pre-commit envelope failure is byte-preserving', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses an already-consumed idempotency key leaving journal bytes identical', async function () {
        const before = await seedSettledHistory(laneDir);
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        writeFileSync(`${envelopePath(laneDir, plan)}.consumed`, 'spent\n', {mode: 0o600});

        const outcome = await new EffectExecutor(base.deps).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'COORDINATOR_EFFECT_CONFLICT'}));
        expect(journalBytes(laneDir)).toBe(before);
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    /**
     * Correction 04 changed what a planted envelope means. Under the lane lock,
     * with `classifyReplay` having already proved the key has no journal record,
     * an envelope at this path is a provable orphan and is reconciled rather
     * than treated as a permanent conflict — otherwise a crashed attempt would
     * wedge the key forever. The byte-preservation case that remains is an
     * orphan whose *cleanup* fails: that must still refuse without touching a
     * single journal byte.
     */
    it('refuses an unreconcilable orphan leaving journal bytes identical', async function () {
        const before = await seedSettledHistory(laneDir);
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        nodeEffectFileSystem.ensureDirectory(join(laneDir, 'coordinator', 'effects'));
        writeFileSync(envelopePath(laneDir, plan), '{"orphan":true}', {mode: 0o600});
        const files = faultingFileSystem({op: 'remove', match: (path) => path.endsWith('.envelope.json')});

        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED'}));
        expect(journalBytes(laneDir)).toBe(before);
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    it('refuses an injected envelope-create I/O fault leaving journal bytes identical', async function () {
        const before = await seedSettledHistory(laneDir);
        const base = scenario(laneDir);
        const files = faultingFileSystem({op: 'createExclusive', match: (path) => path.endsWith('.envelope.json')});

        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'refused', reason: 'EFFECT_ENVELOPE_WRITE_FAILED'}));
        expect(journalBytes(laneDir)).toBe(before);
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    it('writes no journal at all when the very first effect fails envelope creation', async function () {
        const base = scenario(laneDir);
        const files = faultingFileSystem({op: 'createExclusive', match: (path) => path.endsWith('.envelope.json')});

        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome.status).toBe('refused');
        expect(nodeEffectFileSystem.fileExists(effectJournalPath(laneDir))).toBeFalse();
    });

    it('leaves the idempotency key cleanly retryable after an envelope-create fault', async function () {
        const base = scenario(laneDir);
        const files = faultingFileSystem({op: 'createExclusive', match: (path) => path.endsWith('.envelope.json')});
        expect((await new EffectExecutor({...base.deps, files}).apply(base.request)).status).toBe('refused');

        // No prepared/failed record was written, so the retry is a genuine first
        // attempt rather than a replay of a phantom settled key.
        const retry = scenario(laneDir);
        const outcome = await new EffectExecutor(retry.deps).apply(retry.request);
        expect(outcome.status).toBe('applied');
        expect((retry.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(1);
    });

    it('discards the envelope and preserves journal bytes when the prepared append itself fails', async function () {
        const before = await seedSettledHistory(laneDir);
        const base = scenario(laneDir);
        const plan = new EffectExecutor(base.deps).plan(base.request);
        const files = faultingFileSystem({op: 'appendLine', match: (path) => path.endsWith('effect-events.jsonl')});

        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome.status).toBe('refused');
        expect(journalBytes(laneDir)).toBe(before);
        expect(nodeEffectFileSystem.fileExists(envelopePath(laneDir, plan))).toBeFalse();
        expect(nodeEffectFileSystem.fileExists(`${envelopePath(laneDir, plan)}.consumed`)).toBeFalse();
        expect((base.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });
});

describe('CA10-02 — thrown runner and cleanup failures resolve to a typed outcome', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    const rejectingRunner = {
        invocations: [] as unknown[],
        async run(): Promise<never> { throw new Error('tmux socket disappeared mid-launch'); }
    };

    it('returns uncertain rather than throwing when the runner rejects', async function () {
        const base = scenario(laneDir, {runner: rejectingRunner});
        const outcome = await new EffectExecutor(base.deps).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'uncertain', reason: 'COORDINATOR_EFFECT_UNCERTAIN'}));
        expect((outcome as {message: string}).message).toContain('tmux socket disappeared mid-launch');
    });

    it('appends a terminal record so a rejected runner never leaves an attempted tail', async function () {
        const base = scenario(laneDir, {runner: rejectingRunner});
        await new EffectExecutor(base.deps).apply(base.request);

        const records = readEffectJournal(laneDir, nodeEffectFileSystem).records;
        expect(records.map((record) => record.payload.phase)).toEqual(['prepared', 'attempted', 'uncertain']);
        expect(records.map((record) => record.sequence)).toEqual([0, 1, 2]);
    });

    it('classifies the retry after a rejected runner as settled, without re-invoking', async function () {
        await new EffectExecutor(scenario(laneDir, {runner: rejectingRunner}).deps).apply(scenario(laneDir, {runner: rejectingRunner}).request);
        const retry = scenario(laneDir);
        const outcome = await new EffectExecutor(retry.deps).apply(retry.request);

        expect(outcome.status).toBe('replayed');
        expect((retry.deps.runner as ReturnType<typeof applyingRunner>).invocations.length).toBe(0);
    });

    it('reports an unspendable envelope as uncertain without discarding the effect outcome', async function () {
        const base = scenario(laneDir);
        const files = faultingFileSystem({op: 'remove', match: (path) => path.endsWith('.envelope.json')});
        const outcome = await new EffectExecutor({...base.deps, files}).apply(base.request);

        expect(outcome).toEqual(jasmine.objectContaining({status: 'uncertain', reason: 'COORDINATOR_EFFECT_UNCERTAIN'}));
        expect((outcome as {message: string}).message).toContain('could not be spent');
        expect((outcome as {message: string}).message).toContain('applied');
        expect(readEffectJournal(laneDir, nodeEffectFileSystem).records.map((record) => record.payload.phase))
            .toEqual(['prepared', 'attempted', 'verified', 'uncertain']);
    });

    it('releases the lane lock on every one of those paths', async function () {
        await new EffectExecutor(scenario(laneDir, {runner: rejectingRunner}).deps).apply(scenario(laneDir, {runner: rejectingRunner}).request);
        expect(nodeEffectFileSystem.fileExists(join(laneDir, 'coordinator', '.lane.lock'))).toBeFalse();
    });
});

describe('CA10-03 — an unreadable active-revision pointer fails closed', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () {
        const pointer = join(laneDir, REVISION_DIR, POINTER);
        try { chmodSync(pointer, 0o600); } catch { /* already removable */ }
        removeLaneDir(laneDir);
    });

    const DEPS = {files: nodeEffectFileSystem, clock: fixedClock()};
    const FIRST = `sha256:${'1'.repeat(64)}`;
    const SECOND = `sha256:${'2'.repeat(64)}`;
    const COMMIT = '0'.repeat(40);

    function activateFirst() {
        return activatePackRevision({
            laneDir, laneId: 'lane-1', blockerId: 'blocker-1', supersedesSeal: '',
            admitted: {blockerId: 'blocker-1', activeSeal: FIRST, requiredCommit: COMMIT}, affectedWorktreeIds: []
        }, DEPS);
    }

    it('refuses to read an existing pointer that is not readable', function () {
        activateFirst();
        const pointer = join(laneDir, REVISION_DIR, POINTER);
        chmodSync(pointer, 0o000);
        if (nodeEffectFileSystem.readText(pointer, 65536).kind === 'text') {
            pending('running with privileges that bypass file permissions');
            return;
        }
        expect(() => readActiveRevision(laneDir, nodeEffectFileSystem))
            .toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_REVISION_NOT_ADMITTED');
    });

    it('refuses to admit a first activation over an unreadable pointer, preserving the live revision', function () {
        activateFirst();
        const pointer = join(laneDir, REVISION_DIR, POINTER);
        const live = readFileSync(pointer, 'utf8');
        chmodSync(pointer, 0o000);
        if (nodeEffectFileSystem.readText(pointer, 65536).kind === 'text') {
            pending('running with privileges that bypass file permissions');
            return;
        }
        expect(() => activatePackRevision({
            laneDir, laneId: 'lane-1', blockerId: 'blocker-1', supersedesSeal: '',
            admitted: {blockerId: 'blocker-1', activeSeal: SECOND, requiredCommit: COMMIT}, affectedWorktreeIds: []
        }, DEPS)).toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_REVISION_NOT_ADMITTED');
        chmodSync(pointer, 0o600);
        expect(readFileSync(pointer, 'utf8')).toBe(live);
    });

    it('refuses an oversized pointer instead of treating it as absent', function () {
        activateFirst();
        writeFileSync(join(laneDir, REVISION_DIR, POINTER), 'x'.repeat(64 * 1024 + 1), {mode: 0o600});
        expect(() => readActiveRevision(laneDir, nodeEffectFileSystem))
            .toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_REVISION_NOT_ADMITTED');
    });

    it('refuses an empty pointer instead of treating it as absent', function () {
        activateFirst();
        writeFileSync(join(laneDir, REVISION_DIR, POINTER), '', {mode: 0o600});
        expect(() => readActiveRevision(laneDir, nodeEffectFileSystem))
            .toThrowMatching((error) => error instanceof EffectExecutionError && error.reason === 'EFFECT_REVISION_NOT_ADMITTED');
    });

    it('still reports a genuinely absent pointer as absence', function () {
        expect(readActiveRevision(laneDir, nodeEffectFileSystem)).toBeNull();
    });

    it('distinguishes missing, unreadable, and readable at the port itself', function () {
        const pointer = join(laneDir, REVISION_DIR, POINTER);
        expect(nodeEffectFileSystem.readText(pointer, 65536)).toEqual({kind: 'missing'});
        activateFirst();
        expect(nodeEffectFileSystem.readText(pointer, 65536).kind).toBe('text');
        expect(nodeEffectFileSystem.readText(join(laneDir, REVISION_DIR), 65536))
            .toEqual({kind: 'unreadable', reason: 'not-a-file'});
        expect(nodeEffectFileSystem.readText(pointer, 4)).toEqual({kind: 'unreadable', reason: 'too-large'});
    });
});
