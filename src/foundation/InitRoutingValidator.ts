import {createWatchtowerError} from '../contracts/errors.js';
import type {
    AutomatedRoute, CapabilityClass, CoordinatorRoutingPolicy, DecisionClass, RoutingEndpoint, SessionRoute
} from './InitContracts.js';

const CAPABILITIES: readonly CapabilityClass[] = ['C2', 'C3', 'C5'];
const CLASSES: readonly DecisionClass[] = ['D1', 'D2', 'D3'];
const FLOORS: Readonly<Record<DecisionClass, CapabilityClass>> = {D1: 'C2', D2: 'C3', D3: 'C5'};
const POLICY_KEYS = ['schemaVersion', 'endpoints', 'classes', 'operatorSessionClasses', 'operatorSessionBudgetPolicyRef'];
const ENDPOINT_KEYS = ['endpointId', 'hostId', 'osUser', 'adapterId', 'provider', 'accountId', 'model', 'effort', 'capabilityClass'];

export function validateRoutingPolicy(value: unknown): CoordinatorRoutingPolicy {
    if (!record(value) || !only(value, POLICY_KEYS) || value.schemaVersion !== 1 || !Array.isArray(value.endpoints) ||
        !record(value.classes) || !record(value.operatorSessionClasses) ||
        value.operatorSessionBudgetPolicyRef !== 'context-policy.json#operatorSession') invalid();
    const endpoints = value.endpoints.map(endpoint);
    const ids = endpoints.map(item => item.endpointId);
    if (ids.length === 0 || new Set(ids).size !== ids.length) invalid();
    const byId = new Map(endpoints.map(item => [item.endpointId, item]));
    const classes = automatedClasses(value.classes, byId);
    const sessions = sessionClasses(value.operatorSessionClasses, byId);
    return Object.freeze({schemaVersion: 1, endpoints: Object.freeze(endpoints), classes,
        operatorSessionClasses: sessions, operatorSessionBudgetPolicyRef: 'context-policy.json#operatorSession'});
}

function automatedClasses(value: Record<string, unknown>, endpoints: ReadonlyMap<string, RoutingEndpoint>):
    Readonly<Record<DecisionClass, AutomatedRoute>> {
    if (!only(value, CLASSES)) invalid();
    return Object.freeze({D1: automatedRoute(value.D1, 'D1', endpoints),
        D2: automatedRoute(value.D2, 'D2', endpoints), D3: automatedRoute(value.D3, 'D3', endpoints)});
}

function sessionClasses(value: Record<string, unknown>, endpoints: ReadonlyMap<string, RoutingEndpoint>):
    Readonly<Record<DecisionClass, SessionRoute>> {
    if (!only(value, CLASSES)) invalid();
    return Object.freeze({D1: sessionRoute(value.D1, 'D1', endpoints),
        D2: sessionRoute(value.D2, 'D2', endpoints), D3: sessionRoute(value.D3, 'D3', endpoints)});
}

function automatedRoute(value: unknown, decision: DecisionClass,
    endpoints: ReadonlyMap<string, RoutingEndpoint>): AutomatedRoute {
    if (!record(value) || !only(value, ['minimumCapability', 'primary', 'fallbacks']) ||
        !CAPABILITIES.includes(value.minimumCapability as CapabilityClass) ||
        capability(value.minimumCapability as CapabilityClass) < capability(FLOORS[decision])) invalid();
    const selected = selectedEndpoints(value, endpoints);
    if (selected.some(item => capability(item.capabilityClass) < capability(value.minimumCapability as CapabilityClass))) invalid();
    return Object.freeze({minimumCapability: value.minimumCapability as CapabilityClass, primary: selected[0].endpointId,
        fallbacks: Object.freeze(selected.slice(1).map(item => item.endpointId))});
}

function sessionRoute(value: unknown, decision: DecisionClass,
    endpoints: ReadonlyMap<string, RoutingEndpoint>): SessionRoute {
    if (!record(value) || !only(value, ['primary', 'fallbacks'])) invalid();
    const selected = selectedEndpoints(value, endpoints);
    if (selected.some(item => capability(item.capabilityClass) < capability(FLOORS[decision]))) invalid();
    return Object.freeze({primary: selected[0].endpointId,
        fallbacks: Object.freeze(selected.slice(1).map(item => item.endpointId))});
}

function selectedEndpoints(value: Record<string, unknown>, endpoints: ReadonlyMap<string, RoutingEndpoint>): RoutingEndpoint[] {
    if (!text(value.primary) || !Array.isArray(value.fallbacks) || !value.fallbacks.every(text)) invalid();
    const ids = [value.primary, ...value.fallbacks];
    if (new Set(ids).size !== ids.length) invalid();
    const selected = ids.map(id => endpoints.get(id));
    if (selected.some(item => item === undefined)) invalid();
    return selected as RoutingEndpoint[];
}

function endpoint(value: unknown): RoutingEndpoint {
    if (!record(value) || !only(value, ENDPOINT_KEYS) || !ENDPOINT_KEYS.slice(0, -1).every(key => text(value[key])) ||
        !CAPABILITIES.includes(value.capabilityClass as CapabilityClass) || Object.values(value).some(secret)) invalid();
    return Object.freeze(value as unknown as RoutingEndpoint);
}

function capability(value: CapabilityClass): number { return CAPABILITIES.indexOf(value); }
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function only(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key)); }
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(value); }
function secret(value: unknown): boolean { return typeof value === 'string' && /(?:token|secret|password|credential|api[_-]?key)\s*[:=]/iu.test(value); }
function invalid(): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'validate coordinator routing', target: '--coordinator-routing', remediation: 'Use the closed version 1 routing shape, exact floors, eligible endpoint capabilities, and no secret values.'}); }
