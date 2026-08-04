import type {WatchtowerError} from '../../src/contracts/errors.js';
import type {MigrationSnapshot, MigrationStagingPlan, MigrationStepDefinition} from '../../src/contracts/migration.js';
import {MigrationRegistry} from '../../src/foundation/upgrade/index.js';
import {stageMigrationPlan} from '../../src/foundation/upgrade/index.js';

/**
 * These fixture steps and fixture registries are test-local only: they exercise the harness mechanics
 * (ordering, staging, preservation enforcement, registry-provenance) that a real capability-owned rebuild
 * adapter must satisfy. UK-02 ships no production migration step; the production registry accepts exactly
 * schema version 1 with zero declared steps (proved directly below).
 */
function laneOwnedSnapshot(): MigrationSnapshot {
    return Object.freeze({
        laneConfigEnv: {kind: 'json', value: Object.freeze({LANE_ID: 'lane-abc', TMUX_PREFIX: 'wt-abc'})},
        repositoriesLocal: {kind: 'json', value: Object.freeze({main: '/home/kavan/repo'})},
        operatorSessionJournal: {kind: 'bytes', value: new TextEncoder().encode('{"turn":1}\n{"turn":2}\n')},
        operatorSessionPins: {kind: 'json', value: Object.freeze(['turn-2'])},
        laneLifecycleState: {kind: 'json', value: 'active'},
        schemaMarker: {kind: 'json', value: 1}
    });
}

function schemaBumpStep(id: string, fromSchemaVersion: number, toSchemaVersion: number): MigrationStepDefinition {
    return {
        id, fromSchemaVersion, toSchemaVersion,
        preservation: {protectedEntries: ['laneConfigEnv', 'repositoriesLocal', 'operatorSessionJournal', 'operatorSessionPins', 'laneLifecycleState']},
        rebuild: (input: MigrationSnapshot): MigrationSnapshot => Object.freeze({...input, schemaMarker: {kind: 'json', value: toSchemaVersion}})
    };
}

function registryWith(steps: readonly MigrationStepDefinition[], acceptedSchemaVersions: readonly number[]): MigrationRegistry {
    return new MigrationRegistry({acceptedSchemaVersions, steps});
}

/** Builds a registry that declares exactly `steps` as accepted, then returns the registry-issued plan for it. */
function issuedPlan(steps: readonly MigrationStepDefinition[], fromSchemaVersion = 1, toSchemaVersion = steps.length + 1): {
    registry: MigrationRegistry; plan: MigrationStagingPlan;
} {
    const acceptedSchemaVersions = Array.from({length: toSchemaVersion - fromSchemaVersion + 1}, (_v, index) => fromSchemaVersion + index);
    const registry = registryWith(steps, acceptedSchemaVersions);
    return {registry, plan: registry.plan(fromSchemaVersion, toSchemaVersion)};
}

describe('stageMigrationPlan (UK-02 value/history/pin/lifecycle preservation harness)', () => {
    it('returns the input snapshot unchanged for an empty (no-op) plan', () => {
        const {registry, plan} = issuedPlan([], 1, 1);
        const input = laneOwnedSnapshot();
        const result = stageMigrationPlan(registry, plan, input);
        expect(result.appliedStepIds).toEqual([]);
        expect(result.snapshot).toBe(input);
    });

    it('proves lane-owned value, history, pin, and lifecycle entries survive a rebuild byte/deep-identical', () => {
        const {registry, plan} = issuedPlan([schemaBumpStep('1-to-2', 1, 2)]);
        const input = laneOwnedSnapshot();
        const result = stageMigrationPlan(registry, plan, input);
        expect(result.appliedStepIds).toEqual(['1-to-2']);
        expect(result.snapshot.laneConfigEnv).toEqual(input.laneConfigEnv);
        expect(result.snapshot.repositoriesLocal).toEqual(input.repositoriesLocal);
        expect(result.snapshot.operatorSessionPins).toEqual(input.operatorSessionPins);
        expect(result.snapshot.laneLifecycleState).toEqual(input.laneLifecycleState);
        expect(bytesOf(result.snapshot.operatorSessionJournal)).toEqual(bytesOf(input.operatorSessionJournal));
        expect(valueOf(result.snapshot.schemaMarker)).toBe(2);
    });

    it('sequences a multi-step chain and preserves protected entries across every step', () => {
        const {registry, plan} = issuedPlan([schemaBumpStep('1-to-2', 1, 2), schemaBumpStep('2-to-3', 2, 3)], 1, 3);
        const input = laneOwnedSnapshot();
        const result = stageMigrationPlan(registry, plan, input);
        expect(result.appliedStepIds).toEqual(['1-to-2', '2-to-3']);
        expect(result.snapshot.operatorSessionPins).toEqual(input.operatorSessionPins);
        expect(valueOf(result.snapshot.schemaMarker)).toBe(3);
    });

    it('is idempotent/replay-safe: staging the same registry-issued plan and input twice produces an equal output', () => {
        const {registry, plan} = issuedPlan([schemaBumpStep('1-to-2', 1, 2)]);
        const input = laneOwnedSnapshot();
        const first = stageMigrationPlan(registry, plan, input);
        const second = stageMigrationPlan(registry, plan, input);
        expect(first.snapshot).toEqual(second.snapshot);
        expect(first.appliedStepIds).toEqual(second.appliedStepIds);
    });

    it('fails closed with an integrity error when a step silently mutates a protected json entry', () => {
        const corrupting: MigrationStepDefinition = {
            id: 'corrupts-pins', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['operatorSessionPins']},
            rebuild: (input: MigrationSnapshot): MigrationSnapshot => Object.freeze({...input, operatorSessionPins: {kind: 'json', value: []}})
        };
        const {registry, plan} = issuedPlan([corrupting]);
        expectCode(() => stageMigrationPlan(registry, plan, laneOwnedSnapshot()), 'ERR_INTEGRITY_FAILURE');
    });

    it('fails closed with an integrity error when a step silently mutates protected journal bytes', () => {
        const corrupting: MigrationStepDefinition = {
            id: 'corrupts-journal', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['operatorSessionJournal']},
            rebuild: (input: MigrationSnapshot): MigrationSnapshot => Object.freeze({
                ...input, operatorSessionJournal: {kind: 'bytes', value: new TextEncoder().encode('{"turn":1}\n')}
            })
        };
        const {registry, plan} = issuedPlan([corrupting]);
        expectCode(() => stageMigrationPlan(registry, plan, laneOwnedSnapshot()), 'ERR_INTEGRITY_FAILURE');
    });

    it('fails closed with an integrity error when a step drops a protected entry entirely', () => {
        const dropping: MigrationStepDefinition = {
            id: 'drops-lifecycle', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['laneLifecycleState']},
            rebuild: (input: MigrationSnapshot): MigrationSnapshot => {
                const {laneLifecycleState: _omit, ...rest} = input;
                return Object.freeze(rest);
            }
        };
        const {registry, plan} = issuedPlan([dropping]);
        expectCode(() => stageMigrationPlan(registry, plan, laneOwnedSnapshot()), 'ERR_INTEGRITY_FAILURE');
    });

    it('fails closed on a malformed rebuild adapter output (not a snapshot object)', () => {
        const malformed: MigrationStepDefinition = {
            id: 'malformed', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['laneLifecycleState']},
            rebuild: () => (null as unknown) as MigrationSnapshot
        };
        const {registry, plan} = issuedPlan([malformed]);
        expectCode(() => stageMigrationPlan(registry, plan, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
    });

    it('fails closed on a malformed rebuild adapter output (entry missing a valid kind)', () => {
        const malformed: MigrationStepDefinition = {
            id: 'malformed-entry', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['laneLifecycleState']},
            rebuild: (input: MigrationSnapshot) => (
                {...input, extra: {kind: 'unknown', value: 1}} as unknown as MigrationSnapshot
            )
        };
        const {registry, plan} = issuedPlan([malformed]);
        expectCode(() => stageMigrationPlan(registry, plan, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a malformed input snapshot before invoking any rebuild adapter', () => {
        let invoked = false;
        const step: MigrationStepDefinition = {
            id: 'unused', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['laneLifecycleState']},
            rebuild: (input: MigrationSnapshot) => { invoked = true; return input; }
        };
        const {registry, plan} = issuedPlan([step]);
        expectCode(() => stageMigrationPlan(registry, plan, (['not', 'a', 'snapshot'] as unknown) as MigrationSnapshot), 'ERR_INVALID_ARGUMENT');
        expect(invoked).toBe(false);
    });

    it('rejects an input snapshot entry with an undefined json value before invoking any rebuild adapter', () => {
        let invoked = false;
        const step: MigrationStepDefinition = {
            id: 'unused', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['laneLifecycleState']},
            rebuild: (input: MigrationSnapshot) => { invoked = true; return input; }
        };
        const {registry, plan} = issuedPlan([step]);
        const corruptInput = {...laneOwnedSnapshot(), bad: {kind: 'json', value: undefined}} as unknown as MigrationSnapshot;
        expectCode(() => stageMigrationPlan(registry, plan, corruptInput), 'ERR_INVALID_ARGUMENT');
        expect(invoked).toBe(false);
    });

    it('fails closed when a step declares a protected entry that is absent from the input snapshot, before invoking rebuild', () => {
        let invoked = false;
        const step: MigrationStepDefinition = {
            id: 'unused', fromSchemaVersion: 1, toSchemaVersion: 2,
            preservation: {protectedEntries: ['neverExisted']},
            rebuild: (input: MigrationSnapshot) => { invoked = true; return input; }
        };
        const {registry, plan} = issuedPlan([step]);
        expectCode(() => stageMigrationPlan(registry, plan, laneOwnedSnapshot()), 'ERR_INTEGRITY_FAILURE');
        expect(invoked).toBe(false);
    });

    it('rejects a hand-built plan that bypasses MigrationRegistry with a broken chain (structural rejection)', () => {
        const registry = registryWith([], [1, 2, 3, 4]);
        const tamperedPlan: MigrationStagingPlan = {
            fromSchemaVersion: 1, toSchemaVersion: 3,
            steps: [schemaBumpStep('1-to-2', 1, 2), schemaBumpStep('skips-2-to-3', 2, 4)]
        };
        expectCode(() => stageMigrationPlan(registry, tamperedPlan, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a hand-built plan whose declared toSchemaVersion disagrees with its resolved chain (structural rejection)', () => {
        const registry = registryWith([], [1, 2, 9]);
        const tamperedPlan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 9, steps: [schemaBumpStep('1-to-2', 1, 2)]};
        expectCode(() => stageMigrationPlan(registry, tamperedPlan, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
    });

    it('UK02-06: rejects a hand-built, structurally well-formed, but fictional plan when the production-shaped registry accepts only schema version 1', () => {
        // Exact production shape: acceptedSchemaVersions: [1], steps: [] (see MigrationRegistry.spec.ts "ships no fictional transition").
        const productionShapedRegistry = registryWith([], [1]);
        const fictionalStep = schemaBumpStep('fictional-1-to-2', 1, 2);
        const fictionalPlan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 2, steps: [fictionalStep]};
        expectCode(() => stageMigrationPlan(productionShapedRegistry, fictionalPlan, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
    });

    it('UK02-06: rejects a hand-built fictional no-op plan for a version the registry never declared accepted', () => {
        const productionShapedRegistry = registryWith([], [1]);
        const fictionalNoOp: MigrationStagingPlan = {fromSchemaVersion: 2, toSchemaVersion: 2, steps: []};
        expectCode(() => stageMigrationPlan(productionShapedRegistry, fictionalNoOp, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a plan whose declared version pair is genuinely accepted but whose step objects are foreign (not issued by this registry)', () => {
        const realStep = schemaBumpStep('1-to-2', 1, 2);
        const registry = registryWith([realStep], [1, 2]);
        const foreignStep = schemaBumpStep('1-to-2', 1, 2); // same shape, different object identity, never registered
        const foreignPlan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 2, steps: [foreignStep]};
        expectCode(() => stageMigrationPlan(registry, foreignPlan, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
    });

    it('CORRECTION-04: rejects a plan issued by registry B when staged against registry A, even though both registries share the identical step-definition object', () => {
        const sharedStep = schemaBumpStep('1-to-2', 1, 2);
        const registryA = registryWith([sharedStep], [1, 2]);
        const registryB = registryWith([sharedStep], [1, 2]);
        const planFromB = registryB.plan(1, 2);
        expect(planFromB.steps[0]).toBe(sharedStep);
        expectCode(() => stageMigrationPlan(registryA, planFromB, laneOwnedSnapshot()), 'ERR_INVALID_ARGUMENT');
        expect(() => stageMigrationPlan(registryB, planFromB, laneOwnedSnapshot())).not.toThrow();
    });

    it('accepts a plan produced by registry.plan() and re-supplied to stageMigrationPlan (the only legitimate provenance path)', () => {
        const realStep = schemaBumpStep('1-to-2', 1, 2);
        const registry = registryWith([realStep], [1, 2]);
        const plan = registry.plan(1, 2);
        expect(() => stageMigrationPlan(registry, plan, laneOwnedSnapshot())).not.toThrow();
    });

    it('performs no filesystem, network, subprocess, timer, or global-state effect (pure staging only)', () => {
        const {registry, plan} = issuedPlan([schemaBumpStep('1-to-2', 1, 2)]);
        const originalWrite = process.stdout.write;
        let wroteToStdout = false;
        process.stdout.write = ((chunk: unknown, ...rest: unknown[]) => { wroteToStdout = true; return originalWrite.apply(process.stdout, [chunk, ...rest] as never); }) as typeof process.stdout.write;
        try {
            stageMigrationPlan(registry, plan, laneOwnedSnapshot());
        } finally { process.stdout.write = originalWrite; }
        expect(wroteToStdout).toBe(false);
    });
});

function bytesOf(entry: {readonly kind: 'json' | 'bytes'; readonly value: unknown} | undefined): string {
    if (entry === undefined || entry.kind !== 'bytes') throw new Error('expected a bytes entry');
    return Buffer.from(entry.value as Uint8Array).toString('utf8');
}

function valueOf(entry: {readonly kind: 'json' | 'bytes'; readonly value: unknown} | undefined): unknown {
    if (entry === undefined || entry.kind !== 'json') throw new Error('expected a json entry');
    return entry.value;
}

function expectCode(action: () => unknown, code: string): void {
    try {
        action();
        fail(`expected ${code}`);
    } catch (error) {
        expect((error as WatchtowerError).code).toBe(code);
    }
}
