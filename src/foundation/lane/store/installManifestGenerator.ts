/**
 * Builds the closed `install.json` document (`docs/spec/v1.md` §7.5). LC-03
 * is the sole owner of whole-document generation at `init`
 * (`docs/spec/implementation/wt-runtime-distribution/RT-06-specification-resolution-amendment.md`
 * §1); the verified `taskRuntime` pin is obtained by the caller through RT-06's
 * `LaneTaskProfileInstaller.install()` and passed through here unmodified —
 * this module never calls the RT-06 rebind writer, which is reserved for a
 * later `upgrade`.
 */
import {isAbsolute, relative} from 'node:path';
import type {ManagedAssetDeclaration, InstallManifestV1} from '../../../contracts/manifests.js';
import {createWatchtowerError} from '../../../contracts/errors.js';
import {safePathTarget} from '../../paths/index.js';
import type {InitPlan} from '../../init/index.js';
import type {InstallManifestInputs, LaneManagedLink} from './laneStoreContracts.js';

const VERSION = /^[0-9]+\.[0-9]+\.[0-9]+(?:-.+)?$/u;

export function generateInstallManifest(
    plan: InitPlan, assets: readonly LaneManagedLink[], inputs: InstallManifestInputs
): InstallManifestV1 {
    if (plan.runtime.version === null) {
        throw missingDependency(plan.laneDir, 'Resolve a runtime version for this lane before generating install.json.');
    }
    const manifest: InstallManifestV1 = Object.freeze({
        schemaVersion: 1,
        cliVersion: assertVersion(inputs.cliVersion, 'cliVersion'),
        runtimeVersion: assertVersion(plan.runtime.version, 'runtimeVersion'),
        knowledgeVersion: assertVersion(inputs.knowledgeVersion, 'knowledgeVersion'),
        mode: 'linked',
        taskRuntime: inputs.taskRuntime,
        managedAssets: managedAssetDeclarations(plan, assets)
    }) as InstallManifestV1;
    return manifest;
}

function managedAssetDeclarations(plan: InitPlan, assets: readonly LaneManagedLink[]): Readonly<Record<string, ManagedAssetDeclaration>> {
    const declarations: Record<string, ManagedAssetDeclaration> = {};
    for (const asset of assets) {
        const key = assetKey(plan, asset);
        if (asset.sha256 === undefined) throw integrityFailure(key, 'Every managed asset requires a verified checksum.');
        if (!isAbsolute(asset.target)) throw integrityFailure(key, 'Managed-asset targets must be absolute runtime-store paths.');
        if (Object.hasOwn(declarations, key)) throw integrityFailure(key, 'Remove the duplicate managed-asset path.');
        declarations[key] = Object.freeze({target: asset.target, sha256: asset.sha256});
    }
    return Object.freeze(declarations);
}

function assetKey(plan: InitPlan, asset: LaneManagedLink): string {
    const key = relative(plan.laneDir, asset.path).split('\\').join('/');
    if (key.startsWith('..') || !key.startsWith('bin/')) {
        throw integrityFailure(asset.path, 'Managed assets must live under the lane bin/ directory.');
    }
    return key;
}

function assertVersion(value: string, field: string): string {
    if (!VERSION.test(value)) throw integrityFailure(field, 'Use semantic-version syntax.');
    return value;
}

function integrityFailure(target: string, remediation: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'generate install manifest', target: safePathTarget(target), remediation});
}

function missingDependency(target: string, remediation: string) {
    return createWatchtowerError('ERR_MISSING_DEPENDENCY', {operation: 'generate install manifest', target: safePathTarget(target), remediation});
}
