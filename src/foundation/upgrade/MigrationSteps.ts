import {createWatchtowerError} from '../../contracts/errors.js';
import type {JsonValue} from '../../contracts/types.js';
import type {
    MigrationSnapshot, MigrationSnapshotEntry, MigrationStageResult, MigrationStagingPlan, MigrationStepDefinition
} from '../../contracts/migration.js';
import type {MigrationRegistry} from './MigrationRegistry.js';
import {validateMigrationSnapshot, validateStagingPlan} from './migrationValidation.js';

const STAGE_OP = 'stage migration plan';

/**
 * Pure staging/preservation harness for a resolved migration plan. It performs no filesystem, network,
 * or process I/O, acquires no lock, closes no session, prunes no content, and changes no lifecycle state.
 * Each step's rebuild adapter is capability-owned; this harness only sequences steps and enforces that
 * every entry a step declares protected exists and is byte/deep-identical before and after that step's
 * rebuild. The `plan` argument is validated as a closed contract and then required to have been actually
 * issued by the supplied `registry` (`registry.assertIssuedPlan`) — a caller cannot bypass
 * `MigrationRegistry` by staging an arbitrary, malformed, hand-built, or fictional-but-well-formed plan,
 * even one whose declared version pair happens to be structurally valid.
 */
export function stageMigrationPlan(registry: MigrationRegistry, plan: MigrationStagingPlan, input: MigrationSnapshot): MigrationStageResult {
    validateStagingPlan(plan, STAGE_OP);
    registry.assertIssuedPlan(plan, STAGE_OP);
    validateMigrationSnapshot(input, `${STAGE_OP} (input)`);
    let current = input;
    const appliedStepIds: string[] = [];
    for (const step of plan.steps) {
        current = stageOneStep(step, current);
        appliedStepIds.push(step.id);
    }
    return Object.freeze({
        fromSchemaVersion: plan.fromSchemaVersion, toSchemaVersion: plan.toSchemaVersion,
        appliedStepIds: Object.freeze(appliedStepIds), snapshot: current
    });
}

function stageOneStep(step: MigrationStepDefinition, input: MigrationSnapshot): MigrationSnapshot {
    const before = captureProtectedEntries(step, input, 'before');
    const output: unknown = step.rebuild(input, {fromSchemaVersion: step.fromSchemaVersion, toSchemaVersion: step.toSchemaVersion});
    validateMigrationSnapshot(output, `stage migration step ${step.id}`);
    const after = captureProtectedEntries(step, output, 'after');
    assertPreserved(step, before, after);
    return output;
}

function captureProtectedEntries(
    step: MigrationStepDefinition,
    snapshot: MigrationSnapshot,
    phase: 'before' | 'after'
): ReadonlyMap<string, MigrationSnapshotEntry> {
    const captured = new Map<string, MigrationSnapshotEntry>();
    for (const name of step.preservation.protectedEntries) {
        const entry = snapshot[name];
        if (entry === undefined) {
            throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {
                operation: `stage migration step ${step.id}`, target: name,
                remediation: `Ensure the declared protected entry exists in the snapshot ${phase} this step's rebuild, or remove it from the preservation policy.`
            });
        }
        captured.set(name, entry);
    }
    return captured;
}

function assertPreserved(
    step: MigrationStepDefinition,
    before: ReadonlyMap<string, MigrationSnapshotEntry>,
    after: ReadonlyMap<string, MigrationSnapshotEntry>
): void {
    for (const [name, beforeEntry] of before) {
        const afterEntry = after.get(name);
        if (afterEntry === undefined || !entriesEqual(beforeEntry, afterEntry)) {
            throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {
                operation: `stage migration step ${step.id}`, target: name,
                remediation: 'Preserve the declared protected entry unchanged, or remove it from the step preservation policy.'
            });
        }
    }
}

function entriesEqual(a: MigrationSnapshotEntry, b: MigrationSnapshotEntry): boolean {
    if (a.kind !== b.kind) return false;
    if (a.kind === 'bytes') return bytesEqual(a.value as Uint8Array, b.value as Uint8Array);
    return deepEqualJson(a.value as JsonValue, b.value as JsonValue);
}

function bytesEqual(a: Uint8Array, b: Uint8Array): boolean {
    if (a.length !== b.length) return false;
    for (let index = 0; index < a.length; index += 1) if (a[index] !== b[index]) return false;
    return true;
}

function deepEqualJson(a: JsonValue, b: JsonValue): boolean {
    if (a === b) return true;
    if (Array.isArray(a) || Array.isArray(b)) {
        if (!Array.isArray(a) || !Array.isArray(b) || a.length !== b.length) return false;
        return a.every((item, index) => deepEqualJson(item, b[index]));
    }
    if (typeof a === 'object' && a !== null && typeof b === 'object' && b !== null) {
        const aKeys = Object.keys(a).sort();
        const bKeys = Object.keys(b).sort();
        if (aKeys.length !== bKeys.length || aKeys.some((key, index) => key !== bKeys[index])) return false;
        return aKeys.every(key => deepEqualJson((a as Record<string, JsonValue>)[key], (b as Record<string, JsonValue>)[key]));
    }
    return false;
}
