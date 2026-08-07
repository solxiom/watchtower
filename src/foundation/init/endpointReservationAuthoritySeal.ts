/** Internal authority implementation shape; not exported from init barrel. */
export interface EndpointReservationAuthorityImpl {
    assertAuthorized(
        profile: import('../../contracts/endpointEligibility.js').EndpointProfile,
        authorization: import('../../contracts/endpointEligibility.js').EndpointReservationAuthorization,
        nowMs: number
    ): import('../../contracts/endpointEligibility.js').EndpointReservationReason | null;
    mintAuthorization(input: MintAuthorizationInput): import('../../contracts/endpointEligibility.js').EndpointReservationAuthorization;
}

export interface MintAuthorizationInput {
    readonly profile: import('../../contracts/endpointEligibility.js').EndpointProfile;
    readonly eligibility: import('../../contracts/endpointEligibility.js').EligibilityResult;
    readonly reservationId: string;
    readonly reservationRevision: number;
    readonly poolSnapshotRevision: number;
    readonly holdsPoolSlot: boolean;
    readonly observedAtMs: number;
    readonly expiresAtMs: number;
}
