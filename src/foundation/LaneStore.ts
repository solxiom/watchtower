/**
 * Public capsule for the lane store foundation (`docs/spec/v1.md` §7.2-§7.5,
 * LC-03). Owns the complete, side-effect-free lane directory layout and the
 * whole-document generation of `lane.json`, `install.json`,
 * `repositories.local.json`, and `lane.config.env` from an accepted
 * `InitPlan` (LC-01) and its bound `ConsumedPack` (LC-02). Materialization
 * itself belongs to `TransactionalWriter`; this module never touches the
 * filesystem.
 */
export {buildLaneLayout} from './laneStore/laneLayoutPlanner.js';
export {generateLaneManifest} from './laneStore/laneManifestGenerator.js';
export {generateInstallManifest} from './laneStore/installManifestGenerator.js';
export {generateRepositoriesLocal} from './laneStore/repositoriesLocalGenerator.js';
export {generateLaneConfig} from './laneStore/laneConfigGenerator.js';
export type {
    InstallManifestInputs,
    LaneFile,
    LaneLayout,
    LaneLayoutInputs,
    LaneManagedLink,
    RuntimeAssetRef
} from './laneStore/laneStoreContracts.js';
