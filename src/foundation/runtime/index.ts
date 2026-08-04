// Public surface of the runtime capability tree.
// Deliberately NOT exported from this barrel:
//   - leaf process port internals (see runtime/leaf/index.ts)
export {RuntimeCatalog} from './catalog/index.js';
export type {RuntimeCatalogOptions} from './catalog/index.js';
export {ManagedAssets, LaneTaskProfileInstaller} from './distribution/index.js';
export type {ManagedAssetsOptions, LaneTaskProfileInstallRequest} from './distribution/index.js';
export {
    COMPATIBILITY_NAMES,
    resolveCompatibilityName,
    resolveCompatibilityNameFrom,
    requireCompatibilityAction,
    nodeManagedLinkFileSystem,
    parseInstallManifest
} from './distribution/index.js';
export type {
    CompatibilityNameTable,
    ManagedLinkFileSystem,
    ManagedLinkSourceKind,
    ManagedLinkSourceObservation
} from './distribution/index.js';
export {RuntimeKnowledgeManifestValidator} from './knowledge/index.js';
export {parseKnowledgeManifest, parseRuntimeManifest} from './knowledge/index.js';
export {isManagedBinPath} from './distribution/index.js';
export {grantExecutingTaskLeafCapability} from './leaf/index.js';
export type {TaskLeafGrantOptions} from './leaf/index.js';
