import {mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {injectedDiagnosticCheckProviders} from '../../../src/foundation/doctor/injectedCheckProviders.js';
import type {DoctorCheckId, DoctorReport} from '../../../src/contracts/index.js';
import {
    activateWatchIndex, createWatchLaneFixture, type WatchLaneFixture
} from '../support/watchPreflightFixtures.js';

function ignoreWatchtower(controlHome: string): void {
    writeFileSync(join(controlHome, '.gitignore'), '.watchtower/\n');
}

function statusOf(checks: readonly {id: DoctorCheckId; status: string}[], id: DoctorCheckId): string | undefined {
    return checks.find(check => check.id === id)?.status;
}

/** Runs the injected provider kernel with `WATCHTOWER_DATA_HOME` pinned to this fixture's isolated data home. */
async function runWithDataHome(fixture: WatchLaneFixture, cwd: string): Promise<DoctorReport> {
    const originalDataHome = process.env.WATCHTOWER_DATA_HOME;
    process.env.WATCHTOWER_DATA_HOME = fixture.fixture.dataHome;
    try {
        return await new DoctorKernel(injectedDiagnosticCheckProviders).run({cwd});
    } finally {
        if (originalDataHome === undefined) delete process.env.WATCHTOWER_DATA_HOME;
        else process.env.WATCHTOWER_DATA_HOME = originalDataHome;
    }
}

describe('injected diagnostic check providers (LC-10) composed through the unmodified LC-07 kernel', function () {
    it('reports pass for every one of the ten checks against a real staged runtime, activated pack index, and fresh heartbeat', async function () {
        const fixture = createWatchLaneFixture();
        try {
            ignoreWatchtower(fixture.fixture.controlHome);
            await activateWatchIndex(fixture.laneDir);
            mkdirSync(join(fixture.laneDir, 'state'), {recursive: true});
            writeFileSync(join(fixture.laneDir, 'state', 'watcher-heartbeat.txt'), new Date().toISOString());
            const report = await runWithDataHome(fixture, fixture.fixture.controlHome);
            expect(report.checks.length).toBe(10);
            expect(report.checks.every(check => check.status === 'pass')).toBeTrue();
            expect(report.summary.pass).toBe(10);
            expect(report.summary.warn).toBe(0);
            expect(report.summary.fail).toBe(0);
            expect(report.summary.skip).toBe(0);
        } finally { fixture.remove(); }
    }, 30000);

    it('skips runtime-dependent checks without failing, and fails runtime-catalog, when nothing is set up yet', async function () {
        const fixture = createWatchLaneFixture({runtimeAvailable: false});
        try {
            ignoreWatchtower(fixture.fixture.controlHome);
            const report = await runWithDataHome(fixture, fixture.fixture.controlHome);
            expect(statusOf(report.checks, 'runtime-catalog')).toBe('fail');
            expect(statusOf(report.checks, 'account-access')).toBe('skip');
            expect(statusOf(report.checks, 'watcher-heartbeat')).toBe('skip');
            expect(statusOf(report.checks, 'pack-index')).toBe('skip');
        } finally { fixture.remove(); }
    }, 20000);
});
