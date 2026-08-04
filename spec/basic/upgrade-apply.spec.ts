import {chmodSync, existsSync, readFileSync, readlinkSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {join} from 'node:path';
import type {InstallManifestV1} from '../../src/contracts/manifests.js';
import {UpgradeApply, UpgradePlanner, UpgradeRecovery} from '../../src/foundation/upgrade/index.js';
import {nodeUpgradeApplyFileSystem, type UpgradeApplyFileSystem} from '../../src/foundation/upgrade/upgradeApplyFileSystem.js';
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

function digest(text: string): string { return createHash('sha256').update(text).digest('hex'); }

function assertLockReleased(laneDir: string): void {
    expect(existsSync(join(laneDir, 'state', 'lane.lock'))).toBeFalse();
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
        expect(linkTarget(fixture.laneDir, 'assetA.sh')).toBe(join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh'));
        expect(linkTarget(fixture.laneDir, 'assetB.sh')).toBe(join(fixture.targetRuntimeRoot, 'coordinator/assetB.sh'));
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

describe('UpgradeApply crash recovery at every staging write point', () => {
    let fixture: UpgradeApplyFixture;
    afterEach(() => cleanupUpgradeApplyFixture(fixture.root));

    it('before any asset staging: recovery restores clean state and old install.json is untouched', async () => {
        fixture = makeUpgradeApplyFixture();
        const result = await run(fixture, withFault('ensureDirectory', 1));
        expect(result.success).toBeFalse();
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        expect(linkTarget(fixture.laneDir, 'assetA.sh')).toBe(join(fixture.currentRuntimeRoot, 'coordinator/assetA.sh'));
        assertLockReleased(fixture.laneDir);
        const recovery = new UpgradeRecovery().recover(fixture.laneDir);
        expect(recovery.oldManifestStatus).toBe('valid');
        expect(recovery.oldRuntimeInvocable).toBeTrue();
    });

    it('after the first asset is renamed, before the second: old runtime store remains checksummed and invocable', async () => {
        fixture = makeUpgradeApplyFixture();
        const result = await run(fixture, withFault('fsyncDirectory', 3));
        expect(result.success).toBeFalse();
        expect(linkTarget(fixture.laneDir, 'assetA.sh')).toBe(join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh'));
        expect(linkTarget(fixture.laneDir, 'assetB.sh')).toBe(join(fixture.currentRuntimeRoot, 'coordinator/assetB.sh'));
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        assertLockReleased(fixture.laneDir);
        const recovery = new UpgradeRecovery().recover(fixture.laneDir);
        expect(recovery.artifactsCleaned.some((path) => path.includes('assetB.sh'))).toBeTrue();
        expect(recovery.oldManifestStatus).toBe('valid');
        expect(recovery.oldRuntimeInvocable).toBeTrue();
    });

    it('after all assets staged but before the manifest write: old manifest remains authoritative', async () => {
        fixture = makeUpgradeApplyFixture();
        const result = await run(fixture, withFault('writeFileExclusive', 1));
        expect(result.success).toBeFalse();
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        expect(linkTarget(fixture.laneDir, 'assetA.sh')).toBe(join(fixture.targetRuntimeRoot, 'coordinator/assetA.sh'));
        expect(linkTarget(fixture.laneDir, 'assetB.sh')).toBe(join(fixture.targetRuntimeRoot, 'coordinator/assetB.sh'));
        assertLockReleased(fixture.laneDir);
        const recovery = new UpgradeRecovery().recover(fixture.laneDir);
        expect(recovery.oldManifestStatus).toBe('valid');
        expect(recovery.oldRuntimeInvocable).toBeTrue();
    });

    it('after the manifest rename but before its final directory fsync: manifest-last commit already honored', async () => {
        fixture = makeUpgradeApplyFixture();
        await expectAsync(run(fixture, withFault('fsyncDirectory', 5))).toBeRejected();
        const install = readInstall(fixture.laneDir);
        expect(install.runtimeVersion).toBe('2.0.0');
        assertLockReleased(fixture.laneDir);
        const recovery = new UpgradeRecovery().recover(fixture.laneDir);
        expect(recovery.oldManifestStatus).toBe('valid');
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
        expect(linkTarget(fixture.laneDir, 'assetA.sh')).toBe(join(fixture.currentRuntimeRoot, 'coordinator/assetA.sh'));
        expect(readInstall(fixture.laneDir).runtimeVersion).toBe('1.0.0');
        assertLockReleased(fixture.laneDir);
    });
});
