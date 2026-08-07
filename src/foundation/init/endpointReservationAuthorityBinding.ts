import {bindEndpointReservationAuthorityVerifier} from '../../contracts/endpointReservationAuthority.js';
import {
    isSealedEndpointReservationAuthority, runEndpointReservationAuthorityInitBinding
} from './endpointReservationAuthorityComposition.js';

bindEndpointReservationAuthorityVerifier((value: unknown): value is import('../../contracts/endpointReservationAuthority.js').EndpointReservationAuthority =>
    isSealedEndpointReservationAuthority(value) && typeof (value as {assertAuthorized?: unknown}).assertAuthorized === 'function');

runEndpointReservationAuthorityInitBinding();
