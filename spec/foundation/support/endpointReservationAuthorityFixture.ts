import type {EndpointReservationAuthoritySnapshot} from '../../../src/foundation/init/EndpointReservationEvidence.js';
import type {EndpointReservationAuthority} from '../../../src/contracts/endpointReservationAuthority.js';
import type {MintAuthorizationInput} from '../../../src/foundation/init/endpointReservationAuthoritySeal.js';
import {
    advanceEndpointReservationCompositionSnapshot, endpointReservationCompositionCapabilityForAccess
} from '../../../src/foundation/init/endpointReservationAuthorityCompositionAccess.js';

export function testAuthoritySnapshot(overrides: Partial<EndpointReservationAuthoritySnapshot> = {}): EndpointReservationAuthoritySnapshot {
    return {
        pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 1, limit: 2, activeReservations: 1, endpointIds: ['opencode-1']}],
        reservations: [{
            endpointId: 'opencode-1', capacityPoolId: 'pool', reservationId: 'res-1', reservationRevision: 1,
            reservationState: 'active', holdsPoolSlot: true
        }],
        ...overrides
    };
}

export function testReservationAuthority(snapshot: EndpointReservationAuthoritySnapshot = testAuthoritySnapshot()): EndpointReservationAuthority {
    advanceEndpointReservationCompositionSnapshot(snapshot);
    return endpointReservationCompositionCapabilityForAccess().createAuthority();
}

export function advanceReservationAuthoritySnapshot(
    authority: EndpointReservationAuthority, snapshot: EndpointReservationAuthoritySnapshot
): EndpointReservationAuthority {
    advanceEndpointReservationCompositionSnapshot(snapshot);
    return authority;
}

export function mintTestReservationAuthorization(
    authority: EndpointReservationAuthority, input: MintAuthorizationInput
): import('../../../src/contracts/endpointEligibility.js').EndpointReservationAuthorization {
    return endpointReservationCompositionCapabilityForAccess().mintAuthorization(authority, input);
}

export {endpointReservationCompositionCapabilityForAccess};

export type {EndpointReservationAuthoritySnapshot, MintAuthorizationInput};
