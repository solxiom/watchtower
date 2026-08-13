import {mkdirSync, readFileSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {injectedDiagnosticCheckProviders} from '../../../src/foundation/doctor/injectedCheckProviders.js';
import type {DoctorCheckId, DoctorReport} from '../../../src/contracts/index.js';
import {digest, workerText} from '../support/runtimeCatalogFixtures.js';
import {
    activateWatchIndex, createWatchLaneFixture, WATCH_RUNTIME_VERSION, type WatchLaneFixture
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

/**
 * Declares and really creates the lane's single managed `bin/` link into the
 * real staged runtime, so the composed report exercises the `managed-links`
 * provider's pass path rather than its no-declared-assets skip.
 */
function linkManagedWorker(fixture: WatchLaneFixture): string {
    const targetPath = join(fixture.runtimeCatalog.getRuntimeRoot(WATCH_RUNTIME_VERSION), 'bin', 'worker');
    const installPath = join(fixture.laneDir, 'install.json');
    const install = JSON.parse(readFileSync(installPath, 'utf8')) as Record<string, unknown>;
    writeFileSync(installPath, `${JSON.stringify({
        ...install, managedAssets: {'bin/worker': {target: targetPath, sha256: digest(workerText())}}
    }, null, 2)}\n`);
    const sourcePath = join(fixture.laneDir, 'bin', 'worker');
    mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
    symlinkSync(targetPath, sourcePath);
    return sourcePath;
}

async function healthyLane(fixture: WatchLaneFixture): Promise<string> {
    ignoreWatchtower(fixture.fixture.controlHome);
    await activateWatchIndex(fixture.laneDir);
    mkdirSync(join(fixture.laneDir, 'state'), {recursive: true});
    writeFileSync(join(fixture.laneDir, 'state', 'watcher-heartbeat.txt'), new Date().toISOString());
    return linkManagedWorker(fixture);
}

describe('injected diagnostic check providers (LC-10) composed through the unmodified LC-07 kernel', function () {
    it('reports pass for the eleven LC-07/LC-10 checks against a real staged runtime, linked managed asset, activated pack index, and fresh heartbeat, and skips the four CA-31 coordinator/session checks this untouched lane has no evidence for', async function () {
        const fixture = createWatchLaneFixture();
        try {
            await healthyLane(fixture);
            const report = await runWithDataHome(fixture, fixture.fixture.controlHome);
            expect(report.checks.length).toBe(15);
            expect(report.checks.every(check => check.status === 'pass' || check.status === 'skip')).toBeTrue();
            expect(statusOf(report.checks, 'managed-links')).toBe('pass');
            expect(report.summary.pass).toBe(11);
            expect(report.summary.warn).toBe(0);
            expect(report.summary.fail).toBe(0);
            expect(report.summary.skip).toBe(4);
        } finally { fixture.remove(); }
    }, 30000);

    /**
     * LC-10 correction 01 (REL-01 Phase 9): removing one managed runtime link
     * from an otherwise healthy lane used to produce a report byte-identical
     * to the healthy one — exit 0, `fail: 0`. The composed report must now
     * name that exact violation.
     */
    it('fails the composed report when a managed runtime link is removed from an otherwise healthy lane', async function () {
        const fixture = createWatchLaneFixture();
        try {
            const sourcePath = await healthyLane(fixture);
            const healthy = await runWithDataHome(fixture, fixture.fixture.controlHome);
            unlinkSync(sourcePath);
            const broken = await runWithDataHome(fixture, fixture.fixture.controlHome);
            expect(healthy.summary.fail).toBe(0);
            expect(broken.summary.fail).toBe(1);
            expect(statusOf(broken.checks, 'managed-links')).toBe('fail');
            expect(broken.checks.find(check => check.id === 'managed-links')?.message).toContain('bin/worker (missing)');
        } finally { fixture.remove(); }
    }, 30000);

    it('skips runtime-dependent checks without failing, and fails runtime-catalog, when nothing is set up yet', async function () {
        const fixture = createWatchLaneFixture({runtimeAvailable: false});
        try {
            ignoreWatchtower(fixture.fixture.controlHome);
            const report = await runWithDataHome(fixture, fixture.fixture.controlHome);
            expect(statusOf(report.checks, 'runtime-catalog')).toBe('fail');
            expect(statusOf(report.checks, 'managed-links')).toBe('skip');
            expect(statusOf(report.checks, 'account-access')).toBe('skip');
            expect(statusOf(report.checks, 'watcher-heartbeat')).toBe('skip');
            expect(statusOf(report.checks, 'pack-index')).toBe('skip');
            expect(statusOf(report.checks, 'coordinator-queue')).toBe('skip');
            expect(statusOf(report.checks, 'coordinator-cursor')).toBe('skip');
            expect(statusOf(report.checks, 'session-index')).toBe('skip');
            expect(statusOf(report.checks, 'session-turns')).toBe('skip');
        } finally { fixture.remove(); }
    }, 20000);
});
