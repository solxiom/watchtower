import {existsSync, mkdirSync, readdirSync, symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {InitialPackIndexActivation, consumePack} from '../../src/foundation/pack/index.js';
import type {PackIndexActivationRequest} from '../../src/foundation/pack/index.js';
import type {ConsumedPack, PackIndexCompileResult} from '../../src/contracts/index.js';
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

function activation(fixture: PackFixture): InitialPackIndexActivation {
    return new InitialPackIndexActivation({fs: fakeFileSystem(fixture), validators: realValidators()});
}

function accepted(result: PackIndexCompileResult) {
    if (!result.ok) throw new Error(`unexpected rejection ${result.reason}: ${result.detail}`);
    return result;
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
