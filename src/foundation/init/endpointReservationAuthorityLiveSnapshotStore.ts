import type {EndpointReservationAuthoritySnapshot} from './EndpointReservationEvidence.js';

const FAIL_CLOSED: EndpointReservationAuthoritySnapshot = Object.freeze({pools: Object.freeze([]), reservations: Object.freeze([])});

const liveHolder: {snapshot: EndpointReservationAuthoritySnapshot} = {snapshot: FAIL_CLOSED};

export function readEndpointReservationLiveSnapshot(): EndpointReservationAuthoritySnapshot {
    return liveHolder.snapshot;
}

/** Spec/composition snapshot advance; excluded from packaged dist artifacts. */
export function replaceEndpointReservationLiveSnapshot(snapshot: EndpointReservationAuthoritySnapshot): void {
    liveHolder.snapshot = freezeSnapshot(snapshot);
}

function freezeSnapshot(snapshot: EndpointReservationAuthoritySnapshot): EndpointReservationAuthoritySnapshot {
    return Object.freeze({
        pools: Object.freeze(snapshot.pools.map(pool => Object.freeze({...pool, endpointIds: Object.freeze([...pool.endpointIds])}))),
        reservations: Object.freeze(snapshot.reservations.map(item => Object.freeze({...item})))
    });
}
