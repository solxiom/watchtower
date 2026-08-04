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
import {dirname, join} from 'node:path';
import type {AssetClassificationEntry, UpgradePlan} from '../../contracts/upgrade.js';
import type {InstallManifestV1} from '../../contracts/manifests.js';
import type {KnowledgeManifestV1, RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import type {ApplyResult, StagedAssetRecord, UpgradeApplyFailure} from '../../contracts/upgradeApply.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {buildLaneFilePath} from '../paths/index.js';
import {LaneTaskProfileInstaller, RuntimeCatalog} from '../runtime/index.js';
import {acquireWriteLock} from '../storage/sqliteWriteLock.js';
import {MigrationRegistry} from './MigrationRegistry.js';
import {stageMigrationPlan} from './MigrationSteps.js';
import {installStagingTempPath, nodeUpgradeApplyFileSystem, stagingTempPath, type UpgradeApplyFileSystem} from './upgradeApplyFileSystem.js';
import {
    alreadyLinked, assertChecksum, assertNoTamperedCollision, failureResult, nextManagedAssets, requireNonNull,
    resolveManagedLinkSourcePath, successResult, toFailure
} from './upgradeApplyValidation.js';

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
}

export interface UpgradeApplyOptions { readonly fileSystem?: UpgradeApplyFileSystem; readonly runtimeCatalog?: RuntimeCatalog; }

export class UpgradeApply {
    private readonly fileSystem: UpgradeApplyFileSystem;
    private readonly runtimeCatalog: RuntimeCatalog;

    constructor(options: UpgradeApplyOptions = {}) {
        this.fileSystem = options.fileSystem ?? nodeUpgradeApplyFileSystem;
        this.runtimeCatalog = options.runtimeCatalog ?? new RuntimeCatalog();
    }

    async apply(input: UpgradeApplyInput): Promise<ApplyResult> {
        assertNoConflicts(input.plan);
        const lockPath = join(input.laneDir, 'state', 'lane.lock');
        const lock = await acquireWriteLock(lockPath);
        try {
            const migrated = this.runMigration(input.plan);
            const entries = [...input.plan.added, ...input.plan.changed];
            const staged = this.stageEntries(input, entries);
            if (staged.failure !== null) return failureResult(input.plan, migrated, staged);
            const manifestFailure = this.writeInstallManifest(input);
            if (manifestFailure !== null) return failureResult(input.plan, migrated, {...staged, failure: manifestFailure});
            return successResult(input.plan, migrated, staged);
        } finally {
            await lock.release();
        }
    }

    private runMigration(plan: UpgradePlan): readonly string[] {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [LANE_SCHEMA_VERSION], steps: []});
        const migrationPlan = registry.plan(plan.from.laneSchemaVersion, LANE_SCHEMA_VERSION);
        return stageMigrationPlan(registry, migrationPlan, {}).appliedStepIds;
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
        assertChecksum(
            (path) => this.fileSystem.digestFile(path), entry.path, targetPath, declaredSha256, input.targetRuntimeRoot, input.targetRuntime
        );
        const sourcePath = resolveManagedLinkSourcePath(input.laneDir, entry.path);
        const observation = this.fileSystem.inspectLink(sourcePath);
        if (alreadyLinked(observation, targetPath)) return null;
        assertNoTamperedCollision(entry, observation);
        return this.stageAndRename(sourcePath, targetPath, entry.path);
    }

    private stageAndRename(sourcePath: string, targetPath: string, path: string): StagedAssetRecord {
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
        return {path, tempPath, targetPath, renamed: true};
    }

    /**
     * Returns a data-shaped `UpgradeApplyFailure` for any failure strictly
     * before the manifest rename (the commit point) — nothing durable
     * changed, so the caller may safely retry. A failure at or after the
     * rename is an uncertain/post-commit outcome and propagates as a thrown
     * exception instead: the mutation may have already happened, so the
     * caller must resolve durable state (via `UpgradeRecovery`) before
     * retrying, never assume `success: false`.
     */
    private writeInstallManifest(input: UpgradeApplyInput): UpgradeApplyFailure | null {
        const pin = new LaneTaskProfileInstaller(this.runtimeCatalog).install({
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
        try {
            this.fileSystem.removeIfExists(tempPath);
            this.fileSystem.writeFileExclusive(tempPath, `${JSON.stringify(next, null, 2)}\n`);
        } catch (error) {
            this.fileSystem.removeIfExists(tempPath);
            return toFailure('install.json', error);
        }
        this.fileSystem.renameAtomic(tempPath, installJsonPath);
        this.fileSystem.fsyncDirectory(directory);
        return null;
    }
}

function assertNoConflicts(plan: UpgradePlan): void {
    if (plan.conflicts.length === 0) return;
    throw createWatchtowerError('ERR_MANAGED_CONFLICT', {
        operation: 'apply upgrade', target: plan.conflicts[0].path,
        remediation: 'Resolve the regular-file collision, then rerun the preview before applying an upgrade.'
    });
}
