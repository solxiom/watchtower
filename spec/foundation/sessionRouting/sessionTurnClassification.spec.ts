/**
 * CA-17 turn classification proof: the M0/D1–D3 rule table, hard floors, hard
 * guards, `--class` escalation, endpoint escalation, and malformed input.
 */
import {SessionRoutingError} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import {classifySessionTurn, reclassifyAfterEndpointEscalation} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import type {SessionClassificationRequest, SessionRoutingReason} from '../../../src/contracts/index.js';
import {classificationRequest} from './support/sessionRoutingFixtures.js';

function reasonOf(run: () => unknown): SessionRoutingReason {
    try {
        run();
    } catch (error) {
        if (error instanceof SessionRoutingError) return error.reason;
        throw error;
    }
    throw new Error('expected a SessionRoutingError');
}

describe('CA-17 operator turn classification rule table', () => {
    it('routes an exact registered structured query to M0 with no capability floor and no model', () => {
        const result = classifySessionTurn(classificationRequest({form: {kind: 'structured-query', queryFormId: 'session.budget'}}));
        expect(result.ruleId).toBe('projection-query-v1');
        expect(result.decisionClass).toBe('M0');
        expect(result.minimumCapability).toBeNull();
        expect(result.modelRequired).toBeFalse();
    });

    it('refuses M0 for a structured query form that policy has not registered', () => {
        const result = classifySessionTurn(classificationRequest({form: {kind: 'structured-query', queryFormId: 'session.invented'}}));
        expect(result.ruleId).toBe('operator-default-v1');
        expect(result.decisionClass).toBe('D2');
    });

    it('routes an exact single-subject registered bounded form to D1 with the C2 floor', () => {
        const result = classifySessionTurn(classificationRequest({form: {kind: 'registered-bounded', boundedFormId: 'explain.batch', subjectCount: 1}}));
        expect(result.ruleId).toBe('operator-bounded-v1');
        expect(result.decisionClass).toBe('D1');
        expect(result.minimumCapability).toBe('C2');
    });

    it('never uses D1 for a bounded form with more than one subject', () => {
        const result = classifySessionTurn(classificationRequest({form: {kind: 'registered-bounded', boundedFormId: 'explain.batch', subjectCount: 2}}));
        expect(result.decisionClass).toBe('D2');
    });

    it('defaults unproven natural language to D2 with the C3 floor', () => {
        const result = classifySessionTurn(classificationRequest());
        expect(result.ruleId).toBe('operator-default-v1');
        expect(result.decisionClass).toBe('D2');
        expect(result.minimumCapability).toBe('C3');
        expect(result.modelRequired).toBeTrue();
    });

    it('raises every hard guard to D3 with the C5 floor', () => {
        for (const guard of ['safety-escalation', 'integrity-conflict', 'normative-contradiction',
            'pack-scope-drift', 'cross-repository', 'structural-redesign', 'repeated-failure'] as const) {
            const result = classifySessionTurn(classificationRequest({guards: [guard]}));
            expect(result.ruleId).withContext(guard).toBe('operator-complex-v1');
            expect(result.decisionClass).withContext(guard).toBe('D3');
            expect(result.minimumCapability).withContext(guard).toBe('C5');
        }
    });

    it('lets a hard guard dominate an otherwise exact M0 query form', () => {
        const result = classifySessionTurn(classificationRequest({
            form: {kind: 'structured-query', queryFormId: 'session.budget'}, guards: ['integrity-conflict']
        }));
        expect(result.decisionClass).toBe('D3');
        expect(result.modelRequired).toBeTrue();
    });

    it('deduplicates and sorts matched guards deterministically', () => {
        const result = classifySessionTurn(classificationRequest({guards: ['repeated-failure', 'cross-repository', 'repeated-failure']}));
        expect(result.matchedGuards).toEqual(['cross-repository', 'repeated-failure']);
    });
});

describe('CA-17 operator class escalation', () => {
    it('escalates a D2 default to D3 when --class=D3 is given', () => {
        const result = classifySessionTurn(classificationRequest({requestedClass: 'D3'}));
        expect(result.ruleDecisionClass).toBe('D2');
        expect(result.decisionClass).toBe('D3');
        expect(result.minimumCapability).toBe('C5');
        expect(result.escalatedByOperator).toBeTrue();
    });

    it('escalates an M0 query form to a model-backed class only on explicit request', () => {
        const plain = classifySessionTurn(classificationRequest({form: {kind: 'structured-query', queryFormId: 'batch.status'}}));
        expect(plain.modelRequired).toBeFalse();
        const escalated = classifySessionTurn(classificationRequest({
            form: {kind: 'structured-query', queryFormId: 'batch.status'}, requestedClass: 'D2'
        }));
        expect(escalated.decisionClass).toBe('D2');
        expect(escalated.modelRequired).toBeTrue();
        expect(escalated.ruleDecisionClass).toBe('M0');
    });

    it('refuses to under-route a guarded turn and leaves no partial result', () => {
        expect(reasonOf(() => classifySessionTurn(classificationRequest({guards: ['safety-escalation'], requestedClass: 'D1'}))))
            .toBe('SESSION_ROUTING_UNDER_ROUTE_REFUSED');
    });

    it('refuses to under-route a D2 default to D1', () => {
        expect(reasonOf(() => classifySessionTurn(classificationRequest({requestedClass: 'D1'}))))
            .toBe('SESSION_ROUTING_UNDER_ROUTE_REFUSED');
    });

    it('accepts an equal --class without reporting an escalation', () => {
        const result = classifySessionTurn(classificationRequest({requestedClass: 'D2'}));
        expect(result.decisionClass).toBe('D2');
        expect(result.escalatedByOperator).toBeFalse();
    });
});

describe('CA-17 endpoint escalation reroute', () => {
    it('raises D2 to D3 and records the escalating endpoint', () => {
        const original = classifySessionTurn(classificationRequest());
        const rerouted = reclassifyAfterEndpointEscalation(original, {
            fromDecisionClass: 'D2', requestedDecisionClass: 'D3', endpointId: 'ep-c3', reasonText: 'cross-repository impact'
        });
        expect(rerouted.decisionClass).toBe('D3');
        expect(rerouted.minimumCapability).toBe('C5');
        expect(rerouted.escalatedByEndpoint).toBeTrue();
        expect(rerouted.escalatedFromEndpointId).toBe('ep-c3');
    });

    it('refuses an escalation that would lower or hold the class', () => {
        const original = classifySessionTurn(classificationRequest());
        expect(reasonOf(() => reclassifyAfterEndpointEscalation(original, {
            fromDecisionClass: 'D2', requestedDecisionClass: 'D2', endpointId: 'ep-c3', reasonText: 'no'
        }))).toBe('SESSION_ROUTING_UNDER_ROUTE_REFUSED');
    });

    it('refuses an escalation whose declared source class does not match the turn', () => {
        const original = classifySessionTurn(classificationRequest());
        expect(reasonOf(() => reclassifyAfterEndpointEscalation(original, {
            fromDecisionClass: 'D1', requestedDecisionClass: 'D3', endpointId: 'ep-c3', reasonText: 'stale'
        }))).toBe('SESSION_ROUTING_REQUEST_INVALID');
    });
});

describe('CA-17 classification input validation', () => {
    it('refuses an unsupported request form kind', () => {
        const malformed = {...classificationRequest(), form: {kind: 'free-text'}} as unknown as SessionClassificationRequest;
        expect(reasonOf(() => classifySessionTurn(malformed))).toBe('SESSION_ROUTING_REQUEST_INVALID');
    });

    it('refuses an unsupported hard guard rather than ignoring it', () => {
        const malformed = {...classificationRequest(), guards: ['vibes']} as unknown as SessionClassificationRequest;
        expect(reasonOf(() => classifySessionTurn(malformed))).toBe('SESSION_ROUTING_REQUEST_INVALID');
    });

    it('refuses an unsupported --class value', () => {
        const malformed = {...classificationRequest(), requestedClass: 'D4'} as unknown as SessionClassificationRequest;
        expect(reasonOf(() => classifySessionTurn(malformed))).toBe('SESSION_ROUTING_CLASS_UNSUPPORTED');
    });

    it('refuses a blank turn identity', () => {
        expect(reasonOf(() => classifySessionTurn(classificationRequest({turnId: '  '})))).toBe('SESSION_ROUTING_REQUEST_INVALID');
    });

    it('refuses a negative subject count', () => {
        const malformed = classificationRequest({form: {kind: 'registered-bounded', boundedFormId: 'explain.batch', subjectCount: -1}});
        expect(reasonOf(() => classifySessionTurn(malformed))).toBe('SESSION_ROUTING_REQUEST_INVALID');
    });

    it('is deterministic: the same request classifies identically on replay', () => {
        const request = classificationRequest({guards: ['pack-scope-drift']});
        expect(classifySessionTurn(request)).toEqual(classifySessionTurn(request));
    });
});
