/**
 * UK-03 closed contracts for the atomic upgrade-apply, crash-recovery, and
 * downgrade-guard boundary (`docs/spec/v1.md` §11.5, §14;
 * `docs/spec/v1-contracts.md` §11). These shapes extend the UK-01
 * `upgradePlan` schema definition (`additionalProperties: true`), so an
 * applied result validates against the same public `upgradePlan` schema def
 * with `applied: true` plus the extra fields below.
 */

/** One managed-asset staging outcome recorded during an atomic apply attempt. */
export interface StagedAssetRecord {
    readonly path: string;
    readonly tempPath: string;
    readonly targetPath: string;
    readonly renamed: boolean;
}

/** Stable reason codes this boundary raises, closed against the registered `ErrorCode` set. */
export type UpgradeApplyReason =
    | 'MANAGED_COLLISION'
    | 'CHECKSUM_MISMATCH'
    | 'TARGET_MISSING'
    | 'MIGRATION_FAILED'
    | 'IO_UNAVAILABLE';

export interface UpgradeApplyFailure {
    readonly reason: UpgradeApplyReason;
    readonly path: string;
    readonly message: string;
}

/** Result of `UpgradeApply.apply()`: success carries the full applied plan; failure carries staging evidence for recovery. */
export interface ApplyResult {
    readonly success: boolean;
    readonly applied: boolean;
    readonly from: {readonly runtimeVersion: string; readonly knowledgeVersion: string; readonly laneSchemaVersion: number};
    readonly to: {readonly runtimeVersion: string; readonly knowledgeVersion: string};
    readonly changed: readonly string[];
    readonly unchanged: readonly string[];
    readonly preserved: readonly string[];
    readonly migrated: readonly string[];
    readonly conflicts: readonly string[];
    readonly stagedCount: number;
    readonly partialStagingPaths: readonly string[];
    /** Managed-asset paths reconciled back to `currentInstall`'s declared target after a pre-commit failure. */
    readonly restoredLinks: readonly string[];
    readonly failure: UpgradeApplyFailure | null;
}

export type OldManifestStatus = 'valid' | 'invalid' | 'missing';

/** Result of `UpgradeRecovery.recover()`: cleans staged temp artifacts and proves the old install remains authoritative. */
export interface RecoveryResult {
    readonly recovered: boolean;
    readonly artifactsCleaned: readonly string[];
    readonly oldManifestStatus: OldManifestStatus;
    readonly oldRuntimeInvocable: boolean;
    /** Managed-asset paths whose live link was reconciled back to the authoritative install manifest's declared target. */
    readonly linksRestored: readonly string[];
}

export type DowngradeGuardReason = 'DOWNGRADE_NOT_ALLOWED' | 'DOWNGRADE_SCHEMA_INCOMPATIBLE';

/** Result of `UpgradeRecovery.guardDowngrade()`: a pre-mutation check with no side effects. */
export interface DowngradeGuardResult {
    readonly allowed: boolean;
    readonly reason: DowngradeGuardReason | null;
    readonly incompatibleField: string | null;
}
