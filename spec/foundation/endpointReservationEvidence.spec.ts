import type {EndpointProfile} from '../../src/contracts/endpointEligibility.js';
import {evaluateEndpointEligibility, groupCapacityPools} from '../../src/foundation/init/index.js';
import {
    advanceReservationAuthoritySnapshot, mintTestReservationAuthorization, testAuthoritySnapshot, testReservationAuthority
} from './support/endpointReservationAuthorityFixture.js';

const NOW = 1_700_000_000_000;

describe('endpoint reservation authority (CA-06)', () => {
    it('binds authorization digests and rejects stale live revisions', () => {
        const endpoint = profile('endpoint-a');
        const snapshot = liveSnapshot();
        const authority = testReservationAuthority(snapshot);
        const authorization = mintTestReservationAuthorization(authority, {
            profile: endpoint, eligibility: evaluateEndpointEligibility(endpoint, requirements(), facts()),
            reservationId: 'res-a', reservationRevision: 3, poolSnapshotRevision: 7, holdsPoolSlot: true,
            observedAtMs: NOW, expiresAtMs: NOW + 30_000
        });
        expect(authority.assertAuthorized(endpoint, authorization, NOW)).toBeNull();
        const stalePool = advanceReservationAuthoritySnapshot(authority, {
            ...snapshot,
            pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 8, limit: 2, activeReservations: 1, endpointIds: ['endpoint-a']}]
        });
        expect(stalePool.assertAuthorized(endpoint, authorization, NOW)).toBe('reservation-stale-revision');
    });

    it('rejects full pools at equality without a held slot and accepts the slot holder', () => {
        const endpoint = profile('endpoint-a');
        const full = testAuthoritySnapshot({
            pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 1, limit: 1, activeReservations: 1, endpointIds: ['endpoint-a']}],
            reservations: [{endpointId: 'endpoint-a', capacityPoolId: 'pool', reservationId: 'res-a', reservationRevision: 1, reservationState: 'active', holdsPoolSlot: true}]
        });
        const authority = testReservationAuthority(full);
        const ok = mintTestReservationAuthorization(authority, {
            profile: endpoint, eligibility: evaluateEndpointEligibility(endpoint, requirements(), facts()),
            reservationId: 'res-a', reservationRevision: 1, poolSnapshotRevision: 1, holdsPoolSlot: true,
            observedAtMs: NOW, expiresAtMs: NOW + 30_000
        });
        expect(authority.assertAuthorized(endpoint, ok, NOW)).toBeNull();
        const noSlot = mintTestReservationAuthorization(authority, {
            profile: endpoint, eligibility: evaluateEndpointEligibility(endpoint, requirements(), facts()),
            reservationId: 'res-a', reservationRevision: 1, poolSnapshotRevision: 1, holdsPoolSlot: false,
            observedAtMs: NOW, expiresAtMs: NOW + 30_000
        });
        expect(authority.assertAuthorized(endpoint, noSlot, NOW)).toBe('pool-capacity-exhausted');
    });

    it('rejects revoked, consumed, and shared-pool alias exhaustion', () => {
        const first = profile('endpoint-a');
        const second = profile('endpoint-b');
        const snapshot = testAuthoritySnapshot({
            pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 1, limit: 1, activeReservations: 1, endpointIds: ['endpoint-a', 'endpoint-b']}],
            reservations: [
                {endpointId: 'endpoint-a', capacityPoolId: 'pool', reservationId: 'res-a', reservationRevision: 1, reservationState: 'active', holdsPoolSlot: true},
                {endpointId: 'endpoint-b', capacityPoolId: 'pool', reservationId: 'res-b', reservationRevision: 1, reservationState: 'active', holdsPoolSlot: false}
            ]
        });
        const authority = testReservationAuthority(snapshot);
        const aliasAuth = mintTestReservationAuthorization(authority, {
            profile: second, eligibility: evaluateEndpointEligibility(second, requirements(), facts()),
            reservationId: 'res-b', reservationRevision: 1, poolSnapshotRevision: 1, holdsPoolSlot: false,
            observedAtMs: NOW, expiresAtMs: NOW + 30_000
        });
        expect(authority.assertAuthorized(second, aliasAuth, NOW)).toBe('pool-capacity-exhausted');
        const held = mintTestReservationAuthorization(authority, {
            profile: first, eligibility: evaluateEndpointEligibility(first, requirements(), facts()),
            reservationId: 'res-a', reservationRevision: 1, poolSnapshotRevision: 1, holdsPoolSlot: true,
            observedAtMs: NOW, expiresAtMs: NOW + 30_000
        });
        advanceReservationAuthoritySnapshot(authority, {
            ...snapshot,
            reservations: snapshot.reservations.map(item => item.endpointId === 'endpoint-a' ? {...item, reservationState: 'revoked', holdsPoolSlot: false} : item)
        });
        expect(authority.assertAuthorized(first, held, NOW)).toBe('reservation-revoked');
    });
});

function liveSnapshot() {
    const snapshot = {capacityPoolId: 'pool', limit: 2, activeReservations: 1};
    const usage = groupCapacityPools([profile('endpoint-a')], [snapshot])[0];
    return testAuthoritySnapshot({
        pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 7, limit: snapshot.limit, activeReservations: snapshot.activeReservations, endpointIds: [...usage.endpointIds]}],
        reservations: [{endpointId: 'endpoint-a', capacityPoolId: 'pool', reservationId: 'res-a', reservationRevision: 3, reservationState: 'active', holdsPoolSlot: true}]
    });
}

function profile(endpointId: string): EndpointProfile {
    return {
        schemaVersion: 1, endpointId, toolId: 'tool', adapterId: 'adapter', hostId: 'host', osUser: 'operator',
        routeId: 'route', capacityPoolId: 'pool', catalogId: 'catalog', model: 'model', effort: 'high', enabled: true,
        availability: 'available',
        capabilities: {capabilityClass: 'C5', reasoningClass: 'R5', contextClass: 'large', roles: ['review'], evidence: 'watchtower-verified'},
        conformance: {
            launchable: true, argvArray: true, explicitCwd: true, environmentAllowlist: true, boundedInput: true,
            singleJsonResult: true, writeDenied: true, brokeredContext: true, interruptible: true, boundedOutput: true,
            installableKnowledge: true
        },
        fingerprint: {executable: '/bin/tool', adapterVersion: '1', route: 'route', catalog: 'catalog', model: 'model', effort: 'high', capabilityEvidence: 'v1'}
    };
}
function requirements() { return {role: 'review', minimumCapability: 'C5' as const, minimumContext: 'large' as const, requiresUnattended: true, reviewer: true}; }
function facts() {
    return {
        roleSupported: true, hostFeatures: true, traversable: true, repositoryAccess: true, policyAllowed: true,
        capacityAvailable: true, reviewerIndependent: true, proofAvailable: true, fingerprintCurrent: true
    };
}
