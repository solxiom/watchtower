/**
 * Shared builders for the CA-17 session routing/budget specs. Every fixture
 * mirrors the exact `docs/spec/v1-contracts.md` §7 "Operator-standard session
 * defaults" so a spec asserts against the shipping baseline rather than an
 * invented number.
 */
import type {
    SessionBudgetLimits, SessionBudgetState, SessionClassificationRequest, SessionEndpointCandidate,
    SessionGrantRequest, SessionRoutingPlan, SessionTurnClassification
} from '../../../../src/contracts/index.js';
import {classifySessionTurn} from '../../../../src/foundation/lane/coordinator/sessionRouting/index.js';

export const OPERATOR_STANDARD_LIMITS: SessionBudgetLimits = Object.freeze({
    perTurnInputTokens: 40_000,
    perTurnOutputTokens: 4_000,
    sessionCumulativeTokens: 500_000,
    sessionTurns: 50,
    sessionContextRequests: 2_000,
    sessionStoredFullTextBytes: 33_554_432,
    laneOperatorSessionTotalTokens: 2_000_000,
    protectedCapacityPercent: 20,
    maxConcurrentActiveTurns: 2,
    softWarnPercent: 80,
    allowUnknownTelemetry: false,
    unit: 'estimated-tokens'
});

export function budgetLimits(overrides: Partial<SessionBudgetLimits> = {}): SessionBudgetLimits {
    return Object.freeze({...OPERATOR_STANDARD_LIMITS, ...overrides});
}

export function budgetState(overrides: Partial<SessionBudgetState> = {}): SessionBudgetState {
    return Object.freeze({
        operatorSessionId: 'os-1', laneId: 'lane-1', budgetSegmentId: 'seg-1',
        turnInputTokens: 0, turnOutputTokens: 0, sessionCumulativeTokens: 0, sessionModelBackedTurns: 0,
        sessionContextRequests: 0, sessionStoredFullTextBytes: 0, laneOperatorSessionUsedTokens: 0,
        telemetryQuality: 'reported', ...overrides
    });
}

export function routingPlan(overrides: Partial<SessionRoutingPlan> = {}): SessionRoutingPlan {
    return Object.freeze({
        schemaVersion: 1, policyVersion: 'shipping-v1', allocationSlotPrefix: 'coordinator:operator-session',
        classes: Object.freeze({
            D1: route('ep-c2', ['ep-c3'], 'C2', 'small'),
            D2: route('ep-c3', ['ep-c5'], 'C3', 'medium'),
            D3: route('ep-c5', ['ep-c5-reserve'], 'C5', 'large')
        }),
        protectedReserveIds: Object.freeze(['escalation', 'recovery']),
        ...overrides
    });
}

export function route(
    primary: string, fallbacks: readonly string[],
    minimumCapability: 'C2' | 'C3' | 'C5', minimumContext: 'small' | 'medium' | 'large', maxConcurrentTurns = 2
): SessionRoutingPlan['classes']['D1'] {
    return Object.freeze({primary, fallbacks: Object.freeze([...fallbacks]), minimumCapability, minimumContext, maxConcurrentTurns});
}

export function candidate(overrides: Partial<SessionEndpointCandidate> & {endpointId: string}): SessionEndpointCandidate {
    return Object.freeze({
        capacityPoolId: 'pool-a', capabilityClass: 'C5', contextClass: 'large', eligibilityStatus: 'eligible',
        availableSlots: 1, reserveId: null, economicsRank: 10, independencePass: true, ...overrides
    });
}

export function classificationRequest(overrides: Partial<SessionClassificationRequest> = {}): SessionClassificationRequest {
    const base: SessionClassificationRequest = {
        operatorSessionId: 'os-1', turnId: 'turn-1', form: {kind: 'natural-language'}, guards: Object.freeze([]),
        registeredQueryFormIds: Object.freeze(['session.budget', 'batch.status']),
        registeredBoundedFormIds: Object.freeze(['explain.batch'])
    };
    const merged: SessionClassificationRequest = {...base, form: overrides.form ?? base.form, ...withoutForm(overrides)};
    return Object.freeze(merged);
}

function withoutForm(overrides: Partial<SessionClassificationRequest>): Omit<Partial<SessionClassificationRequest>, 'form'> {
    const {form: _ignored, ...rest} = overrides;
    return rest;
}

/** A ready-to-route classification for the given class, produced through the real classifier. */
export function classificationFor(decisionClass: 'D1' | 'D2' | 'D3'): SessionTurnClassification {
    if (decisionClass === 'D3') return classifySessionTurn(classificationRequest({guards: ['safety-escalation']}));
    if (decisionClass === 'D1') {
        return classifySessionTurn(classificationRequest({form: {kind: 'registered-bounded', boundedFormId: 'explain.batch', subjectCount: 1}}));
    }
    return classifySessionTurn(classificationRequest());
}

export function grantRequest(overrides: Partial<SessionGrantRequest> = {}): SessionGrantRequest {
    const base: SessionGrantRequest = {
        grantId: 'grant-1', operatorSessionId: 'os-1', laneId: 'lane-1', budgetSegmentId: 'seg-1',
        allowance: {kind: 'turns', turns: 2}, reason: 'finish the reject triage',
        requestedAtMs: 1_000, expiresAtMs: null, operatorConfirmed: true, telemetryQuality: 'reported'
    };
    const merged: SessionGrantRequest = {...base, allowance: overrides.allowance ?? base.allowance, ...withoutAllowance(overrides)};
    return Object.freeze(merged);
}

function withoutAllowance(overrides: Partial<SessionGrantRequest>): Omit<Partial<SessionGrantRequest>, 'allowance'> {
    const {allowance: _ignored, ...rest} = overrides;
    return rest;
}

/** Admission with an explicit level, for route specs that are not exercising the ledger. */
export function admission(level: 'ok' | 'soft' | 'hard' = 'ok'): SessionRouteRequestAdmission {
    return Object.freeze({
        check: Object.freeze({level, exceededDimensions: Object.freeze(level === 'hard' ? ['sessionCumulativeTokens'] : []), warnedDimensions: Object.freeze([])}),
        modelBackedTurnAdmitted: level !== 'hard', appliedGrantIds: Object.freeze([]), recommendation: null
    });
}

type SessionRouteRequestAdmission = import('../../../../src/contracts/index.js').SessionBudgetAdmission;
