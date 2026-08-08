/** Endpoint eligibility, reservation, and adapter contract surface. */
export type {
    CapacityPoolSnapshot,
    CapacityPoolUsage,
    EndpointAvailability as EndpointAvailabilityStatus,
    EndpointCapabilityClass,
    EndpointCapabilities,
    EndpointConformance,
    EndpointContextClass,
    EndpointFingerprint,
    EndpointProfile,
    EndpointReasoningClass,
    EndpointSupportMode,
    EligibilityFacts,
    EligibilityReason,
    EligibilityRequirements,
    EligibilityResult,
    EndpointReservationAuthorization,
    EndpointReservationCurrentState,
    EndpointReservationEvidence,
    EndpointReservationRecord,
    EndpointReservationReason,
    EndpointReservationState
} from './endpointEligibility.js';
export type {EndpointReservationAuthority} from './endpointReservationAuthority.js';
export {isEndpointReservationAuthority} from './endpointReservationAuthority.js';
export {OPENCODE_ENDPOINT_REASONS} from './opencodeEndpoint.js';
export type {
    OpenCodeDecisionFailure,
    OpenCodeDecisionOutcome,
    OpenCodeDecisionRequest,
    OpenCodeDecisionResult,
    OpenCodeEndpointAdapterOptions,
    OpenCodeEndpointReason
} from './opencodeEndpoint.js';
export {HERMES_ENDPOINT_REASONS} from './hermesEndpoint.js';
export type {
    HermesEndpointIdentity,
    HermesEndpointOptions,
    HermesEndpointReason,
    HermesEndpointStatus,
    HermesInvokeFailure,
    HermesInvokeRequest,
    HermesInvokeResult,
    HermesInvokeSuccess,
    HermesProcessPort,
    HermesProcessRequest,
    HermesProcessResult,
    HermesProbeRequest,
    HermesProbeResult
} from './hermesEndpoint.js';
