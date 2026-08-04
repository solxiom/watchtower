export {UpgradePlanner} from './UpgradePlanner.js';
export type {UpgradePlannerOptions} from './UpgradePlanner.js';
export {UpgradePreviewSource} from './UpgradePreviewSource.js';
export type {UpgradePreviewSourceOptions, UpgradeSourceQuery} from './UpgradePreviewSource.js';
export {nodeUpgradeFileSystem} from './upgradeFileSystem.js';
export type {UpgradeFileSystem, UpgradePathKind} from './upgradeFileSystem.js';
export {MigrationRegistry} from './MigrationRegistry.js';
export type {MigrationRegistryOptions} from './MigrationRegistry.js';
export {stageMigrationPlan} from './MigrationSteps.js';
export {
    validateMigrationSnapshot, validatePreservationPolicy, validateRegistryOptions, validateSchemaVersion,
    validateStagingPlan, validateStepDefinition
} from './migrationValidation.js';
export {UpgradeApply} from './UpgradeApply.js';
export type {TaskRuntimeRelativeTargets, UpgradeApplyInput, UpgradeApplyOptions} from './UpgradeApply.js';
export {UpgradeRecovery} from './UpgradeRecovery.js';
export type {DowngradeGuardInput, UpgradeRecoveryOptions} from './UpgradeRecovery.js';
export {nodeUpgradeApplyFileSystem} from './upgradeApplyFileSystem.js';
export type {UpgradeApplyFileSystem, UpgradeLinkKind, UpgradeLinkObservation} from './upgradeApplyFileSystem.js';
