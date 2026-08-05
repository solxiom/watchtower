import {createWatchtowerError} from '../../../contracts/errors.js';
import {ROUTING_CAPABILITY_CLASSES, type RouteSelection, type RoutingEndpointCandidate, type RoutingClassification} from '../../../contracts/index.js';
import type {CoordinatorRoutingPolicy} from './coordinatorBaselineContracts.js';
import type {EndpointSelectionInput} from './routingPolicyContracts.js';

export function selectRouteEndpoint(input: EndpointSelectionInput): RouteSelection {
    if (input.classification.decisionClass === 'M0') throw unavailable('M0 has no model route');
    const route = input.policy.routing.classes[input.classification.decisionClass];
    const classificationMinimum = input.classification.minimumCapability;
    if (classificationMinimum === null) throw unavailable('non-M0 route has no capability floor');
    const minimumCapability = maxCapability(classificationMinimum, route.minimumCapability);
    const orderedIds = [route.primary, ...route.fallbacks];
    const candidates = orderedIds.map(id => input.candidates.find(candidate => candidate.endpointId === id)).filter(isCandidate);
    const eligible = candidates.filter(candidate => hardEligible(candidate, minimumCapability, input.policy.routing.endpoints));
    if (eligible.length === 0) throw unavailable('no eligible endpoint satisfies the capability floor');
    const selected = eligible.reduce((best, candidate) => better(candidate, best) ? candidate : best);
    return Object.freeze({endpointId: selected.endpointId, capacityPoolId: selected.capacityPoolId,
        decisionClass: input.classification.decisionClass, minimumCapability,
        economicsRank: selected.economicsRank ?? null});
}

function hardEligible(candidate: RoutingEndpointCandidate, minimum: RoutingClassification['minimumCapability'], endpoints: CoordinatorRoutingPolicy['endpoints']): boolean {
    const configured = endpoints.find(endpoint => endpoint.endpointId === candidate.endpointId);
    if (configured === undefined || configured.capabilityClass !== candidate.capabilityClass || minimum === null ||
        ROUTING_CAPABILITY_CLASSES.indexOf(candidate.capabilityClass) < ROUTING_CAPABILITY_CLASSES.indexOf(minimum)) return false;
    const checks = Object.values(candidate.hardEligibility);
    return checks.length > 0 && checks.every(value => value === true);
}

function maxCapability(first: NonNullable<RoutingClassification['minimumCapability']>, second: NonNullable<RoutingClassification['minimumCapability']>): NonNullable<RoutingClassification['minimumCapability']> {
    return ROUTING_CAPABILITY_CLASSES.indexOf(first) >= ROUTING_CAPABILITY_CLASSES.indexOf(second) ? first : second;
}

function better(candidate: RoutingEndpointCandidate, current: RoutingEndpointCandidate): boolean {
    const candidateRank = candidate.economicsRank ?? Number.MAX_SAFE_INTEGER;
    const currentRank = current.economicsRank ?? Number.MAX_SAFE_INTEGER;
    return candidateRank < currentRank;
}

function isCandidate(value: RoutingEndpointCandidate | undefined): value is RoutingEndpointCandidate { return value !== undefined; }
function unavailable(remediation: string): never { throw createWatchtowerError('ERR_ROUTE_UNAVAILABLE', {operation: 'select coordinator endpoint', target: 'active routing policy', remediation}); }
