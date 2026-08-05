import {existsSync, mkdirSync, readFileSync, readdirSync, symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {InitialPackIndexActivation, consumePack} from '../../src/foundation/pack/index.js';
import type {PackIndexActivationRequest} from '../../src/foundation/pack/index.js';
import {createWatchtowerError} from '../../src/contracts/index.js';
import type {ConsumedPack, PackIndexCompileResult} from '../../src/contracts/index.js';
import type {DerivedStorage} from '../../src/foundation/storage/index.js';
import {buildPackFixture, deps, fakeFileSystem, realValidators, PACK_ROOT, AUTHOR_LANE_ID, type PackFixture} from './fixtures/packFixture.js';
import {makeWorkDir, removeWorkDir} from '../storage/support/storeFixtures.js';

async function acceptedPack(fixture: PackFixture): Promise<ConsumedPack> {
    const result = await consumePack(fixture.context, deps(fixture));
    if (!result.ok) throw new Error(`fixture pack was rejected: ${result.reason}`);
    return result.pack;
}

function requestFor(pack: ConsumedPack, laneDir: string, laneId = AUTHOR_LANE_ID): PackIndexActivationRequest {
    return {pack, packRoot: PACK_ROOT, packPath: 'docs/spec/implementation/watchtower-v1', laneId, laneDir};
}

function activation(fixture: PackFixture, overrides: Partial<{
    readonly storage: (root: string) => DerivedStorage;
    readonly now: () => string;
    readonly indexId: () => string;
}> = {}): InitialPackIndexActivation {
    return new InitialPackIndexActivation({fs: fakeFileSystem(fixture), validators: realValidators(), ...overrides});
}

function accepted(result: PackIndexCompileResult) {
    if (!result.ok) throw new Error(`unexpected rejection ${result.reason}: ${result.detail}`);
    return result;
}

function rejected(result: PackIndexCompileResult) {
    if (result.ok) throw new Error('expected a rejection but the activation succeeded');
    return result;
}

/** A `DerivedStorage` double whose `rebuild`/`open` both fail with the given error, simulating a mid-compile/verify failure. */
function failingStorage(error: Error): (root: string) => DerivedStorage {
    return () => ({
        open: () => Promise.reject(error),
        rebuild: () => Promise.reject(error)
    });
}

function pointerPath(laneDir: string): string {
    return join(laneDir, 'coordinator', 'index', 'pack', 'current.json');
}

function readPointerRaw(laneDir: string): unknown {
    return JSON.parse(readFileSync(pointerPath(laneDir), 'utf8'));
}

describe('InitialPackIndexActivation — canonical index-root resolution and delegation', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(laneDir); });

    it('activates the compiler at the canonical coordinator/index/pack root beneath laneDir', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const result = accepted(await activation(fixture).activate(requestFor(pack, laneDir)));

        const expectedRoot = join(laneDir, 'coordinator', 'index', 'pack');
        expect(result.indexDir.startsWith(`${expectedRoot}/`)).toBeTrue();
        expect(existsSync(join(expectedRoot, 'current.json'))).toBeTrue();
        expect(result.manifest.packSealId).toBe(pack.sealId);
        expect(result.manifest.laneId).toBe(AUTHOR_LANE_ID);
    });

    it('reuses the current generation on a repeat activation of the same pack state', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const request = requestFor(pack, laneDir);
        const first = accepted(await activation(fixture).activate(request));
        const second = accepted(await activation(fixture).activate(request));

        expect(second.reused).toBe(true);
        expect(second.indexId).toBe(first.indexId);
    });

    it('rejects a malformed lane id before any filesystem effect and never invokes the compiler', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const result = await activation(fixture).activate(requestFor(pack, laneDir, 'not-a-uuid'));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('PACK_INDEX_ENTITY_INVALID');
        expect(existsSync(join(laneDir, 'coordinator'))).toBeFalse();
    });

    it('fails closed when laneDir does not exist and performs no filesystem effect', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const missingLaneDir = join(laneDir, 'does-not-exist');
        const result = await activation(fixture).activate(requestFor(pack, missingLaneDir));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('PACK_INDEX_PATH_INVALID');
        expect(existsSync(missingLaneDir)).toBeFalse();
    });

    it('fails closed instead of following a symlinked coordinator/ directory that escapes laneDir', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const outside = makeWorkDir();
        try {
            symlinkSync(outside, join(laneDir, 'coordinator'));
            const result = await activation(fixture).activate(requestFor(pack, laneDir));

            expect(result.ok).toBe(false);
            if (!result.ok) expect(result.reason).toBe('PACK_INDEX_PATH_INVALID');
            expect(readdirSync(outside)).toEqual([]);
        } finally {
            removeWorkDir(outside);
        }
    });

    it('delegates every rejection reason the compiler itself produces unchanged', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        mkdirSync(join(laneDir, 'coordinator'), {recursive: true});
        fixture.files.delete(`${PACK_ROOT}/implementation-pack.json`);
        const result = await activation(fixture).activate(requestFor(pack, laneDir));

        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('PACK_INDEX_SOURCE_UNREADABLE');
    });
});

describe('InitialPackIndexActivation — failure injection before/after compile, verify, and activation', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(laneDir); });

    it('fails closed and writes no pointer when the injected compile (rebuild) step fails, with the staged root left empty', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const storage = failingStorage(new Error('injected rebuild failure'));
        const result = rejected(await activation(fixture, {storage}).activate(requestFor(pack, laneDir)));

        expect(result.reason).toBe('PACK_INDEX_PUBLISH_FAILED');
        const indexRoot = join(laneDir, 'coordinator', 'index', 'pack');
        expect(existsSync(join(indexRoot, 'current.json'))).toBeFalse();
        expect(readdirSync(indexRoot)).toEqual([]);
    });

    it('fails closed and writes no pointer when the injected compile step fails verification (ERR_INTEGRITY_FAILURE), with the staged root left empty', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const integrityError = createWatchtowerError('ERR_INTEGRITY_FAILURE', {
            operation: 'rebuild pack index', target: 'pack.sqlite', remediation: 'Rebuild the pack index from the accepted pack source.'
        });
        const storage = failingStorage(integrityError);
        const result = rejected(await activation(fixture, {storage}).activate(requestFor(pack, laneDir)));

        expect(result.reason).toBe('PACK_INDEX_INTEGRITY_FAILURE');
        const indexRoot = join(laneDir, 'coordinator', 'index', 'pack');
        expect(existsSync(join(indexRoot, 'current.json'))).toBeFalse();
        expect(readdirSync(indexRoot)).toEqual([]);
    });

    it('fails closed and writes no pointer when a failure is injected strictly after compile succeeds and before rename/activation', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const now = (): string => { throw new Error('injected failure between compile success and pointer activation'); };
        const result = rejected(await activation(fixture, {now}).activate(requestFor(pack, laneDir)));

        expect(result.reason).toBe('PACK_INDEX_PUBLISH_FAILED');
        const indexRoot = join(laneDir, 'coordinator', 'index', 'pack');
        expect(existsSync(join(indexRoot, 'current.json'))).toBeFalse();
        expect(readdirSync(indexRoot)).toEqual([]);
    });

    it('recovers cleanly on the next activation after a post-compile, pre-activation failure — no residual staged state blocks it', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const request = requestFor(pack, laneDir);
        const failingNow = (): string => { throw new Error('injected'); };
        rejected(await activation(fixture, {now: failingNow}).activate(request));

        const retry = accepted(await activation(fixture).activate(request));
        expect(retry.reused).toBe(false);
        expect(readPointerRaw(laneDir)).toEqual(jasmine.objectContaining({indexId: retry.indexId}));
    });

    it('leaves a prior activation\'s authoritative pointer completely unchanged when a later re-activation attempt fails mid-compile', async function () {
        const baselineFixture = buildPackFixture();
        const baselinePack = await acceptedPack(baselineFixture);
        const baseline = accepted(await activation(baselineFixture).activate(requestFor(baselinePack, laneDir)));
        const pointerBefore = readPointerRaw(laneDir);

        const changedFixture = buildPackFixture({acceptance: {findings: [{id: 'F-2', severity: 'minor', disposition: 'closed'}]}});
        const changedPack = await acceptedPack(changedFixture);
        expect(changedPack.sealId).not.toBe(baselinePack.sealId);
        const storage = failingStorage(new Error('injected rebuild failure on re-activation'));
        const result = rejected(await activation(changedFixture, {storage}).activate(requestFor(changedPack, laneDir)));

        expect(result.reason).toBe('PACK_INDEX_PUBLISH_FAILED');
        expect(readPointerRaw(laneDir)).toEqual(pointerBefore);
        const indexRoot = join(laneDir, 'coordinator', 'index', 'pack');
        expect(readdirSync(indexRoot).sort()).toEqual(['current.json', baseline.indexId].sort());
    });
});
