import '../../src/foundation/init/index.js';
import {access, readFile} from 'node:fs/promises';
import {existsSync} from 'node:fs';
import {join} from 'node:path';
import * as contracts from '../../src/contracts/index.js';
import {OpenCodeEndpointAdapter} from '../../src/foundation/endpoint/index.js';
import {bindEndpointReservationAuthorityVerifier} from '../../src/contracts/endpointReservationAuthority.js';
import {
    buildEndpointReservationAuthorization, buildEndpointReservationCurrentState, buildEndpointReservationEvidence
} from '../../src/foundation/init/EndpointReservationEvidence.js';
import {evaluateEndpointEligibility} from '../../src/foundation/init/index.js';
import type {LaneRuntimeContext, TaskLeafCapability} from '../../src/contracts/index.js';
import type {EndpointReservationAuthority} from '../../src/contracts/endpointReservationAuthority.js';
import {computeEndpointFingerprint} from '../../src/foundation/init/index.js';
import {OPENCODE_11814_SUCCESS_STREAM} from './support/opencodeStreamFixtures.js';
import {
    advanceEndpointReservationCompositionSnapshot, endpointReservationCompositionCapabilityForAccess
} from '../../src/foundation/init/endpointReservationAuthorityCompositionAccess.js';
import {mintTestReservationAuthorization, testAuthoritySnapshot, testReservationAuthority} from './support/endpointReservationAuthorityFixture.js';

const NOW = 1_700_000_000_000;
const DIST_INIT = join(process.cwd(), 'dist', 'src', 'foundation', 'init');

describe('endpoint reservation authority bypass adversarial (CA-28)', () => {
    it('does not expose registry replacement or reset controls on the public contracts barrel', () => {
        expect(Object.hasOwn(contracts, 'registerEndpointReservationAuthorityConstructor')).toBeFalse();
        expect(Object.hasOwn(contracts, 'resetEndpointReservationAuthorityConstructorForTests')).toBeFalse();
        expect(Object.hasOwn(contracts, 'bindEndpointReservationAuthorityVerifier')).toBeFalse();
    });

    it('rejects fake reservation authorities and registry replacement at adapter construction with zero leaf calls', async () => {
        const args: string[][] = [];
        const leaf: TaskLeafCapability = {
            taskId: 'wt:coordinator:decision', leafIds: ['opencode'],
            async invoke(request) {
                args.push([...request.args]);
                return {outcome: 'completed', leafId: request.leafId, exitCode: 0, stdout: OPENCODE_11814_SUCCESS_STREAM, stderr: ''};
            }
        };
        expect(() => new OpenCodeEndpointAdapter({
            leaf, leafId: 'opencode', reservationAuthority: {assertAuthorized: () => null} as never, now: () => NOW
        })).toThrowError(/reservationAuthority/);
        class FakeAuthority { assertAuthorized() { return null; } }
        expect(() => bindEndpointReservationAuthorityVerifier((value: unknown): value is FakeAuthority => value instanceof FakeAuthority)).toThrowError();
        expect(args).toEqual([]);
    });

    it('omits forgeable live-source and composition capability seams from rebuilt dist artifacts', async () => {
        if (!existsSync(DIST_INIT)) return;
        await expectAsync(access(join(DIST_INIT, 'EndpointReservationAuthority.js'))).toBeRejected();
        await expectAsync(access(join(DIST_INIT, 'endpointReservationAuthorityCompositionAccess.js'))).toBeRejected();
        await expectAsync(access(join(DIST_INIT, 'endpointReservationAuthorityLiveSnapshotStore.js'))).toBeRejected();
        await expectAsync(access(join(DIST_INIT, 'endpointReservationAuthoritySeal.js'))).toBeRejected();
        for (const file of ['endpointReservationAuthorityLiveSource.js', 'endpointReservationAuthorityComposition.js']) {
            const source = await readFile(join(DIST_INIT, file), 'utf8');
            for (const symbol of [
                'replaceEndpointReservationLiveSnapshot', 'authorizeEndpointReservationLiveSource',
                'endpointReservationCompositionLiveSource', 'grantEndpointReservationCompositionCapability',
                'endpointReservationCompositionCapability', 'getEndpointReservationCompositionCapabilityForInitAccess',
                'sealEndpointReservationAuthority'
            ]) {
                expect(source.includes(`export function ${symbol}`)).withContext(file).toBeFalse();
                expect(source.includes(`export const ${symbol}`)).withContext(file).toBeFalse();
            }
        }
    });

    it('rejects fabricated snapshot authorities that disagree with live authorization before leaf invoke', async () => {
        const args: string[][] = [];
        const leaf: TaskLeafCapability = {
            taskId: 'wt:coordinator:decision', leafIds: ['opencode'],
            async invoke(request) {
                args.push([...request.args]);
                return {outcome: 'completed', leafId: request.leafId, exitCode: 0, stdout: OPENCODE_11814_SUCCESS_STREAM, stderr: ''};
            }
        };
        const realAuthority = testReservationAuthority();
        const authorization = mintTestReservationAuthorization(realAuthority, mintInput());
        advanceEndpointReservationCompositionSnapshot(testAuthoritySnapshot({
            pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 99, limit: 1, activeReservations: 0, endpointIds: ['opencode-1']}],
            reservations: [{endpointId: 'opencode-1', capacityPoolId: 'pool', reservationId: 'res-1', reservationRevision: 99, reservationState: 'active', holdsPoolSlot: true}]
        }));
        const fabricated = endpointReservationCompositionCapabilityForAccess().createAuthority();
        const adapter = new OpenCodeEndpointAdapter({leaf, leafId: 'opencode', reservationAuthority: fabricated, now: () => NOW});
        const result = await adapter.decide(decisionRequest(authorization));
        expect(result.outcome).toBe('failed');
        if (result.outcome === 'failed') expect(result.reason).toBe('stale-fingerprint');
        expect(args).toEqual([]);
    });

    it('rejects rebuilt-package matching fabrication before leaf invoke with zero leaf calls', async () => {
        if (!existsSync(join(DIST_INIT, 'endpointReservationAuthorityComposition.js'))) return;
        const args: string[][] = [];
        const leaf: TaskLeafCapability = {
            taskId: 'wt:coordinator:decision', leafIds: ['opencode'],
            async invoke(request) {
                args.push([...request.args]);
                return {outcome: 'completed', leafId: request.leafId, exitCode: 0, stdout: OPENCODE_11814_SUCCESS_STREAM, stderr: ''};
            }
        };
        await import('../../dist/src/foundation/init/index.js');
        const liveSource = await import('../../dist/src/foundation/init/endpointReservationAuthorityLiveSource.js');
        const composition = await import('../../dist/src/foundation/init/endpointReservationAuthorityComposition.js');
        expect(Object.hasOwn(liveSource, 'replaceEndpointReservationLiveSnapshot')).toBeFalse();
        expect(Object.hasOwn(composition, 'endpointReservationCompositionCapability')).toBeFalse();
        expect(Object.hasOwn(composition, 'getEndpointReservationCompositionCapabilityForInitAccess')).toBeFalse();
        const invented = testAuthoritySnapshot({
            pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 77, limit: 1, activeReservations: 0, endpointIds: ['fake-ep']}],
            reservations: [{endpointId: 'fake-ep', capacityPoolId: 'pool', reservationId: 'res-77', reservationRevision: 77, reservationState: 'active', holdsPoolSlot: true}]
        });
        if (typeof (liveSource as Record<string, unknown>).replaceEndpointReservationLiveSnapshot === 'function') {
            ((liveSource as unknown) as {replaceEndpointReservationLiveSnapshot: (snapshot: typeof invented) => void})
                .replaceEndpointReservationLiveSnapshot(invented);
        }
        const capability = (composition as {
            endpointReservationCompositionCapability?: () => {
                createAuthority(): EndpointReservationAuthority;
                mintAuthorization(a: EndpointReservationAuthority, i: unknown): unknown;
            };
        }).endpointReservationCompositionCapability?.();
        const profile = fakeEndpointProfile();
        const pool = invented.pools[0];
        const reservation = invented.reservations[0];
        const eligibility = evaluateEndpointEligibility(profile, requirements(), facts());
        const evidence = buildEndpointReservationEvidence({
            profile, eligibility,
            poolUsage: {capacityPoolId: pool.capacityPoolId, endpointIds: pool.endpointIds, availableSlots: 1},
            poolSnapshot: {capacityPoolId: pool.capacityPoolId, limit: pool.limit, activeReservations: pool.activeReservations},
            reservationId: reservation.reservationId, reservationRevision: reservation.reservationRevision,
            poolSnapshotRevision: pool.poolSnapshotRevision, holdsPoolSlot: reservation.holdsPoolSlot,
            observedAtMs: NOW, expiresAtMs: NOW + 60_000
        });
        const currentState = buildEndpointReservationCurrentState({
            poolSnapshot: {capacityPoolId: pool.capacityPoolId, limit: pool.limit, activeReservations: pool.activeReservations},
            poolSnapshotRevision: pool.poolSnapshotRevision, sharedEndpointIds: pool.endpointIds,
            reservation: {
                reservationId: reservation.reservationId, reservationRevision: reservation.reservationRevision,
                endpointId: reservation.endpointId, capacityPoolId: reservation.capacityPoolId,
                reservationState: reservation.reservationState, holdsPoolSlot: reservation.holdsPoolSlot
            },
            observedAtMs: NOW, expiresAtMs: NOW + 60_000
        });
        const authorization = buildEndpointReservationAuthorization({evidence, currentState});
        if (capability === undefined) {
            expect(() => new OpenCodeEndpointAdapter({
                leaf, leafId: 'opencode', reservationAuthority: {assertAuthorized: () => null} as never, now: () => NOW
            })).toThrowError(/reservationAuthority/);
            expect(args).toEqual([]);
            return;
        }
        const authority = capability.createAuthority();
        const adapter = new OpenCodeEndpointAdapter({leaf, leafId: 'opencode', reservationAuthority: authority, now: () => NOW});
        const fingerprint = {
            executable: '/usr/bin/opencode', adapterVersion: '1.0.0', route: 'openai', catalog: 'fake-catalog',
            model: 'openai/gpt-5', effort: 'high', capabilityEvidence: 'proof-v1'
        };
        const result = await adapter.decide({
            endpoint: profile,
            fingerprint, expectedFingerprint: computeEndpointFingerprint(fingerprint), catalogFingerprint: 'fake-catalog',
            reservationAuthorization: authorization, envelope: {schemaVersion: 1, prompt: 'bounded'}, workspace: '/lane',
            context: laneContext(), timeoutMs: 1000, maxOutputBytes: 4096
        });
        expect(result.outcome).toBe('failed');
        expect(args).toEqual([]);
    });

    it('rejects rebuilt-package seal-forged authority with matching authorization before leaf invoke', async () => {
        if (!existsSync(join(DIST_INIT, 'endpointReservationAuthorityComposition.js'))) return;
        await expectAsync(access(join(DIST_INIT, 'endpointReservationAuthoritySeal.js'))).toBeRejected();
        const args: string[][] = [];
        const leaf: TaskLeafCapability = {
            taskId: 'wt:coordinator:decision', leafIds: ['opencode'],
            async invoke(request) {
                args.push([...request.args]);
                return {outcome: 'completed', leafId: request.leafId, exitCode: 0, stdout: OPENCODE_11814_SUCCESS_STREAM, stderr: ''};
            }
        };
        await import('../../dist/src/foundation/init/index.js');
        const forged = {assertAuthorized: () => null};
        const profile = fakeEndpointProfile();
        const invented = testAuthoritySnapshot({
            pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 77, limit: 1, activeReservations: 0, endpointIds: ['fake-ep']}],
            reservations: [{endpointId: 'fake-ep', capacityPoolId: 'pool', reservationId: 'res-77', reservationRevision: 77, reservationState: 'active', holdsPoolSlot: true}]
        });
        const pool = invented.pools[0];
        const reservation = invented.reservations[0];
        const eligibility = evaluateEndpointEligibility(profile, requirements(), facts());
        const evidence = buildEndpointReservationEvidence({
            profile, eligibility,
            poolUsage: {capacityPoolId: pool.capacityPoolId, endpointIds: pool.endpointIds, availableSlots: 1},
            poolSnapshot: {capacityPoolId: pool.capacityPoolId, limit: pool.limit, activeReservations: pool.activeReservations},
            reservationId: reservation.reservationId, reservationRevision: reservation.reservationRevision,
            poolSnapshotRevision: pool.poolSnapshotRevision, holdsPoolSlot: reservation.holdsPoolSlot,
            observedAtMs: NOW, expiresAtMs: NOW + 60_000
        });
        const currentState = buildEndpointReservationCurrentState({
            poolSnapshot: {capacityPoolId: pool.capacityPoolId, limit: pool.limit, activeReservations: pool.activeReservations},
            poolSnapshotRevision: pool.poolSnapshotRevision, sharedEndpointIds: pool.endpointIds,
            reservation: {
                reservationId: reservation.reservationId, reservationRevision: reservation.reservationRevision,
                endpointId: reservation.endpointId, capacityPoolId: reservation.capacityPoolId,
                reservationState: reservation.reservationState, holdsPoolSlot: reservation.holdsPoolSlot
            },
            observedAtMs: NOW, expiresAtMs: NOW + 60_000
        });
        const authorization = buildEndpointReservationAuthorization({evidence, currentState});
        expect(() => new OpenCodeEndpointAdapter({
            leaf, leafId: 'opencode', reservationAuthority: forged as never, now: () => NOW
        })).toThrowError(/reservationAuthority/);
        const fingerprint = {
            executable: '/usr/bin/opencode', adapterVersion: '1.0.0', route: 'openai', catalog: 'fake-catalog',
            model: 'openai/gpt-5', effort: 'high', capabilityEvidence: 'proof-v1'
        };
        try {
            const adapter = new OpenCodeEndpointAdapter({leaf, leafId: 'opencode', reservationAuthority: forged as never, now: () => NOW});
            await adapter.decide({
                endpoint: profile,
                fingerprint, expectedFingerprint: computeEndpointFingerprint(fingerprint), catalogFingerprint: 'fake-catalog',
                reservationAuthorization: authorization, envelope: {schemaVersion: 1, prompt: 'bounded'}, workspace: '/lane',
                context: laneContext(), timeoutMs: 1000, maxOutputBytes: 4096
            });
        } catch {
            // construction refusal is the expected packaged closure
        }
        expect(args).toEqual([]);
    });
});

function mintInput() {
    return {
        profile: endpointProfile(),
        eligibility: evaluateEndpointEligibility(endpointProfile(), requirements(), facts()),
        reservationId: 'res-1', reservationRevision: 1, poolSnapshotRevision: 1, holdsPoolSlot: true,
        observedAtMs: NOW, expiresAtMs: NOW + 60_000
    };
}

function decisionRequest(authorization: import('../../src/contracts/endpointEligibility.js').EndpointReservationAuthorization) {
    const fingerprint = {
        executable: '/usr/bin/opencode', adapterVersion: '1.0.0', route: 'openai', catalog: 'catalog-v1',
        model: 'openai/gpt-5', effort: 'high', capabilityEvidence: 'proof-v1'
    };
    return {
        endpoint: endpointProfile(),
        fingerprint, expectedFingerprint: computeEndpointFingerprint(fingerprint), catalogFingerprint: 'catalog-v1',
        reservationAuthorization: authorization, envelope: {schemaVersion: 1, prompt: 'bounded'}, workspace: '/lane',
        context: laneContext(), timeoutMs: 1000, maxOutputBytes: 4096
    };
}

function laneContext(): LaneRuntimeContext {
    return {
        workspace: '/lane', laneId: 'lane-1', initiativeId: 'initiative-1', laneSlug: 'lane', laneDir: '/lane/.watchtower',
        homeRepositoryId: 'repo', repositoriesFile: '/lane/repos.json', runtimeRoot: '/runtime', runtimeVersion: '1',
        knowledgeRoot: '/knowledge', baseEnvironment: {path: '/bin', home: '/home/operator'}
    };
}

function endpointProfile(): import('../../src/contracts/endpointEligibility.js').EndpointProfile {
    return fakeEndpointProfile('opencode-1', 'catalog-v1');
}

function fakeEndpointProfile(endpointId = 'fake-ep', catalogId = 'fake-catalog'): import('../../src/contracts/endpointEligibility.js').EndpointProfile {
    return {
        schemaVersion: 1, endpointId, toolId: 'opencode', adapterId: 'opencode-cli', hostId: 'host',
        osUser: 'operator', routeId: 'route', capacityPoolId: 'pool', catalogId, model: 'openai/gpt-5',
        effort: 'high', enabled: true, availability: 'available',
        capabilities: {capabilityClass: 'C5', reasoningClass: 'R4', contextClass: 'large', roles: ['coordinator'], evidence: 'watchtower-verified'},
        conformance: {
            launchable: true, argvArray: true, explicitCwd: true, environmentAllowlist: true, boundedInput: true,
            singleJsonResult: true, writeDenied: true, brokeredContext: true, interruptible: true, boundedOutput: true,
            installableKnowledge: true
        },
        fingerprint: {
            executable: '/usr/bin/opencode', adapterVersion: '1.0.0', route: 'openai', catalog: catalogId,
            model: 'openai/gpt-5', effort: 'high', capabilityEvidence: 'proof-v1'
        }
    };
}

function requirements() {
    return {role: 'coordinator', minimumCapability: 'C5' as const, minimumContext: 'large' as const, requiresUnattended: true, reviewer: false};
}

function facts() {
    return {
        roleSupported: true, hostFeatures: true, traversable: true, repositoryAccess: true, policyAllowed: true,
        capacityAvailable: true, reviewerIndependent: true, proofAvailable: true, fingerprintCurrent: true
    };
}
