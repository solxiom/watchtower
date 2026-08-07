import type {
    EndpointConformance, EndpointFingerprint, EndpointProfile, JsonValue, LaneRuntimeContext, OpenCodeDecisionRequest,
    OpenCodeEndpointReason
} from '../../contracts/index.js';
import {OPENCODE_MAX_OUTPUT_BYTES} from '../../contracts/opencodeEndpoint.js';
import {reservationAuthorizationValue} from './openCodeReservationValidation.js';

const MAX_TIMEOUT = 600_000;
const CONTROL = /[\u0000-\u001f\u007f]/u;
const UNATTENDED_CONFORMANCE: readonly (keyof EndpointConformance)[] = [
    'launchable', 'argvArray', 'explicitCwd', 'environmentAllowlist', 'boundedInput', 'singleJsonResult',
    'writeDenied', 'brokeredContext', 'interruptible', 'boundedOutput'
];
const FINGERPRINT_KEYS: readonly (keyof EndpointFingerprint)[] = [
    'executable', 'adapterVersion', 'route', 'catalog', 'model', 'effort', 'capabilityEvidence'
];

export function assertInvokeAuthorized(profile: EndpointProfile): OpenCodeEndpointReason | null {
    if (!profile.enabled) return 'disabled';
    if (!UNATTENDED_CONFORMANCE.every(key => profile.conformance[key])) return 'support-mode';
    return null;
}

export function assertIdentityBound(
    profile: EndpointProfile, fingerprint: EndpointFingerprint, catalogFingerprint: string
): OpenCodeEndpointReason | null {
    if (!FINGERPRINT_KEYS.every(key => profile.fingerprint[key] === fingerprint[key])) return 'identity-mismatch';
    if (profile.model !== fingerprint.model) return 'identity-mismatch';
    if (profile.catalogId !== catalogFingerprint || fingerprint.catalog !== catalogFingerprint) return 'identity-mismatch';
    return null;
}

export function validateOpenCodeRequest(value: unknown): {ok: true; value: OpenCodeDecisionRequest} | {ok: false; reason: OpenCodeEndpointReason} {
    if (!record(value) || !exactKeys(value, [
        'endpoint', 'fingerprint', 'expectedFingerprint', 'catalogFingerprint', 'reservationAuthorization',
        'envelope', 'workspace', 'context', 'timeoutMs', 'maxOutputBytes'
    ]) || !isJsonValue(value.envelope) || !safeText(value.workspace) || !sha256(value.expectedFingerprint) || !safeText(value.catalogFingerprint) ||
        !boundedNumber(value.timeoutMs, 1, MAX_TIMEOUT) || !boundedNumber(value.maxOutputBytes, 1, OPENCODE_MAX_OUTPUT_BYTES)) {
        return {ok: false, reason: 'invalid-request'};
    }
    const endpoint = endpointProfile(value.endpoint);
    const fingerprint = endpointFingerprint(value.fingerprint);
    const context = runtimeContext(value.context);
    const reservationAuthorization = reservationAuthorizationValue(value.reservationAuthorization);
    if (!endpoint || !fingerprint || !context || !reservationAuthorization) return {ok: false, reason: 'invalid-request'};
    return {ok: true, value: Object.freeze({
        endpoint, fingerprint, expectedFingerprint: value.expectedFingerprint, catalogFingerprint: value.catalogFingerprint,
        reservationAuthorization, envelope: value.envelope, workspace: value.workspace, context,
        timeoutMs: value.timeoutMs, maxOutputBytes: value.maxOutputBytes
    })};
}

function boundedNumber(value: unknown, minimum: number, maximum: number): value is number {
    return typeof value === 'number' && Number.isInteger(value) && value >= minimum && value <= maximum;
}
function exactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    const actual = Object.keys(value);
    return actual.length === keys.length && actual.every(key => keys.includes(key));
}
function safeText(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= 4096 && !CONTROL.test(value);
}
function sha256(value: unknown): value is `sha256:${string}` {
    return typeof value === 'string' && /^sha256:[0-9a-f]{64}$/u.test(value);
}
function endpointFingerprint(value: unknown): EndpointFingerprint | null {
    if (!record(value) || !exactKeys(value, FINGERPRINT_KEYS)) return null;
    const executable = text(value.executable); const adapterVersion = text(value.adapterVersion); const route = text(value.route);
    const catalog = text(value.catalog); const model = text(value.model); const effort = text(value.effort);
    const capabilityEvidence = text(value.capabilityEvidence);
    return executable && adapterVersion && route && catalog && model && effort && capabilityEvidence
        ? {executable, adapterVersion, route, catalog, model, effort, capabilityEvidence} : null;
}
function endpointProfile(value: unknown): EndpointProfile | null {
    if (!record(value) || !exactKeys(value, ['schemaVersion', 'endpointId', 'toolId', 'adapterId', 'hostId', 'osUser', 'routeId', 'capacityPoolId', 'catalogId', 'model', 'effort', 'enabled', 'availability', 'capabilities', 'conformance', 'fingerprint']) ||
        value.schemaVersion !== 1 || typeof value.enabled !== 'boolean') return null;
    const endpointId = text(value.endpointId); const toolId = text(value.toolId); const adapterId = text(value.adapterId);
    const hostId = text(value.hostId); const osUser = text(value.osUser); const routeId = text(value.routeId);
    const capacityPoolId = text(value.capacityPoolId); const catalogId = text(value.catalogId); const model = text(value.model);
    const effort = text(value.effort); const availability = availabilityValue(value.availability);
    const capabilities = value.capabilities; const fingerprint = endpointFingerprint(value.fingerprint);
    const conformance = validConformance(value.conformance);
    if (!endpointId || !toolId || !adapterId || !hostId || !osUser || !routeId || !capacityPoolId || !catalogId || !model || !effort || !availability ||
        !record(capabilities) || !fingerprint || !conformance) return null;
    const capabilityClass = capabilityValue(capabilities.capabilityClass);
    const reasoningClass = reasoningValue(capabilities.reasoningClass);
    const contextClass = contextValue(capabilities.contextClass);
    const evidence = evidenceValue(capabilities.evidence);
    if (!capabilityClass || !reasoningClass || !contextClass || !evidence || !Array.isArray(capabilities.roles)) return null;
    const roles = capabilities.roles.map(text);
    if (roles.some(role => role === null)) return null;
    return {
        schemaVersion: 1, endpointId, toolId, adapterId, hostId, osUser, routeId, capacityPoolId, catalogId, model, effort,
        enabled: value.enabled, availability,
        capabilities: {capabilityClass, reasoningClass, contextClass, roles: Object.freeze(roles.filter((role): role is string => role !== null)), evidence},
        conformance, fingerprint
    };
}
function validConformance(value: unknown): EndpointConformance | null {
    if (!record(value)) return null;
    const keys = ['launchable', 'argvArray', 'explicitCwd', 'environmentAllowlist', 'boundedInput', 'singleJsonResult', 'writeDenied', 'brokeredContext', 'interruptible', 'boundedOutput', 'installableKnowledge'];
    if (!exactKeys(value, keys) || keys.some(key => typeof value[key] !== 'boolean')) return null;
    return {
        launchable: value.launchable === true, argvArray: value.argvArray === true, explicitCwd: value.explicitCwd === true,
        environmentAllowlist: value.environmentAllowlist === true, boundedInput: value.boundedInput === true,
        singleJsonResult: value.singleJsonResult === true, writeDenied: value.writeDenied === true,
        brokeredContext: value.brokeredContext === true, interruptible: value.interruptible === true,
        boundedOutput: value.boundedOutput === true, installableKnowledge: value.installableKnowledge === true
    };
}
function runtimeContext(value: unknown): LaneRuntimeContext | null {
    const required = ['workspace', 'laneId', 'initiativeId', 'laneSlug', 'laneDir', 'homeRepositoryId', 'repositoriesFile', 'runtimeRoot', 'runtimeVersion', 'knowledgeRoot'];
    const optional = ['activeRepositoryId', 'coordinatorCycleId', 'decisionClass'];
    if (!record(value) || !exactKeys(value, [...required, 'baseEnvironment', ...optional].filter(key => value[key] !== undefined)) ||
        required.some(key => !text(value[key])) || !optional.every(key => value[key] === undefined || text(value[key]) !== null)) return null;
    const base = value.baseEnvironment;
    if (!record(base) || !exactKeys(base, ['path', 'home'])) return null;
    const path = text(base.path); const home = text(base.home);
    if (!path || !home) return null;
    const workspace = text(value.workspace); const laneId = text(value.laneId); const initiativeId = text(value.initiativeId);
    const laneSlug = text(value.laneSlug); const laneDir = text(value.laneDir); const homeRepositoryId = text(value.homeRepositoryId);
    const repositoriesFile = text(value.repositoriesFile); const runtimeRoot = text(value.runtimeRoot);
    const runtimeVersion = text(value.runtimeVersion); const knowledgeRoot = text(value.knowledgeRoot);
    if (!workspace || !laneId || !initiativeId || !laneSlug || !laneDir || !homeRepositoryId || !repositoriesFile || !runtimeRoot || !runtimeVersion || !knowledgeRoot) return null;
    const activeRepositoryId = optionalText(value.activeRepositoryId);
    const coordinatorCycleId = optionalText(value.coordinatorCycleId);
    const decisionClass = optionalText(value.decisionClass);
    return {
        workspace, laneId, initiativeId, laneSlug, laneDir, homeRepositoryId, repositoriesFile, runtimeRoot, runtimeVersion, knowledgeRoot,
        baseEnvironment: {path, home},
        ...(activeRepositoryId ? {activeRepositoryId} : {}),
        ...(coordinatorCycleId ? {coordinatorCycleId} : {}),
        ...(decisionClass ? {decisionClass} : {})
    };
}
function text(value: unknown): string | null { return safeText(value) ? value : null; }
function optionalText(value: unknown): string | undefined { return value === undefined ? undefined : text(value) ?? undefined; }
function availabilityValue(value: unknown): EndpointProfile['availability'] | null {
    return value === 'available' || value === 'unavailable' || value === 'unknown' ? value : null;
}
function capabilityValue(value: unknown): 'C2' | 'C3' | 'C5' | null { return value === 'C2' || value === 'C3' || value === 'C5' ? value : null; }
function reasoningValue(value: unknown): 'R1' | 'R2' | 'R3' | 'R4' | 'R5' | null {
    return value === 'R1' || value === 'R2' || value === 'R3' || value === 'R4' || value === 'R5' ? value : null;
}
function contextValue(value: unknown): 'small' | 'medium' | 'large' | null {
    return value === 'small' || value === 'medium' || value === 'large' ? value : null;
}
function evidenceValue(value: unknown): 'adapter-reported' | 'watchtower-verified' | 'operator-approved' | 'estimated' | 'unknown' | null {
    return value === 'adapter-reported' || value === 'watchtower-verified' || value === 'operator-approved' || value === 'estimated' || value === 'unknown' ? value : null;
}
function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isJsonValue(value: unknown): value is JsonValue {
    return value === null || typeof value === 'string' || typeof value === 'boolean' ||
        (typeof value === 'number' && Number.isFinite(value)) ||
        (Array.isArray(value) && value.every(isJsonValue)) ||
        (record(value) && Object.values(value).every(isJsonValue));
}
