import type {
    EndpointProfile, EndpointReservationAuthorization, EndpointReservationReason
} from './endpointEligibility.js';

/** Composition-owned CA-06 reservation authority capability surface. */
export interface EndpointReservationAuthority {
    assertAuthorized(
        profile: EndpointProfile, authorization: EndpointReservationAuthorization, nowMs: number
    ): EndpointReservationReason | null;
}

type EndpointReservationAuthorityVerifier = (value: unknown) => value is EndpointReservationAuthority;

let verifier: EndpointReservationAuthorityVerifier | null = null;

/** Init-domain binding only; not exported from the public contracts barrel. */
export function bindEndpointReservationAuthorityVerifier(next: EndpointReservationAuthorityVerifier): void {
    if (verifier !== null) throw new Error('Endpoint reservation authority verifier already bound.');
    verifier = next;
}

export function isEndpointReservationAuthority(value: unknown): value is EndpointReservationAuthority {
    return verifier !== null && verifier(value);
}
