import type {EndpointConformance, EndpointProfile, EligibilityFacts, EligibilityRequirements} from '../../src/contracts/endpointEligibility.js';
import {
    classifyEndpoint, computeEndpointFingerprint, evaluateEndpointEligibility, groupCapacityPools, validateEndpointProfile
} from '../../src/foundation/init/index.js';

describe('provider-neutral endpoint eligibility', function () {
    it('classifies only fully conforming launch surfaces as unattended', function () {
        expect(classifyEndpoint(conformance())).toBe('unattended');
        expect(classifyEndpoint({...conformance(), writeDenied: false})).toBe('advisory-confirmed');
        expect(classifyEndpoint({...conformance(), launchable: false})).toBe('skill-only');
    });

    it('rejects hard capability, access, proof, independence, and stale-fingerprint failures', function () {
        const result = evaluateEndpointEligibility(profile(), requirements(), {...facts(), repositoryAccess: false, fingerprintCurrent: false});
        expect(result.status).toBe('ineligible');
        expect(result.reasons).toEqual(['repository-access-gap', 'stale-fingerprint']);
        expect(evaluateEndpointEligibility(profile(), requirements(), {...facts(), capacityAvailable: 'unknown'}).status).toBe('unknown');
    });

    it('invalidates drift and counts aliases once through shared pools', function () {
        const first = computeEndpointFingerprint(profile().fingerprint);
        const changed = computeEndpointFingerprint({...profile().fingerprint, model: 'changed'});
        expect(changed).not.toBe(first);
        const usages = groupCapacityPools([profile(), {...profile(), endpointId: 'alias'}], [{capacityPoolId: 'pool', limit: 2, activeReservations: 1}]);
        expect(usages[0]).toEqual({capacityPoolId: 'pool', endpointIds: ['alias', 'endpoint'], availableSlots: 1});
    });

    it('fails closed for unknown and extra profile fields', function () {
        expect(() => validateEndpointProfile({...profile(), future: true})).toThrowError();
        expect(() => validateEndpointProfile({...profile(), capabilities: {...profile().capabilities, capabilityClass: 'C1'}})).toThrowError();
    });
});

function conformance(): EndpointConformance { return {
    launchable: true, argvArray: true, explicitCwd: true, environmentAllowlist: true, boundedInput: true,
    singleJsonResult: true, writeDenied: true, brokeredContext: true, interruptible: true, boundedOutput: true, installableKnowledge: true
}; }
function profile(): EndpointProfile { return {
    schemaVersion: 1, endpointId: 'endpoint', toolId: 'tool', adapterId: 'adapter', hostId: 'host', osUser: 'operator',
    routeId: 'route', capacityPoolId: 'pool', catalogId: 'catalog', model: 'model', effort: 'high', enabled: true,
    availability: 'available', capabilities: {capabilityClass: 'C5', reasoningClass: 'R5', contextClass: 'large', roles: ['review'], evidence: 'watchtower-verified'},
    conformance: conformance(), fingerprint: {executable: '/bin/tool', adapterVersion: '1', route: 'route', catalog: 'catalog', model: 'model', effort: 'high', capabilityEvidence: 'v1'}
}; }
function requirements(): EligibilityRequirements { return {role: 'review', minimumCapability: 'C5', minimumContext: 'large', requiresUnattended: true, reviewer: true}; }
function facts(): EligibilityFacts { return {roleSupported: true, hostFeatures: true, traversable: true, repositoryAccess: true, policyAllowed: true, capacityAvailable: true, reviewerIndependent: true, proofAvailable: true, fingerprintCurrent: true}; }
