import type {
    EndpointReservationAuthorization, EndpointReservationCurrentState, EndpointReservationEvidence, EndpointReservationRecord,
    OpenCodeEndpointReason
} from '../../contracts/index.js';

const STATES = ['active', 'expired', 'revoked', 'exhausted', 'unknown'] as const;

export function reservationAuthorizationValue(value: unknown): EndpointReservationAuthorization | null {
    if (!record(value) || !exactKeys(value, ['schemaVersion', 'evidence', 'currentState', 'authorizationDigest']) ||
        value.schemaVersion !== 1 || !digest(value.authorizationDigest)) return null;
    const evidence = reservationEvidenceValue(value.evidence);
    const currentState = reservationCurrentStateValue(value.currentState);
    if (!evidence || !currentState) return null;
    return {schemaVersion: 1, evidence, currentState, authorizationDigest: value.authorizationDigest};
}

function reservationEvidenceValue(value: unknown): EndpointReservationEvidence | null {
    if (!record(value) || !exactKeys(value, [
        'schemaVersion', 'endpointId', 'capacityPoolId', 'reservationId', 'reservationRevision', 'poolSnapshotRevision',
        'poolLimit', 'poolActiveReservations', 'sharedEndpointIds', 'holdsPoolSlot', 'eligibilityStatus', 'eligibilityDigest',
        'reservationState', 'observedAtMs', 'expiresAtMs', 'evidenceDigest'
    ]) || value.schemaVersion !== 1 || value.eligibilityStatus !== 'eligible' || typeof value.holdsPoolSlot !== 'boolean') return null;
    const endpointId = parseText(value.endpointId); const capacityPoolId = parseText(value.capacityPoolId);
    const reservationId = parseText(value.reservationId);
    if (endpointId === null || capacityPoolId === null || reservationId === null) return null;
    if (!revision(value.reservationRevision) || !revision(value.poolSnapshotRevision) || !revision(value.poolLimit) ||
        !revision(value.poolActiveReservations) || !revision(value.observedAtMs) || !revision(value.expiresAtMs)) return null;
    if (!digest(value.eligibilityDigest) || !digest(value.evidenceDigest)) return null;
    if (!STATES.includes(value.reservationState as typeof STATES[number]) || value.expiresAtMs < value.observedAtMs) return null;
    const sharedEndpointIds = parseStringArray(value.sharedEndpointIds);
    if (!sharedEndpointIds) return null;
    return {
        schemaVersion: 1, endpointId, capacityPoolId, reservationId, holdsPoolSlot: value.holdsPoolSlot,
        reservationRevision: value.reservationRevision, poolSnapshotRevision: value.poolSnapshotRevision,
        poolLimit: value.poolLimit, poolActiveReservations: value.poolActiveReservations, sharedEndpointIds,
        eligibilityStatus: 'eligible', eligibilityDigest: value.eligibilityDigest,
        reservationState: value.reservationState as EndpointReservationEvidence['reservationState'],
        observedAtMs: value.observedAtMs, expiresAtMs: value.expiresAtMs, evidenceDigest: value.evidenceDigest
    };
}

function reservationCurrentStateValue(value: unknown): EndpointReservationCurrentState | null {
    if (!record(value) || !exactKeys(value, [
        'schemaVersion', 'capacityPoolId', 'poolSnapshotRevision', 'poolLimit', 'poolActiveReservations', 'sharedEndpointIds',
        'reservation', 'observedAtMs', 'expiresAtMs', 'stateDigest'
    ]) || value.schemaVersion !== 1 || !digest(value.stateDigest)) return null;
    const capacityPoolId = parseText(value.capacityPoolId);
    if (capacityPoolId === null || !revision(value.poolSnapshotRevision) || !revision(value.poolLimit) ||
        !revision(value.poolActiveReservations) || !revision(value.observedAtMs) || !revision(value.expiresAtMs)) return null;
    if (value.expiresAtMs < value.observedAtMs) return null;
    const sharedEndpointIds = parseStringArray(value.sharedEndpointIds);
    const reservation = reservationRecordValue(value.reservation);
    if (!sharedEndpointIds || !reservation) return null;
    return {
        schemaVersion: 1, capacityPoolId, poolSnapshotRevision: value.poolSnapshotRevision, poolLimit: value.poolLimit,
        poolActiveReservations: value.poolActiveReservations, sharedEndpointIds, reservation,
        observedAtMs: value.observedAtMs, expiresAtMs: value.expiresAtMs, stateDigest: value.stateDigest
    };
}

function reservationRecordValue(value: unknown): EndpointReservationRecord | null {
    if (!record(value) || !exactKeys(value, [
        'reservationId', 'reservationRevision', 'endpointId', 'capacityPoolId', 'reservationState', 'holdsPoolSlot'
    ]) || typeof value.holdsPoolSlot !== 'boolean') return null;
    const reservationId = parseText(value.reservationId); const endpointId = parseText(value.endpointId);
    const capacityPoolId = parseText(value.capacityPoolId);
    if (reservationId === null || endpointId === null || capacityPoolId === null || !revision(value.reservationRevision)) return null;
    if (!STATES.includes(value.reservationState as typeof STATES[number])) return null;
    return {
        reservationId, reservationRevision: value.reservationRevision, endpointId, capacityPoolId,
        reservationState: value.reservationState as EndpointReservationRecord['reservationState'],
        holdsPoolSlot: value.holdsPoolSlot
    };
}

function parseStringArray(value: unknown): readonly string[] | null {
    if (!Array.isArray(value)) return null;
    const items = value.map(parseText);
    if (items.some(item => item === null)) return null;
    return Object.freeze(items.filter((item): item is string => item !== null));
}

function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    const actual = Object.keys(value);
    return actual.length === keys.length && actual.every(key => keys.includes(key));
}
function parseText(value: unknown): string | null {
    return typeof value === 'string' && value.length > 0 && value.length <= 4096 && !/[\u0000-\u001f\u007f]/u.test(value) ? value : null;
}
function revision(value: unknown): value is number { return typeof value === 'number' && Number.isInteger(value) && value >= 0; }
function digest(value: unknown): value is `sha256:${string}` { return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }

export type ReservationParseResult =
    | {ok: true; value: EndpointReservationAuthorization}
    | {ok: false; reason: OpenCodeEndpointReason};
