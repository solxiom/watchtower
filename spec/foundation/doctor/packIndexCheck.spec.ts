import {mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {dirname} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {createPackIndexCheck} from '../../../src/foundation/doctor/checks/packIndexCheck.js';
import type {PackIndexPointer} from '../../../src/contracts/index.js';
import {
    activateWatchIndex, createWatchLaneFixture, currentPointerPath, type WatchLaneFixture
} from '../support/watchPreflightFixtures.js';

function readRealPointer(laneDir: string): PackIndexPointer {
    return JSON.parse(readFileSync(currentPointerPath(laneDir), 'utf8')) as PackIndexPointer;
}

/** Writes a hand-crafted `current.json` without running real pack-index compilation/activation. */
function writeRawPointer(laneDir: string, content: string): void {
    const path = currentPointerPath(laneDir);
    mkdirSync(dirname(path), {recursive: true});
    writeFileSync(path, content);
}

function writePointer(laneDir: string, pointer: unknown): void {
    writeRawPointer(laneDir, JSON.stringify(pointer));
}

async function runCheck(fixture: WatchLaneFixture) {
    const kernel = new DoctorKernel([createPackIndexCheck()]);
    return kernel.run({cwd: fixture.laneDir});
}

describe('packIndexCheck — pointer-shape adversarial proof (no real index compilation needed)', function () {
    let fixture: WatchLaneFixture;
    beforeEach(function () { fixture = createWatchLaneFixture({runtimeAvailable: false}); });
    afterEach(function () { fixture.remove(); });

    it('skips when no pack index has ever been activated for this lane', async function () {
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('skip');
    });

    it('fails (never partially trusts, and never silently treats existing corruption as absence) on malformed JSON in current.json', async function () {
        writeRawPointer(fixture.laneDir, '{not json');
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('fail');
    });

    it('fails when the pointer is missing packSealId, databaseSchemaVersion, compilerVersion, and manifestDigest', async function () {
        writePointer(fixture.laneDir, {indexId: '11111111-1111-4111-8111-111111111111'});
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('fail');
    });

    it('fails when the pointer indexId is not a UUID (path-traversal attempt rejected before any filesystem open)', async function () {
        writePointer(fixture.laneDir, {
            indexId: '../../../etc', packSealId: 'seal', databaseSchemaVersion: 1,
            compilerVersion: 'v1', manifestDigest: 'digest'
        });
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('fail');
    });

    it('fails when the on-disk generation directory referenced by the pointer does not exist', async function () {
        writePointer(fixture.laneDir, {
            indexId: '11111111-1111-4111-8111-111111111111', packSealId: 'seal', databaseSchemaVersion: 1,
            compilerVersion: 'v1', manifestDigest: 'digest'
        });
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('fail');
    });

    it('fails on an extra/unsupported pointer field rather than silently accepting it (closed schema, LC10-R2)', async function () {
        writePointer(fixture.laneDir, {
            indexId: '11111111-1111-4111-8111-111111111111', packSealId: 'seal', databaseSchemaVersion: 1,
            compilerVersion: 'v1', manifestDigest: 'digest', unsupportedExtra: 'x'
        });
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('fail');
    });

    it('fails on a duplicate top-level JSON member rather than silently applying last-wins (LC10-R2)', async function () {
        writeRawPointer(fixture.laneDir,
            '{"indexId":"11111111-1111-4111-8111-111111111111","indexId":"11111111-1111-4111-8111-111111111111",' +
            '"packSealId":"seal","databaseSchemaVersion":1,"compilerVersion":"v1","manifestDigest":"digest"}');
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('fail');
    });
});

describe('packIndexCheck — real lane, real staged runtime, real activated pack index', function () {
    let fixture: WatchLaneFixture;
    beforeEach(function () { fixture = createWatchLaneFixture(); });
    afterEach(function () { fixture.remove(); });

    it('passes once activated and verifies clean, and never writes to the lane or generation directory', async function () {
        await activateWatchIndex(fixture.laneDir);
        const before = readFileSync(currentPointerPath(fixture.laneDir), 'utf8');
        const report = await runCheck(fixture);
        expect(report.checks[0].status).toBe('pass');
        expect(readFileSync(currentPointerPath(fixture.laneDir), 'utf8')).toBe(before);
    }, 30000);

    it('fails on an unsupported schema/compiler version and on a tampered manifestDigest', async function () {
        await activateWatchIndex(fixture.laneDir);
        const real = readRealPointer(fixture.laneDir);

        writePointer(fixture.laneDir, {...real, databaseSchemaVersion: 999});
        expect((await runCheck(fixture)).checks[0].status).toBe('fail');

        writePointer(fixture.laneDir, {...real, manifestDigest: `${real.manifestDigest}00`});
        expect((await runCheck(fixture)).checks[0].status).toBe('fail');
    }, 30000);
});
