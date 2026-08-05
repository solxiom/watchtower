/** Closed vocabulary shared by the coordinator routing foundation. */
export type RoutingDecisionClass = 'M0' | 'D1' | 'D2' | 'D3';
export type RoutingCapabilityClass = 'C2' | 'C3' | 'C5';

export const ROUTING_DECISION_CLASSES: readonly RoutingDecisionClass[] = Object.freeze(['M0', 'D1', 'D2', 'D3']);
export const ROUTING_CAPABILITY_CLASSES: readonly RoutingCapabilityClass[] = Object.freeze(['C2', 'C3', 'C5']);

export interface RoutingRule {
    readonly ruleId: string;
    readonly guardId: string;
    readonly decisionClass: RoutingDecisionClass;
    readonly minimumCapability?: RoutingCapabilityClass;
    readonly permittedProposalTypes: readonly string[];
    readonly hold: 'none' | 'system' | 'impact-scoped';
}

export interface RoutingGuardFacts {
    readonly matches: Readonly<Record<string, boolean>>;
}

export interface RoutingEndpointCandidate {
    readonly endpointId: string;
    readonly capabilityClass: RoutingCapabilityClass;
    readonly hardEligibility: Readonly<Record<string, boolean>>;
    readonly economicsRank?: number;
    readonly capacityPoolId: string;
}

export interface RouteSelection {
    readonly endpointId: string;
    readonly capacityPoolId: string;
    readonly decisionClass: Exclude<RoutingDecisionClass, 'M0'>;
    readonly minimumCapability: RoutingCapabilityClass;
    readonly economicsRank: number | null;
}

export interface RoutingClassification {
    readonly ruleId: string;
    readonly decisionClass: RoutingDecisionClass;
    readonly minimumCapability: RoutingCapabilityClass | null;
    readonly permittedProposalTypes: readonly string[];
    readonly hold: RoutingRule['hold'];
    readonly policyVersion: string;
    readonly policyDigest: string;
    readonly knowledgeVersion: string;
    readonly knowledgeProvenance: {
        readonly repository: string;
        readonly commit: string;
        readonly importRecordSha256: string;
    };
}
