import type {
    CapacityPoolSnapshot, CapacityPoolUsage, EligibilityResult, EndpointProfile, EndpointReservationAuthorization,
    EndpointReservationCurrentState, EndpointReservationEvidence, EndpointReservationReason, EndpointReservationRecord,
    EndpointReservationState
} from '../../contracts/endpointEligibility.js';
import {semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';
import type {JsonValue} from '../schemaComposition/schemaCompositionContracts.js';

const EVIDENCE_KEYS = [
    'schemaVersion', 'endpointId', 'capacityPoolId', 'reservationId', 'reservationRevision', 'poolSnapshotRevision',
    'poolLimit', 'poolActiveReservations', 'sharedEndpointIds', 'holdsPoolSlot', 'eligibilityStatus', 'eligibilityDigest',
    'reservationState', 'observedAtMs', 'expiresAtMs', 'evidenceDigest'
] as const;

export function buildEndpointReservationEvidence(input: {
    readonly profile: EndpointProfile;
    readonly eligibility: EligibilityResult;
    readonly poolUsage: CapacityPoolUsage;
    readonly poolSnapshot: CapacityPoolSnapshot;
    readonly reservationId: string;
    readonly reservationRevision: number;
    readonly poolSnapshotRevision: number;
    readonly holdsPoolSlot: boolean;
    readonly reservationState?: EndpointReservationState;
    readonly observedAtMs: number;
    readonly expiresAtMs: number;
}): EndpointReservationEvidence {
    if (input.eligibility.status !== 'eligible') invalidEvidence('eligibility must be eligible to mint reservation evidence');
    const sharedEndpointIds = Object.freeze([...input.poolUsage.endpointIds].sort());
    const body = {
        schemaVersion: 1 as const, endpointId: input.profile.endpointId, capacityPoolId: input.profile.capacityPoolId,
        reservationId: input.reservationId, reservationRevision: input.reservationRevision,
        poolSnapshotRevision: input.poolSnapshotRevision, poolLimit: input.poolSnapshot.limit,
        poolActiveReservations: input.poolSnapshot.activeReservations, sharedEndpointIds,
        holdsPoolSlot: input.holdsPoolSlot, eligibilityStatus: 'eligible' as const,
        eligibilityDigest: semanticDigest(input.eligibility as unknown as JsonValue),
        reservationState: input.reservationState ?? 'active', observedAtMs: input.observedAtMs, expiresAtMs: input.expiresAtMs
    };
    return Object.freeze({...body, evidenceDigest: reservationEvidenceDigest(body)});
}

export function buildEndpointReservationCurrentState(input: {
    readonly poolSnapshot: CapacityPoolSnapshot;
    readonly poolSnapshotRevision: number;
    readonly sharedEndpointIds: readonly string[];
    readonly reservation: EndpointReservationRecord;
    readonly observedAtMs: number;
    readonly expiresAtMs: number;
}): EndpointReservationCurrentState {
    const body = {
        schemaVersion: 1 as const, capacityPoolId: input.poolSnapshot.capacityPoolId,
        poolSnapshotRevision: input.poolSnapshotRevision, poolLimit: input.poolSnapshot.limit,
        poolActiveReservations: input.poolSnapshot.activeReservations,
        sharedEndpointIds: Object.freeze([...input.sharedEndpointIds].sort()),
        reservation: input.reservation, observedAtMs: input.observedAtMs, expiresAtMs: input.expiresAtMs
    };
    return Object.freeze({...body, stateDigest: reservationCurrentStateDigest(body)});
}

export function buildEndpointReservationAuthorization(input: {
    readonly evidence: EndpointReservationEvidence;
    readonly currentState: EndpointReservationCurrentState;
}): EndpointReservationAuthorization {
    const body = {schemaVersion: 1 as const, evidenceDigest: input.evidence.evidenceDigest, stateDigest: input.currentState.stateDigest};
    return Object.freeze({schemaVersion: 1, evidence: input.evidence, currentState: input.currentState,
        authorizationDigest: reservationAuthorizationDigest(body)});
}

export function assertEndpointReservationAuthorization(
    profile: EndpointProfile, authorization: EndpointReservationAuthorization, nowMs: number,
    live: EndpointReservationAuthoritySnapshot
): EndpointReservationReason | null {
    const {evidence, currentState} = authorization;
    if (reservationEvidenceDigest(withoutEvidenceDigest(evidence)) !== evidence.evidenceDigest) return 'evidence-digest-mismatch';
    if (reservationCurrentStateDigest(withoutStateDigest(currentState)) !== currentState.stateDigest) return 'state-digest-mismatch';
    if (reservationAuthorizationDigest({schemaVersion: 1, evidenceDigest: evidence.evidenceDigest, stateDigest: currentState.stateDigest}) !== authorization.authorizationDigest) {
        return 'authorization-digest-mismatch';
    }
    const structural = assertReservationBinding(profile, evidence, currentState, nowMs);
    if (structural !== null) return structural;
    return assertReservationLiveState(profile, evidence, currentState, live);
}

function assertReservationBinding(
    profile: EndpointProfile, evidence: EndpointReservationEvidence, currentState: EndpointReservationCurrentState, nowMs: number
): EndpointReservationReason | null {
    if (evidence.endpointId !== profile.endpointId || currentState.reservation.endpointId !== profile.endpointId) return 'endpoint-mismatch';
    if (evidence.capacityPoolId !== profile.capacityPoolId || currentState.capacityPoolId !== profile.capacityPoolId) return 'pool-mismatch';
    if (!evidence.sharedEndpointIds.includes(profile.endpointId) || !currentState.sharedEndpointIds.includes(profile.endpointId)) return 'pool-member-mismatch';
    if (evidence.reservationId !== currentState.reservation.reservationId ||
        evidence.reservationRevision !== currentState.reservation.reservationRevision ||
        evidence.poolSnapshotRevision !== currentState.poolSnapshotRevision ||
        evidence.holdsPoolSlot !== currentState.reservation.holdsPoolSlot) return 'reservation-stale-revision';
    if (evidence.eligibilityStatus !== 'eligible') return 'eligibility-not-eligible';
    if (evidence.reservationState !== currentState.reservation.reservationState) return 'reservation-stale-revision';
    if (evidence.reservationState === 'revoked' || currentState.reservation.reservationState === 'revoked') return 'reservation-revoked';
    if (evidence.reservationState === 'exhausted' || currentState.reservation.reservationState === 'exhausted') return 'reservation-exhausted';
    if (evidence.reservationState === 'unknown' || currentState.reservation.reservationState === 'unknown') return 'reservation-unknown';
    if (evidence.reservationState !== 'active' || currentState.reservation.reservationState !== 'active') return 'reservation-not-active';
    if (nowMs > evidence.expiresAtMs || nowMs < evidence.observedAtMs || nowMs > currentState.expiresAtMs || nowMs < currentState.observedAtMs) return 'reservation-expired';
    if (currentState.poolActiveReservations > currentState.poolLimit || evidence.poolActiveReservations > evidence.poolLimit) return 'pool-capacity-exhausted';
    if (currentState.poolActiveReservations >= currentState.poolLimit && !currentState.reservation.holdsPoolSlot) return 'pool-capacity-exhausted';
    return null;
}

function assertReservationLiveState(
    profile: EndpointProfile, evidence: EndpointReservationEvidence, currentState: EndpointReservationCurrentState,
    live: EndpointReservationAuthoritySnapshot
): EndpointReservationReason | null {
    const reservation = live.reservations.find(item => item.endpointId === profile.endpointId);
    if (!reservation) return 'reservation-consumed';
    if (reservation.reservationId !== evidence.reservationId || reservation.reservationRevision !== evidence.reservationRevision) return 'reservation-stale-revision';
    if (reservation.reservationState !== 'active') return reservation.reservationState === 'revoked' ? 'reservation-revoked' : 'reservation-consumed';
    if (reservation.holdsPoolSlot !== evidence.holdsPoolSlot) return 'reservation-stale-revision';
    const pool = live.pools.find(item => item.capacityPoolId === profile.capacityPoolId);
    if (!pool) return 'pool-mismatch';
    if (pool.poolSnapshotRevision !== evidence.poolSnapshotRevision || pool.poolSnapshotRevision !== currentState.poolSnapshotRevision) return 'reservation-stale-revision';
    if (pool.limit !== currentState.poolLimit || pool.activeReservations !== currentState.poolActiveReservations) return 'reservation-stale-revision';
    const members = Object.freeze([...pool.endpointIds].sort());
    if (members.length !== currentState.sharedEndpointIds.length || members.some((id, index) => id !== currentState.sharedEndpointIds[index])) return 'pool-member-mismatch';
    if (pool.activeReservations >= pool.limit && !reservation.holdsPoolSlot) return 'pool-capacity-exhausted';
    return null;
}

export interface EndpointReservationAuthoritySnapshot {
    readonly pools: readonly {
        readonly capacityPoolId: string;
        readonly poolSnapshotRevision: number;
        readonly limit: number;
        readonly activeReservations: number;
        readonly endpointIds: readonly string[];
    }[];
    readonly reservations: readonly {
        readonly endpointId: string;
        readonly capacityPoolId: string;
        readonly reservationId: string;
        readonly reservationRevision: number;
        readonly reservationState: EndpointReservationState;
        readonly holdsPoolSlot: boolean;
    }[];
}

function reservationEvidenceDigest(body: Omit<EndpointReservationEvidence, 'evidenceDigest'>): `sha256:${string}` {
    return semanticDigest(body as unknown as JsonValue);
}
function reservationCurrentStateDigest(body: Omit<EndpointReservationCurrentState, 'stateDigest'>): `sha256:${string}` {
    return semanticDigest(body as unknown as JsonValue);
}
function reservationAuthorizationDigest(body: {
    readonly schemaVersion: 1; readonly evidenceDigest: `sha256:${string}`; readonly stateDigest: `sha256:${string}`;
}): `sha256:${string}` {
    return semanticDigest(body as unknown as JsonValue);
}
function withoutEvidenceDigest(evidence: EndpointReservationEvidence): Omit<EndpointReservationEvidence, 'evidenceDigest'> {
    const {evidenceDigest: _ignored, ...body} = evidence;
    return body;
}
function withoutStateDigest(state: EndpointReservationCurrentState): Omit<EndpointReservationCurrentState, 'stateDigest'> {
    const {stateDigest: _ignored, ...body} = state;
    return body;
}
function invalidEvidence(message: string): never { throw new Error(`Invalid reservation evidence: ${message}`); }

export {EVIDENCE_KEYS};
