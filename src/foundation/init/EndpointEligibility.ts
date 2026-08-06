import {createWatchtowerError} from '../../contracts/errors.js';
import type {
    CapacityPoolSnapshot, CapacityPoolUsage, EndpointCapabilityClass, EndpointConformance,
    EndpointContextClass, EndpointFingerprint, EndpointProfile, EndpointReasoningClass,
    EndpointSupportMode, EligibilityFacts, EligibilityReason, EligibilityRequirements, EligibilityResult
} from '../../contracts/endpointEligibility.js';
import {semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';
import type {JsonValue} from '../schemaComposition/schemaCompositionContracts.js';

const CAPABILITIES: readonly EndpointCapabilityClass[] = ['C2', 'C3', 'C5'];
const REASONING: readonly EndpointReasoningClass[] = ['R1', 'R2', 'R3', 'R4', 'R5'];
const CONTEXT: readonly EndpointContextClass[] = ['small', 'medium', 'large'];
const UNATTENDED_KEYS: readonly (keyof EndpointConformance)[] = [
    'launchable', 'argvArray', 'explicitCwd', 'environmentAllowlist', 'boundedInput', 'singleJsonResult',
    'writeDenied', 'brokeredContext', 'interruptible', 'boundedOutput'
];
const PROFILE_KEYS = ['schemaVersion', 'endpointId', 'toolId', 'adapterId', 'hostId', 'osUser', 'routeId', 'capacityPoolId', 'catalogId', 'model', 'effort', 'enabled', 'availability', 'capabilities', 'conformance', 'fingerprint'];
const CAPABILITY_KEYS = ['capabilityClass', 'reasoningClass', 'contextClass', 'roles', 'evidence'];
const CONFORMANCE_KEYS = ['launchable', ...UNATTENDED_KEYS.filter(key => key !== 'launchable'), 'installableKnowledge'];
const FINGERPRINT_KEYS = ['executable', 'adapterVersion', 'route', 'catalog', 'model', 'effort', 'capabilityEvidence'];
const EVIDENCE = ['adapter-reported', 'watchtower-verified', 'operator-approved', 'estimated', 'unknown'] as const;

export function classifyEndpoint(conformance: EndpointConformance): EndpointSupportMode {
    if (UNATTENDED_KEYS.every(key => conformance[key])) return 'unattended';
    if (conformance.launchable) return 'advisory-confirmed';
    return 'skill-only';
}

export function computeEndpointFingerprint(fingerprint: EndpointFingerprint): `sha256:${string}` {
    return semanticDigest(fingerprint as unknown as JsonValue);
}

export function evaluateEndpointEligibility(
    profile: EndpointProfile, requirements: EligibilityRequirements, facts: EligibilityFacts
): EligibilityResult {
    const reasons: EligibilityReason[] = [];
    if (!profile.enabled) reasons.push('disabled');
    if (profile.availability !== 'available') reasons.push(profile.availability === 'unknown' ? 'unknown-fact' : 'unavailable');
    if (!profile.capabilities.roles.includes(requirements.role)) reasons.push('role-gap');
    if (requirements.requiresUnattended && classifyEndpoint(profile.conformance) !== 'unattended') reasons.push('support-mode');
    if (capability(profile.capabilities.capabilityClass) < capability(requirements.minimumCapability)) reasons.push('capability-floor');
    if (context(profile.capabilities.contextClass) < context(requirements.minimumContext)) reasons.push('context-floor');
    addFactReason(reasons, facts.roleSupported, 'role-gap');
    addFactReason(reasons, facts.hostFeatures, 'host-feature-gap');
    addFactReason(reasons, facts.traversable, 'path-access-gap');
    addFactReason(reasons, facts.repositoryAccess, 'repository-access-gap');
    addFactReason(reasons, facts.policyAllowed, 'policy-gap');
    addFactReason(reasons, facts.capacityAvailable, 'capacity-unavailable');
    if (requirements.reviewer) addFactReason(reasons, facts.reviewerIndependent, 'reviewer-independence-gap');
    addFactReason(reasons, facts.proofAvailable, 'proof-gap');
    if (!facts.fingerprintCurrent) reasons.push('stale-fingerprint');
    const status = reasons.length === 0 ? 'eligible' : reasons.every(reason => reason === 'unknown-fact') ? 'unknown' : 'ineligible';
    return Object.freeze({endpointId: profile.endpointId, status, reasons: Object.freeze(reasons), capacityPoolId: profile.capacityPoolId});
}

export function groupCapacityPools(profiles: readonly EndpointProfile[], snapshots: readonly CapacityPoolSnapshot[]): readonly CapacityPoolUsage[] {
    validateSnapshots(snapshots);
    const ids = new Map<string, string[]>();
    for (const profile of profiles) {
        const endpointIds = ids.get(profile.capacityPoolId) ?? [];
        endpointIds.push(profile.endpointId);
        ids.set(profile.capacityPoolId, endpointIds);
    }
    return Object.freeze([...ids.entries()].sort(([left], [right]) => left.localeCompare(right)).map(([capacityPoolId, endpointIds]) => {
        const snapshot = snapshots.find(item => item.capacityPoolId === capacityPoolId);
        if (!snapshot) invalidPool(capacityPoolId);
        return Object.freeze({capacityPoolId, endpointIds: Object.freeze([...endpointIds].sort()),
            availableSlots: Math.max(0, snapshot.limit - snapshot.activeReservations)});
    }));
}

function addFactReason(reasons: EligibilityReason[], value: boolean | 'unknown', reason: EligibilityReason): void {
    if (value !== true) reasons.push(value === 'unknown' ? 'unknown-fact' : reason);
}
function validateSnapshots(snapshots: readonly CapacityPoolSnapshot[]): void {
    const ids = snapshots.map(item => item.capacityPoolId);
    if (snapshots.some(item => !text(item.capacityPoolId) || !Number.isInteger(item.limit) || item.limit < 0 ||
        !Number.isInteger(item.activeReservations) || item.activeReservations < 0) || new Set(ids).size !== ids.length) invalidPool('snapshot');
}
function capability(value: EndpointCapabilityClass): number { return CAPABILITIES.indexOf(value); }
function context(value: EndpointContextClass): number { return CONTEXT.indexOf(value); }
function invalidPool(pool: string): never { throw createWatchtowerError('ERR_PREFLIGHT_FAILED', {operation: 'resolve endpoint capacity pool', target: pool, remediation: 'Declare a capacity snapshot for every endpoint pool before planning.'}); }

export function validateEndpointProfile(value: unknown): EndpointProfile {
    if (!record(value) || value.schemaVersion !== 1 || !text(value.endpointId) || !text(value.capacityPoolId) ||
        !text(value.adapterId) || !text(value.model) || !record(value.capabilities) || !record(value.conformance) || !record(value.fingerprint)) invalidProfile();
    const capabilities = value.capabilities;
    const conformance = value.conformance;
    if (!CAPABILITIES.includes(capabilities.capabilityClass as EndpointCapabilityClass) ||
        !REASONING.includes(capabilities.reasoningClass as EndpointReasoningClass) ||
        !CONTEXT.includes(capabilities.contextClass as EndpointContextClass) || !only(value, PROFILE_KEYS) ||
        !only(capabilities, CAPABILITY_KEYS) || !only(conformance, CONFORMANCE_KEYS) || !only(value.fingerprint, FINGERPRINT_KEYS) ||
        !textFields(value, ['toolId', 'hostId', 'osUser', 'routeId', 'catalogId', 'effort']) ||
        typeof value.enabled !== 'boolean' || !['available', 'unavailable', 'unknown'].includes(value.availability as string) ||
        !Array.isArray(capabilities.roles) || !capabilities.roles.every(text) || !EVIDENCE.includes(capabilities.evidence as typeof EVIDENCE[number]) ||
        !textFields(value.fingerprint, FINGERPRINT_KEYS)) invalidProfile();
    if (!CONFORMANCE_KEYS.every(key => typeof conformance[key] === 'boolean')) invalidProfile();
    return Object.freeze(value as unknown as EndpointProfile);
}

function record(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value) && Object.getPrototypeOf(value) === Object.prototype; }
function only(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every(key => keys.includes(key)); }
function textFields(value: Record<string, unknown>, keys: readonly string[]): boolean { return keys.every(key => text(value[key])); }
function text(value: unknown): value is string { return typeof value === 'string' && value.length > 0 && value.length <= 200 && !/[\u0000-\u001f\u007f]/u.test(value); }
function invalidProfile(): never { throw createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: 'validate endpoint profile', target: 'endpoint', remediation: 'Supply a closed provider-neutral endpoint profile with capability and fingerprint evidence.'}); }
