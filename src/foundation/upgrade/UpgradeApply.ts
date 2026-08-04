/**
 * UK-03 atomic upgrade apply: the sole install-pointer/store writer for
 * `wt upgrade --apply` (`docs/spec/v1.md` §11.5, §7.5; `docs/spec/v1-contracts.md`
 * §11). Acquires the lane lock, invokes the UK-02 migration registry when the
 * plan crosses a schema version, stages every changed/added managed `bin/`
 * link to a temp path adjacent to its target and atomically renames it, then
 * writes `install.json` last, after every staged asset is fsynced and
 * checksum-verified. A staging failure never writes the manifest and never
 * throws mid-mutation for a data-shaped failure: it returns `ApplyResult`
 * with `success: false` so the caller (thin command layer) maps the typed
 * failure reason to the registered public error/exit code, and `UpgradeRecovery`
 * can clean any leftover temp artifact on a later run.
 */
import {dirname, join, relative, sep} from 'node:path';
import type {AssetClassificationEntry, UpgradePlan} from '../../contracts/upgrade.js';
import type {InstallManifestV1} from '../../contracts/manifests.js';
import type {KnowledgeManifestV1, RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import type {ApplyResult, StagedAssetRecord, UpgradeApplyFailure, UpgradeApplyReason} from '../../contracts/upgradeApply.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {buildLaneFilePath} from '../paths/index.js';
import {LaneTaskProfileInstaller, type RuntimeCatalog} from '../runtime/index.js';
import {acquireWriteLock} from '../storage/sqliteWriteLock.js';
import {MigrationRegistry} from './MigrationRegistry.js';
import {stageMigrationPlan} from './MigrationSteps.js';
import {installStagingTempPath, nodeUpgradeApplyFileSystem, stagingTempPath, type UpgradeApplyFileSystem} from './upgradeApplyFileSystem.js';

const LANE_SCHEMA_VERSION: 1 = 1;

export interface TaskRuntimeRelativeTargets {
    readonly configTargetRelative: string;
    readonly moduleTargetRelative: string;
}

export interface UpgradeApplyInput {
    readonly laneDir: string;
    readonly plan: UpgradePlan;
    readonly currentInstall: InstallManifestV1;
    readonly targetRuntime: RuntimeManifestV1;
    readonly targetKnowledge: KnowledgeManifestV1;
    readonly targetRuntimeRoot: string;
    readonly taskRuntimeTargets: TaskRuntimeRelativeTargets;
    readonly runtimeCatalog: RuntimeCatalog;
}

export interface UpgradeApplyOptions { readonly fileSystem?: UpgradeApplyFileSystem; }

export class UpgradeApply {
    private readonly fileSystem: UpgradeApplyFileSystem;

    constructor(options: UpgradeApplyOptions = {}) { this.fileSystem = options.fileSystem ?? nodeUpgradeApplyFileSystem; }

    async apply(input: UpgradeApplyInput): Promise<ApplyResult> {
        assertNoConflicts(input.plan);
        const lockPath = join(input.laneDir, 'state', 'lane.lock');
        const lock = await acquireWriteLock(lockPath);
        try {
            const migrated = this.runMigration(input.plan);
            const entries = [...input.plan.added, ...input.plan.changed];
            const staged = this.stageEntries(input, entries);
            if (staged.failure !== null) return failureResult(input.plan, migrated, staged);
            this.writeInstallManifest(input);
            return successResult(input.plan, migrated, staged);
        } finally {
            await lock.release();
        }
    }

    private runMigration(plan: UpgradePlan): readonly string[] {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [LANE_SCHEMA_VERSION], steps: []});
        const migrationPlan = registry.plan(plan.from.laneSchemaVersion, LANE_SCHEMA_VERSION);
        const result = stageMigrationPlan(registry, migrationPlan, {});
        return result.appliedStepIds;
    }

    private stageEntries(
        input: UpgradeApplyInput, entries: readonly AssetClassificationEntry[]
    ): {readonly records: StagedAssetRecord[]; readonly failure: UpgradeApplyFailure | null} {
        const records: StagedAssetRecord[] = [];
        for (const entry of entries) {
            try {
                const record = this.stageOne(input, entry);
                if (record !== null) records.push(record);
            } catch (error) {
                return {records, failure: toFailure(entry.path, error)};
            }
        }
        return {records, failure: null};
    }

    private stageOne(input: UpgradeApplyInput, entry: AssetClassificationEntry): StagedAssetRecord | null {
        const targetPath = requireNonNull(entry.targetTarget, entry.path, 'TARGET_MISSING', 'managed asset has no declared target');
        const declaredSha256 = requireNonNull(entry.targetSha256, entry.path, 'TARGET_MISSING', 'managed asset has no declared checksum');
        this.assertChecksum(input, entry.path, targetPath, declaredSha256);
        const sourcePath = buildLaneFilePath(input.laneDir, entry.path);
        const observation = this.fileSystem.inspectLink(sourcePath);
        if (alreadyLinked(observation, targetPath)) return null;
        this.assertNoTamperedCollision(entry, observation);
        const directory = dirname(sourcePath);
        const tempPath = stagingTempPath(sourcePath);
        this.fileSystem.ensureDirectory(directory);
        this.fileSystem.removeIfExists(tempPath);
        this.fileSystem.createSymlinkAt(targetPath, tempPath);
        this.fileSystem.fsyncDirectory(directory);
        try {
            this.fileSystem.renameAtomic(tempPath, sourcePath);
        } catch (error) {
            this.fileSystem.removeIfExists(tempPath);
            throw error;
        }
        this.fileSystem.fsyncDirectory(directory);
        return {path: entry.path, tempPath, targetPath, renamed: true};
    }

    private assertChecksum(input: UpgradeApplyInput, path: string, targetPath: string, declaredSha256: string): void {
        const liveDigest = this.fileSystem.digestFile(targetPath);
        if (liveDigest === null) throw stagingError('TARGET_MISSING', path, 'The declared managed-asset target is unreadable or missing.');
        if (liveDigest !== declaredSha256) throw stagingError('CHECKSUM_MISMATCH', path, 'The live target digest disagrees with the declared checksum.');
        const relativePath = relative(input.targetRuntimeRoot, targetPath).split(sep).join('/');
        const asset = input.targetRuntime.assets.find((candidate) => candidate.path === relativePath);
        if (asset === undefined) throw stagingError('TARGET_MISSING', path, 'The target is not a declared target-runtime-manifest asset.');
        if (asset.sha256 !== declaredSha256 || asset.mode !== '0755') {
            throw stagingError('CHECKSUM_MISMATCH', path, 'The target-runtime-manifest asset disagrees with the declared checksum or mode.');
        }
    }

    private assertNoTamperedCollision(entry: AssetClassificationEntry, observation: {readonly kind: string; readonly target: string | null}): void {
        if (observation.kind === 'missing') return;
        if (observation.kind === 'symlink' && entry.currentTarget !== null && observation.target === entry.currentTarget) return;
        throw stagingError('MANAGED_COLLISION', entry.path, 'The live managed link no longer matches the current install manifest declaration.');
    }

    private writeInstallManifest(input: UpgradeApplyInput): void {
        const installer = new LaneTaskProfileInstaller(input.runtimeCatalog);
        const pin = installer.install({
            runtimeVersion: input.targetRuntime.runtimeVersion,
            profile: input.currentInstall.taskRuntime.profile,
            cliVersion: input.currentInstall.cliVersion,
            configTargetRelative: input.taskRuntimeTargets.configTargetRelative,
            moduleTargetRelative: input.taskRuntimeTargets.moduleTargetRelative
        });
        const next: InstallManifestV1 = {
            schemaVersion: 1,
            cliVersion: input.currentInstall.cliVersion,
            runtimeVersion: input.targetRuntime.runtimeVersion,
            knowledgeVersion: input.targetKnowledge.knowledgeVersion,
            mode: 'linked',
            taskRuntime: pin,
            managedAssets: nextManagedAssets(input.plan)
        };
        const installJsonPath = buildLaneFilePath(input.laneDir, 'install.json');
        const directory = dirname(installJsonPath);
        const tempPath = installStagingTempPath(installJsonPath);
        this.fileSystem.removeIfExists(tempPath);
        this.fileSystem.writeFileExclusive(tempPath, `${JSON.stringify(next, null, 2)}\n`);
        this.fileSystem.renameAtomic(tempPath, installJsonPath);
        this.fileSystem.fsyncDirectory(directory);
    }
}

function assertNoConflicts(plan: UpgradePlan): void {
    if (plan.conflicts.length === 0) return;
    throw createWatchtowerError('ERR_MANAGED_CONFLICT', {
        operation: 'apply upgrade', target: plan.conflicts[0].path,
        remediation: 'Resolve the regular-file collision, then rerun the preview before applying an upgrade.'
    });
}

function nextManagedAssets(plan: UpgradePlan): Readonly<Record<string, {readonly target: string; readonly sha256: `sha256:${string}`}>> {
    const result: Record<string, {readonly target: string; readonly sha256: `sha256:${string}`}> = {};
    for (const entry of [...plan.preserved, ...plan.changed, ...plan.added]) {
        result[entry.path] = {target: entry.targetTarget as string, sha256: entry.targetSha256 as `sha256:${string}`};
    }
    return result;
}

function alreadyLinked(observation: {readonly kind: string; readonly target: string | null}, targetPath: string): boolean {
    return observation.kind === 'symlink' && observation.target === targetPath;
}

function requireNonNull<T>(value: T | null, path: string, reason: UpgradeApplyReason, message: string): T {
    if (value === null) throw stagingError(reason, path, message);
    return value;
}

function stagingError(reason: UpgradeApplyReason, path: string, message: string): Error & {readonly reason: UpgradeApplyReason} {
    const error = new Error(message) as Error & {reason: UpgradeApplyReason};
    error.reason = reason;
    Object.assign(error, {path});
    return error;
}

function toFailure(path: string, error: unknown): UpgradeApplyFailure {
    if (error instanceof Error && 'reason' in error && typeof (error as {reason?: unknown}).reason === 'string') {
        return {reason: (error as {reason: UpgradeApplyReason}).reason, path, message: error.message};
    }
    return {reason: 'IO_UNAVAILABLE', path, message: error instanceof Error ? error.message : 'unexpected failure'};
}

function successResult(
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

function failureResult(
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
