import type {EligibilityResult, EndpointProfile, LaneRuntimeContext, TaskLeafCapability} from '../../src/contracts/index.js';
import {OpenCodeEndpointAdapter} from '../../src/foundation/endpoint/index.js';
import {
    OPENCODE_MAX_LINE_BYTES, OPENCODE_MAX_EVENT_LINES, OPENCODE_MAX_PHYSICAL_LINES, openCodeParseLimits, parseOpenCodeResult
} from '../../src/foundation/endpoint/openCodeEventStream.js';
import {computeEndpointFingerprint, evaluateEndpointEligibility} from '../../src/foundation/init/index.js';
import type {EndpointFingerprint} from '../../src/contracts/index.js';
import type {EndpointReservationAuthority} from '../../src/contracts/endpointReservationAuthority.js';
import {OPENCODE_MAX_OUTPUT_BYTES} from '../../src/contracts/opencodeEndpoint.js';
import {
    advanceReservationAuthoritySnapshot, endpointReservationCompositionCapabilityForAccess, mintTestReservationAuthorization, testAuthoritySnapshot, testReservationAuthority
} from './support/endpointReservationAuthorityFixture.js';
import {
    emptyLineFlood, OPENCODE_11814_MALFORMED_TEXT_STREAM, OPENCODE_11814_SUCCESS_STREAM, OPENCODE_11814_UNKNOWN_EVENT_STREAM
} from './support/opencodeStreamFixtures.js';

const NOW = 1_700_000_000_000;
const fingerprint: EndpointFingerprint = {
    executable: '/usr/bin/opencode', adapterVersion: '1.0.0', route: 'openai', catalog: 'catalog-v1',
    model: 'openai/gpt-5', effort: 'high', capabilityEvidence: 'proof-v1'
};
const context: LaneRuntimeContext = {
    workspace: '/lane', laneId: 'lane-1', initiativeId: 'initiative-1', laneSlug: 'lane', laneDir: '/lane/.watchtower',
    homeRepositoryId: 'repo', repositoriesFile: '/lane/repos.json', runtimeRoot: '/runtime', runtimeVersion: '1',
    knowledgeRoot: '/knowledge', baseEnvironment: {path: '/bin', home: '/home/operator'}
};
const defaultLimits = openCodeParseLimits(OPENCODE_MAX_OUTPUT_BYTES);

function profile(overrides: Partial<EndpointProfile> = {}): EndpointProfile {
    return {
        schemaVersion: 1, endpointId: 'opencode-1', toolId: 'opencode', adapterId: 'opencode-cli', hostId: 'host',
        osUser: 'operator', routeId: 'route', capacityPoolId: 'pool', catalogId: 'catalog-v1', model: 'openai/gpt-5',
        effort: 'high', enabled: true, availability: 'available',
        capabilities: {capabilityClass: 'C5', reasoningClass: 'R4', contextClass: 'large', roles: ['coordinator'], evidence: 'watchtower-verified'},
        conformance: {
            launchable: true, argvArray: true, explicitCwd: true, environmentAllowlist: true, boundedInput: true,
            singleJsonResult: true, writeDenied: true, brokeredContext: true, interruptible: true, boundedOutput: true,
            installableKnowledge: true
        },
        fingerprint, ...overrides
    };
}

function eligibility(endpoint: EndpointProfile): EligibilityResult {
    return evaluateEndpointEligibility(endpoint, {
        role: 'coordinator', minimumCapability: 'C5', minimumContext: 'large', requiresUnattended: true, reviewer: false
    }, {
        roleSupported: true, hostFeatures: true, traversable: true, repositoryAccess: true, policyAllowed: true,
        capacityAvailable: true, reviewerIndependent: true, proofAvailable: true, fingerprintCurrent: true
    });
}

function reservationAuthorization(
    endpoint: EndpointProfile = profile(), authority?: EndpointReservationAuthority,
    input: Partial<Parameters<typeof mintTestReservationAuthorization>[1]> = {}
) {
    const resolvedAuthority = authority ?? endpointReservationCompositionCapabilityForAccess().createAuthority();
    return mintTestReservationAuthorization(resolvedAuthority, {
        profile: endpoint, eligibility: eligibility(endpoint), reservationId: 'res-1', reservationRevision: 1,
        poolSnapshotRevision: 1, holdsPoolSlot: true, observedAtMs: NOW, expiresAtMs: NOW + 60_000, ...input
    });
}

function leaf(result: string, seen: string[][]): TaskLeafCapability {
    return {
        taskId: 'wt:coordinator:decision', leafIds: ['opencode'],
        async invoke(request) {
            seen.push([...request.args]);
            return {outcome: 'completed', leafId: request.leafId, exitCode: 0, stdout: result, stderr: ''};
        }
    };
}

function adapter(stream: string, authority: EndpointReservationAuthority, seen: string[][] = []): OpenCodeEndpointAdapter {
    return new OpenCodeEndpointAdapter({leaf: leaf(stream, seen), leafId: 'opencode', reservationAuthority: authority, now: () => NOW});
}

function request(overrides: Record<string, unknown> = {}): Record<string, unknown> {
    const endpoint = profile();
    return {
        endpoint, fingerprint, expectedFingerprint: computeEndpointFingerprint(fingerprint),
        catalogFingerprint: 'catalog-v1', reservationAuthorization: reservationAuthorization(endpoint),
        envelope: {schemaVersion: 1, prompt: 'bounded'}, workspace: '/lane', context, timeoutMs: 1000, maxOutputBytes: 4096,
        ...overrides
    };
}

describe('OpenCodeEndpointAdapter', () => {
    it('runs an unattended bounded JSON decision through argv-only leaf capability', async () => {
        const args: string[][] = [];
        const authority = testReservationAuthority();
        const result = await adapter(OPENCODE_11814_SUCCESS_STREAM, authority, args).decide(request({reservationAuthorization: reservationAuthorization(profile(), authority)}));
        expect(result.outcome).toBe('completed');
        if (result.outcome === 'completed') expect(JSON.stringify(result.result)).toBe('{"decision":"hold"}');
        expect(args.length).toBe(1);
    });

    it('rejects stale revisions, tampered authorization, and post-revocation evidence before invoking the leaf', async () => {
        const args: string[][] = [];
        const authority = testReservationAuthority();
        const item = adapter(OPENCODE_11814_SUCCESS_STREAM, authority, args);
        const authorization = reservationAuthorization(profile(), authority);
        const staleRevision = advanceReservationAuthoritySnapshot(authority, testAuthoritySnapshot({
            reservations: [{endpointId: 'opencode-1', capacityPoolId: 'pool', reservationId: 'res-1', reservationRevision: 2, reservationState: 'active', holdsPoolSlot: true}]
        }));
        const stale = await adapter(OPENCODE_11814_SUCCESS_STREAM, staleRevision, args).decide(request({reservationAuthorization: authorization}));
        expect(stale.outcome).toBe('failed');
        if (stale.outcome === 'failed') expect(stale.reason).toBe('stale-fingerprint');
        const revoked = advanceReservationAuthoritySnapshot(authority, testAuthoritySnapshot({
            reservations: [{endpointId: 'opencode-1', capacityPoolId: 'pool', reservationId: 'res-1', reservationRevision: 1, reservationState: 'revoked', holdsPoolSlot: false}]
        }));
        const consumed = await adapter(OPENCODE_11814_SUCCESS_STREAM, revoked, args).decide(request({reservationAuthorization: authorization}));
        expect(consumed.outcome).toBe('failed');
        if (consumed.outcome === 'failed') expect(consumed.reason).toBe('ineligible');
        const tampered = {...authorization, authorizationDigest: 'sha256:0000000000000000000000000000000000000000000000000000000000000000' as const};
        const digest = await item.decide(request({reservationAuthorization: tampered}));
        expect(digest.outcome).toBe('failed');
        if (digest.outcome === 'failed') expect(digest.reason).toBe('stale-fingerprint');
        expect(args).toEqual([]);
    });

    it('rejects full shared pools at equality unless the reservation holds the slot', async () => {
        const args: string[][] = [];
        const fullPool = testAuthoritySnapshot({
            pools: [{capacityPoolId: 'pool', poolSnapshotRevision: 1, limit: 1, activeReservations: 1, endpointIds: ['opencode-1', 'opencode-2']}],
            reservations: [{endpointId: 'opencode-1', capacityPoolId: 'pool', reservationId: 'res-1', reservationRevision: 1, reservationState: 'active', holdsPoolSlot: true}]
        });
        const holder = testReservationAuthority(fullPool);
        const holderOk = await adapter(OPENCODE_11814_SUCCESS_STREAM, holder, args).decide(request({
            reservationAuthorization: reservationAuthorization(profile(), holder)
        }));
        expect(holderOk.outcome).toBe('completed');
        const alias = profile({endpointId: 'opencode-2'});
        const aliasAuthority = advanceReservationAuthoritySnapshot(holder, {
            ...fullPool,
            reservations: [...fullPool.reservations, {endpointId: 'opencode-2', capacityPoolId: 'pool', reservationId: 'res-2', reservationRevision: 1, reservationState: 'active', holdsPoolSlot: false}]
        });
        const aliasDenied = await adapter(OPENCODE_11814_SUCCESS_STREAM, aliasAuthority, args).decide(request({
            endpoint: alias,
            reservationAuthorization: reservationAuthorization(alias, aliasAuthority, {reservationId: 'res-2', holdsPoolSlot: false})
        }));
        expect(aliasDenied.outcome).toBe('failed');
        if (aliasDenied.outcome === 'failed') expect(aliasDenied.reason).toBe('pool-exhausted');
        expect(args.length).toBe(1);
    });

    it('rejects disabled profiles and reservation expiry before invoking the leaf', async () => {
        const args: string[][] = [];
        const authority = testReservationAuthority();
        const item = adapter(OPENCODE_11814_SUCCESS_STREAM, authority, args);
        const disabled = await item.decide(request({endpoint: profile({enabled: false})}));
        expect(disabled.outcome).toBe('failed');
        if (disabled.outcome === 'failed') expect(disabled.reason).toBe('disabled');
        const expired = await item.decide(request({
            reservationAuthorization: reservationAuthorization(profile(), authority, {observedAtMs: NOW - 60_000, expiresAtMs: NOW - 1})
        }));
        expect(expired.outcome).toBe('failed');
        if (expired.outcome === 'failed') expect(expired.reason).toBe('ineligible');
        expect(args).toEqual([]);
    });

    it('classifies malformed text separately from truncated streams after leaf execution', async () => {
        const args: string[][] = [];
        const malformed = await adapter(OPENCODE_11814_MALFORMED_TEXT_STREAM, testReservationAuthority(), args).decide(request());
        expect(malformed.outcome).toBe('failed');
        if (malformed.outcome === 'failed') expect(malformed.reason).toBe('malformed-output');
        expect(args.length).toBe(1);
    });

    it('enforces strict 1.18.14 event vocabulary, terminal step_finish, and bounded parser limits', async () => {
        const parsedSuccess = parseOpenCodeResult(OPENCODE_11814_SUCCESS_STREAM, defaultLimits);
        expect(parsedSuccess.ok).toBeTrue();
        const unknown = parseOpenCodeResult(OPENCODE_11814_UNKNOWN_EVENT_STREAM, defaultLimits);
        expect(unknown.ok).toBeFalse();
        const flood = parseOpenCodeResult(emptyLineFlood(OPENCODE_MAX_PHYSICAL_LINES + 1), defaultLimits);
        expect(flood.ok).toBeFalse();
        if (!flood.ok) expect(flood.reason).toBe('malformed-output');
        expect(OPENCODE_MAX_LINE_BYTES).toBe(65_536);
        expect(OPENCODE_MAX_EVENT_LINES).toBe(512);
        expect(OPENCODE_MAX_PHYSICAL_LINES).toBe(8192);
    });
});
