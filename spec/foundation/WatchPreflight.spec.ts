import {mkdirSync, readFileSync, rmSync, truncateSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {PackIndexPointer} from '../../src/contracts/index.js';
import {RuntimeCatalog} from '../../src/foundation/runtime/index.js';
import {WatchPreflight} from '../../src/foundation/task/watch/index.js';
import {
    WATCH_LANE_ID, activateWatchIndex, createWatchLaneFixture, currentPointerPath, type WatchLaneFixture
} from './support/watchPreflightFixtures.js';

function preflightFor(fixture: WatchLaneFixture): WatchPreflight {
    return new WatchPreflight({runtimeCatalog: fixture.runtimeCatalog});
}

async function expectRejected(promise: Promise<unknown>, code: string): Promise<void> {
    try {
        await promise;
        fail(`expected rejection with code ${code}`);
    } catch (error) {
        expect(error).toEqual(jasmine.objectContaining({code}));
    }
}

/** Reads the real, fully valid pointer this fixture's own activation wrote. */
function readRealPointer(laneDir: string): PackIndexPointer {
    return JSON.parse(readFileSync(currentPointerPath(laneDir), 'utf8')) as PackIndexPointer;
}

function writePointer(laneDir: string, pointer: unknown): void {
    writeFileSync(currentPointerPath(laneDir), JSON.stringify(pointer));
}

describe('WatchPreflight — real lane, real staged runtime, real activated pack index', function () {
    let fixture: WatchLaneFixture;
    beforeEach(function () { fixture = createWatchLaneFixture(); });
    afterEach(function () { fixture.remove(); });

    it('resolves the lane, runtime root, and activated index id once every fence passes', async function () {
        await activateWatchIndex(fixture.laneDir);
        const result = await preflightFor(fixture).run({cwd: fixture.laneDir});

        expect(result.lane.laneId).toBe(WATCH_LANE_ID);
        expect(result.lane.laneDir).toBe(fixture.laneDir);
        expect(result.runtimeVersion).toBe('1.0.0');
        expect(result.runtimeRoot.length).toBeGreaterThan(0);
        expect(result.indexId.length).toBeGreaterThan(0);
    });

    it('fails closed with ERR_MISSING_DEPENDENCY when LC-09 activation never ran for this lane', async function () {
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_MISSING_DEPENDENCY');
    });

    it('fails closed with ERR_MISSING_DEPENDENCY when current.json is malformed JSON', async function () {
        await activateWatchIndex(fixture.laneDir);
        writeFileSync(currentPointerPath(fixture.laneDir), '{not json');
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_MISSING_DEPENDENCY');
    });

    it('fails closed with ERR_MISSING_DEPENDENCY when the pointer is missing packSealId, databaseSchemaVersion, compilerVersion, and manifestDigest', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {indexId: real.indexId});
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_MISSING_DEPENDENCY');
    });

    it('fails closed with ERR_MISSING_DEPENDENCY when only manifestDigest is missing from an otherwise complete pointer', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        const {manifestDigest: _omit, ...withoutManifestDigest} = real;
        void _omit;
        writePointer(fixture.laneDir, withoutManifestDigest);
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_MISSING_DEPENDENCY');
    });

    it('fails closed with ERR_MISSING_DEPENDENCY when the pointer indexId is not a UUID (path-traversal attempt rejected)', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {...real, indexId: '../../../etc'});
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_MISSING_DEPENDENCY');
    });

    it('fails closed with ERR_INDEX_UNAVAILABLE when a complete, well-typed pointer names a generation directory that does not exist', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {...real, indexId: '11111111-1111-4111-8111-111111111111'});
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_INDEX_UNAVAILABLE');
    });

    it('fails closed with ERR_INTEGRITY_FAILURE when the activated index database is truncated/corrupt', async function () {
        await activateWatchIndex(fixture.laneDir);
        const pointer = readRealPointer(fixture.laneDir);
        const dbPath = join(fixture.laneDir, 'coordinator', 'index', 'pack', pointer.indexId, 'pack.sqlite');
        truncateSync(dbPath, 4);
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_INTEGRITY_FAILURE');
    });

    it('fails closed with ERR_INTEGRITY_FAILURE when the activated index belongs to a different lane', async function () {
        await activateWatchIndex(fixture.laneDir, '1c2d3e4f-5678-4abc-9def-0123456789ab');
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_INTEGRITY_FAILURE');
    });

    it('fails closed with ERR_INTEGRITY_FAILURE when a UUID-valid pointer carries a tampered packSealId that does not match the opened generation', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {...real, packSealId: `sha256:${'0'.repeat(64)}`});
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_INTEGRITY_FAILURE');
    });

    it('fails closed with ERR_INTEGRITY_FAILURE when a UUID-valid pointer carries a tampered manifestDigest that does not match the opened generation', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {...real, manifestDigest: `sha256:${'f'.repeat(64)}`});
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_INTEGRITY_FAILURE');
    });

    it('fails closed with ERR_UNSUPPORTED_VERSION when the pointer declares an unsupported databaseSchemaVersion', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {...real, databaseSchemaVersion: real.databaseSchemaVersion + 999});
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_UNSUPPORTED_VERSION');
    });

    it('fails closed with ERR_UNSUPPORTED_VERSION when the pointer declares an unsupported/stale compilerVersion', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {...real, compilerVersion: '0.0.1-stale'});
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_UNSUPPORTED_VERSION');
    });

    it('fails closed with ERR_MISSING_DEPENDENCY when the lane-pinned runtime is not installed', async function () {
        await activateWatchIndex(fixture.laneDir);
        const emptyCatalog = new RuntimeCatalog({dataRoot: () => join(fixture.fixture.dataHome, 'no-runtimes-here')});
        await expectRejected(
            new WatchPreflight({runtimeCatalog: emptyCatalog}).run({cwd: fixture.laneDir}),
            'ERR_MISSING_DEPENDENCY'
        );
    });

    it('propagates ERR_LANE_NOT_FOUND from the shared, already-accepted lane discovery when no lane exists', async function () {
        const root = join(fixture.fixture.root, 'no-lane-here');
        mkdirSync(root, {recursive: true});
        await expectRejected(preflightFor(fixture).run({cwd: root}), 'ERR_LANE_NOT_FOUND');
        rmSync(root, {recursive: true, force: true});
    });

    it('never mutates the activated index or any lane byte during a successful preflight', async function () {
        await activateWatchIndex(fixture.laneDir);
        const before = readFileSync(currentPointerPath(fixture.laneDir), 'utf8');
        await preflightFor(fixture).run({cwd: fixture.laneDir});
        const after = readFileSync(currentPointerPath(fixture.laneDir), 'utf8');
        expect(after).toBe(before);
    });

    it('never mutates any lane byte on a rejected (tampered-metadata) preflight either', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);
        writePointer(fixture.laneDir, {...real, packSealId: `sha256:${'0'.repeat(64)}`});
        const before = readFileSync(currentPointerPath(fixture.laneDir), 'utf8');
        await expectRejected(preflightFor(fixture).run({cwd: fixture.laneDir}), 'ERR_INTEGRITY_FAILURE');
        const after = readFileSync(currentPointerPath(fixture.laneDir), 'utf8');
        expect(after).toBe(before);
    });
});
