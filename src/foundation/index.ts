// Foundation root — command-facing domain barrels only (T3). Named re-exports only; no wildcards.
export {
    LaneListService,
    ResolvedConfigService,
    digestLaneListQuery,
    MAX_LIST_PAGE_SIZE,
    paginateLaneList,
    validateLaneListPageInput
} from './read/index.js';
export type {LaneListQuery, LaneListServiceOptions, ResolvedConfigQuery, ResolvedConfigServiceOptions} from './read/index.js';
export {StatusProjection} from './status/index.js';
export type {StatusProjectionOptions, StatusProjectionQuery} from './status/index.js';
export {InitPlanner, validateInitRequest} from './init/index.js';
export type {InitPlan, InitRequest, CoordinatorRoutingPolicy} from './init/index.js';
export {UpgradePlanner, UpgradePreviewSource} from './upgrade/index.js';
export type {UpgradePlannerOptions, UpgradePreviewSourceOptions, UpgradeSourceQuery} from './upgrade/index.js';
export {buildCommandError, buildCommandResult, renderError, renderResult} from './presentation/index.js';
export {
    confirmationRequiredError,
    createClaudeHostAdapter,
    createCodexHostAdapter,
    createCursorHostAdapter,
    HOST_NAMES,
    INSTALL_SCOPES,
    resolveHostAdapter,
    resolveKnowledgeRoot
} from './hostAdapters/index.js';
export type {HostAdapter, HostName, InstallScope, PreviewResult, ResolvedKnowledgePack} from './hostAdapters/index.js';
export {RuntimeCatalog, ManagedAssets} from './runtime/index.js';
export type {RuntimeCatalogOptions, ManagedAssetsOptions} from './runtime/index.js';
export {LaneTaskCatalog, NirvanaLaneTaskRunner} from './task/index.js';
export {CoordinatorIndexBuildService, INDEX_BUILD_ACTION} from './index/assembly/index.js';
export {createDefaultIndexBuildComposition} from './index/assembly/IndexBuildComposition.js';
export type {IndexBuildService, IndexBuildRequestSource} from './index/assembly/index.js';
export type {LaneTaskRunner, NirvanaLaneTaskRunnerOptions} from './task/index.js';
export {OpenCodeEndpointAdapter} from './endpoint/index.js';
export {resolveWatchtowerDataHome, validateWatchtowerDataHome} from './paths/index.js';
