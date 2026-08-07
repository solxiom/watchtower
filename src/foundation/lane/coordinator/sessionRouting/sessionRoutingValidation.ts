/**
 * The trust boundary for the CA-17 capsule. Lane-owned routing plans, budget
 * limits, and budget states all reach this batch as bytes that were persisted
 * by someone else (LC-05's `context-policy.json`, a CA-15 session journal, a
 * caller-held JSON blob), so every one of them is parsed from `unknown` into a
 * closed contract here before any other module reads a field from it.
 *
 * Nothing is repaired, defaulted, or coerced: a malformed, missing, extra, or
 * unsupported value produces one stable typed reason and no partial result.
 */
import type {
    EndpointCapabilityClass, EndpointContextClass, SessionBudgetLimits, SessionBudgetState,
    SessionClassRoute, SessionModelDecisionClass, SessionRoutingPlan
} from '../../../../contracts/index.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';

const MODEL_CLASSES: readonly SessionModelDecisionClass[] = Object.freeze(['D1', 'D2', 'D3']);
const CAPABILITIES: readonly EndpointCapabilityClass[] = Object.freeze(['C2', 'C3', 'C5']);
const CONTEXTS: readonly EndpointContextClass[] = Object.freeze(['small', 'medium', 'large']);
const PLAN_KEYS = ['schemaVersion', 'policyVersion', 'allocationSlotPrefix', 'classes', 'protectedReserveIds'] as const;
const ROUTE_KEYS = ['primary', 'fallbacks', 'minimumCapability', 'minimumContext', 'maxConcurrentTurns'] as const;

const LIMIT_FIELDS = [
    'perTurnInputTokens', 'perTurnOutputTokens', 'sessionCumulativeTokens', 'sessionTurns',
    'sessionContextRequests', 'sessionStoredFullTextBytes', 'laneOperatorSessionTotalTokens',
    'protectedCapacityPercent', 'maxConcurrentActiveTurns', 'softWarnPercent'
] as const;

const STATE_FIELDS = [
    'turnInputTokens', 'turnOutputTokens', 'sessionCumulativeTokens', 'sessionModelBackedTurns',
    'sessionContextRequests', 'sessionStoredFullTextBytes', 'laneOperatorSessionUsedTokens'
] as const;

const TELEMETRY = ['reported', 'estimated', 'unknown'] as const;

/** Parses an untrusted lane routing plan document into the closed contract. */
export function parseSessionRoutingPlan(value: unknown): SessionRoutingPlan {
    const record = requireObject('routing plan', value);
    rejectExtraKeys('routing plan', record, PLAN_KEYS);
    if (record['schemaVersion'] !== 1) invalidPolicy('schemaVersion', 'schemaVersion must be exactly 1');
    if (record['allocationSlotPrefix'] !== 'coordinator:operator-session') {
        invalidPolicy('allocationSlotPrefix', 'allocationSlotPrefix must be "coordinator:operator-session"');
    }
    const classes = requireObject('classes', record['classes']);
    rejectExtraKeys('classes', classes, MODEL_CLASSES);
    const parsed: SessionRoutingPlan = Object.freeze({
        schemaVersion: 1, policyVersion: requireText('policyVersion', record['policyVersion']),
        allocationSlotPrefix: 'coordinator:operator-session',
        classes: Object.freeze(Object.fromEntries(MODEL_CLASSES.map(name => [name, parseClassRoute(name, classes[name])]))) as SessionRoutingPlan['classes'],
        protectedReserveIds: requireTextArray('protectedReserveIds', record['protectedReserveIds'])
    });
    return validateSessionRoutingPlan(parsed);
}

/** Structural re-check for an already-typed plan; every entry point runs it before selecting a route. */
export function validateSessionRoutingPlan(plan: SessionRoutingPlan): SessionRoutingPlan {
    if (plan.schemaVersion !== 1) invalidPolicy('schemaVersion', 'schemaVersion must be exactly 1');
    if (plan.allocationSlotPrefix !== 'coordinator:operator-session') {
        invalidPolicy('allocationSlotPrefix', 'allocationSlotPrefix must be "coordinator:operator-session"');
    }
    for (const name of MODEL_CLASSES) {
        const route = plan.classes[name];
        if (route === undefined) invalidPolicy(`classes.${name}`, `the plan must declare a route for ${name}`);
        if (!CAPABILITIES.includes(route.minimumCapability)) invalidPolicy(`classes.${name}.minimumCapability`, 'unsupported capability class');
        if (!CONTEXTS.includes(route.minimumContext)) invalidPolicy(`classes.${name}.minimumContext`, 'unsupported context class');
        if (!Number.isSafeInteger(route.maxConcurrentTurns) || route.maxConcurrentTurns < 1) {
            invalidPolicy(`classes.${name}.maxConcurrentTurns`, 'maxConcurrentTurns must be a positive safe integer');
        }
    }
    return plan;
}

/** Fails closed on limits that are absent, negative, non-integral, or self-contradictory. */
export function validateSessionBudgetLimits(limits: SessionBudgetLimits): SessionBudgetLimits {
    for (const field of LIMIT_FIELDS) {
        const value = limits[field];
        if (!Number.isSafeInteger(value) || value < 0) {
            sessionRoutingFailure('SESSION_BUDGET_LIMITS_INVALID', field, `budget limit "${field}" must be a non-negative safe integer`);
        }
    }
    if (limits.protectedCapacityPercent > 100) {
        sessionRoutingFailure('SESSION_BUDGET_LIMITS_INVALID', 'protectedCapacityPercent', 'protectedCapacityPercent must be between 0 and 100');
    }
    if (limits.softWarnPercent > 100) {
        sessionRoutingFailure('SESSION_BUDGET_LIMITS_INVALID', 'softWarnPercent', 'softWarnPercent must be between 0 and 100');
    }
    if (limits.sessionCumulativeTokens > limits.laneOperatorSessionTotalTokens) {
        sessionRoutingFailure('SESSION_BUDGET_LIMITS_INVALID', 'sessionCumulativeTokens',
            'a per-session ceiling may not exceed the lane-wide operator-session ceiling');
    }
    if (limits.unit !== 'estimated-tokens') sessionRoutingFailure('SESSION_BUDGET_LIMITS_INVALID', 'unit', 'unit must be "estimated-tokens"');
    return limits;
}

/** Fails closed on a state round-tripped through untrusted storage before any field is read. */
export function validateSessionBudgetState(state: SessionBudgetState): SessionBudgetState {
    for (const field of STATE_FIELDS) {
        const value = state[field];
        if (!Number.isSafeInteger(value) || value < 0) {
            sessionRoutingFailure('SESSION_BUDGET_STATE_INVALID', field, `budget state field "${field}" must be a non-negative safe integer`);
        }
    }
    if (!TELEMETRY.includes(state.telemetryQuality)) {
        sessionRoutingFailure('SESSION_BUDGET_STATE_INVALID', 'telemetryQuality', 'telemetryQuality must be reported, estimated, or unknown');
    }
    requireText('operatorSessionId', state.operatorSessionId);
    requireText('laneId', state.laneId);
    requireText('budgetSegmentId', state.budgetSegmentId);
    return state;
}

function parseClassRoute(name: string, value: unknown): SessionClassRoute {
    const record = requireObject(`classes.${name}`, value);
    rejectExtraKeys(`classes.${name}`, record, ROUTE_KEYS);
    const minimumCapability = requireText(`classes.${name}.minimumCapability`, record['minimumCapability']);
    const minimumContext = requireText(`classes.${name}.minimumContext`, record['minimumContext']);
    if (!isCapability(minimumCapability)) invalidPolicy(`classes.${name}.minimumCapability`, 'unsupported capability class');
    if (!isContext(minimumContext)) invalidPolicy(`classes.${name}.minimumContext`, 'unsupported context class');
    const maxConcurrentTurns = record['maxConcurrentTurns'];
    if (!isPositiveInteger(maxConcurrentTurns)) {
        invalidPolicy(`classes.${name}.maxConcurrentTurns`, 'maxConcurrentTurns must be a positive safe integer');
    }
    return Object.freeze({
        primary: requireText(`classes.${name}.primary`, record['primary']),
        fallbacks: requireTextArray(`classes.${name}.fallbacks`, record['fallbacks']),
        minimumCapability, minimumContext, maxConcurrentTurns
    });
}

function requireObject(subject: string, value: unknown): Readonly<Record<string, unknown>> {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) invalidPolicy(subject, `${subject} must be a JSON object`);
    return value as Readonly<Record<string, unknown>>; // narrowed above: a non-null, non-array object

}

function rejectExtraKeys(subject: string, record: Readonly<Record<string, unknown>>, allowed: readonly string[]): void {
    const extra = Object.keys(record).filter(key => !allowed.includes(key));
    if (extra.length > 0) invalidPolicy(subject, `unsupported ${subject} field(s): ${extra.sort().join(', ')}`);
}

function isCapability(value: string): value is EndpointCapabilityClass {
    return (CAPABILITIES as readonly string[]).includes(value);
}

function isContext(value: string): value is EndpointContextClass {
    return (CONTEXTS as readonly string[]).includes(value);
}

function isPositiveInteger(value: unknown): value is number {
    return Number.isSafeInteger(value) && (value as number) >= 1;
}

function requireText(subject: string, value: unknown): string {
    if (typeof value !== 'string' || value.trim() === '') invalidPolicy(subject, `${subject} must be a non-empty string`);
    return value;
}

function requireTextArray(subject: string, value: unknown): readonly string[] {
    if (!Array.isArray(value)) invalidPolicy(subject, `${subject} must be an array of strings`);
    return Object.freeze(value.map((item: unknown, position: number) => requireText(`${subject}[${position}]`, item)));
}

function invalidPolicy(subject: string, message: string): never {
    return sessionRoutingFailure('SESSION_ROUTING_POLICY_INVALID', subject, message);
}
