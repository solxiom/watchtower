/**
 * Closed contracts for the CA-08 context broker and cycle-budget foundation
 * (`docs/spec/coordinator-automation.md` §10, `docs/spec/v1-contracts.md`
 * §6/§7). The broker exposes brokered typed context by reference kind
 * (§10.1), never unrestricted filesystem or full-index access; the ledger
 * tracks per-cycle budget consumption against a caller-supplied
 * `CycleBudgetLimits` and per-endpoint shared-pool token usage against
 * CA-06's `CapacityPoolUsage`. All content this batch returns is `JsonValue`;
 * no field is a broad `any`.
 */
import type {EnvelopeDigest, EvidenceSource} from './decision.js';
import type {JsonValue} from './types.js';

/** `docs/spec/coordinator-automation.md` §10.1 brokered reference vocabulary. */
export const BROKER_REFERENCE_KINDS = [
    'batch-brief',
    'review-finding',
    'recent-events',
    'repository-state',
    'tracker-projection',
    'dependency-neighborhood',
    'policy-fragment',
    'push-journal'
] as const;
export type BrokerReferenceKind = typeof BROKER_REFERENCE_KINDS[number];

export const BROKER_REASONS = [
    'BROKER_KIND_UNSUPPORTED',
    'BROKER_KIND_NOT_ALLOWLISTED',
    'BROKER_REFERENCE_INVALID',
    'BROKER_DIGEST_MISMATCH',
    'BROKER_SOFT_LIMIT_EXCEEDED',
    'BROKER_HARD_LIMIT_EXCEEDED',
    'BROKER_REQUEST_LIMIT_EXCEEDED',
    'BROKER_LIMITS_INVALID',
    'BROKER_SOFT_LIMIT_JUSTIFICATION_REQUIRED',
    'BROKER_UNKNOWN_TELEMETRY_FOR_HARD_LIMIT',
    'BROKER_CAPACITY_POOL_UNKNOWN',
    'BROKER_CAPACITY_EXHAUSTED',
    'BROKER_CAPACITY_QUOTA_EXCEEDED',
    'BROKER_ENDPOINT_NOT_IN_POOL',
    'BROKER_EVENT_APPEND_FAILED'
] as const;
export type BrokerReason = typeof BROKER_REASONS[number];

/** Reported/estimated/unknown telemetry quality (`docs/spec/v1-contracts.md` §6/§7). */
export type TelemetryQuality = 'reported' | 'estimated' | 'unknown';

/** Per-request record/depth/node bounds and an opaque continuation cursor (`docs/spec/coordinator-automation.md` §9.4). */
export interface BrokerQueryBounds {
    readonly recordLimit?: number;
    readonly depthLimit?: number;
    readonly nodeLimit?: number;
    readonly cursor?: string;
}

export interface BrokerReferenceRequest {
    readonly kind: BrokerReferenceKind;
    readonly ref: string;
    readonly expectedDigest?: EnvelopeDigest;
    readonly maxBytes: number;
    /** Required once the cycle is at `soft` level; §10.2 "requires justification for more context". */
    readonly justification?: string;
    readonly bounds?: BrokerQueryBounds;
}

export interface BrokerContentProvenance {
    readonly source: EvidenceSource;
    readonly digest: EnvelopeDigest;
    readonly ref: string;
}

/** Closed pagination/truncation envelope every bounded query kind reports, mirroring CA-02's `QueryPage`. */
export interface BrokerPage {
    readonly nextCursor: string | null;
    readonly truncated: boolean;
    readonly totalCount: number | null;
    readonly depthLimit: number | null;
    readonly depthReached: number | null;
    readonly nodeLimit: number | null;
}

export interface BrokerResponse {
    readonly kind: BrokerReferenceKind;
    readonly content: JsonValue;
    readonly provenance: BrokerContentProvenance;
    readonly byteLength: number;
    readonly truncated: boolean;
    readonly estimatedTokens: number;
    readonly tokenEstimateQuality: TelemetryQuality;
    readonly page: BrokerPage;
    readonly redacted: boolean;
    readonly redactedKeys: readonly string[];
}

/** Caller-supplied, policy-resolved bounds for one cycle (never hardcoded by this capsule). */
export interface CycleBudgetLimits {
    readonly inputSoft: number;
    readonly inputHard: number;
    readonly outputHard: number;
    readonly contextRequestsHard: number;
    readonly wallClockHardMs: number;
    readonly cumulativeBatchSoft: number;
    readonly cumulativeBatchHard: number;
    readonly cumulativeLaneSoft: number;
    readonly cumulativeLaneHard: number;
    readonly unit: 'estimated-tokens';
}

export interface CycleBudgetState {
    readonly cycleId: string;
    readonly batchId: string;
    readonly laneId: string;
    readonly estimatedInputTokens: number;
    readonly hostReportedInputTokens: number | null;
    readonly brokerLoadedBytes: number;
    readonly outputTokens: number;
    readonly wallClockMs: number;
    readonly contextRequestCount: number;
    readonly retryEscalationCount: number;
    readonly cumulativeBatchUsageTokens: number;
    readonly cumulativeLaneUsageTokens: number;
}

export interface CycleBudgetDebit {
    readonly estimatedInputTokens?: number;
    readonly hostReportedInputTokens?: number;
    readonly outputTokens?: number;
    readonly wallClockMs?: number;
    readonly brokerBytes?: number;
    readonly contextRequests?: number;
    readonly retryEscalation?: boolean;
}

export type BudgetLimitLevel = 'ok' | 'soft' | 'hard';

export interface CycleBudgetCheck {
    readonly level: BudgetLimitLevel;
    readonly exceededDimensions: readonly string[];
}

export interface CycleBudgetResult {
    readonly state: CycleBudgetState;
    readonly check: CycleBudgetCheck;
}

/** One endpoint's reported usage for a single decision-cycle invocation. */
export interface EndpointUsageRecord {
    readonly endpointId: string;
    readonly capacityPoolId: string;
    readonly tokens: number;
    readonly telemetryQuality: TelemetryQuality;
}

/** Accumulated shared-pool usage; `capacityPoolId` is the sole grouping key (CA-06 §6). `endpointIds` is the resolved snapshot's own member list — usage for any other endpoint id is refused rather than silently attributed to this pool. */
export interface CapacityPoolLedgerState {
    readonly capacityPoolId: string;
    readonly endpointIds: readonly string[];
    readonly limitSlots: number;
    readonly availableSlotsAtSnapshot: number;
    readonly cumulativeTokens: number;
    readonly usageCount: number;
    readonly worstTelemetryQuality: TelemetryQuality;
}

export interface EndpointUsageLimits {
    readonly monetaryHardLimitTokens: number | null;
}

/** The durable audit record for `docs/spec/coordinator-automation.md` §10.1 step 5; `eventId` is a deterministic idempotency key. */
export interface ContextRequestedEvent {
    readonly eventId: string;
    readonly cycleId: string;
    readonly laneId: string;
    readonly batchId: string;
    readonly kind: BrokerReferenceKind;
    readonly ref: string;
    readonly digest: EnvelopeDigest;
    readonly byteLength: number;
    readonly requestedAt: string;
}

export type ContextRequestedAppendStatus = 'appended' | 'duplicate';

export interface ContextRequestedAppendResult {
    readonly status: ContextRequestedAppendStatus;
    readonly eventId: string;
}
