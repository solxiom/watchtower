import type {EndpointReservationAuthoritySnapshot} from './EndpointReservationEvidence.js';
import {replaceEndpointReservationLiveSnapshot} from './endpointReservationAuthorityLiveSnapshotStore.js';
import {getEndpointReservationCompositionCapabilityForInitAccess} from './endpointReservationAuthorityComposition.js';

/** Spec/composition-only snapshot advance; excluded from packaged dist artifacts. */
export function advanceEndpointReservationCompositionSnapshot(snapshot: EndpointReservationAuthoritySnapshot): void {
    replaceEndpointReservationLiveSnapshot(snapshot);
}

/** Spec/composition-only capability accessor; excluded from packaged dist artifacts. */
export function endpointReservationCompositionCapabilityForAccess() {
    return getEndpointReservationCompositionCapabilityForInitAccess();
}
