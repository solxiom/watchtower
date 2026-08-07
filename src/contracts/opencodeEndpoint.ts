import type {JsonValue, LaneRuntimeContext, TaskLeafCapability} from './index.js';
import type {EndpointFingerprint, EndpointProfile, EndpointReservationAuthorization} from './endpointEligibility.js';
import type {EndpointReservationAuthority} from './endpointReservationAuthority.js';

export const OPENCODE_ENDPOINT_REASONS = [
    'invalid-request', 'wrong-adapter', 'unsupported-model', 'identity-mismatch', 'stale-fingerprint', 'catalog-mismatch',
    'pool-exhausted', 'disabled', 'support-mode', 'ineligible', 'unavailable', 'cancelled', 'timeout', 'truncated-output',
    'ambiguous-output', 'malformed-output', 'output-limit', 'execution-failed'
] as const;

export type OpenCodeEndpointReason = typeof OPENCODE_ENDPOINT_REASONS[number];

/** Maximum stdout bytes the adapter accepts for unattended parsing. */
export const OPENCODE_MAX_OUTPUT_BYTES = 4 * 1024 * 1024;

export interface OpenCodeDecisionRequest {
    readonly endpoint: EndpointProfile;
    readonly fingerprint: EndpointFingerprint;
    readonly expectedFingerprint: `sha256:${string}`;
    readonly catalogFingerprint: string;
    readonly reservationAuthorization: EndpointReservationAuthorization;
    readonly envelope: JsonValue;
    readonly workspace: string;
    readonly context: LaneRuntimeContext;
    readonly timeoutMs: number;
    readonly maxOutputBytes: number;
}

export interface OpenCodeDecisionResult {
    readonly outcome: 'completed';
    readonly endpointId: string;
    readonly fingerprint: `sha256:${string}`;
    readonly catalogFingerprint: string;
    readonly result: JsonValue;
    readonly stdoutBytes: number;
}

export interface OpenCodeDecisionFailure {
    readonly outcome: 'failed';
    readonly endpointId: string;
    readonly reason: OpenCodeEndpointReason;
    readonly diagnostic: string;
}

export type OpenCodeDecisionOutcome = OpenCodeDecisionResult | OpenCodeDecisionFailure;

export interface OpenCodeEndpointAdapterOptions {
    readonly leaf: TaskLeafCapability;
    readonly leafId: string;
    readonly reservationAuthority: EndpointReservationAuthority;
    readonly now?: () => number;
}
