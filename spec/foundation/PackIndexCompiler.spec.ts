import {existsSync, readFileSync, readdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {PackIndexCompiler, consumePack} from '../../src/foundation/index.js';
import {openDerivedStorage} from '../../src/foundation/storage/index.js';
import type {PackIndexCompileRequest} from '../../src/foundation/index.js';
import {PACK_INDEX_SCHEMA} from '../../src/foundation/pack/index/packIndexSchema.js';
import type {ConsumedPack, PackIndexCompileResult} from '../../src/contracts/index.js';
import {buildPackFixture, deps, fakeFileSystem, realValidators, PACK_ROOT, type PackFixture} from './fixtures/packFixture.js';
import {makeWorkDir, removeWorkDir} from '../storage/support/storeFixtures.js';

const LANE_ID = '9d0ee3d2-8833-4fb7-b112-8438f04f57d2';
const encoder = new TextEncoder();

async function acceptedPack(fixture: PackFixture): Promise<ConsumedPack> {
    const result = await consumePack(fixture.context, deps(fixture));
    if (!result.ok) throw new Error(`fixture pack was rejected: ${result.reason}`);
    return result.pack;
}

function requestFor(fixture: PackFixture, pack: ConsumedPack, indexRoot: string): PackIndexCompileRequest {
    return {pack, packRoot: PACK_ROOT, packPath: 'docs/spec/implementation/watchtower-v1', laneId: LANE_ID, indexRoot};
}

function compiler(fixture: PackFixture) {
    return new PackIndexCompiler({fs: fakeFileSystem(fixture), validators: realValidators()});
}

function accepted(result: PackIndexCompileResult) {
    if (!result.ok) throw new Error(`unexpected rejection ${result.reason}: ${result.detail}`);
    return result;
}

describe('PackIndexCompiler — deterministic compilation', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('compiles a valid sealed pack into a staged immutable generation with the expected table registry', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const result = accepted(await compiler(fixture).compile(requestFor(fixture, pack, dir)));

        expect(result.reused).toBe(false);
        expect(existsSync(join(dir, 'current.json'))).toBe(true);
        expect(existsSync(join(result.indexDir, 'index-manifest.json'))).toBe(true);
        expect(existsSync(join(result.indexDir, 'pack.sqlite'))).toBe(true);
        expect(result.manifest.packSealId).toBe(pack.sealId);
        expect(result.manifest.semanticRoot).toMatch(/^sha256:[0-9a-f]{64}$/);
        expect(result.manifest.counts.batch).toBe(1);
        expect(result.manifest.counts.repository).toBe(1);
        expect(result.manifest.counts.requirement).toBe(1);

        const store = await openDerivedStorage(result.indexDir).open('pack', PACK_INDEX_SCHEMA, {readOnly: true});
        try {
            expect(await store.getByPrimaryKey('batch', 'B1')).toEqual(jasmine.objectContaining({id: 'B1', primary_repository: 'nirvana'}));
            const dependencyRelation = await store.list('batch_requirement');
            expect(dependencyRelation).toEqual([{batch_id: 'B1', requirement_id: 'REQ-1', relation: 'review'}, {batch_id: 'B1', requirement_id: 'REQ-1', relation: 'work'}]);
            expect((await store.integrityCheck()).ok).toBe(true);
        } finally {
            await store.close();
        }

        const pointer = JSON.parse(readFileSync(join(dir, 'current.json'), 'utf8'));
        expect(pointer).toEqual({
            indexId: result.indexId, packSealId: pack.sealId, databaseSchemaVersion: 1,
            compilerVersion: result.manifest.compilerVersion, manifestDigest: result.manifest.source.manifestDigest
        });
    });

    it('produces an identical semantic root for two independent compiles of identical pack bytes', async function () {
        const fixtureA = buildPackFixture();
        const fixtureB = buildPackFixture();
        const packA = await acceptedPack(fixtureA);
        const packB = await acceptedPack(fixtureB);
        const dirA = join(dir, 'a');
        const dirB = join(dir, 'b');
        const resultA = accepted(await compiler(fixtureA).compile(requestFor(fixtureA, packA, dirA)));
        const resultB = accepted(await compiler(fixtureB).compile(requestFor(fixtureB, packB, dirB)));

        expect(resultA.manifest.semanticRoot).toBe(resultB.manifest.semanticRoot);
        expect(resultA.manifest.counts).toEqual(resultB.manifest.counts);
        expect(resultA.indexId).not.toBe(resultB.indexId);
    });

    it('reuses the current generation on a repeat compile of the same pack state without publishing a new generation', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const request = requestFor(fixture, pack, dir);
        const first = accepted(await compiler(fixture).compile(request));
        const generationsBefore = readdirSync(dir);
        const second = accepted(await compiler(fixture).compile(request));

        expect(second.reused).toBe(true);
        expect(second.indexId).toBe(first.indexId);
        expect(readdirSync(dir)).toEqual(generationsBefore);
    });

    it('self-heals by publishing a fresh generation when the referenced generation is corrupt', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const request = requestFor(fixture, pack, dir);
        const first = accepted(await compiler(fixture).compile(request));
        writeFileSync(join(first.indexDir, 'pack.sqlite'), 'not a sqlite file');

        const second = accepted(await compiler(fixture).compile(request));
        expect(second.reused).toBe(false);
        expect(second.indexId).not.toBe(first.indexId);
        const healedStore = await openDerivedStorage(second.indexDir).open('pack', PACK_INDEX_SCHEMA, {readOnly: true});
        try {
            expect(await healedStore.integrityCheck()).toEqual({ok: true, details: ['ok']});
        } finally {
            await healedStore.close();
        }
    });

    it('does not reuse a generation whose sidecar was tampered even though the SQLite bytes are untouched', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const request = requestFor(fixture, pack, dir);
        const first = accepted(await compiler(fixture).compile(request));
        const sidecarPath = join(first.indexDir, 'index-manifest.json');
        const tamperedManifest = {...JSON.parse(readFileSync(sidecarPath, 'utf8')), laneId: '00000000-0000-0000-0000-000000000000'};
        writeFileSync(sidecarPath, JSON.stringify(tamperedManifest));

        const second = accepted(await compiler(fixture).compile(request));
        expect(second.reused).toBe(false);
        expect(second.indexId).not.toBe(first.indexId);
        expect(second.manifest.laneId).toBe(LANE_ID);
        const pointer = JSON.parse(readFileSync(join(dir, 'current.json'), 'utf8'));
        expect(pointer.indexId).toBe(second.indexId);
    });

    it('does not reuse a generation whose stored rows were tampered even though the sidecar and structural integrity are intact', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const request = requestFor(fixture, pack, dir);
        const first = accepted(await compiler(fixture).compile(request));

        const writable = await openDerivedStorage(first.indexDir).open('pack', PACK_INDEX_SCHEMA, {readOnly: false});
        try {
            await writable.updateByPrimaryKey('batch', 'B1', {title: 'tampered-after-publish'});
        } finally {
            await writable.close();
        }
        const tamperedStore = await openDerivedStorage(first.indexDir).open('pack', PACK_INDEX_SCHEMA, {readOnly: true});
        try {
            expect((await tamperedStore.integrityCheck()).ok).toBe(true);
        } finally {
            await tamperedStore.close();
        }

        const second = accepted(await compiler(fixture).compile(request));
        expect(second.reused).toBe(false);
        expect(second.indexId).not.toBe(first.indexId);
        const healedStore = await openDerivedStorage(second.indexDir).open('pack', PACK_INDEX_SCHEMA, {readOnly: true});
        try {
            const healedBatch = await healedStore.getByPrimaryKey('batch', 'B1');
            expect(healedBatch?.title).not.toBe('tampered-after-publish');
        } finally {
            await healedStore.close();
        }
    });

    it('runs two concurrent compiles of the same pack state to exactly one healthy published generation', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const request = requestFor(fixture, pack, dir);
        const [first, second] = await Promise.all([compiler(fixture).compile(request), compiler(fixture).compile(request)]);
        const okFirst = accepted(first);
        const okSecond = accepted(second);

        expect(okFirst.indexId).toBe(okSecond.indexId);
        const pointer = JSON.parse(readFileSync(join(dir, 'current.json'), 'utf8'));
        expect(pointer.indexId).toBe(okFirst.indexId);
    });
});

describe('PackIndexCompiler — malformed, stale, and corrupt predecessor evidence', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('fails closed when implementation-pack.json is absent from the sealed ledger', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        fixture.files.delete(`${PACK_ROOT}/implementation-pack.json`);
        const result = await compiler(fixture).compile(requestFor(fixture, pack, dir));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('PACK_INDEX_SOURCE_UNREADABLE');
    });

    it('fails closed when the manifest bytes on disk drift from the sealed digest', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const tampered = {...fixture.manifest, packId: 'tampered-after-seal'};
        fixture.files.set(`${PACK_ROOT}/implementation-pack.json`, encoder.encode(JSON.stringify(tampered)));
        const result = await compiler(fixture).compile(requestFor(fixture, pack, dir));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('PACK_INDEX_DIGEST_MISMATCH');
    });

    it('fails closed when the lock file sealId no longer matches the accepted pack', async function () {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const tamperedLock = {...fixture.lock, sealId: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'};
        fixture.files.set(`${PACK_ROOT}/implementation-pack.lock.json`, encoder.encode(JSON.stringify(tamperedLock)));
        const result = await compiler(fixture).compile(requestFor(fixture, pack, dir));
        expect(result.ok).toBe(false);
        if (!result.ok) expect(result.reason).toBe('PACK_INDEX_DIGEST_MISMATCH');
    });
});
