import type {EndpointReservationAuthoritySnapshot} from './EndpointReservationEvidence.js';
import {readEndpointReservationLiveSnapshot, replaceEndpointReservationLiveSnapshot} from './endpointReservationAuthorityLiveSnapshotStore.js';

/** Authoritative CA-06 reservation snapshot reader bound at composition grant time. */
export interface EndpointReservationLiveSource {
    readSnapshot(): EndpointReservationAuthoritySnapshot;
}

let boundSource: EndpointReservationLiveSource | null = null;

/** Composition-bound live source backed by the init snapshot store. */
export function createAndBindCompositionLiveSource(): EndpointReservationLiveSource {
    if (boundSource !== null) throw new Error('Composition live source is already bound.');
    const source: EndpointReservationLiveSource = {readSnapshot: () => readEndpointReservationLiveSnapshot()};
    boundSource = source;
    return source;
}

export function isAuthorizedEndpointReservationLiveSource(source: EndpointReservationLiveSource): boolean {
    return boundSource !== null && source === boundSource;
}
