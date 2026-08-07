/**
 * CA-17 session route selection (`docs/spec/operator-session.md` §14). Each
 * turn is one allocation slot `coordinator:operator-session:D{1,2,3}`; this
 * module picks the endpoint for that slot from the lane's session routing
 * plan and refuses deterministically when no candidate clears every gate.
 *
 * Two separations are load-bearing and proven by the focused specs:
 *
 * 1. Session routing never draws on an automated coordinator-cycle reserve, so
 *    operator discussion cannot consume reject/recovery capacity (§14).
 * 2. M0 has no route at all, which is what makes the model-free guarantee
 *    structural rather than a convention.
 *
 * CA-06 owns eligibility; the candidates arriving here are already classified
 * and this module never recomputes or overrides that verdict. Selection is
 * side-effect-free: nothing is reserved, journaled, or mutated here — the
 * bounded reservation effect belongs to CA-10's executor.
 */
import type {
    EndpointCapabilityClass, EndpointContextClass, SessionClassRoute, SessionEndpointCandidate,
    SessionModelDecisionClass, SessionRouteRequest, SessionRouteSelection, SessionReuseCandidate,
    SessionReuseRejection, SessionRoutingPlan
} from '../../../../contracts/index.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';
import {validateSessionRoutingPlan} from './sessionRoutingValidation.js';

const CAPABILITY_ORDER: readonly EndpointCapabilityClass[] = Object.freeze(['C2', 'C3', 'C5']);
const CONTEXT_ORDER: readonly EndpointContextClass[] = Object.freeze(['small', 'medium', 'large']);

export function selectSessionRoute(request: SessionRouteRequest): SessionRouteSelection {
    const {classification, plan} = request;
    if (!classification.modelRequired || classification.decisionClass === 'M0') {
        sessionRoutingFailure('SESSION_ROUTING_CLASS_UNSUPPORTED', classification.turnId,
            'an M0 turn has no model route; answer it from the projection instead of routing it');
    }
    validateSessionRoutingPlan(plan);
    assertAdmitted(request);
    const decisionClass: SessionModelDecisionClass = classification.decisionClass;
    const route = plan.classes[decisionClass];
    assertConcurrency(request, route);
    const floor = raise(classification.minimumCapability ?? route.minimumCapability, route.minimumCapability);
    const ordered = orderedPoolCandidates(route, request.candidates);
    return decide(request, route, decisionClass, floor, ordered);
}

function decide(
    request: SessionRouteRequest, route: SessionClassRoute, decisionClass: SessionModelDecisionClass,
    floor: EndpointCapabilityClass, ordered: readonly SessionEndpointCandidate[]
): SessionRouteSelection {
    const plan = request.plan;
    const pool = ordered.filter(candidate => isAdmissible(candidate, floor, route, plan));
    if (pool.length === 0) refuseEmpty(request, route, floor, ordered);
    const reuse = evaluateReuse(request.reuse, pool, ordered);
    const selected = reuse.endpoint ?? pool.reduce((best, candidate) => cheaper(candidate, best) ? candidate : best);
    return Object.freeze({
        allocationSlot: `${plan.allocationSlotPrefix}:${decisionClass}` as const,
        decisionClass, endpointId: selected.endpointId, capacityPoolId: selected.capacityPoolId,
        minimumCapability: floor, minimumContext: route.minimumContext, economicsRank: selected.economicsRank,
        reused: reuse.endpoint !== null, reuseRejection: reuse.rejection,
        consideredEndpointIds: Object.freeze(ordered.map(candidate => candidate.endpointId))
    });
}

/**
 * The §14 reuse test: continuity is preferred only when the next turn's floor
 * is satisfied, the endpoint is still eligible and available, continuity
 * benefit exceeds switching cost, budget/independence pass, and no external
 * provider chat history is required for correctness. Any failure falls back to
 * ordinary selection and records which condition failed.
 */
function evaluateReuse(
    reuse: SessionReuseCandidate | undefined, admissible: readonly SessionEndpointCandidate[],
    ordered: readonly SessionEndpointCandidate[]
): {readonly endpoint: SessionEndpointCandidate | null; readonly rejection: SessionReuseRejection | null} {
    if (reuse === undefined) return {endpoint: null, rejection: null};
    if (reuse.requiresExternalProviderHistory) return {endpoint: null, rejection: 'external-provider-history-required'};
    const inPool = ordered.find(candidate => candidate.endpointId === reuse.endpointId);
    if (inPool === undefined) return {endpoint: null, rejection: 'not-in-class-pool'};
    const candidate = admissible.find(item => item.endpointId === reuse.endpointId);
    if (candidate === undefined) return {endpoint: null, rejection: rejectionFor(inPool)};
    if (reuse.continuityBenefit <= reuse.switchCost) return {endpoint: null, rejection: 'continuity-not-worth-switch'};
    return {endpoint: candidate, rejection: null};
}

function rejectionFor(candidate: SessionEndpointCandidate): SessionReuseRejection {
    if (candidate.eligibilityStatus !== 'eligible') return 'not-eligible';
    if (!candidate.independencePass) return 'budget-or-independence';
    return 'capability-floor';
}

/**
 * A candidate is admissible only when it clears the capability and context
 * floors, CA-06 called it eligible, it has a free slot, independence passes,
 * and its capacity is not a protected coordinator-cycle reserve.
 */
function isAdmissible(
    candidate: SessionEndpointCandidate, floor: EndpointCapabilityClass,
    route: SessionClassRoute, plan: SessionRoutingPlan
): boolean {
    return capabilityRank(candidate.capabilityClass) >= capabilityRank(floor)
        && contextRank(candidate.contextClass) >= contextRank(route.minimumContext)
        && candidate.eligibilityStatus === 'eligible' && candidate.availableSlots > 0
        && candidate.independencePass && !isProtectedReserve(candidate, plan);
}

function isProtectedReserve(candidate: SessionEndpointCandidate, plan: SessionRoutingPlan): boolean {
    return candidate.reserveId !== null && plan.protectedReserveIds.includes(candidate.reserveId);
}

/** Primary first, then declared fallbacks in order; an endpoint outside the class pool is never considered. */
function orderedPoolCandidates(route: SessionClassRoute, candidates: readonly SessionEndpointCandidate[]): readonly SessionEndpointCandidate[] {
    const seen = new Set<string>();
    const pool: SessionEndpointCandidate[] = [];
    for (const endpointId of [route.primary, ...route.fallbacks]) {
        if (seen.has(endpointId)) continue;
        seen.add(endpointId);
        const candidate = candidates.find(item => item.endpointId === endpointId);
        if (candidate !== undefined) pool.push(candidate);
    }
    return Object.freeze(pool);
}

/** Economics ranks only after every hard gate has passed; an unranked candidate never outranks a ranked one. */
function cheaper(candidate: SessionEndpointCandidate, current: SessionEndpointCandidate): boolean {
    return (candidate.economicsRank ?? Number.MAX_SAFE_INTEGER) < (current.economicsRank ?? Number.MAX_SAFE_INTEGER);
}

function refuseEmpty(
    request: SessionRouteRequest, route: SessionClassRoute, floor: EndpointCapabilityClass,
    ordered: readonly SessionEndpointCandidate[]
): never {
    const turnId = request.classification.turnId;
    if (ordered.length === 0) {
        sessionRoutingFailure('SESSION_ROUTE_UNAVAILABLE', turnId,
            `no configured endpoint for ${route.primary} or its fallbacks is present in the candidate set`);
    }
    if (ordered.every(candidate => isProtectedReserve(candidate, request.plan))) {
        sessionRoutingFailure('SESSION_ROUTE_RESERVE_PROTECTED', turnId,
            'the only remaining candidates hold protected coordinator-cycle reserve capacity');
    }
    if (ordered.some(candidate => capabilityRank(candidate.capabilityClass) >= capabilityRank(floor)
        && candidate.eligibilityStatus === 'eligible' && candidate.availableSlots <= 0)) {
        sessionRoutingFailure('SESSION_ROUTE_CAPACITY_EXHAUSTED', turnId,
            'every eligible endpoint at the required capability floor has no free capacity slot');
    }
    sessionRoutingFailure('SESSION_ROUTE_CAPABILITY_FLOOR', turnId,
        `no candidate satisfies the ${floor} capability and ${route.minimumContext} context floor`);
}

function assertAdmitted(request: SessionRouteRequest): void {
    const admission = request.budgetAdmission;
    if (!admission.modelBackedTurnAdmitted || admission.check.level === 'hard') {
        sessionRoutingFailure('SESSION_BUDGET_HARD_LIMIT', request.classification.turnId,
            `budget refuses a model-backed turn: ${admission.check.exceededDimensions.join(', ') || 'not admitted'}`);
    }
}

function assertConcurrency(request: SessionRouteRequest, route: SessionClassRoute): void {
    if (!Number.isSafeInteger(request.activeSessionTurns) || request.activeSessionTurns < 0) {
        sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', 'activeSessionTurns', 'activeSessionTurns must be a non-negative safe integer');
    }
    if (request.activeSessionTurns >= route.maxConcurrentTurns) {
        sessionRoutingFailure('SESSION_CONCURRENCY_EXHAUSTED', request.classification.turnId,
            `${request.activeSessionTurns} active turns already occupy the ${route.maxConcurrentTurns} concurrent-turn limit`);
    }
}

function raise(first: EndpointCapabilityClass, second: EndpointCapabilityClass): EndpointCapabilityClass {
    return capabilityRank(first) >= capabilityRank(second) ? first : second;
}

function capabilityRank(value: EndpointCapabilityClass): number { return CAPABILITY_ORDER.indexOf(value); }
function contextRank(value: EndpointContextClass): number { return CONTEXT_ORDER.indexOf(value); }
