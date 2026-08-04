import {join} from 'node:path';
import {lstatSync, readFileSync} from 'node:fs';
import type {KnowledgeManifestV1, RuntimeManifestV1} from '../contracts/runtimeKnowledgeManifests.js';
import {ManagedAssetsError} from '../contracts/manifests.js';
import type {UpgradePlannerInput} from '../contracts/upgrade.js';
import {createWatchtowerError} from '../contracts/errors.js';
import {parseInstallManifest} from './managedAssets/installManifestReader.js';
import {resolveLane, type LaneSelectionContext} from './LaneSelector.js';
import {RuntimeCatalog} from './runtimeCatalog/index.js';
import {parseKnowledgeManifest, parseRuntimeManifest} from './runtimeKnowledgeManifest/manifestDocumentParser.js';

export interface UpgradeSourceQuery extends LaneSelectionContext { readonly workspace?: string; readonly to?: string; }
export interface UpgradePreviewSourceOptions { readonly catalog?: RuntimeCatalog; }

export class UpgradePreviewSource {
    private readonly catalog: RuntimeCatalog;

    constructor(options: UpgradePreviewSourceOptions = {}) { this.catalog = options.catalog ?? new RuntimeCatalog(); }

    read(query: UpgradeSourceQuery): UpgradePlannerInput {
        const lane = resolveLane({cwd: query.workspace ?? query.cwd, lane: query.lane});
        const install = readInstall(lane.laneDir);
        const currentRoot = requiredRuntime(this.catalog, install.runtimeVersion);
        const targetVersion = query.to ?? install.runtimeVersion;
        const targetRoot = requiredRuntime(this.catalog, targetVersion);
        const knowledgeRoot = requiredKnowledge(this.catalog, install.knowledgeVersion);
        return {laneDir: lane.laneDir, laneSchemaVersion: lane.manifest.schemaVersion, currentInstall: install,
            targetRuntime: readRuntime(targetRoot), targetKnowledge: readKnowledge(knowledgeRoot),
            currentRuntimeRoot: currentRoot, targetRuntimeRoot: targetRoot};
    }
}

function readInstall(laneDir: string) {
    const path = join(laneDir, 'install.json');
    try {
        if (!lstatSync(path).isFile()) throw new Error('not a regular file');
        return parseInstallManifest(JSON.parse(readFileSync(path, 'utf8')) as unknown);
    } catch (error) {
        if (error instanceof ManagedAssetsError) {
            throw createWatchtowerError('ERR_INVALID_LANE_CONFIG', {operation: 'read install manifest', target: path,
                remediation: 'Restore a schema-valid install.json for the selected lane.'});
        }
        throw createWatchtowerError('ERR_INVALID_LANE_CONFIG', {operation: 'read install manifest', target: path,
            remediation: 'Restore a schema-valid install.json for the selected lane.'});
    }
}

function requiredRuntime(catalog: RuntimeCatalog, version: string): string {
    try { return catalog.getRuntimeRoot(version); } catch { throw missing(version, 'runtime'); }
}

function requiredKnowledge(catalog: RuntimeCatalog, version: string): string {
    try { return catalog.getKnowledgeRoot(version); } catch { throw missing(version, 'knowledge'); }
}

function readRuntime(root: string): RuntimeManifestV1 {
    try { return parseRuntimeManifest(JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as unknown); }
    catch { throw missing(root, 'runtime manifest'); }
}

function readKnowledge(root: string): KnowledgeManifestV1 {
    try { return parseKnowledgeManifest(JSON.parse(readFileSync(join(root, 'manifest.json'), 'utf8')) as unknown); }
    catch { throw missing(root, 'knowledge manifest'); }
}

function missing(target: string, kind: string) {
    return createWatchtowerError('ERR_MISSING_DEPENDENCY', {operation: 'prepare upgrade preview', target: target.slice(0, 200),
        remediation: `Install or restore the requested ${kind} before previewing this upgrade.`});
}
