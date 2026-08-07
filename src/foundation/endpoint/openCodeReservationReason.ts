import type {EndpointReservationReason, OpenCodeEndpointReason} from '../../contracts/index.js';

/** Maps CA-06 reservation authority reasons to OpenCode adapter reasons without re-evaluating policy. */
export function mapReservationReason(reason: EndpointReservationReason): OpenCodeEndpointReason {
    switch (reason) {
        case 'authorization-digest-mismatch':
        case 'state-digest-mismatch':
        case 'evidence-digest-mismatch':
        case 'reservation-stale-revision': return 'stale-fingerprint';
        case 'endpoint-mismatch':
        case 'pool-mismatch':
        case 'pool-member-mismatch': return 'identity-mismatch';
        case 'pool-capacity-exhausted':
        case 'reservation-exhausted': return 'pool-exhausted';
        case 'reservation-expired':
        case 'reservation-revoked':
        case 'reservation-unknown':
        case 'reservation-not-active':
        case 'reservation-consumed':
        case 'eligibility-not-eligible': return 'ineligible';
    }
}
