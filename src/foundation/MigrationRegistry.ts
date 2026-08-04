import {createWatchtowerError} from '../contracts/errors.js';
import type {MigrationRegistryOptions, MigrationStagingPlan, MigrationStepDefinition, SchemaVersion} from '../contracts/migration.js';
import {validateRegistryOptions, validateSchemaVersion, validateStepDefinition} from './migrationValidation.js';

export type {MigrationRegistryOptions} from '../contracts/migration.js';

const MAX_CHAIN_STEPS = 64;
const CONSTRUCT_OP = 'construct migration registry';

/**
 * Closed migration registry: the accepted schema versions and the declared transition steps are supplied
 * once at construction as an immutable collection, each validated as an `unknown` runtime value into its
 * closed typed shape (including the `options` argument itself, before any property is dereferenced).
 * There is no post-construction registration method and no mutable global map; a new declared transition
 * requires constructing a new registry instance.
 */
export class MigrationRegistry {
    private readonly acceptedSchemaVersions: ReadonlySet<SchemaVersion>;
    private readonly stepByFromVersion: ReadonlyMap<SchemaVersion, MigrationStepDefinition>;
    /**
     * Unforgeable per-instance provenance token set: exactly the `MigrationStagingPlan` objects this exact
     * registry instance has itself returned from `plan()`. Membership is by object identity, not shape or
     * step-array content, so a plan issued by a *different* registry instance is rejected even when both
     * registries were constructed from the identical step-definition object (shared step references do not
     * imply shared provenance). A `WeakSet` keeps this a private, non-enumerable, per-instance collection —
     * never a mutable global registry — and allows issued-but-unreferenced plans to be garbage collected.
     */
    private readonly issuedPlans: WeakSet<MigrationStagingPlan>;

    constructor(options: MigrationRegistryOptions) {
        validateRegistryOptions(options, CONSTRUCT_OP);
        this.acceptedSchemaVersions = validateAcceptedSchemaVersions(options.acceptedSchemaVersions);
        this.stepByFromVersion = buildClosedStepIndex(options.steps, this.acceptedSchemaVersions);
        this.issuedPlans = new WeakSet();
    }

    plan(fromSchemaVersion: SchemaVersion, toSchemaVersion: SchemaVersion): MigrationStagingPlan {
        validateSchemaVersion(fromSchemaVersion, 'plan migration', 'fromSchemaVersion');
        validateSchemaVersion(toSchemaVersion, 'plan migration', 'toSchemaVersion');
        this.assertAccepted(fromSchemaVersion, 'from');
        this.assertAccepted(toSchemaVersion, 'to');
        if (toSchemaVersion < fromSchemaVersion) {
            throw createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
                operation: 'plan migration', target: `${fromSchemaVersion}->${toSchemaVersion}`,
                remediation: 'Downgrade is not a migration; use the guarded downgrade path instead.'
            });
        }
        const steps = toSchemaVersion === fromSchemaVersion
            ? Object.freeze([]) : this.resolveChain(fromSchemaVersion, toSchemaVersion);
        const result: MigrationStagingPlan = Object.freeze({fromSchemaVersion, toSchemaVersion, steps});
        this.issuedPlans.add(result);
        return result;
    }

    /**
     * Proves a `MigrationStagingPlan` object is exactly one this registry instance itself returned from
     * `plan()` — an unforgeable per-instance provenance check by object identity, not by re-deriving and
     * structurally comparing steps. This rejects a hand-built/foreign plan, a plan for an undeclared
     * version (which `plan()` never issues), and — the defect this closes — a plan issued by a *different*
     * registry instance even when that registry shares the identical step-definition object with this one.
     */
    assertIssuedPlan(plan: MigrationStagingPlan, operation: string): void {
        if (!this.issuedPlans.has(plan)) {
            throw createWatchtowerError('ERR_INVALID_ARGUMENT', {
                operation, target: 'plan',
                remediation: 'Stage only a plan object returned by this exact registry instance\'s own plan() method; a hand-built, foreign, or cross-registry plan is rejected.'
            });
        }
    }

    private resolveChain(fromSchemaVersion: SchemaVersion, toSchemaVersion: SchemaVersion): readonly MigrationStepDefinition[] {
        const steps: MigrationStepDefinition[] = [];
        let current = fromSchemaVersion;
        while (current !== toSchemaVersion) {
            if (steps.length >= MAX_CHAIN_STEPS) {
                throw createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
                    operation: 'plan migration', target: `${fromSchemaVersion}->${toSchemaVersion}`,
                    remediation: 'Register a closed, terminating transition chain instead of an unbounded one.'
                });
            }
            const step = this.stepByFromVersion.get(current);
            if (step === undefined) {
                throw createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
                    operation: 'plan migration', target: `${fromSchemaVersion}->${toSchemaVersion}`,
                    remediation: 'Declare an accepted migration step for every version on the requested path.'
                });
            }
            steps.push(step);
            current = step.toSchemaVersion;
        }
        return Object.freeze(steps);
    }

    private assertAccepted(version: SchemaVersion, which: 'from' | 'to'): void {
        if (!this.acceptedSchemaVersions.has(version)) {
            throw createWatchtowerError('ERR_UNSUPPORTED_VERSION', {
                operation: 'plan migration', target: `${which}SchemaVersion=${version}`,
                remediation: 'Use only a declared accepted schema version; no fictional version is planned.'
            });
        }
    }
}

function validateAcceptedSchemaVersions(value: readonly unknown[]): ReadonlySet<SchemaVersion> {
    const versions = new Set<SchemaVersion>();
    value.forEach((entry, index) => {
        validateSchemaVersion(entry, CONSTRUCT_OP, `acceptedSchemaVersions[${index}]`);
        if (versions.has(entry)) throw rejectRegistry(`acceptedSchemaVersions[${index}]`, `duplicate accepted schema version ${entry}`);
        versions.add(entry);
    });
    return versions;
}

function buildClosedStepIndex(
    steps: readonly unknown[],
    acceptedSchemaVersions: ReadonlySet<SchemaVersion>
): ReadonlyMap<SchemaVersion, MigrationStepDefinition> {
    const byFromVersion = new Map<SchemaVersion, MigrationStepDefinition>();
    const seenIds = new Set<string>();
    steps.forEach((candidate, index) => {
        validateStepDefinition(candidate, CONSTRUCT_OP, `steps[${index}]`);
        const step = candidate;
        assertDeclaredVersion(step, step.fromSchemaVersion, acceptedSchemaVersions);
        assertDeclaredVersion(step, step.toSchemaVersion, acceptedSchemaVersions);
        if (step.toSchemaVersion <= step.fromSchemaVersion) throw rejectStep(step, 'a migration step must strictly increase the schema version');
        if (seenIds.has(step.id)) throw rejectStep(step, 'a migration step id must be unique in the closed registry');
        if (byFromVersion.has(step.fromSchemaVersion)) throw rejectStep(step, 'at most one declared successor is accepted per schema version');
        seenIds.add(step.id);
        byFromVersion.set(step.fromSchemaVersion, step);
    });
    return byFromVersion;
}

function assertDeclaredVersion(
    step: MigrationStepDefinition,
    version: SchemaVersion,
    acceptedSchemaVersions: ReadonlySet<SchemaVersion>
): void {
    if (!acceptedSchemaVersions.has(version)) {
        throw rejectStep(step, `schema version ${version} is not a declared accepted version; no fictional version is registered`);
    }
}

function rejectStep(step: MigrationStepDefinition, reason: string): ReturnType<typeof createWatchtowerError> {
    return createWatchtowerError('ERR_INVALID_ARGUMENT', {
        operation: CONSTRUCT_OP, target: step.id.length > 0 ? step.id : '(missing id)',
        remediation: `Fix the closed step declaration: ${reason}.`
    });
}

function rejectRegistry(target: string, reason: string): ReturnType<typeof createWatchtowerError> {
    return createWatchtowerError('ERR_INVALID_ARGUMENT', {operation: CONSTRUCT_OP, target, remediation: `Fix the closed registry options: ${reason}.`});
}
