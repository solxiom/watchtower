import type {JsonObject} from './types.js';

export type EndpointSupportMode = 'unattended' | 'advisory-confirmed' | 'skill-only';
export type EndpointAvailability = 'available' | 'unavailable' | 'unknown';
export type EndpointCapabilityClass = 'C2' | 'C3' | 'C5';
export type EndpointReasoningClass = 'R1' | 'R2' | 'R3' | 'R4' | 'R5';
export type EndpointContextClass = 'small' | 'medium' | 'large';

export interface EndpointFingerprint {
    readonly executable: string;
    readonly adapterVersion: string;
    readonly route: string;
    readonly catalog: string;
    readonly model: string;
    readonly effort: string;
    readonly capabilityEvidence: string;
}

export interface EndpointCapabilities {
    readonly capabilityClass: EndpointCapabilityClass;
    readonly reasoningClass: EndpointReasoningClass;
    readonly contextClass: EndpointContextClass;
    readonly roles: readonly string[];
    readonly evidence: 'adapter-reported' | 'watchtower-verified' | 'operator-approved' | 'estimated' | 'unknown';
}

export interface EndpointConformance {
    readonly launchable: boolean;
    readonly argvArray: boolean;
    readonly explicitCwd: boolean;
    readonly environmentAllowlist: boolean;
    readonly boundedInput: boolean;
    readonly singleJsonResult: boolean;
    readonly writeDenied: boolean;
    readonly brokeredContext: boolean;
    readonly interruptible: boolean;
    readonly boundedOutput: boolean;
    readonly installableKnowledge: boolean;
}

export interface EndpointProfile {
    readonly schemaVersion: 1;
    readonly endpointId: string;
    readonly toolId: string;
    readonly adapterId: string;
    readonly hostId: string;
    readonly osUser: string;
    readonly routeId: string;
    readonly capacityPoolId: string;
    readonly catalogId: string;
    readonly model: string;
    readonly effort: string;
    readonly enabled: boolean;
    readonly availability: EndpointAvailability;
    readonly capabilities: EndpointCapabilities;
    readonly conformance: EndpointConformance;
    readonly fingerprint: EndpointFingerprint;
}

export interface EligibilityFacts {
    readonly roleSupported: boolean | 'unknown';
    readonly hostFeatures: boolean | 'unknown';
    readonly traversable: boolean | 'unknown';
    readonly repositoryAccess: boolean | 'unknown';
    readonly policyAllowed: boolean | 'unknown';
    readonly capacityAvailable: boolean | 'unknown';
    readonly reviewerIndependent: boolean | 'unknown';
    readonly proofAvailable: boolean | 'unknown';
    readonly fingerprintCurrent: boolean;
}

export interface EligibilityRequirements {
    readonly role: string;
    readonly minimumCapability: EndpointCapabilityClass;
    readonly minimumContext: EndpointContextClass;
    readonly requiresUnattended: boolean;
    readonly reviewer: boolean;
}

export type EligibilityReason =
    | 'disabled' | 'unavailable' | 'support-mode' | 'role-gap' | 'capability-floor' | 'context-floor'
    | 'host-feature-gap' | 'path-access-gap' | 'repository-access-gap' | 'policy-gap'
    | 'capacity-unavailable' | 'reviewer-independence-gap' | 'proof-gap' | 'stale-fingerprint'
    | 'unknown-fact';

export interface EligibilityResult {
    readonly endpointId: string;
    readonly status: 'eligible' | 'ineligible' | 'unknown';
    readonly reasons: readonly EligibilityReason[];
    readonly capacityPoolId: string;
}

export interface CapacityPoolSnapshot {
    readonly capacityPoolId: string;
    readonly limit: number;
    readonly activeReservations: number;
}

export interface CapacityPoolUsage {
    readonly capacityPoolId: string;
    readonly endpointIds: readonly string[];
    readonly availableSlots: number;
}

export type EndpointJson = JsonObject;
