import type {
    EndpointProfile, EndpointReservationAuthorization, EndpointReservationReason, EndpointReservationRecord
} from '../../contracts/endpointEligibility.js';
import type {EndpointReservationAuthority} from '../../contracts/endpointReservationAuthority.js';
import {
    assertEndpointReservationAuthorization, buildEndpointReservationAuthorization, buildEndpointReservationCurrentState,
    buildEndpointReservationEvidence
} from './EndpointReservationEvidence.js';
import {
    createAndBindCompositionLiveSource, isAuthorizedEndpointReservationLiveSource, type EndpointReservationLiveSource
} from './endpointReservationAuthorityLiveSource.js';
import type {EndpointReservationAuthorityImpl, MintAuthorizationInput} from './endpointReservationAuthoritySeal.js';

const compositionGrantedAuthorities = new WeakSet<object>();
const compositionAuthorityBrand = Symbol('endpointReservationCompositionAuthority');

/** Composition-owned CA-06 reservation capability; mint stays on this surface. */
export interface EndpointReservationCompositionCapability {
    createAuthority(): EndpointReservationAuthority;
    mintAuthorization(authority: EndpointReservationAuthority, input: MintAuthorizationInput): EndpointReservationAuthorization;
}

let grantedEndpointReservationCompositionCapability: EndpointReservationCompositionCapability | null = null;

export function runEndpointReservationAuthorityInitBinding(): void {
    if (grantedEndpointReservationCompositionCapability !== null) return;
    grantedEndpointReservationCompositionCapability = createCompositionCapability(createAndBindCompositionLiveSource());
}

/** Verifier input for init binding; sealing is composition-private and not packaged for external callers. */
export function isSealedEndpointReservationAuthority(value: unknown): boolean {
    return typeof value === 'object' && value !== null &&
        compositionGrantedAuthorities.has(value) &&
        (value as Record<symbol, unknown>)[compositionAuthorityBrand] === true;
}

/** Spec/composition-only capability accessor; not exported from packaged dist artifacts. */
export function getEndpointReservationCompositionCapabilityForInitAccess(): EndpointReservationCompositionCapability {
    if (grantedEndpointReservationCompositionCapability === null) {
        throw new Error('Endpoint reservation composition capability is not granted.');
    }
    return grantedEndpointReservationCompositionCapability;
}

function createCompositionCapability(source: EndpointReservationLiveSource): EndpointReservationCompositionCapability {
    return Object.freeze({
        createAuthority: () => createSealedAuthority(source),
        mintAuthorization: (authority: EndpointReservationAuthority, input: MintAuthorizationInput) =>
            mintFromSealedAuthority(authority, input)
    });
}

function createSealedAuthority(source: EndpointReservationLiveSource): EndpointReservationAuthority {
    if (!isAuthorizedEndpointReservationLiveSource(source)) invalidSeam('live source is not composition-authorized');
    const authority = new SealedEndpointReservationAuthority(source);
    compositionGrantedAuthorities.add(authority);
    return authority;
}

function mintFromSealedAuthority(
    authority: EndpointReservationAuthority, input: MintAuthorizationInput
): EndpointReservationAuthorization {
    if (!isSealedEndpointReservationAuthority(authority)) invalidSeam('authority is not a sealed CA-06 reservation capability');
    return (authority as SealedEndpointReservationAuthority).mintAuthorization(input);
}

class SealedEndpointReservationAuthority implements EndpointReservationAuthorityImpl {
    readonly [compositionAuthorityBrand] = true;
    private readonly source: EndpointReservationLiveSource;

    constructor(source: EndpointReservationLiveSource) {
        if (!isAuthorizedEndpointReservationLiveSource(source)) invalidSeam('live source is not composition-authorized');
        this.source = source;
    }

    mintAuthorization(input: MintAuthorizationInput): EndpointReservationAuthorization {
        const snapshot = this.source.readSnapshot();
        const pool = snapshot.pools.find(item => item.capacityPoolId === input.profile.capacityPoolId);
        const reservation = snapshot.reservations.find(item => item.endpointId === input.profile.endpointId);
        if (!pool || !reservation) invalidMint('missing live pool or reservation');
        const poolSnapshot = {capacityPoolId: pool.capacityPoolId, limit: pool.limit, activeReservations: pool.activeReservations};
        const poolUsage = {
            capacityPoolId: pool.capacityPoolId, endpointIds: pool.endpointIds,
            availableSlots: Math.max(0, pool.limit - pool.activeReservations)
        };
        const record: EndpointReservationRecord = {
            reservationId: input.reservationId, reservationRevision: input.reservationRevision,
            endpointId: input.profile.endpointId, capacityPoolId: input.profile.capacityPoolId,
            reservationState: reservation.reservationState, holdsPoolSlot: input.holdsPoolSlot
        };
        const evidence = buildEndpointReservationEvidence({
            profile: input.profile, eligibility: input.eligibility, poolUsage, poolSnapshot,
            reservationId: input.reservationId, reservationRevision: input.reservationRevision,
            poolSnapshotRevision: input.poolSnapshotRevision, holdsPoolSlot: input.holdsPoolSlot,
            observedAtMs: input.observedAtMs, expiresAtMs: input.expiresAtMs
        });
        const currentState = buildEndpointReservationCurrentState({
            poolSnapshot, poolSnapshotRevision: input.poolSnapshotRevision, sharedEndpointIds: pool.endpointIds,
            reservation: record, observedAtMs: input.observedAtMs, expiresAtMs: input.expiresAtMs
        });
        return buildEndpointReservationAuthorization({evidence, currentState});
    }

    assertAuthorized(
        profile: EndpointProfile, authorization: EndpointReservationAuthorization, nowMs: number
    ): EndpointReservationReason | null {
        return assertEndpointReservationAuthorization(profile, authorization, nowMs, this.source.readSnapshot());
    }
}

function invalidMint(message: string): never { throw new Error(`Invalid reservation mint: ${message}`); }
function invalidSeam(message: string): never { throw new Error(`Invalid reservation authority seam: ${message}`); }
