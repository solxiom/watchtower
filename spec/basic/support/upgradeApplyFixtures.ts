import {chmodSync, lstatSync, mkdirSync, readdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {InstallManifestV1} from '../../../src/contracts/manifests.js';
import type {KnowledgeManifestV1, ManifestAsset, RuntimeManifestV1} from '../../../src/contracts/runtimeKnowledgeManifests.js';
import type {UpgradePlannerInput} from '../../../src/contracts/upgrade.js';
import {RuntimeCatalog} from '../../../src/foundation/runtime/catalog/index.js';
import {catalogDocument, CATALOG_ID, CLI_VERSION, digest, PROFILE_ID} from '../../foundation/support/managedAssetsFixtures.js';

const ASSET_A = 'coordinator/assetA.sh';
const ASSET_B = 'coordinator/assetB.sh';

export interface UpgradeApplyFixture {
    readonly root: string;
    readonly laneDir: string;
    readonly runtimeCatalog: RuntimeCatalog;
    readonly currentRuntimeRoot: string;
    readonly targetRuntimeRoot: string;
    readonly currentInstall: InstallManifestV1;
    readonly targetRuntime: RuntimeManifestV1;
    readonly targetKnowledge: KnowledgeManifestV1;
    readonly plannerInput: UpgradePlannerInput;
}

function mkRoot(): string {
    const root = join(tmpdir(), `watchtower-upgrade-apply-${process.pid}-${Date.now()}-${Math.random()}`);
    mkdirSync(root, {recursive: true});
    return root;
}

function stageVersion(runtimeCatalog: RuntimeCatalog, root: string, version: string, contentSeed: string): {
    readonly runtimeRoot: string; readonly runtime: RuntimeManifestV1; readonly assetAText: string; readonly assetBText: string;
} {
    const source = join(root, `source-${version}`);
    mkdirSync(join(source, 'runtime-nvb'), {recursive: true});
    mkdirSync(join(source, 'coordinator'), {recursive: true});
    const document = catalogDocument();
    const configText = JSON.stringify({tasks: {}});
    const moduleText = `// runtime-nvb module ${version}\n`;
    const assetAText = `#!/bin/sh\necho ${contentSeed}-a\n`;
    const assetBText = `#!/bin/sh\necho ${contentSeed}-b\n`;
    writeFileSync(join(source, 'runtime-nvb', 'runtime-nvb.json'), configText);
    writeFileSync(join(source, 'runtime-nvb', 'runtime-nvb.js'), moduleText);
    writeFileSync(join(source, 'runtime-nvb', 'task-catalog.json'), JSON.stringify(document));
    writeFileSync(join(source, 'coordinator', 'assetA.sh'), assetAText, {mode: 0o755});
    writeFileSync(join(source, 'coordinator', 'assetB.sh'), assetBText, {mode: 0o755});
    const assets: ManifestAsset[] = ([
        {path: ASSET_A, sha256: digest(assetAText), mode: '0755'},
        {path: ASSET_B, sha256: digest(assetBText), mode: '0755'},
        {path: 'runtime-nvb/runtime-nvb.js', sha256: digest(moduleText), mode: '0644'},
        {path: 'runtime-nvb/runtime-nvb.json', sha256: digest(configText), mode: '0644'},
        {path: 'runtime-nvb/task-catalog.json', sha256: digest(JSON.stringify(document)), mode: '0644'}
    ] satisfies ManifestAsset[]).sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
    const runtime: RuntimeManifestV1 = {
        schemaVersion: 1, manifestId: 'watchtower-runtime/v1', runtimeVersion: version, minimumCliVersion: '0.1.0',
        compatibleLaneSchemaVersions: [1], compatibleKnowledgeVersions: ['1.0.0'], assets, actions: [], requiredCommands: []
    };
    runtimeCatalog.stageRuntime(version, runtime, source);
    return {runtimeRoot: runtimeCatalog.getRuntimeRoot(version), runtime, assetAText, assetBText};
}

/** A real two-managed-asset, two-runtime-version fixture on a real filesystem, for genuine atomic-rename/fsync proof. */
export function makeUpgradeApplyFixture(): UpgradeApplyFixture {
    const root = mkRoot();
    const laneDir = join(root, 'lane');
    mkdirSync(join(laneDir, 'bin'), {recursive: true});
    mkdirSync(join(laneDir, 'state'), {recursive: true});
    const runtimeCatalog = new RuntimeCatalog({dataRoot: () => join(root, 'data')});
    const current = stageVersion(runtimeCatalog, root, '1.0.0', 'v1');
    const target = stageVersion(runtimeCatalog, root, '2.0.0', 'v2');

    symlinkSync(join(current.runtimeRoot, ASSET_A), join(laneDir, 'bin', 'assetA.sh'));
    symlinkSync(join(current.runtimeRoot, ASSET_B), join(laneDir, 'bin', 'assetB.sh'));

    const currentInstall: InstallManifestV1 = {
        schemaVersion: 1, cliVersion: CLI_VERSION, runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked',
        taskRuntime: {
            catalogId: CATALOG_ID, catalogSha256: current.runtime.assets.find((a) => a.path === 'runtime-nvb/task-catalog.json')!.sha256,
            profile: PROFILE_ID, configTarget: join(current.runtimeRoot, 'runtime-nvb', 'runtime-nvb.json'),
            moduleTarget: join(current.runtimeRoot, 'runtime-nvb', 'runtime-nvb.js')
        },
        managedAssets: {
            'bin/assetA.sh': {target: join(current.runtimeRoot, ASSET_A), sha256: digest(current.assetAText)},
            'bin/assetB.sh': {target: join(current.runtimeRoot, ASSET_B), sha256: digest(current.assetBText)}
        }
    };
    const targetKnowledge: KnowledgeManifestV1 = {
        schemaVersion: 1, manifestId: 'watchtower-knowledge/v1', knowledgeVersion: '1.0.0', compatibleRuntimeVersions: ['1.0.0', '2.0.0'],
        provenance: {repository: 'pack', commit: '1'.repeat(40), importRecordSha256: digest('knowledge')}, assets: []
    };
    writeFileSync(join(laneDir, 'install.json'), `${JSON.stringify(currentInstall, null, 2)}\n`);
    const plannerInput: UpgradePlannerInput = {
        laneDir, laneSchemaVersion: 1, currentInstall, targetRuntime: target.runtime, targetKnowledge,
        currentRuntimeRoot: current.runtimeRoot, targetRuntimeRoot: target.runtimeRoot
    };
    return {
        root, laneDir, runtimeCatalog, currentRuntimeRoot: current.runtimeRoot, targetRuntimeRoot: target.runtimeRoot,
        currentInstall, targetRuntime: target.runtime, targetKnowledge, plannerInput
    };
}

export function cleanupUpgradeApplyFixture(root: string): void {
    makeWritable(root);
    rmSync(root, {recursive: true, force: true});
}

function makeWritable(path: string): void {
    let stat;
    try { stat = lstatSync(path); } catch { return; }
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
        try { chmodSync(path, 0o755); } catch { /* best-effort teardown */ }
        for (const entry of readdirSync(path, {withFileTypes: true})) makeWritable(join(path, entry.name));
    } else {
        try { chmodSync(path, 0o644); } catch { /* best-effort teardown */ }
    }
}
