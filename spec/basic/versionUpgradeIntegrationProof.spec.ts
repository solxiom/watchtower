import {unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {MigrationSnapshot, MigrationStepDefinition} from '../../src/contracts/migration.js';
import {MigrationRegistry, stageMigrationPlan, UpgradeApply, UpgradePlanner, VersionReportService} from '../../src/foundation/upgrade/index.js';
import type {UpgradeApplyFileSystem} from '../../src/foundation/upgrade/upgradeApplyFileSystem.js';
import {cleanupUpgradeApplyFixture, makeUpgradeApplyFixture, type UpgradeApplyFixture} from './support/upgradeApplyFixtures.js';

describe('UK-05 correction-04 version/upgrade integration proof', function () {
    let fixture: UpgradeApplyFixture;

    beforeEach(() => { fixture = makeUpgradeApplyFixture(); bindLaneForVersionReport(fixture); });
    afterEach(() => cleanupUpgradeApplyFixture(fixture.root));

    it('reports the two-version lane transition before and after a real atomic upgrade', async function () {
        const service = new VersionReportService({catalog: fixture.runtimeCatalog, packageRoot: process.cwd()});
        const before = service.report({cwd: fixture.root, lane: 'lane-a'});
        expect(before.runtimeVersion).toBe('1.0.0');
        expect(before.availableRuntimes).toEqual(['1.0.0', '2.0.0']);

        const result = await apply(fixture);
        expect(result.success).toBeTrue();

        const after = service.report({cwd: fixture.root, lane: 'lane-a'});
        expect(after.runtimeVersion).toBe('2.0.0');
        expect(after.knowledgeVersion).toBe('1.0.0');
        expect(after.availableRuntimes).toEqual(['1.0.0', '2.0.0']);
    });

    it('proves a managed-file collision refuses the upgrade and preserves the reported version', async function () {
        unlinkSync(join(fixture.laneDir, 'bin', 'assetA.sh'));
        writeFileSync(join(fixture.laneDir, 'bin', 'assetA.sh'), 'operator-owned collision\n');
        let code = '';
        try { await apply(fixture); fail('expected the collision to be rejected'); }
        catch (error) { code = (error as {code?: string}).code ?? ''; }
        expect(code).toBe('ERR_MANAGED_CONFLICT');
        expect(new VersionReportService({catalog: fixture.runtimeCatalog, packageRoot: process.cwd()})
            .report({cwd: fixture.root, lane: 'lane-a'}).runtimeVersion).toBe('1.0.0');
    });

    it('proves failed migration staging leaves the pre-migration version authoritative', function () {
        const input: MigrationSnapshot = {laneLifecycleState: {kind: 'json', value: 'active'}};
        const failing: MigrationStepDefinition = {
            id: 'uk05-failing-migration', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['laneLifecycleState']},
            rebuild: () => ({laneLifecycleState: {kind: 'json', value: 'corrupted'}})
        };
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [failing]});
        let failed = false;
        try { stageMigrationPlan(registry, registry.plan(1, 2), input); }
        catch (error) { failed = (error as {code?: string}).code === 'ERR_INTEGRITY_FAILURE'; }
        expect(failed).toBeTrue();
        expect(new VersionReportService({catalog: fixture.runtimeCatalog, packageRoot: process.cwd()})
            .report({cwd: fixture.root, lane: 'lane-a'}).runtimeVersion).toBe('1.0.0');
    });
});

async function apply(fixture: UpgradeApplyFixture, fileSystem?: UpgradeApplyFileSystem) {
    const plan = new UpgradePlanner().plan(fixture.plannerInput);
    return new UpgradeApply({fileSystem, runtimeCatalog: fixture.runtimeCatalog}).apply({
        laneDir: fixture.laneDir, plan, currentInstall: fixture.currentInstall,
        targetRuntime: fixture.targetRuntime, targetKnowledge: fixture.targetKnowledge,
        targetRuntimeRoot: fixture.targetRuntimeRoot,
        taskRuntimeTargets: {configTargetRelative: 'runtime-nvb/runtime-nvb.json', moduleTargetRelative: 'runtime-nvb/runtime-nvb.js'}
    });
}

function bindLaneForVersionReport(fixture: UpgradeApplyFixture): void {
    writeFileSync(join(fixture.laneDir, 'lane.json'), `${JSON.stringify({
        schemaVersion: 1, laneId: '11111111-1111-4111-8111-111111111111', kind: 'implementation', slug: 'lane-a',
        initiativeId: 'uk-05', controlHomeRepository: 'main', laneDir: '.watchtower/lanes/lane-a',
        implementationPack: {repository: 'main', path: 'pack'},
        repositories: [{id: 'main', role: 'primary', access: 'write'}]
    })}\n`);
}
