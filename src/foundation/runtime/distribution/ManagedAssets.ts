/**
 * Manifest-only ownership of managed lane `bin/` links (`docs/spec/v1.md`
 * §7.5, §16.2; RT-06, Correction 01). This facade validates, creates,
 * removes, and reports on symlinks from a lane's `bin/` directory to the
 * checksum-verified immutable runtime store; it never resolves symlink
 * targets without checksum and runtime-manifest agreement, never overwrites a
 * non-managed file, and never reads or writes a participating repository's
 * `nvb.json`.
 *
 * Correction 01, finding 4: `createLinks`/`removeLinks` now plan the complete
 * requested set — every declaration, collision, escape, checksum, and
 * permission check — before any mutation, under a lane-scoped lock. If any
 * asset fails planning, nothing in the call is mutated and every entry
 * reports either its own failure or `'blocked'`. If a mutation itself fails
 * unexpectedly after the whole set passed planning (a TOCTOU race), this
 * stops applying further entries and reports the remainder `'blocked'`
 * rather than a misleading partial success; a caller retries the same call,
 * and already-applied entries resolve idempotently through `decideCreate`/
 * `decideRemove` on replay.
 */
import type {RuntimeCatalog} from '../catalog/index.js';
import type {
    InstallManifestV1,
    ManagedAssetDeclaration,
    ManagedAssetsReason,
    ManagedLinkResult,
    ValidationResult
} from '../../../contracts/manifests.js';
import {ManagedAssetsError} from '../../../contracts/manifests.js';
import {nodeManagedLinkFileSystem, type ManagedLinkFileSystem, type ManagedLinkSourceObservation} from './managedLinkFileSystem.js';
import {planLink, planRemoval} from './managedLinkPlanner.js';
import {decideCreate, decideRemove} from './managedLinkValidator.js';
import {createLink, removeLink} from './managedLinkMutator.js';
import {validateLink} from './managedLinkValidation.js';
import {acquireManagedAssetsLock} from './managedAssetsLock.js';
import {nodeRuntimeFileSystem, type RuntimeFileSystem} from '../../task/runtime/runtimeFileSystem.js';

export interface ManagedAssetsOptions {
    readonly fileSystem?: ManagedLinkFileSystem;
    readonly runtimeFiles?: RuntimeFileSystem;
}

type PlannedAction =
    | {readonly kind: 'no-op'; readonly result: ManagedLinkResult}
    | {readonly kind: 'mutate'; readonly mutate: () => ManagedLinkResult};

export class ManagedAssets {
    private readonly fileSystem: ManagedLinkFileSystem;
    private readonly runtimeFiles: RuntimeFileSystem;

    constructor(options: ManagedAssetsOptions = {}) {
        this.fileSystem = options.fileSystem ?? nodeManagedLinkFileSystem;
        this.runtimeFiles = options.runtimeFiles ?? nodeRuntimeFileSystem;
    }

    createLinks(laneDir: string, installManifest: InstallManifestV1, runtimeCatalog: RuntimeCatalog): ManagedLinkResult[] {
        const runtimeRoot = runtimeCatalog.getRuntimeRoot(installManifest.runtimeVersion);
        const lock = acquireManagedAssetsLock(laneDir);
        try {
            return this.applySet(installManifest, (assetPath, declaration) =>
                this.planCreate(laneDir, runtimeRoot, assetPath, declaration));
        } finally {
            lock.release();
        }
    }

    removeLinks(laneDir: string, installManifest: InstallManifestV1): ManagedLinkResult[] {
        const lock = acquireManagedAssetsLock(laneDir);
        try {
            return this.applySet(installManifest, (assetPath, declaration) => this.planRemove(laneDir, assetPath, declaration));
        } finally {
            lock.release();
        }
    }

    validateLinks(laneDir: string, installManifest: InstallManifestV1, runtimeCatalog: RuntimeCatalog): ValidationResult {
        const runtimeRoot = runtimeCatalog.getRuntimeRoot(installManifest.runtimeVersion);
        const findings = Object.keys(installManifest.managedAssets).sort().map((assetPath) =>
            validateLink(laneDir, runtimeRoot, assetPath, installManifest, this.fileSystem, this.runtimeFiles));
        return {ok: findings.every((finding) => finding.status === 'valid'), findings};
    }

    private planCreate(laneDir: string, runtimeRoot: string, assetPath: string, declaration: ManagedAssetDeclaration): PlannedAction {
        const plan = planLink(laneDir, runtimeRoot, assetPath, declaration, this.runtimeFiles);
        const decision = decideCreate(plan, this.observeSourceSafely(plan.sourcePath));
        if (decision === 'already-linked') {
            return {kind: 'no-op', result: linkResult(assetPath, 'already-linked', null, plan.targetPath)};
        }
        return {kind: 'mutate', mutate: () => { createLink(this.fileSystem, plan); return linkResult(assetPath, 'created', null, plan.targetPath); }};
    }

    private planRemove(laneDir: string, assetPath: string, declaration: ManagedAssetDeclaration): PlannedAction {
        const plan = planRemoval(laneDir, assetPath, declaration);
        const decision = decideRemove(plan, this.observeSourceSafely(plan.sourcePath));
        if (decision === 'absent') return {kind: 'no-op', result: linkResult(assetPath, 'absent', null, null)};
        if (decision === 'not-managed') return {kind: 'no-op', result: linkResult(assetPath, 'error', 'LINK_NOT_MANAGED', null)};
        return {kind: 'mutate', mutate: () => { removeLink(this.fileSystem, plan); return linkResult(assetPath, 'removed', null, plan.targetPath); }};
    }

    private observeSourceSafely(sourcePath: string): ManagedLinkSourceObservation {
        try {
            return this.fileSystem.observeSource(sourcePath);
        } catch (error) {
            throw ioUnavailable(sourcePath, error);
        }
    }

    /**
     * Plan every asset with zero mutation. If any planning step fails, nothing
     * is applied: every entry reports its own failure or `'blocked'`. Only
     * when the whole set plans cleanly does mutation begin, in order, and a
     * later unexpected mutation failure halts further application.
     */
    private applySet(
        installManifest: InstallManifestV1,
        plan: (assetPath: string, declaration: ManagedAssetDeclaration) => PlannedAction
    ): ManagedLinkResult[] {
        const assetPaths = Object.keys(installManifest.managedAssets).sort();
        const planned = assetPaths.map((assetPath) => this.planOne(assetPath, installManifest.managedAssets[assetPath], plan));
        if (planned.some((entry) => entry.reason !== null)) {
            return planned.map((entry) => linkResult(
                entry.assetPath, entry.reason !== null ? 'error' : 'blocked', entry.reason, null
            ));
        }
        return this.applyPlanned(planned);
    }

    private planOne(
        assetPath: string,
        declaration: ManagedAssetDeclaration,
        plan: (assetPath: string, declaration: ManagedAssetDeclaration) => PlannedAction
    ): {readonly assetPath: string; readonly action: PlannedAction | null; readonly reason: ManagedAssetsReason | null} {
        try {
            return {assetPath, action: plan(assetPath, declaration), reason: null};
        } catch (error) {
            if (!(error instanceof ManagedAssetsError)) throw error;
            return {assetPath, action: null, reason: error.reason};
        }
    }

    private applyPlanned(
        planned: ReadonlyArray<{readonly assetPath: string; readonly action: PlannedAction | null; readonly reason: ManagedAssetsReason | null}>
    ): ManagedLinkResult[] {
        const results: ManagedLinkResult[] = [];
        for (let index = 0; index < planned.length; index += 1) {
            const {assetPath, action} = planned[index];
            if (action!.kind === 'no-op') { results.push(action!.result); continue; }
            try {
                results.push(action!.mutate());
            } catch (error) {
                const reason = error instanceof ManagedAssetsError ? error.reason : 'LINK_IO_UNAVAILABLE';
                results.push(linkResult(assetPath, 'error', reason, null));
                for (const remaining of planned.slice(index + 1)) results.push(linkResult(remaining.assetPath, 'blocked', null, null));
                return results;
            }
        }
        return results;
    }
}

function linkResult(
    assetPath: string,
    outcome: ManagedLinkResult['outcome'],
    reason: ManagedAssetsReason | null,
    target: string | null
): ManagedLinkResult {
    return {assetPath, outcome, reason, target};
}

function ioUnavailable(subject: string, error: unknown): ManagedAssetsError {
    const detail = error instanceof Error ? error.message : 'unavailable';
    return new ManagedAssetsError('LINK_IO_UNAVAILABLE', subject, `Unexpected filesystem failure: ${detail}`);
}
