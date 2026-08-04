import {createHash} from 'node:crypto';
import {chmodSync, lstatSync, mkdirSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {InstallManifestV1, ManagedAssetDeclaration} from '../../../src/contracts/manifests.js';
import type {ManifestAsset, RuntimeManifestV1} from '../../../src/contracts/runtimeKnowledgeManifests.js';
import {RuntimeCatalog} from '../../../src/foundation/runtimeCatalog/index.js';
import {semanticDigest} from '../../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';

export const RUNTIME_VERSION = '1.0.0';
export const CLI_VERSION = '1.0.0';
export const PROFILE_ID = 'implementation-v1';
export const CATALOG_ID = 'watchtower-runtime-nvb/v1';
export const TASK_ID = 'wt:runtime:smoke';
export const ACTION_ID = 'runtime.smoke';
export const ASSET_KEY = 'bin/coordinator-watch.sh';

export interface ManagedAssetsFixture {
    readonly root: string;
    readonly laneDir: string;
    readonly runtimeCatalog: RuntimeCatalog;
    readonly runtimeRoot: string;
    readonly configTarget: string;
    readonly moduleTarget: string;
    readonly managedAssetTarget: string;
    readonly managedAssetDeclaration: ManagedAssetDeclaration;
    readonly document: JsonObject;
}

export function digest(text: string): `sha256:${string}` {
    return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

function mkFixtureRoot(): string {
    const root = join(tmpdir(), `watchtower-managed-assets-${process.pid}-${Date.now()}-${Math.random()}`);
    mkdirSync(root, {recursive: true});
    return root;
}

export function catalogDocument(): JsonObject {
    return {
        schemaVersion: 1,
        catalogId: CATALOG_ID,
        catalogVersion: 1,
        minimumRuntime: {cliVersion: '0.1.0', nodeVersion: '26.4.0'},
        fragments: ['runtime-smoke'],
        handlers: {},
        tasks: {[TASK_ID]: {
            executionScope: 'lane-runtime',
            handlerId: 'RuntimeSmokeTaskHandler',
            inputSchema: 'watchtower://runtime/schemas/runtime-smoke-input/v1',
            resultSchema: 'watchtower://runtime/schemas/runtime-smoke-result/v1',
            leafIds: [],
            mutationClass: 'read-only',
            requiresInvocationEnvelope: false
        }},
        groups: {},
        actions: {[ACTION_ID]: {taskId: TASK_ID}},
        leaves: {},
        profiles: {[PROFILE_ID]: {taskIds: [TASK_ID]}},
        schemas: {}
    };
}

/**
 * Stage a real, checksum-verified runtime version root containing a
 * `runtime-nvb.json`/`runtime-nvb.js` pair, a `task-catalog.json` matching
 * `catalogDocument()`, and one managed asset (`coordinator/coordinatorWatch.sh`),
 * then build a matching lane directory and `InstallManifestV1`.
 */
export function makeManagedAssetsFixture(catalogOverride?: JsonObject): ManagedAssetsFixture {
    const root = mkFixtureRoot();
    const source = join(root, 'source');
    const laneDir = join(root, 'lane');
    mkdirSync(join(source, 'runtime-nvb'), {recursive: true});
    mkdirSync(join(source, 'coordinator'), {recursive: true});
    mkdirSync(join(laneDir, 'bin'), {recursive: true});

    const document = catalogOverride ?? catalogDocument();
    const configText = JSON.stringify({tasks: {}});
    const moduleText = '// runtime-nvb module\n';
    const managedAssetText = '#!/bin/sh\necho legacy coordinator watch\n';
    writeFileSync(join(source, 'runtime-nvb', 'runtime-nvb.json'), configText);
    writeFileSync(join(source, 'runtime-nvb', 'runtime-nvb.js'), moduleText);
    writeFileSync(join(source, 'runtime-nvb', 'task-catalog.json'), JSON.stringify(document));
    writeFileSync(join(source, 'coordinator', 'coordinatorWatch.sh'), managedAssetText, {mode: 0o755});

    const runtimeCatalog = new RuntimeCatalog({dataRoot: () => join(root, 'data')});
    runtimeCatalog.stageRuntime(RUNTIME_VERSION, runtimeManifestFor(configText, moduleText, document, managedAssetText), source);
    const runtimeRoot = runtimeCatalog.getRuntimeRoot(RUNTIME_VERSION);

    const configTarget = join(runtimeRoot, 'runtime-nvb', 'runtime-nvb.json');
    const moduleTarget = join(runtimeRoot, 'runtime-nvb', 'runtime-nvb.js');
    const managedAssetTarget = join(runtimeRoot, 'coordinator', 'coordinatorWatch.sh');
    const managedAssetDeclaration: ManagedAssetDeclaration = {target: managedAssetTarget, sha256: digest(managedAssetText)};

    return {root, laneDir, runtimeCatalog, runtimeRoot, configTarget, moduleTarget, managedAssetTarget, managedAssetDeclaration, document};
}

function runtimeManifestFor(configText: string, moduleText: string, document: JsonObject, managedAssetText: string): RuntimeManifestV1 {
    return {
        schemaVersion: 1,
        manifestId: 'watchtower-runtime/v1',
        runtimeVersion: RUNTIME_VERSION,
        minimumCliVersion: '0.1.0',
        compatibleLaneSchemaVersions: [1],
        compatibleKnowledgeVersions: ['1.0.0'],
        assets: manifestAssets(managedAssetText, moduleText, configText, document),
        actions: [],
        requiredCommands: []
    };
}

function manifestAssets(managedAssetText: string, moduleText: string, configText: string, document: JsonObject): ManifestAsset[] {
    const assets: ManifestAsset[] = [
        {path: 'coordinator/coordinatorWatch.sh', sha256: digest(managedAssetText), mode: '0755'},
        {path: 'runtime-nvb/runtime-nvb.js', sha256: digest(moduleText), mode: '0644'},
        {path: 'runtime-nvb/runtime-nvb.json', sha256: digest(configText), mode: '0644'},
        {path: 'runtime-nvb/task-catalog.json', sha256: digest(JSON.stringify(document)), mode: '0644'}
    ];
    return assets.sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

export function installManifestFor(fixture: ManagedAssetsFixture, overrides: Partial<InstallManifestV1> = {}): InstallManifestV1 {
    return {
        schemaVersion: 1,
        cliVersion: CLI_VERSION,
        runtimeVersion: RUNTIME_VERSION,
        knowledgeVersion: '1.0.0',
        mode: 'linked',
        taskRuntime: {
            catalogId: CATALOG_ID,
            catalogSha256: semanticDigest(fixture.document),
            profile: PROFILE_ID,
            configTarget: fixture.configTarget,
            moduleTarget: fixture.moduleTarget
        },
        managedAssets: {[ASSET_KEY]: fixture.managedAssetDeclaration},
        ...overrides
    };
}

export function cleanupFixture(root: string): void {
    makeWritable(root);
    rmSync(root, {recursive: true, force: true});
}

/** The immutable staged runtime root is read-only; teardown must restore write access first. */
function makeWritable(path: string): void {
    let stat;
    try {
        stat = lstatSync(path);
    } catch {
        return;
    }
    if (stat.isSymbolicLink()) return;
    if (stat.isDirectory()) {
        try { chmodSync(path, 0o755); } catch { /* best-effort teardown */ }
        for (const entry of readdirSync(path, {withFileTypes: true})) makeWritable(join(path, entry.name));
    } else {
        try { chmodSync(path, 0o644); } catch { /* best-effort teardown */ }
    }
}
