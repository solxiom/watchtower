/**
 * Public capsule for the coordinator/session policy baseline foundation
 * (`docs/spec/v1.md` §11.1, LC-05). Owns verified routing/context policy
 * materialization and the empty durable coordinator roots this batch is
 * responsible for; see `coordinatorBaseline/` for the individual owners.
 */
export {buildCoordinatorBaseline, composeLaneLayoutWithCoordinatorBaseline} from './coordinatorBaselineBuilder.js';
export {buildContextPolicyDocument} from './contextPolicyBaseline.js';
export {buildRoutingPolicyDocument} from './routingPolicyProjection.js';
export {buildDurableRoots} from './durableRootsPlanner.js';
export {nodeKnowledgeProvenanceHost, resolveInstalledKnowledgeTag} from './knowledgeProvenanceHost.js';
export {
    DecisionEnvelopeBuilder, DecisionEnvelopeError, computeEnvelopeDigest, verifyEnvelopeDigest,
    parseDecisionEnvelope, validateDecisionEnvelope
} from './DecisionEnvelope.js';
export type {
    DecisionEnvelopeBuilderOptions, EnvelopeIndexQuery, EnvelopeJournalProjection, EnvelopeParams,
    EnvelopeRouteDecision, EnvelopeReason, EnvelopeVerificationInput
} from './DecisionEnvelope.js';
export type {
    ContextPolicyDocument,
    CoordinatorBaselineInputs,
    CoordinatorBaselineLayout,
    InstalledKnowledgeTag,
    KnowledgeProvenancePort,
    OperatorSessionPolicy,
    RoutingPolicyDocument
} from './coordinatorBaselineContracts.js';
