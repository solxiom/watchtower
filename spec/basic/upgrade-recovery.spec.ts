import {chmodSync, existsSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {RuntimeManifestV1} from '../../src/contracts/runtimeKnowledgeManifests.js';
import {UpgradeRecovery} from '../../src/foundation/upgrade/index.js';
import {INSTALL_STAGING_SUFFIX, STAGING_SUFFIX} from '../../src/foundation/upgrade/upgradeApplyFileSystem.js';
import {cleanupUpgradeApplyFixture, makeUpgradeApplyFixture, type UpgradeApplyFixture} from './support/upgradeApplyFixtures.js';

describe('UpgradeRecovery.recover', () => {
    let fixture: UpgradeApplyFixture;
    afterEach(() => cleanupUpgradeApplyFixture(fixture.root));

    it('cleans leftover bin/ and install.json staging artifacts and reports the untouched old install as valid', () => {
        fixture = makeUpgradeApplyFixture();
        const binTemp = join(fixture.laneDir, 'bin', `.assetA.sh${STAGING_SUFFIX}`);
        const installTemp = join(fixture.laneDir, `.install.json${INSTALL_STAGING_SUFFIX}`);
        writeFileSync(binTemp, 'leftover');
        writeFileSync(installTemp, 'leftover');
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect(result.recovered).toBeTrue();
        expect(existsSync(binTemp)).toBeFalse();
        expect(existsSync(installTemp)).toBeFalse();
        expect(result.artifactsCleaned.length).toBe(2);
        expect(result.linksRestored).toEqual([]);
        expect(result.oldManifestStatus).toBe('valid');
        expect(result.oldRuntimeInvocable).toBeTrue();
    });

    it('reports missing when install.json does not exist', () => {
        fixture = makeUpgradeApplyFixture();
        unlinkSync(join(fixture.laneDir, 'install.json'));
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect(result.oldManifestStatus).toBe('missing');
        expect(result.oldRuntimeInvocable).toBeFalse();
        expect(result.linksRestored).toEqual([]);
    });

    it('reports invalid when install.json is not well-formed JSON', () => {
        fixture = makeUpgradeApplyFixture();
        writeFileSync(join(fixture.laneDir, 'install.json'), '{not json');
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect(result.oldManifestStatus).toBe('invalid');
        expect(result.oldRuntimeInvocable).toBeFalse();
        expect(result.linksRestored).toEqual([]);
    });

    it('reports the old runtime not invocable when a declared managed-asset target no longer matches its checksum, and does not repair toward a broken target', () => {
        fixture = makeUpgradeApplyFixture();
        chmodSync(fixture.currentRuntimeRoot, 0o755);
        chmodSync(join(fixture.currentRuntimeRoot, 'coordinator'), 0o755);
        chmodSync(join(fixture.currentRuntimeRoot, 'coordinator/assetA.sh'), 0o644);
        writeFileSync(join(fixture.currentRuntimeRoot, 'coordinator/assetA.sh'), 'tampered');
        const result = new UpgradeRecovery().recover(fixture.laneDir);
        expect(result.oldManifestStatus).toBe('valid');
        expect(result.oldRuntimeInvocable).toBeFalse();
        expect(result.linksRestored).toEqual([]);
    });
});

describe('UpgradeRecovery.guardDowngrade', () => {
    let fixture: UpgradeApplyFixture;
    afterEach(() => cleanupUpgradeApplyFixture(fixture.root));

    it('allows a same-or-newer target without requiring --allow-downgrade', () => {
        fixture = makeUpgradeApplyFixture();
        const guard = new UpgradeRecovery().guardDowngrade({
            currentRuntimeVersion: '1.0.0', allowDowngrade: false, laneSchemaVersion: 1, targetRuntime: fixture.targetRuntime
        });
        expect(guard.allowed).toBeTrue();
    });

    it('refuses a downgrade without --allow-downgrade', () => {
        fixture = makeUpgradeApplyFixture();
        const guard = new UpgradeRecovery().guardDowngrade({
            currentRuntimeVersion: '2.0.0', allowDowngrade: false, laneSchemaVersion: 1,
            targetRuntime: {...fixture.targetRuntime, runtimeVersion: '1.0.0'}
        });
        expect(guard.allowed).toBeFalse();
        expect(guard.reason).toBe('DOWNGRADE_NOT_ALLOWED');
    });

    it('refuses an incompatible downgrade even with --allow-downgrade', () => {
        fixture = makeUpgradeApplyFixture();
        const guard = new UpgradeRecovery().guardDowngrade({
            currentRuntimeVersion: '2.0.0', allowDowngrade: true, laneSchemaVersion: 1,
            targetRuntime: {...fixture.targetRuntime, runtimeVersion: '1.0.0', compatibleLaneSchemaVersions: []} as unknown as RuntimeManifestV1
        });
        expect(guard.allowed).toBeFalse();
        expect(guard.reason).toBe('DOWNGRADE_SCHEMA_INCOMPATIBLE');
        expect(guard.incompatibleField).toBe('compatibleLaneSchemaVersions');
    });

    it('allows a compatible downgrade with --allow-downgrade', () => {
        fixture = makeUpgradeApplyFixture();
        const guard = new UpgradeRecovery().guardDowngrade({
            currentRuntimeVersion: '2.0.0', allowDowngrade: true, laneSchemaVersion: 1,
            targetRuntime: {...fixture.targetRuntime, runtimeVersion: '1.0.0'}
        });
        expect(guard.allowed).toBeTrue();
        expect(guard.reason).toBeNull();
    });
});
