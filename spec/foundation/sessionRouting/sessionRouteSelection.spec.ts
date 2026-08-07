/**
 * CA-17 session route selection proof: allocation slots, hard capability and
 * context floors, protected coordinator-cycle reserves, capacity, concurrency,
 * reuse preference, economics ordering, and malformed policy bytes.
 */
import {selectSessionRoute, SessionRoutingError} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import type {SessionRouteRequest, SessionRoutingPlan, SessionRoutingReason} from '../../../src/contracts/index.js';
import {admission, candidate, classificationFor, route, routingPlan} from './support/sessionRoutingFixtures.js';

function reasonOf(run: () => unknown): SessionRoutingReason {
    try {
        run();
    } catch (error) {
        if (error instanceof SessionRoutingError) return error.reason;
        throw error;
    }
    throw new Error('expected a SessionRoutingError');
}

function request(overrides: Partial<SessionRouteRequest> = {}): SessionRouteRequest {
    return {
        classification: classificationFor('D2'), plan: routingPlan(),
        candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C3', contextClass: 'medium', economicsRank: 5}),
            candidate({endpointId: 'ep-c5', economicsRank: 9})],
        activeSessionTurns: 0, budgetAdmission: admission(), ...overrides
    };
}

describe('CA-17 session route selection', () => {
    it('binds the turn to the coordinator:operator-session allocation slot for its class', () => {
        expect(selectSessionRoute(request()).allocationSlot).toBe('coordinator:operator-session:D2');
        expect(selectSessionRoute(request({
            classification: classificationFor('D3'),
            candidates: [candidate({endpointId: 'ep-c5'})]
        })).allocationSlot).toBe('coordinator:operator-session:D3');
    });

    it('refuses to route an M0 turn at all, so M0 can never reach a model', () => {
        const m0 = {...classificationFor('D2'), decisionClass: 'M0' as const, modelRequired: false, minimumCapability: null};
        expect(reasonOf(() => selectSessionRoute(request({classification: m0})))).toBe('SESSION_ROUTING_CLASS_UNSUPPORTED');
    });

    it('prefers the primary endpoint when it clears every gate', () => {
        expect(selectSessionRoute(request()).endpointId).toBe('ep-c3');
    });

    it('falls back in declared order when the primary is ineligible', () => {
        const selection = selectSessionRoute(request({
            candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C3', contextClass: 'medium', eligibilityStatus: 'ineligible'}),
                candidate({endpointId: 'ep-c5'})]
        }));
        expect(selection.endpointId).toBe('ep-c5');
    });

    it('treats an unknown eligibility verdict as not eligible', () => {
        expect(reasonOf(() => selectSessionRoute(request({
            candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C3', contextClass: 'medium', eligibilityStatus: 'unknown'})]
        })))).toBe('SESSION_ROUTE_CAPABILITY_FLOOR');
    });

    it('never routes below the class capability floor', () => {
        expect(reasonOf(() => selectSessionRoute(request({
            candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C2', contextClass: 'medium'})]
        })))).toBe('SESSION_ROUTE_CAPABILITY_FLOOR');
    });

    it('never routes below the class context floor', () => {
        expect(reasonOf(() => selectSessionRoute(request({
            candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C5', contextClass: 'small'})]
        })))).toBe('SESSION_ROUTE_CAPABILITY_FLOOR');
    });

    it('raises the floor when the plan is stricter than the class floor', () => {
        const plan = routingPlan({classes: {...routingPlan().classes, D2: route('ep-c3', ['ep-c5'], 'C5', 'medium')}});
        const selection = selectSessionRoute(request({plan, candidates: [
            candidate({endpointId: 'ep-c3', capabilityClass: 'C3', contextClass: 'medium'}),
            candidate({endpointId: 'ep-c5', contextClass: 'medium'})
        ]}));
        expect(selection.minimumCapability).toBe('C5');
        expect(selection.endpointId).toBe('ep-c5');
    });

    it('never spends protected coordinator-cycle reserve capacity on an operator turn', () => {
        expect(reasonOf(() => selectSessionRoute(request({
            classification: classificationFor('D3'),
            candidates: [candidate({endpointId: 'ep-c5', reserveId: 'escalation'}),
                candidate({endpointId: 'ep-c5-reserve', reserveId: 'recovery'})]
        })))).toBe('SESSION_ROUTE_RESERVE_PROTECTED');
    });

    it('still uses reserve-tagged capacity that the plan does not protect', () => {
        const plan = routingPlan({protectedReserveIds: ['recovery']});
        const selection = selectSessionRoute(request({
            plan, classification: classificationFor('D3'),
            candidates: [candidate({endpointId: 'ep-c5', reserveId: 'batch-dispatch'})]
        }));
        expect(selection.endpointId).toBe('ep-c5');
    });

    it('reports exhausted capacity separately from an unmet floor', () => {
        expect(reasonOf(() => selectSessionRoute(request({
            candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C3', contextClass: 'medium', availableSlots: 0})]
        })))).toBe('SESSION_ROUTE_CAPACITY_EXHAUSTED');
    });

    it('reports an empty class pool distinctly', () => {
        expect(reasonOf(() => selectSessionRoute(request({candidates: []})))).toBe('SESSION_ROUTE_UNAVAILABLE');
    });

    it('never considers an endpoint outside the class pool', () => {
        expect(reasonOf(() => selectSessionRoute(request({
            candidates: [candidate({endpointId: 'ep-stranger'})]
        })))).toBe('SESSION_ROUTE_UNAVAILABLE');
    });

    it('refuses a model-backed turn once the budget is hard', () => {
        expect(reasonOf(() => selectSessionRoute(request({budgetAdmission: admission('hard')})))).toBe('SESSION_BUDGET_HARD_LIMIT');
    });

    it('refuses when the class concurrency limit is already occupied', () => {
        expect(reasonOf(() => selectSessionRoute(request({activeSessionTurns: 2})))).toBe('SESSION_CONCURRENCY_EXHAUSTED');
    });

    it('refuses a negative active-turn count rather than coercing it', () => {
        expect(reasonOf(() => selectSessionRoute(request({activeSessionTurns: -1})))).toBe('SESSION_ROUTING_REQUEST_INVALID');
    });

    it('applies economics only after every hard gate, choosing the cheapest admissible candidate', () => {
        const selection = selectSessionRoute(request({
            classification: classificationFor('D3'),
            plan: routingPlan({classes: {...routingPlan().classes, D3: route('ep-c5', ['ep-c5-reserve'], 'C5', 'large')}}),
            candidates: [candidate({endpointId: 'ep-c5', economicsRank: 9}), candidate({endpointId: 'ep-c5-reserve', economicsRank: 2})]
        }));
        expect(selection.endpointId).toBe('ep-c5-reserve');
        expect(selection.economicsRank).toBe(2);
    });

    it('never lets an unranked candidate outrank a ranked one', () => {
        const selection = selectSessionRoute(request({
            classification: classificationFor('D3'),
            candidates: [candidate({endpointId: 'ep-c5', economicsRank: null}), candidate({endpointId: 'ep-c5-reserve', economicsRank: 7})]
        }));
        expect(selection.endpointId).toBe('ep-c5-reserve');
    });
});

describe('CA-17 endpoint reuse preference', () => {
    const reuse = {endpointId: 'ep-c5', continuityBenefit: 10, switchCost: 3, requiresExternalProviderHistory: false};

    it('reuses the prior endpoint when every §14 condition holds', () => {
        const selection = selectSessionRoute(request({reuse}));
        expect(selection.endpointId).toBe('ep-c5');
        expect(selection.reused).toBeTrue();
        expect(selection.reuseRejection).toBeNull();
    });

    it('refuses reuse when continuity benefit does not exceed switching cost', () => {
        const selection = selectSessionRoute(request({reuse: {...reuse, continuityBenefit: 3}}));
        expect(selection.reused).toBeFalse();
        expect(selection.reuseRejection).toBe('continuity-not-worth-switch');
        expect(selection.endpointId).toBe('ep-c3');
    });

    it('refuses reuse that would depend on provider chat history outside Watchtower', () => {
        const selection = selectSessionRoute(request({reuse: {...reuse, requiresExternalProviderHistory: true}}));
        expect(selection.reuseRejection).toBe('external-provider-history-required');
        expect(selection.endpointId).toBe('ep-c3');
    });

    it('refuses reuse of an endpoint that is no longer eligible', () => {
        const selection = selectSessionRoute(request({
            reuse, candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C3', contextClass: 'medium'}),
                candidate({endpointId: 'ep-c5', eligibilityStatus: 'ineligible'})]
        }));
        expect(selection.reuseRejection).toBe('not-eligible');
        expect(selection.endpointId).toBe('ep-c3');
    });

    it('refuses reuse of an endpoint outside the next class pool', () => {
        const selection = selectSessionRoute(request({reuse: {...reuse, endpointId: 'ep-elsewhere'}}));
        expect(selection.reuseRejection).toBe('not-in-class-pool');
    });

    it('refuses reuse when independence policy fails', () => {
        const selection = selectSessionRoute(request({
            reuse, candidates: [candidate({endpointId: 'ep-c3', capabilityClass: 'C3', contextClass: 'medium'}),
                candidate({endpointId: 'ep-c5', independencePass: false})]
        }));
        expect(selection.reuseRejection).toBe('budget-or-independence');
    });
});

describe('CA-17 routing plan validation', () => {
    function invalid(overrides: Record<string, unknown>): SessionRoutingPlan {
        return {...routingPlan(), ...overrides} as unknown as SessionRoutingPlan;
    }

    it('refuses an unsupported schema version', () => {
        expect(reasonOf(() => selectSessionRoute(request({plan: invalid({schemaVersion: 2})})))).toBe('SESSION_ROUTING_POLICY_INVALID');
    });

    it('refuses a plan whose allocation slot prefix is not the session prefix', () => {
        expect(reasonOf(() => selectSessionRoute(request({plan: invalid({allocationSlotPrefix: 'coordinator:cycle'})}))))
            .toBe('SESSION_ROUTING_POLICY_INVALID');
    });

    it('refuses a plan missing a class route', () => {
        const classes = {...routingPlan().classes} as Record<string, unknown>;
        delete classes['D2'];
        expect(reasonOf(() => selectSessionRoute(request({plan: invalid({classes})})))).toBe('SESSION_ROUTING_POLICY_INVALID');
    });

    it('refuses a non-positive concurrency limit', () => {
        const classes = {...routingPlan().classes, D2: route('ep-c3', [], 'C3', 'medium', 0)};
        expect(reasonOf(() => selectSessionRoute(request({plan: invalid({classes})})))).toBe('SESSION_ROUTING_POLICY_INVALID');
    });
});
