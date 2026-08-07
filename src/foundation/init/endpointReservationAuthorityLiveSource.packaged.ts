import type {EndpointReservationAuthoritySnapshot} from './EndpointReservationEvidence.js';

/** Authoritative CA-06 reservation snapshot reader bound at composition grant time. */
export interface EndpointReservationLiveSource {
    readSnapshot(): EndpointReservationAuthoritySnapshot;
}

const FAIL_CLOSED: EndpointReservationAuthoritySnapshot = Object.freeze({pools: Object.freeze([]), reservations: Object.freeze([])});

let boundSource: EndpointReservationLiveSource | null = null;

/** Fail-closed composition live source; snapshot replacement is not packaged. */
export function createAndBindCompositionLiveSource(): EndpointReservationLiveSource {
    if (boundSource !== null) throw new Error('Composition live source is already bound.');
    const source: EndpointReservationLiveSource = {readSnapshot: () => FAIL_CLOSED};
    boundSource = source;
    return source;
}

export function isAuthorizedEndpointReservationLiveSource(source: EndpointReservationLiveSource): boolean {
    return boundSource !== null && source === boundSource;
}
