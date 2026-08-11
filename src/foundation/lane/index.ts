// Public surface of the lane capability tree.
export {
    buildLaneLayout,
    generateLaneConfig,
    generateLaneManifest,
    generateInstallManifest,
    generateRepositoriesLocal
} from './store/index.js';
export type {
    InstallManifestInputs,
    LaneFile,
    LaneLayout,
    LaneLayoutInputs,
    LaneManagedLink,
    RuntimeAssetRef
} from './store/index.js';
export {commitLane, rollbackStaging, TransactionalWriteError} from './writer/index.js';
export type {WriteError, WriteResult, WriteStage} from './writer/index.js';
export {
    buildCoordinatorBaseline,
    composeLaneLayoutWithCoordinatorBaseline,
    buildContextPolicyDocument,
    buildDurableRoots,
    classifyRoute,
    selectRouteEndpoint,
    verifyRoutingPolicy,
    nodeKnowledgeProvenanceHost,
    resolveInstalledKnowledgeTag
} from './coordinator/index.js';
export {CoordinatorReadService} from './coordinator/index.js';
export type {CoordinatorReadQuery, CoordinatorReadServiceOptions} from './coordinator/index.js';
export type {
    ContextPolicyDocument,
    CoordinatorBaselineInputs,
    CoordinatorBaselineLayout,
    CoordinatorRoutingPolicy,
    InstalledKnowledgeTag,
    KnowledgeProvenancePort,
    OperatorSessionPolicy,
    RoutingPolicyDocument,
    EndpointSelectionInput,
    InstalledRoutingPolicyArtifact,
    InstalledRoutingPolicyManifest,
    RouteClassificationInput,
    RoutingPolicyVerificationInput,
    RoutingPolicyVerificationResult,
    VerifiedRoutingPolicy
} from './coordinator/index.js';
export {
    Ca10CoordinatorEffectAuthority, SpecificationResolutionReadService,
    createDefaultCoordinatorMutationComposition, permittedProposalTypes
} from './coordinator/index.js';
export type {
    CoordinatorEffectAuthority, CoordinatorMutationComposition, CoordinatorMutationRequestSource,
    CoordinatorMutationResolution, CoordinatorMutationSelection, SpecificationResolutionReadOptions
} from './coordinator/index.js';

/**
 * Read-side surface of the CA-13 coordinator queue/cursor projections and the
 * CA-15 operator-session store. Exported so the CA-31 diagnostic providers can
 * reach the accepted owners through this capability barrel instead of reaching
 * into `lane/coordinator/**` internals.
 */
export {readCursorDocument, readQueueDocument} from './coordinator/index.js';
export type {QueueFileSystem} from './coordinator/index.js';
export {SessionStore, OperatorSessionError} from './coordinator/index.js';
export type {
    OperatorSession, SessionJournalReadResult, TurnRecord
} from './coordinator/index.js';
