import {join, relative} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import type {
    AssetClassificationEntry, CompatibilityMatrix, UpgradeAssetDeclaration, UpgradePlan, UpgradePlannerInput
} from '../../contracts/upgrade.js';
import {safePathTarget} from '../paths/index.js';
import {isManagedBinPath} from '../runtime/index.js';
import {nodeUpgradeFileSystem, type UpgradeFileSystem, type UpgradePathKind} from './upgradeFileSystem.js';

export interface UpgradePlannerOptions { readonly fileSystem?: UpgradeFileSystem; }

export class UpgradePlanner {
    private readonly fileSystem: UpgradeFileSystem;

    constructor(options: UpgradePlannerOptions = {}) { this.fileSystem = options.fileSystem ?? nodeUpgradeFileSystem; }

    plan(input: UpgradePlannerInput): UpgradePlan {
        const matrix = this.buildMatrix(input);
        if (!matrix.runtimeKnowledge.compatible || !matrix.schema.compatible) throw incompatible(input, matrix);
        const entries = matrix.assets;
        const preserved = entries.filter(item => item.classification === 'preserved');
        const changed = entries.filter(item => item.classification === 'changed');
        const added = entries.filter(item => item.classification === 'added');
        const removed = entries.filter(item => item.classification === 'removed');
        const conflicts = entries.filter(item => item.classification === 'conflict');
        return Object.freeze({
            from: {runtimeVersion: input.currentInstall.runtimeVersion, knowledgeVersion: input.currentInstall.knowledgeVersion,
                laneSchemaVersion: input.laneSchemaVersion},
            to: {runtimeVersion: input.targetRuntime.runtimeVersion, knowledgeVersion: input.targetKnowledge.knowledgeVersion},
            applied: false as const, changed: freeze(changed), unchanged: freeze(preserved), preserved: freeze(preserved),
            migrated: Object.freeze([]), conflicts: freeze(conflicts), added: freeze(added), removed: freeze(removed), matrix
        });
    }

    private buildMatrix(input: UpgradePlannerInput): CompatibilityMatrix {
        validateAssets(input.currentInstall.managedAssets, input.targetManagedAssets);
        const targetAssets = input.targetManagedAssets ?? deriveTargetAssets(input);
        const assets = classifyAssets(input.laneDir, input.currentInstall.managedAssets, targetAssets, this.fileSystem);
        const runtimeKnowledge = compatibility(input);
        const supported = input.targetRuntime.compatibleLaneSchemaVersions ?? [];
        return Object.freeze({assets: freeze(assets), runtimeKnowledge, schema: Object.freeze({
            laneSchemaVersion: input.laneSchemaVersion, supportedLaneSchemaVersions: Object.freeze([...supported]),
            compatible: supported.includes(input.laneSchemaVersion as 1)
        })});
    }
}

function classifyAssets(
    laneDir: string,
    current: Readonly<Record<string, UpgradeAssetDeclaration>>,
    target: Readonly<Record<string, UpgradeAssetDeclaration>>,
    fileSystem: UpgradeFileSystem
): AssetClassificationEntry[] {
    const paths = [...new Set([...Object.keys(current), ...Object.keys(target)])].sort();
    return paths.map(path => classifyOne(laneDir, path, current[path], target[path], fileSystem));
}

function classifyOne(
    laneDir: string,
    path: string,
    current: UpgradeAssetDeclaration | undefined,
    target: UpgradeAssetDeclaration | undefined,
    fileSystem: UpgradeFileSystem
): AssetClassificationEntry {
    let liveKind: UpgradePathKind;
    try { liveKind = fileSystem.inspect(join(laneDir, path)); }
    catch { throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'inspect managed asset', target: safePathTarget(join(laneDir, path)),
        remediation: 'Restore access to the selected lane and rerun the read-only upgrade preview.'}); }
    if (liveKind === 'regular') return entry(path, 'conflict', current, target);
    if (current === undefined) return entry(path, 'added', current, target);
    if (target === undefined) return entry(path, 'removed', current, target);
    if (current.sha256 === target.sha256 && current.target === target.target) {
        return entry(path, 'preserved', current, target);
    }
    return entry(path, 'changed', current, target);
}

function entry(
    path: string,
    classification: AssetClassificationEntry['classification'],
    current: UpgradeAssetDeclaration | undefined,
    target: UpgradeAssetDeclaration | undefined
): AssetClassificationEntry {
    return Object.freeze({path, classification, currentSha256: current?.sha256 ?? null, targetSha256: target?.sha256 ?? null,
        currentTarget: current?.target ?? null, targetTarget: target?.target ?? null});
}

function deriveTargetAssets(input: UpgradePlannerInput): Readonly<Record<string, UpgradeAssetDeclaration>> {
    if (input.currentRuntimeRoot === undefined || input.targetRuntimeRoot === undefined) return input.currentInstall.managedAssets;
    const byPath = new Map(input.targetRuntime.assets.map(asset => [asset.path, asset]));
    const result: Record<string, UpgradeAssetDeclaration> = {};
    for (const [lanePath, declaration] of Object.entries(input.currentInstall.managedAssets)) {
        const runtimePath = relative(input.currentRuntimeRoot, declaration.target).split('\\').join('/');
        if (runtimePath.startsWith('..')) throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'map managed asset',
            target: safePathTarget(declaration.target), remediation: 'Restore managed targets inside the installed runtime root.'});
        const target = byPath.get(runtimePath);
        if (target !== undefined) result[lanePath] = {target: join(input.targetRuntimeRoot, runtimePath), sha256: target.sha256};
    }
    return result;
}

function validateAssets(
    current: Readonly<Record<string, UpgradeAssetDeclaration>>,
    target: Readonly<Record<string, UpgradeAssetDeclaration>> | undefined
): void {
    for (const [path, declaration] of Object.entries({...current, ...target})) {
        if (!isManagedBinPath(path) || !/^sha256:[0-9a-f]{64}$/u.test(declaration.sha256) || declaration.target.length === 0) {
            throw createWatchtowerError('ERR_INVALID_LANE_CONFIG', {operation: 'validate upgrade assets', target: path,
                remediation: 'Use normalized bin/ asset paths with valid managed-asset declarations.'});
        }
    }
}

function compatibility(input: UpgradePlannerInput): CompatibilityMatrix['runtimeKnowledge'] {
    const runtimeVersions = input.targetRuntime.compatibleKnowledgeVersions ?? [];
    const knowledgeVersions = input.targetKnowledge.compatibleRuntimeVersions ?? [];
    return Object.freeze({runtimeVersion: input.targetRuntime.runtimeVersion, knowledgeVersion: input.targetKnowledge.knowledgeVersion,
        runtimeCompatibleKnowledgeVersions: Object.freeze([...runtimeVersions]), knowledgeCompatibleRuntimeVersions: Object.freeze([...knowledgeVersions]),
        compatible: runtimeVersions.includes(input.targetKnowledge.knowledgeVersion) && knowledgeVersions.includes(input.targetRuntime.runtimeVersion)});
}

function incompatible(input: UpgradePlannerInput, matrix: CompatibilityMatrix): ReturnType<typeof createWatchtowerError> {
    const reason = !matrix.schema.compatible ? 'lane schema' : 'runtime/knowledge versions';
    return createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
        operation: 'plan upgrade', target: `${input.currentInstall.runtimeVersion}->${input.targetRuntime.runtimeVersion}`,
        remediation: `Select a target with compatible ${reason} declarations.`
    });
}

function freeze<T>(items: readonly T[]): readonly T[] { return Object.freeze([...items]); }
