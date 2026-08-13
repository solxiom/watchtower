/**
 * LC-10 correction 01: `wt doctor` never validated a lane's managed runtime
 * links, so removing one from an initialized lane's `bin/` produced a report
 * byte-identical to the healthy one. These specs pin the exact pass/fail/skip
 * outcome of the `managed-links` provider against a real staged runtime and a
 * real lane `bin/` directory, and prove the provider repairs nothing.
 */
import {chmodSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {DoctorKernel} from '../../../src/foundation/doctor/index.js';
import {createManagedLinksCheck} from '../../../src/foundation/doctor/checks/managedLinksCheck.js';
import {createRuntimeCatalogCheck} from '../../../src/foundation/doctor/checks/runtimeCatalogCheck.js';
import type {DoctorCheck} from '../../../src/contracts/index.js';
import {RuntimeCatalog} from '../../../src/foundation/runtime/index.js';
import {nodeRuntimeFileSystem, type RuntimeFileSystem} from '../../../src/foundation/task/index.js';
import {treeSnapshot} from '../../basic/readCommandFixtures.js';
import {cleanupFixture, digest, makeRuntimeCatalogFixture, runtimeManifest, workerText} from '../support/runtimeCatalogFixtures.js';
import {createWatchLaneFixture, WATCH_RUNTIME_VERSION, type WatchLaneFixture} from '../support/watchPreflightFixtures.js';

const ASSET_PATH = 'bin/worker';

interface LinkedLane {
    readonly fixture: WatchLaneFixture;
    readonly sourcePath: string;
    readonly targetPath: string;
}

/** A real lane whose single declared managed asset is really linked into the real staged runtime. */
function linkedLane(overrides: {readonly sha256?: string} = {}): LinkedLane {
    const fixture = createWatchLaneFixture({packAvailable: false});
    const targetPath = join(fixture.runtimeCatalog.getRuntimeRoot(WATCH_RUNTIME_VERSION), 'bin', 'worker');
    declareManagedAsset(fixture.laneDir, targetPath, overrides.sha256 ?? digest(workerText()));
    const sourcePath = join(fixture.laneDir, 'bin', 'worker');
    mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
    symlinkSync(targetPath, sourcePath);
    return {fixture, sourcePath, targetPath};
}

function declareManagedAsset(laneDir: string, target: string, sha256: string): void {
    const installPath = join(laneDir, 'install.json');
    const install = JSON.parse(readFileSync(installPath, 'utf8')) as Record<string, unknown>;
    writeFileSync(installPath, `${JSON.stringify({...install, managedAssets: {[ASSET_PATH]: {target, sha256}}}, null, 2)}\n`);
}

async function runCheck(fixture: WatchLaneFixture, runtimeCatalog: RuntimeCatalog = fixture.runtimeCatalog): Promise<DoctorCheck> {
    const kernel = new DoctorKernel([createManagedLinksCheck({runtimeCatalog})]);
    const report = await kernel.run({cwd: fixture.fixture.controlHome});
    return report.checks[0];
}

describe('managed-links doctor provider (LC-10 correction 01)', function () {
    it('passes when every declared managed asset is present, correctly targeted, and checksum-verified', async function () {
        const lane = linkedLane();
        try {
            const check = await runCheck(lane.fixture);
            expect(check.id).toBe('managed-links');
            expect(check.status).toBe('pass');
            expect(check.reason).toBeNull();
            expect(check.message).toContain('1 managed runtime links');
        } finally { lane.fixture.remove(); }
    }, 20000);

    it('fails, and repairs nothing, when a managed link is removed from the lane bin/ directory', async function () {
        const lane = linkedLane();
        try {
            unlinkSync(lane.sourcePath);
            const before = treeSnapshot(lane.fixture.fixture.root);
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.reason).toBe('ERR_INTEGRITY_FAILURE');
            expect(check.message).toContain(`${ASSET_PATH} (missing)`);
            expect(treeSnapshot(lane.fixture.fixture.root)).toBe(before);
        } finally { lane.fixture.remove(); }
    }, 20000);

    it('fails when a managed link resolves somewhere other than its pinned runtime target', async function () {
        const lane = linkedLane();
        try {
            const decoy = join(lane.fixture.fixture.root, 'decoy-worker');
            writeFileSync(decoy, workerText(), {mode: 0o755});
            unlinkSync(lane.sourcePath);
            symlinkSync(decoy, lane.sourcePath);
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.message).toContain(`${ASSET_PATH} (wrong-target)`);
        } finally { lane.fixture.remove(); }
    }, 20000);

    it('fails when the install-declared checksum no longer matches the live runtime bytes', async function () {
        const lane = linkedLane({sha256: digest('tampered runtime bytes')});
        try {
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.message).toContain(`${ASSET_PATH} (checksum-mismatch)`);
        } finally { lane.fixture.remove(); }
    }, 20000);

    it('fails when the declared target resolves outside the pinned immutable runtime root', async function () {
        const lane = linkedLane();
        try {
            const outside = join(lane.fixture.fixture.root, 'outside-worker');
            writeFileSync(outside, workerText(), {mode: 0o755});
            declareManagedAsset(lane.fixture.laneDir, outside, digest(workerText()));
            unlinkSync(lane.sourcePath);
            symlinkSync(outside, lane.sourcePath);
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.message).toContain(`${ASSET_PATH} (outside-runtime)`);
        } finally { lane.fixture.remove(); }
    }, 20000);

    it('fails when the declared target is inside the runtime root but is not a packaged runtime-manifest asset', async function () {
        const lane = linkedLane();
        try {
            const unmanaged = join(lane.fixture.runtimeCatalog.getRuntimeRoot(WATCH_RUNTIME_VERSION), 'manifest.json');
            declareManagedAsset(lane.fixture.laneDir, unmanaged, digest(readFileSync(unmanaged, 'utf8')));
            unlinkSync(lane.sourcePath);
            symlinkSync(unmanaged, lane.sourcePath);
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.message).toContain(`${ASSET_PATH} (unmanaged-target)`);
        } finally { lane.fixture.remove(); }
    }, 20000);

    it('fails when a managed link has been replaced by a regular file', async function () {
        const lane = linkedLane();
        try {
            unlinkSync(lane.sourcePath);
            writeFileSync(lane.sourcePath, workerText(), {mode: 0o755});
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.message).toContain(`${ASSET_PATH} (not-a-link)`);
        } finally { lane.fixture.remove(); }
    }, 20000);

    /**
     * `wt init` links packaged data/module assets (`bin/runtime-nvb.json`,
     * `bin/runtime-nvb.js`) that the runtime manifest declares `0644`.
     * `docs/spec/v1.md` §7.5 demands manifest representation, runtime-root
     * containment, and checksum agreement — not an executable bit — so a
     * correctly linked `0644` asset must pass.
     */
    it('passes a correctly linked non-executable (0644) packaged asset, as real `wt init` produces', async function () {
        const fixture = createWatchLaneFixture({packAvailable: false, runtimeAvailable: false});
        const source = makeRuntimeCatalogFixture();
        try {
            const catalog = new RuntimeCatalog({dataRoot: () => fixture.fixture.dataHome});
            chmodSync(join(source.source, 'bin', 'worker'), 0o644);
            catalog.stageRuntime(WATCH_RUNTIME_VERSION, runtimeManifest(WATCH_RUNTIME_VERSION, {
                assets: [{path: 'bin/worker', sha256: digest(workerText()), mode: '0644'}]
            }), source.source);
            const targetPath = join(catalog.getRuntimeRoot(WATCH_RUNTIME_VERSION), 'bin', 'worker');
            declareManagedAsset(fixture.laneDir, targetPath, digest(workerText()));
            mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
            symlinkSync(targetPath, join(fixture.laneDir, 'bin', 'worker'));
            const check = await runCheck(fixture, catalog);
            expect(check.status).toBe('pass');
        } finally { cleanupFixture(source.root); fixture.remove(); }
    }, 20000);

    it('fails closed when install.json is missing, malformed, or not a complete linked manifest', async function () {
        for (const mutate of [
            (laneDir: string) => rmSync(join(laneDir, 'install.json')),
            (laneDir: string) => writeFileSync(join(laneDir, 'install.json'), 'not json'),
            (laneDir: string) => writeFileSync(join(laneDir, 'install.json'), '{"schemaVersion":1,"mode":"linked"}')
        ]) {
            const lane = linkedLane();
            try {
                mutate(lane.fixture.laneDir);
                const check = await runCheck(lane.fixture);
                expect(check.status).toBe('fail');
                expect(check.reason).toBe('ERR_INVALID_LANE_CONFIG');
            } finally { lane.fixture.remove(); }
        }
    }, 40000);

    /**
     * Correction 03, finding 1: a symlinked lane `bin/` (or any symlinked
     * ancestor) previously let a link living entirely outside the lane report
     * `pass`. The source's existing parents must canonicalize inside the lane.
     */
    it('fails, without repairing, when the lane bin/ directory is a symlink escaping the lane', async function () {
        const lane = linkedLane();
        try {
            const external = join(lane.fixture.fixture.root, 'external-bin');
            mkdirSync(external, {recursive: true});
            symlinkSync(lane.targetPath, join(external, 'worker'));
            rmSync(join(lane.fixture.laneDir, 'bin'), {recursive: true, force: true});
            symlinkSync(external, join(lane.fixture.laneDir, 'bin'));
            const before = treeSnapshot(lane.fixture.fixture.root);
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.reason).toBe('ERR_INTEGRITY_FAILURE');
            expect(check.message).toContain(`${ASSET_PATH} (outside-lane)`);
            expect(treeSnapshot(lane.fixture.fixture.root)).toBe(before);
        } finally { lane.fixture.remove(); }
    }, 20000);

    /**
     * Correction 03, finding 2: the kernel runs providers concurrently, so a
     * sibling `runtime-catalog` failure fences nothing. Duplicate members must
     * be refused at this provider's own boundary, top-level and nested.
     */
    it('fails closed on a duplicated install.json member, top-level or nested', async function () {
        for (const duplicate of [
            (text: string) => text.replace('"schemaVersion": 1,', '"schemaVersion": 1,\n  "schemaVersion": 1,'),
            (text: string) => text.replace('"target":', '"target": "/decoy",\n      "target":')
        ]) {
            const lane = linkedLane();
            try {
                const installPath = join(lane.fixture.laneDir, 'install.json');
                writeFileSync(installPath, duplicate(readFileSync(installPath, 'utf8')));
                const check = await runCheck(lane.fixture);
                expect(check.status).toBe('fail');
                expect(check.reason).toBe('ERR_INVALID_LANE_CONFIG');
            } finally { lane.fixture.remove(); }
        }
    }, 40000);

    it('skips when the lane declares no managed assets at all', async function () {
        const fixture = createWatchLaneFixture({packAvailable: false});
        try {
            const check = await runCheck(fixture);
            expect(check.status).toBe('skip');
            expect(check.message).toContain('no managed runtime links');
        } finally { fixture.remove(); }
    }, 20000);

    it('reports unreadable, never a thrown check, when the lane bin/ directory denies traversal', async function () {
        const lane = linkedLane();
        const binDir = join(lane.fixture.laneDir, 'bin');
        try {
            chmodSync(binDir, 0o000);
            const check = await runCheck(lane.fixture);
            expect(check.status).toBe('fail');
            expect(check.message).toContain(`${ASSET_PATH} (unreadable)`);
        } finally { chmodSync(binDir, 0o755); lane.fixture.remove(); }
    }, 20000);

    it('fails when the declared target resolves, through a symlink, out of the runtime root', async function () {
        const lane = linkedLane();
        try {
            const escaped = join(lane.fixture.fixture.root, 'escaped-worker');
            writeFileSync(escaped, workerText(), {mode: 0o755});
            const runtimeFiles: RuntimeFileSystem = {
                ...nodeRuntimeFileSystem,
                observe: (path: string) => path === lane.targetPath
                    ? {kind: 'file', canonicalPath: escaped, executable: true, mode: 0o755, owner: null}
                    : nodeRuntimeFileSystem.observe(path)
            };
            const kernel = new DoctorKernel([createManagedLinksCheck({
                runtimeCatalog: lane.fixture.runtimeCatalog, runtimeFiles
            })]);
            const report = await kernel.run({cwd: lane.fixture.fixture.controlHome});
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[0].message).toContain(`${ASSET_PATH} (outside-runtime)`);
        } finally { lane.fixture.remove(); }
    }, 20000);

    /**
     * Executable-mode integrity of packaged bytes is `runtime-catalog`'s, not
     * this check's (`docs/spec/v1.md` §11.7). Chmodding a staged asset away
     * from its manifest mode must therefore fail there and skip here — the
     * split this correction records, proved rather than asserted in prose.
     */
    it('leaves staged executable-mode drift to runtime-catalog, which fails while this check skips', async function () {
        const lane = linkedLane();
        try {
            chmodSync(lane.targetPath, 0o444);
            const kernel = new DoctorKernel([
                createRuntimeCatalogCheck({runtimeCatalog: lane.fixture.runtimeCatalog}),
                createManagedLinksCheck({runtimeCatalog: lane.fixture.runtimeCatalog})
            ]);
            const report = await kernel.run({cwd: lane.fixture.fixture.controlHome});
            expect(report.checks[0].id).toBe('runtime-catalog');
            expect(report.checks[0].status).toBe('fail');
            expect(report.checks[1].status).toBe('skip');
        } finally { chmodSync(lane.targetPath, 0o555); lane.fixture.remove(); }
    }, 20000);

    it('skips, leaving the failure to runtime-catalog, when the pinned runtime is not installed', async function () {
        const fixture = createWatchLaneFixture({packAvailable: false, runtimeAvailable: false});
        try {
            declareManagedAsset(fixture.laneDir, join(fixture.fixture.dataHome, 'runtimes', WATCH_RUNTIME_VERSION,
                'bin', 'worker'), digest(workerText()));
            const check = await runCheck(fixture, new RuntimeCatalog({dataRoot: () => fixture.fixture.dataHome}));
            expect(check.status).toBe('skip');
            expect(check.message).toContain('runtime-catalog');
        } finally { fixture.remove(); }
    }, 20000);
});
