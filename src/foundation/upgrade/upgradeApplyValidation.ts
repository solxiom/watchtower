/**
 * Pure staging-validation and result-shaping helpers for `UpgradeApply`. No
 * I/O of its own; every filesystem fact it judges is passed in already
 * observed by the caller through `UpgradeApplyFileSystem`.
 */
import {lstatSync, realpathSync} from 'node:fs';
import {dirname, relative, resolve, sep} from 'node:path';
import type {AssetClassificationEntry, UpgradePlan} from '../../contracts/upgrade.js';
import type {RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import type {ApplyResult, StagedAssetRecord, UpgradeApplyFailure, UpgradeApplyReason} from '../../contracts/upgradeApply.js';
import type {UpgradeLinkObservation} from './upgradeApplyFileSystem.js';

/**
 * Resolve a managed `bin/` link's lane-relative path to an absolute source
 * path, authorizing only its *ancestor directories* against the lane —
 * never the leaf itself. `buildLaneFilePath` is deliberately wrong here: a
 * managed link is a symlink whose entire purpose is to resolve outside the
 * lane into the immutable runtime store, so fully resolving the leaf (as
 * `buildLaneFilePath` does for authoritative lane-owned files) would reject
 * every legitimate managed link. This mirrors RT-06's
 * `managedLinkPlanner.ts#resolveSource` containment technique — walk to the
 * nearest existing ancestor and prove *that* stays inside the lane — without
 * importing RT-06's internal module (an L5 sub-capsule the barrel does not
 * expose), and without deciding any managed-link policy: checksum/target
 * authority remains `assertChecksum`'s job.
 */
export function resolveManagedLinkSourcePath(laneDir: string, assetPath: string): string {
    const canonicalLaneDir = realpathSync(laneDir);
    const candidate = resolve(canonicalLaneDir, assetPath);
    let current = dirname(candidate);
    while (current !== canonicalLaneDir) {
        const parent = dirname(current);
        if (parent === current) throw stagingError('IO_UNAVAILABLE', assetPath, 'The managed link path escapes the lane directory.');
        if (!existsAt(current)) { current = parent; continue; }
        if (!isContained(canonicalLaneDir, realpathSync(current))) {
            throw stagingError('MANAGED_COLLISION', assetPath, 'A managed link ancestor directory resolves outside the lane.');
        }
        break;
    }
    return candidate;
}

function existsAt(path: string): boolean {
    try { lstatSync(path); return true; } catch { return false; }
}

function isContained(root: string, candidate: string): boolean {
    const difference = relative(root, candidate);
    return difference === '' || (!difference.startsWith(`..${sep}`) && difference !== '..');
}

export function requireNonNull<T>(value: T | null, path: string, reason: UpgradeApplyReason, message: string): T {
    if (value === null) throw stagingError(reason, path, message);
    return value;
}

export function stagingError(reason: UpgradeApplyReason, path: string, message: string): Error & {readonly reason: UpgradeApplyReason} {
    const error = new Error(message) as Error & {reason: UpgradeApplyReason};
    error.reason = reason;
    Object.assign(error, {path});
    return error;
}

export function toFailure(path: string, error: unknown): UpgradeApplyFailure {
    if (error instanceof Error && 'reason' in error && typeof (error as {reason?: unknown}).reason === 'string') {
        return {reason: (error as {reason: UpgradeApplyReason}).reason, path, message: error.message};
    }
    return {reason: 'IO_UNAVAILABLE', path, message: error instanceof Error ? error.message : 'unexpected failure'};
}

export function alreadyLinked(observation: UpgradeLinkObservation, targetPath: string): boolean {
    return observation.kind === 'symlink' && observation.target === targetPath;
}

/** Validates the live target digest against both the declared checksum and the target-runtime-manifest asset entry. */
export function assertChecksum(
    digestFile: (path: string) => `sha256:${string}` | null,
    path: string, targetPath: string, declaredSha256: string, targetRuntimeRoot: string, targetRuntime: RuntimeManifestV1
): void {
    const liveDigest = digestFile(targetPath);
    if (liveDigest === null) throw stagingError('TARGET_MISSING', path, 'The declared managed-asset target is unreadable or missing.');
    if (liveDigest !== declaredSha256) throw stagingError('CHECKSUM_MISMATCH', path, 'The live target digest disagrees with the declared checksum.');
    const relativePath = relative(targetRuntimeRoot, targetPath).split(sep).join('/');
    const asset = targetRuntime.assets.find((candidate) => candidate.path === relativePath);
    if (asset === undefined) throw stagingError('TARGET_MISSING', path, 'The target is not a declared target-runtime-manifest asset.');
    if (asset.sha256 !== declaredSha256 || asset.mode !== '0755') {
        throw stagingError('CHECKSUM_MISMATCH', path, 'The target-runtime-manifest asset disagrees with the declared checksum or mode.');
    }
}

/** Defense against manual modification: an existing link must still match the current install manifest's declared target. */
export function assertNoTamperedCollision(entry: AssetClassificationEntry, observation: UpgradeLinkObservation): void {
    if (observation.kind === 'missing') return;
    if (observation.kind === 'symlink' && entry.currentTarget !== null && observation.target === entry.currentTarget) return;
    throw stagingError('MANAGED_COLLISION', entry.path, 'The live managed link no longer matches the current install manifest declaration.');
}

export function nextManagedAssets(plan: UpgradePlan): Readonly<Record<string, {readonly target: string; readonly sha256: `sha256:${string}`}>> {
    const result: Record<string, {readonly target: string; readonly sha256: `sha256:${string}`}> = {};
    for (const entry of [...plan.preserved, ...plan.changed, ...plan.added]) {
        result[entry.path] = {target: entry.targetTarget as string, sha256: entry.targetSha256 as `sha256:${string}`};
    }
    return result;
}

export function successResult(
    plan: UpgradePlan, migrated: readonly string[], staged: {readonly records: StagedAssetRecord[]}
): ApplyResult {
    return {
        success: true, applied: true, from: plan.from, to: plan.to,
        changed: staged.records.map((record) => record.path),
        unchanged: plan.preserved.map((entry) => entry.path),
        preserved: plan.preserved.map((entry) => entry.path),
        migrated, conflicts: [], stagedCount: staged.records.length, partialStagingPaths: [], failure: null
    };
}

export function failureResult(
    plan: UpgradePlan, migrated: readonly string[],
    staged: {readonly records: StagedAssetRecord[]; readonly failure: UpgradeApplyFailure | null}
): ApplyResult {
    return {
        success: false, applied: false, from: plan.from, to: plan.to,
        changed: staged.records.map((record) => record.path),
        unchanged: plan.preserved.map((entry) => entry.path),
        preserved: plan.preserved.map((entry) => entry.path),
        migrated, conflicts: [],
        stagedCount: staged.records.length,
        partialStagingPaths: staged.records.filter((record) => !record.renamed).map((record) => record.tempPath),
        failure: staged.failure
    };
}
