/**
 * Public capsule for the coordinator/session policy baseline foundation
 * (`docs/spec/v1.md` §11.1, LC-05). Owns verified routing/context policy
 * materialization and the empty durable coordinator roots this batch is
 * responsible for; see `coordinatorBaseline/` for the individual owners.
 */
export {buildCoordinatorBaseline, composeLaneLayoutWithCoordinatorBaseline} from './coordinatorBaseline/coordinatorBaselineBuilder.js';
export {buildContextPolicyDocument} from './coordinatorBaseline/contextPolicyBaseline.js';
export {buildRoutingPolicyDocument} from './coordinatorBaseline/routingPolicyProjection.js';
export {buildDurableRoots} from './coordinatorBaseline/durableRootsPlanner.js';
export {nodeKnowledgeProvenanceHost, resolveInstalledKnowledgeTag} from './coordinatorBaseline/knowledgeProvenanceHost.js';
export type {
    ContextPolicyDocument,
    CoordinatorBaselineInputs,
    CoordinatorBaselineLayout,
    InstalledKnowledgeTag,
    KnowledgeProvenancePort,
    OperatorSessionPolicy,
    RoutingPolicyDocument
} from './coordinatorBaseline/coordinatorBaselineContracts.js';
