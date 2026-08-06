/** Closed contract for one bounded coordinator decision envelope (§8.1). */

export type DecisionClass = 'D1' | 'D2' | 'D3';
export type CapabilityClass = 'C2' | 'C3' | 'C5';
export type EnvelopeDigest = `sha256:${string}`;
export type EvidenceSource = 'index' | 'journal' | 'routing' | 'untrusted';

export interface EvidenceReference {
    readonly reference: string;
    readonly source: EvidenceSource;
}

export interface EnvelopeReference {
    readonly repository: string;
    readonly path: string;
    readonly digest: EnvelopeDigest;
}

export interface EnvelopeTrigger {
    readonly eventId: string;
    readonly event: string;
    readonly batchId: string;
    readonly causationId?: string | null;
    readonly evidenceRefs?: readonly string[];
    readonly impactScope?: readonly string[];
}

export interface LaneProjection {
    readonly status: string;
    readonly activeBatch: string | null;
    readonly accepted: readonly string[];
    readonly ready: readonly string[];
    readonly blocked: readonly string[];
}

export interface EnvelopeBatch {
    readonly id: string;
    readonly briefRef: EnvelopeReference;
    readonly reasoningClass: string;
    readonly repositories: readonly string[];
}

export interface EnvelopeBudget {
    readonly inputSoft: number;
    readonly inputHard: number;
    readonly outputHard: number;
    readonly unit: 'estimated-tokens';
}

export interface PackIndexProvenance {
    readonly packSealId: string;
    readonly manifestDigest: EnvelopeDigest;
    readonly compilerVersion: string;
}

export interface IndexBatchSummary {
    readonly batchId: string;
    readonly title: string;
    readonly primaryRepository: string;
    readonly reasoningClass: string;
    readonly workload: string;
    readonly workBriefRef: string;
    readonly reviewBriefRef: string;
    readonly dependencyIds: readonly string[];
    readonly requirementIds: readonly string[];
}

export interface IndexContextSection {
    readonly packSealId: string;
    readonly relevantBatches: readonly IndexBatchSummary[];
    readonly evidenceRefs: readonly EvidenceReference[];
    readonly impactScope: readonly string[];
    readonly truncated: boolean;
}

export interface JournalEventReference {
    readonly eventId: string;
    readonly type: string;
    readonly sequence: number;
    readonly at: string;
    readonly batchId: string | null;
    readonly cycleId: string | null;
    readonly causationId: string | null;
}

export interface ProjectionSummary {
    readonly state: string;
    readonly lastEventType: string | null;
    readonly eventCount: number;
}

export interface JournalContextSection {
    readonly recentEvents: readonly JournalEventReference[];
    readonly cycle: ProjectionSummary;
    readonly batch: ProjectionSummary;
    readonly eventRefs: readonly EvidenceReference[];
    readonly impactScope: readonly string[];
    readonly maxJournalEntries: number;
    readonly truncated: boolean;
}

export interface EndpointAvailability {
    readonly available: boolean;
    readonly eligibleCount: number;
    readonly capacityPoolId: string | null;
}

export interface RoutingContextSection {
    readonly matchedRuleId: string;
    readonly decisionClass: DecisionClass;
    readonly minimumCapability: CapabilityClass;
    readonly permittedProposalTypes: readonly string[];
    readonly policyVersion: string;
    readonly policyDigest: EnvelopeDigest;
    readonly endpointAvailability: EndpointAvailability;
    readonly evidenceRefs: readonly EvidenceReference[];
    readonly impactScope: readonly string[];
}

export interface UntrustedContentEntry {
    readonly source: 'operator' | 'coordinator-response' | 'external';
    readonly content: string;
}

export interface UntrustedSection {
    readonly trust: 'untrusted';
    readonly beginMarker: 'BEGIN UNTRUSTED CONTENT';
    readonly entries: readonly UntrustedContentEntry[];
    readonly endMarker: 'END UNTRUSTED CONTENT';
}

export interface BoundedContext {
    readonly indexContext: IndexContextSection;
    readonly journalContext: JournalContextSection;
    readonly routingContext: RoutingContextSection;
    readonly untrustedContent: UntrustedSection;
}

export interface DecisionEnvelope {
    readonly schemaVersion: 1;
    readonly cycleId: string;
    readonly laneId: string;
    readonly initiativeId: string;
    readonly decisionClass: DecisionClass;
    readonly routingRuleId: string;
    readonly packIndex: PackIndexProvenance;
    readonly trigger: EnvelopeTrigger;
    readonly laneProjection: LaneProjection;
    readonly batch: EnvelopeBatch;
    readonly findingRefs: readonly EnvelopeReference[];
    readonly permittedProposalTypes: readonly string[];
    readonly budget: EnvelopeBudget;
    readonly boundedContext: BoundedContext;
    readonly createdAt: string;
    readonly expiresAt: string;
    readonly semanticDigest: EnvelopeDigest;
}
