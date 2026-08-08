import {rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {createRuntimeCatalogCheck} from '../../../src/foundation/doctor/checks/runtimeCatalogCheck.js';
import {RuntimeCatalogError} from '../../../src/contracts/runtimeCatalog.js';
import {RuntimeCatalog} from '../../../src/foundation/runtime/index.js';
import {createLane, createReadCommandFixture, treeSnapshot, type ReadCommandFixture} from '../../basic/readCommandFixtures.js';

function fakeCatalog(behavior: (version: string) => string): RuntimeCatalog {
    return {getRuntimeRoot: behavior} as unknown as RuntimeCatalog;
}

function throwingCatalog(error: unknown): RuntimeCatalog {
    return {getRuntimeRoot: () => { throw error; }} as unknown as RuntimeCatalog;
}

async function runCheck(fixture: ReadCommandFixture, runtimeCatalog: RuntimeCatalog) {
    const kernel = new DoctorKernel([createRuntimeCatalogCheck({runtimeCatalog})]);
    return kernel.run({cwd: fixture.controlHome});
}

describe('runtimeCatalogCheck', function () {
    it('passes when the lane-pinned runtime version resolves to an installed root', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false, runtimeVersion: '1.2.3'});
            const before = treeSnapshot(fixture.root);
            const report = await runCheck(fixture, fakeCatalog((version) => {
                expect(version).toBe('1.2.3');
                return '/installed/1.2.3';
            }));
            expect(report.checks[0].status).toBe('pass');
            expect(report.checks[0].message).toContain('/installed/1.2.3');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails with ERR_MISSING_DEPENDENCY when the pinned version is not installed', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture,
                throwingCatalog(new RuntimeCatalogError('VERSION_NOT_INSTALLED', '1.0.0', 'not installed')));
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[0].reason).toBe('ERR_MISSING_DEPENDENCY');
        } finally { fixture.remove(); }
    });

    it('fails with ERR_INVALID_LANE_CONFIG when the pinned version string is invalid', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture,
                throwingCatalog(new RuntimeCatalogError('INVALID_VERSION_STRING', 'bogus', 'bad version')));
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[0].reason).toBe('ERR_INVALID_LANE_CONFIG');
        } finally { fixture.remove(); }
    });

    it('fails with ERR_INTEGRITY_FAILURE when the installed runtime is staging-corrupt', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            const report = await runCheck(fixture,
                throwingCatalog(new RuntimeCatalogError('STAGING_VALIDATION_FAILED', '1.0.0', 'checksum mismatch')));
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[0].reason).toBe('ERR_INTEGRITY_FAILURE');
        } finally { fixture.remove(); }
    });

    it('fails closed, never partially, when install.json itself is missing', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            rmSync(join(laneDir, 'install.json'));
            const before = treeSnapshot(fixture.root);
            const report = await runCheck(fixture, fakeCatalog(() => { throw new Error('must not be called'); }));
            expect(report.checks[0].status).toBe('fail');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails closed when install.json is malformed JSON, never invoking the runtime catalog', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {packAvailable: false});
            writeFileSync(join(laneDir, 'install.json'), 'not json');
            const report = await runCheck(fixture, fakeCatalog(() => { throw new Error('must not be called'); }));
            expect(report.checks[0].status).toBe('fail');
        } finally { fixture.remove(); }
    });
});
