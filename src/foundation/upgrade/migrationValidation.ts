import {createWatchtowerError} from '../../contracts/errors.js';
import type {
    MigrationRegistryOptions, MigrationSnapshot, MigrationSnapshotEntry, MigrationStagingPlan, MigrationStepDefinition,
    PreservationPolicy, SchemaVersion
} from '../../contracts/migration.js';
import type {JsonValue} from '../../contracts/types.js';

const MAX_CHAIN_STEPS = 64;
const SNAPSHOT_ENTRY_KEYS = Object.freeze(['kind', 'value']);
const PRESERVATION_KEYS = Object.freeze(['protectedEntries']);
const STEP_KEYS = Object.freeze(['fromSchemaVersion', 'id', 'preservation', 'rebuild', 'toSchemaVersion']);
const PLAN_KEYS = Object.freeze(['fromSchemaVersion', 'steps', 'toSchemaVersion']);
const REGISTRY_OPTIONS_KEYS = Object.freeze(['acceptedSchemaVersions', 'steps']);

/** Runtime closure of the UK-02 migration contracts: every boundary treats its argument as `unknown` first. */

export function validateSchemaVersion(value: unknown, operation: string, target: string): asserts value is SchemaVersion {
    if (typeof value !== 'number' || !Number.isInteger(value) || value < 1) throw reject(operation, target, 'a schema version must be a positive integer');
}

export function validateStepDefinition(value: unknown, operation: string, target: string): asserts value is MigrationStepDefinition {
    if (!isPlainRecord(value) || !hasExactKeys(value, STEP_KEYS)) throw reject(operation, target, 'a step must be a closed {id, fromSchemaVersion, toSchemaVersion, preservation, rebuild} record');
    const step = value as Record<string, unknown>;
    if (!isNonEmptyString(step.id)) throw reject(operation, target, 'a step id must be a non-empty string');
    validateSchemaVersion(step.fromSchemaVersion, operation, `${target}.fromSchemaVersion`);
    validateSchemaVersion(step.toSchemaVersion, operation, `${target}.toSchemaVersion`);
    validatePreservationPolicy(step.preservation, operation, `${target}.preservation`);
    if (typeof step.rebuild !== 'function') throw reject(operation, target, 'a step rebuild adapter must be a function');
}

export function validatePreservationPolicy(value: unknown, operation: string, target: string): asserts value is PreservationPolicy {
    if (!isPlainRecord(value) || !hasExactKeys(value, PRESERVATION_KEYS)) throw reject(operation, target, 'a preservation policy must be a closed {protectedEntries} record');
    const entries = (value as {protectedEntries: unknown}).protectedEntries;
    if (!Array.isArray(entries) || entries.length === 0) throw reject(operation, target, 'protectedEntries must be a non-empty array');
    const seen = new Set<string>();
    for (const entry of entries) {
        if (!isNonEmptyString(entry) || seen.has(entry)) throw reject(operation, target, 'protectedEntries must contain unique non-empty strings');
        seen.add(entry);
    }
}

export function validateStagingPlan(value: unknown, operation: string): asserts value is MigrationStagingPlan {
    if (!isPlainRecord(value) || !hasExactKeys(value, PLAN_KEYS)) throw reject(operation, 'plan', 'a plan must be a closed {fromSchemaVersion, toSchemaVersion, steps} record');
    const plan = value as Record<string, unknown>;
    validateSchemaVersion(plan.fromSchemaVersion, operation, 'plan.fromSchemaVersion');
    validateSchemaVersion(plan.toSchemaVersion, operation, 'plan.toSchemaVersion');
    if (!Array.isArray(plan.steps) || plan.steps.length > MAX_CHAIN_STEPS) throw reject(operation, 'plan.steps', 'plan.steps must be a bounded array');
    plan.steps.forEach((step, index) => validateStepDefinition(step, operation, `plan.steps[${index}]`));
    validateChainLinkage(plan.steps as readonly MigrationStepDefinition[], plan.fromSchemaVersion as SchemaVersion, plan.toSchemaVersion as SchemaVersion, operation);
}

function validateChainLinkage(
    steps: readonly MigrationStepDefinition[],
    fromSchemaVersion: SchemaVersion,
    toSchemaVersion: SchemaVersion,
    operation: string
): void {
    if (steps.length === 0) {
        if (fromSchemaVersion !== toSchemaVersion) throw reject(operation, 'plan.steps', 'an empty step list must be a no-op (fromSchemaVersion === toSchemaVersion)');
        return;
    }
    const seenIds = new Set<string>();
    let expected = fromSchemaVersion;
    for (const step of steps) {
        if (seenIds.has(step.id)) throw reject(operation, 'plan.steps', `duplicate step id ${step.id} in one plan`);
        seenIds.add(step.id);
        if (step.fromSchemaVersion !== expected) throw reject(operation, 'plan.steps', `step ${step.id} does not chain from the previous step's target version`);
        if (step.toSchemaVersion <= step.fromSchemaVersion) throw reject(operation, 'plan.steps', `step ${step.id} must strictly increase the schema version`);
        expected = step.toSchemaVersion;
    }
    if (expected !== toSchemaVersion) throw reject(operation, 'plan.steps', 'the resolved chain does not end at the declared target version');
}

export function validateRegistryOptions(value: unknown, operation: string): asserts value is MigrationRegistryOptions {
    if (!isPlainRecord(value) || !hasExactKeys(value, REGISTRY_OPTIONS_KEYS)) {
        throw reject(operation, 'options', 'registry options must be a closed {acceptedSchemaVersions, steps} record');
    }
    const options = value as Record<string, unknown>;
    if (!Array.isArray(options.acceptedSchemaVersions)) throw reject(operation, 'options.acceptedSchemaVersions', 'must be an array of schema versions');
    if (!Array.isArray(options.steps)) throw reject(operation, 'options.steps', 'must be an array of step declarations');
}

export function validateMigrationSnapshot(value: unknown, operation: string): asserts value is MigrationSnapshot {
    if (!isPlainRecord(value)) throw reject(operation, '(snapshot)', 'a snapshot must be a closed record of named entries');
    for (const [name, entry] of Object.entries(value)) validateSnapshotEntry(entry, operation, name);
}

function validateSnapshotEntry(value: unknown, operation: string, target: string): asserts value is MigrationSnapshotEntry {
    if (!isPlainRecord(value) || !hasExactKeys(value, SNAPSHOT_ENTRY_KEYS)) throw reject(operation, target, 'a snapshot entry must be a closed {kind, value} record');
    const entry = value as Record<string, unknown>;
    if (entry.kind === 'bytes') {
        if (!(entry.value instanceof Uint8Array)) throw reject(operation, target, 'a "bytes" entry value must be a Uint8Array');
        return;
    }
    if (entry.kind !== 'json' || !isJsonValue(entry.value)) throw reject(operation, target, 'a "json" entry value must be a closed recursive JSON value');
}

function isJsonValue(value: unknown): value is JsonValue {
    if (value === null || typeof value === 'string' || typeof value === 'boolean') return true;
    if (typeof value === 'number') return Number.isFinite(value);
    if (Array.isArray(value)) return value.every(isJsonValue);
    if (isPlainRecord(value)) return Object.values(value).every(isJsonValue);
    return false;
}

function isNonEmptyString(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }

function isPlainRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype;
}

function hasExactKeys(value: Record<string, unknown>, keys: readonly string[]): boolean {
    const actual = Object.keys(value).sort();
    return actual.length === keys.length && actual.every((key, index) => key === keys[index]);
}

function reject(operation: string, target: string, remediation: string): ReturnType<typeof createWatchtowerError> {
    return createWatchtowerError('ERR_INVALID_ARGUMENT', {operation, target, remediation: `Fix the closed contract: ${remediation}.`});
}
