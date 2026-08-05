import {chmodSync, existsSync, readFileSync, readlinkSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import type {InstallManifestV1} from '../../src/contracts/manifests.js';
import {UpgradeApply, UpgradePlanner, UpgradeRecovery} from '../../src/foundation/upgrade/index.js';
import {STAGING_SUFFIX, nodeUpgradeApplyFileSystem, type UpgradeApplyFileSystem} from '../../src/foundation/upgrade/upgradeApplyFileSystem.js';
import {cleanupUpgradeApplyFixture, makeUpgradeApplyFixture, type UpgradeApplyFixture} from './support/upgradeApplyFixtures.js';

function withFault(method: keyof UpgradeApplyFileSystem, failAtCall: number): UpgradeApplyFileSystem {
    let count = 0;
    const real = nodeUpgradeApplyFileSystem[method] as (...args: unknown[]) => unknown;
    return {
        ...nodeUpgradeApplyFileSystem,
        [method]: (...args: unknown[]) => {
            count += 1;
            if (count === failAtCall) throw new Error(`injected crash: ${String(method)} call ${count}`);
            return real(...args);
        }
    };
}

function readInstall(laneDir: string): InstallManifestV1 {
    return JSON.parse(readFileSync(join(laneDir, 'install.json'), 'utf8')) as InstallManifestV1;
}

function linkTarget(laneDir: string, name: string): string {
    return readlinkSync(join(laneDir, 'bin', name));
}

/** Real, direct relink — bypasses UpgradeApply entirely, simulating exactly what a real process kill would leave live on disk. */
function relinkForReal(laneDir: string, name: string, target: string): void {
    const path = join(laneDir, 'bin', name);
    unlinkSync(path);
    symlinkSync(target, path);
}

function leaveOrphanTemp(laneDir: string, name: string, target: string): void {
    symlinkSync(target, join(laneDir, 'bin', `.${name}${STAGING_SUFFIX}`));
}

function digest(text: string): string { return createHash('sha256').update(text).digest('hex'); }

function assertLockReleased(laneDir: string): void {
    expect(existsSync(join(laneDir, 'state', 'lane.lock'))).toBeFalse();
}

function assertLinksMatch(fixture: UpgradeApplyFixture, root: string): void {
    expect(linkTarget(fixture.laneDir, 'assetA.sh')).toBe(join(root, 'coordinator/assetA.sh'));
    expect(linkTarget(fixture.laneDir, 'assetB.sh')).toBe(join(root, 'coordinator/assetB.sh'));
}

async function run(fixture: UpgradeApplyFixture, fileSystem?: UpgradeApplyFileSystem) {
    const plan = new UpgradePlanner().plan(fixture.plannerInput);
    const applier = new UpgradeApply({fileSystem, runtimeCatalog: fixture.runtimeCatalog});
    return applier.apply({
        laneDir: fixture.laneDir, plan, currentInstall: fixture.currentInstall,
        targetRuntime: fixture.targetRuntime, targetKnowledge: fixture.targetKnowledge,
        targetRuntimeRoot: fixture.targetRuntimeRoot,
        taskRuntimeTargets: {configTargetRelative: 'runtime-nvb/runtime-nvb.json', moduleTargetRelative: 'runtime-nvb/runtime-nvb.js'}
    });
}

describe('UpgradeApply end-to-end', () => {
    let fixture: UpgradeApplyFixture;
    afterEach(() => cleanupUpgradeApplyFixture(fixture.root));

    it('atomically switches both managed links and writes install.json last on success', async () => {
        fixture = makeUpgradeApplyFixture();
        const result = await run(fixture);
        expect(result.success).toBeTrue();
        expect(result.applied).toBeTrue();
        expect(result.stagedCount).toBe(2);
        assertLinksMatch(fixture, fixture.targetRuntimeRoot);
        const install = readInstall(fixture.laneDir);
        expect(install.runtimeVersion).toBe('2.0.0');
        expect(install.taskRuntime.configTarget).toBe(join(fixture.targetRuntimeRoot, 'runtime-nvb/runtime-nvb.json'));
        assertLockReleased(fixture.laneDir);
    });

    it('leaves the old runtime version root untouched and checksummed after a successful apply', async () => {
        fixture = makeUpgradeApplyFixture();
        await run(fixture);
        const oldBytes = readFileSync(join(fixture.currentRuntimeRoot, 'coordinator/assetA.sh'), 'utf8');
        expect(digest(oldBytes)).toBe(fixture.currentInstall.managedAssets['bin/assetA.sh'].sha256.replace('sha256:', ''));
    });
});

describe('UpgradeApply same-call rollback at every pre-commit staging write point', () => {
    let fixture: UpgradeApplyFixture;
    afterEach(() => cleanupUpgradeApplyFixture(fixture.root));

    it('before any asset staging: no link ever moves, old install.json untouched', async () => {
        fixture = makeUpgradeApplyFixture();
        const result = await run(fixture, withFault('ensureDirectory', 1));
        expect(result.success).toBeFalse();
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        assertLinksMatch(fixture, fixture.currentRuntimeRoot);
        assertLockReleased(fixture.laneDir);
    });

    it('after the first asset is renamed, before the second: apply() itself restores asset A before returning', async () => {
        fixture = makeUpgradeApplyFixture();
        const result = await run(fixture, withFault('fsyncDirectory', 3));
        expect(result.success).toBeFalse();
        expect(result.restoredLinks).toEqual(['bin/assetA.sh']);
        assertLinksMatch(fixture, fixture.currentRuntimeRoot);
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        assertLockReleased(fixture.laneDir);
    });

    it('after all assets staged but before the manifest write: apply() restores every switched link before returning', async () => {
        fixture = makeUpgradeApplyFixture();
        const result = await run(fixture, withFault('writeFileExclusive', 1));
        expect(result.success).toBeFalse();
        expect([...result.restoredLinks].sort()).toEqual(['bin/assetA.sh', 'bin/assetB.sh']);
        assertLinksMatch(fixture, fixture.currentRuntimeRoot);
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        assertLockReleased(fixture.laneDir);
    });

    it('after the manifest rename but before its final directory fsync: manifest-last commit already honored, links already match the new manifest', async () => {
        fixture = makeUpgradeApplyFixture();
        await expectAsync(run(fixture, withFault('fsyncDirectory', 5))).toBeRejected();
        const install = readInstall(fixture.laneDir);
        expect(install.runtimeVersion).toBe('2.0.0');
        assertLinksMatch(fixture, fixture.targetRuntimeRoot);
        assertLockReleased(fixture.laneDir);
    });

    it('checksum mismatch during staging stops before any link rename', async () => {
        fixture = makeUpgradeApplyFixture();
        const badAssetA = join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh');
        chmodSync(fixture.targetRuntimeRoot, 0o755);
        chmodSync(join(fixture.targetRuntimeRoot, 'coordinator'), 0o755);
        chmodSync(badAssetA, 0o644);
        writeFileSync(badAssetA, '#!/bin/sh\necho tampered\n');
        const result = await run(fixture);
        expect(result.success).toBeFalse();
        expect(result.failure?.reason).toBe('CHECKSUM_MISMATCH');
        expect(result.restoredLinks).toEqual([]);
        assertLinksMatch(fixture, fixture.currentRuntimeRoot);
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        assertLockReleased(fixture.laneDir);
    });
});

describe('UpgradeRecovery repairs a genuine abandoned crash — no UpgradeApply cooperation', () => {
    let fixture: UpgradeApplyFixture;
    afterEach(() => cleanupUpgradeApplyFixture(fixture.root));

    it('before any asset staging: recover() is a clean no-op', () => {
        fixture = makeUpgradeApplyFixture();
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect(result.linksRestored).toEqual([]);
        assertLinksMatch(fixture, fixture.currentRuntimeRoot);
        expect(result.oldManifestStatus).toBe('valid');
        expect(result.oldRuntimeInvocable).toBeTrue();
    });

    it('mid-staging: one link already live-switched for real, the other only has an orphan temp — recover() restores both to v1', () => {
        fixture = makeUpgradeApplyFixture();
        relinkForReal(fixture.laneDir, 'assetA.sh', join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh'));
        leaveOrphanTemp(fixture.laneDir, 'assetB.sh', join(fixture.targetRuntimeRoot, 'coordinator/assetB.sh'));
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect(result.linksRestored).toEqual(['bin/assetA.sh']);
        expect(result.artifactsCleaned.some((path) => path.includes('assetB.sh'))).toBeTrue();
        assertLinksMatch(fixture, fixture.currentRuntimeRoot);
        expect(result.oldManifestStatus).toBe('valid');
        expect(result.oldRuntimeInvocable).toBeTrue();
    });

    it('every asset already live-switched, manifest never written: recover() restores every link to v1', () => {
        fixture = makeUpgradeApplyFixture();
        relinkForReal(fixture.laneDir, 'assetA.sh', join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh'));
        relinkForReal(fixture.laneDir, 'assetB.sh', join(fixture.targetRuntimeRoot, 'coordinator/assetB.sh'));
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect([...result.linksRestored].sort()).toEqual(['bin/assetA.sh', 'bin/assetB.sh']);
        assertLinksMatch(fixture, fixture.currentRuntimeRoot);
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        expect(result.oldManifestStatus).toBe('valid');
        expect(result.oldRuntimeInvocable).toBeTrue();
    });

    it('manifest already committed to v2 for real: recover() leaves the already-consistent v2 links alone', () => {
        fixture = makeUpgradeApplyFixture();
        relinkForReal(fixture.laneDir, 'assetA.sh', join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh'));
        relinkForReal(fixture.laneDir, 'assetB.sh', join(fixture.targetRuntimeRoot, 'coordinator/assetB.sh'));
        const next: InstallManifestV1 = {
            ...fixture.currentInstall, runtimeVersion: '2.0.0',
            managedAssets: {
                'bin/assetA.sh': {target: join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh'), sha256: digestAsset(fixture.targetRuntimeRoot, 'assetA.sh')},
                'bin/assetB.sh': {target: join(fixture.targetRuntimeRoot, 'coordinator/assetB.sh'), sha256: digestAsset(fixture.targetRuntimeRoot, 'assetB.sh')}
            }
        };
        writeFileSync(join(fixture.laneDir, 'install.json'), `${JSON.stringify(next, null, 2)}\n`);
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect(result.linksRestored).toEqual([]);
        assertLinksMatch(fixture, fixture.targetRuntimeRoot);
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('2.0.0');
        expect(result.oldManifestStatus).toBe('valid');
        expect(result.oldRuntimeInvocable).toBeTrue();
    });
});

function digestAsset(runtimeRoot: string, name: string): `sha256:${string}` {
    return `sha256:${digest(readFileSync(join(runtimeRoot, 'coordinator', name), 'utf8'))}`;
}
