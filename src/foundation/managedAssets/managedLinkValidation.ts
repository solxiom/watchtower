/**
 * Read-only report builder for `ManagedAssets.validateLinks`. Reuses the same
 * plan/observation primitives `createLinks`/`removeLinks` use so drift is
 * classified against the exact same containment and checksum rules, never a
 * second copy of them.
 */
import {ManagedAssetsError, type InstallManifestV1, type ManagedLinkFinding, type ManagedLinkFindingStatus} from '../../contracts/manifests.js';
import type {ManagedLinkFileSystem} from './managedLinkFileSystem.js';
import {planLink} from './managedLinkPlanner.js';
import type {RuntimeFileSystem} from '../taskRuntime/runtimeFileSystem.js';

export function validateLink(
    laneDir: string,
    runtimeRoot: string,
    assetPath: string,
    installManifest: InstallManifestV1,
    fileSystem: ManagedLinkFileSystem,
    runtimeFiles: RuntimeFileSystem
): ManagedLinkFinding {
    const declaration = installManifest.managedAssets[assetPath];
    let plan;
    try {
        plan = planLink(laneDir, runtimeRoot, assetPath, declaration, runtimeFiles);
    } catch (error) {
        return {assetPath, status: findingForPlanFailure(error)};
    }
    let observation;
    try {
        observation = fileSystem.observeSource(plan.sourcePath);
    } catch {
        return {assetPath, status: 'broken'};
    }
    return {assetPath, status: findingForObservation(observation.kind, observation.linkTarget, plan.targetPath)};
}

function findingForPlanFailure(error: unknown): ManagedLinkFindingStatus {
    if (!(error instanceof ManagedAssetsError)) return 'broken';
    if (error.reason === 'LINK_TARGET_CHECKSUM_MISMATCH') return 'checksum-mismatch';
    if (error.reason === 'LINK_TARGET_MISSING') return 'missing';
    return 'broken';
}

function findingForObservation(kind: string, linkTarget: string | null, expectedTarget: string): ManagedLinkFindingStatus {
    if (kind === 'missing') return 'missing';
    if (kind === 'symlink') return linkTarget === expectedTarget ? 'valid' : 'wrong-target';
    return 'broken';
}
