/**
 * Public capsule for the lane store foundation (`docs/spec/v1.md` §7.2-§7.5,
 * LC-03). Owns the complete, side-effect-free lane directory layout and the
 * whole-document generation of `lane.json`, `install.json`,
 * `repositories.local.json`, and `lane.config.env` from an accepted
 * `InitPlan` (LC-01) and its bound `ConsumedPack` (LC-02). Materialization
 * itself belongs to `TransactionalWriter`; this module never touches the
 * filesystem.
 */
export {buildLaneLayout} from './laneLayoutPlanner.js';
export {generateLaneManifest} from './laneManifestGenerator.js';
export {generateInstallManifest} from './installManifestGenerator.js';
export {generateRepositoriesLocal} from './repositoriesLocalGenerator.js';
export {generateLaneConfig} from './laneConfigGenerator.js';
export type {
    InstallManifestInputs,
    LaneFile,
    LaneLayout,
    LaneLayoutInputs,
    LaneManagedLink,
    RuntimeAssetRef
} from './laneStoreContracts.js';
