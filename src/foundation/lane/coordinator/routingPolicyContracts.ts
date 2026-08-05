import type {KnowledgeProvenanceEvidence, RoutingRule, Sha256Digest} from '../../../contracts/index.js';
import type {CoordinatorRoutingPolicy, RoutingPolicyDocument} from './coordinatorBaselineContracts.js';

export interface VerifiedRoutingPolicy {
    readonly routing: CoordinatorRoutingPolicy;
    readonly projection: RoutingPolicyDocument;
    readonly rules: readonly RoutingRule[];
}

export interface RoutingPolicyVerificationInput {
    /** LC-05's already validated, lane-owned coordinator-routing projection. */
    readonly routing: CoordinatorRoutingPolicy;
    readonly projection: unknown;
    /** Verified machine-readable policy artifact supplied by the installed pack. */
    readonly installedPolicyArtifact: unknown;
    readonly installedKnowledge?: unknown;
}

export interface InstalledRoutingPolicyManifest {
    readonly schemaVersion: 1;
    readonly policyVersion: 'shipping-v1';
    readonly rulesDigest: Sha256Digest;
    readonly installedKnowledge: {
        readonly knowledgeVersion: string;
        readonly provenance: KnowledgeProvenanceEvidence;
    };
}

export interface InstalledRoutingPolicyArtifact {
    readonly schemaVersion: 1;
    readonly policyVersion: 'shipping-v1';
    readonly rules: readonly RoutingRule[];
    readonly manifest: InstalledRoutingPolicyManifest;
}

export interface RoutingPolicyVerificationResult {
    readonly policy: VerifiedRoutingPolicy;
    readonly provenance: KnowledgeProvenanceEvidence;
}

export interface RouteClassificationInput {
    readonly policy: VerifiedRoutingPolicy;
    readonly facts: import('../../../contracts/index.js').RoutingGuardFacts;
}

export interface EndpointSelectionInput {
    readonly policy: VerifiedRoutingPolicy;
    readonly classification: import('../../../contracts/index.js').RoutingClassification;
    readonly candidates: readonly import('../../../contracts/index.js').RoutingEndpointCandidate[];
}
