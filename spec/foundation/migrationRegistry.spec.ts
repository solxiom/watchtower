import type {WatchtowerError} from '../../src/contracts/errors.js';
import type {MigrationSnapshot, MigrationStepDefinition} from '../../src/contracts/migration.js';
import {MigrationRegistry} from '../../src/foundation/MigrationRegistry.js';

describe('MigrationRegistry (UK-02 closed declared transitions)', () => {
    it('plans a no-op when the requested version equals the current version, with zero registered steps', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1], steps: []});
        const plan = registry.plan(1, 1);
        expect(plan).toEqual({fromSchemaVersion: 1, toSchemaVersion: 1, steps: []});
    });

    it('ships no fictional transition: planning across an undeclared successor fails closed', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: []});
        expectCode(() => registry.plan(1, 2), 'ERR_UNSUPPORTED_VERSION');
    });

    it('rejects a schema version that was never declared accepted, before any output', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1], steps: []});
        expectCode(() => registry.plan(1, 2), 'ERR_UNSUPPORTED_VERSION');
    });

    it('rejects a structurally invalid schema version (not a positive integer) before checking declared acceptance', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1], steps: []});
        expectCode(() => registry.plan(0, 1), 'ERR_INVALID_ARGUMENT');
        expectCode(() => registry.plan(1, 1.5), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a downgrade planning request; downgrade is a separate guarded path', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [step('1-to-2', 1, 2)]});
        expectCode(() => registry.plan(2, 1), 'ERR_UNSUPPORTED_VERSION');
    });

    it('resolves a declared linear chain in order across multiple accepted versions', () => {
        const registry = new MigrationRegistry({
            acceptedSchemaVersions: [1, 2, 3],
            steps: [step('2-to-3', 2, 3), step('1-to-2', 1, 2)]
        });
        const plan = registry.plan(1, 3);
        expect(plan.steps.map(item => item.id)).toEqual(['1-to-2', '2-to-3']);
    });

    it('fails closed when a chain is broken partway to the requested target', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1, 2, 3], steps: [step('1-to-2', 1, 2)]});
        expectCode(() => registry.plan(1, 3), 'ERR_UNSUPPORTED_VERSION');
    });

    it('rejects a step that does not strictly increase the schema version', () => {
        expectConstructCode({acceptedSchemaVersions: [1], steps: [step('same', 1, 1)]}, 'ERR_INVALID_ARGUMENT');
        expectConstructCode({acceptedSchemaVersions: [1, 2], steps: [step('backwards', 2, 1)]}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a duplicate step id in the closed step set', () => {
        expectConstructCode({
            acceptedSchemaVersions: [1, 2, 3],
            steps: [step('dup', 1, 2), step('dup', 2, 3)]
        }, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects more than one declared successor for the same schema version', () => {
        expectConstructCode({
            acceptedSchemaVersions: [1, 2, 3],
            steps: [step('a', 1, 2), step('b', 1, 3)]
        }, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a step with no declared preservation entries', () => {
        expectConstructCode({
            acceptedSchemaVersions: [1, 2],
            steps: [{...step('a', 1, 2), preservation: {protectedEntries: []}}]
        }, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a step whose declared versions are outside the accepted closed set (no fictional version registered)', () => {
        expectConstructCode({acceptedSchemaVersions: [1], steps: [step('1-to-2', 1, 2)]}, 'ERR_INVALID_ARGUMENT');
    });

    it('caps chain resolution so a malformed instance cannot loop unbounded', () => {
        const versions = Array.from({length: 70}, (_v, index) => index + 1);
        const steps: MigrationStepDefinition[] = [];
        for (let index = 1; index < 70; index += 1) steps.push(step(`${index}-to-${index + 1}`, index, index + 1));
        const registry = new MigrationRegistry({acceptedSchemaVersions: versions, steps});
        expectCode(() => registry.plan(1, 70), 'ERR_UNSUPPORTED_VERSION');
    });

    it('rejects a runtime-untyped numeric step id (registry declarations are runtime-closed, not merely compile-time typed)', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1, 2], steps: [{...step('a', 1, 2), id: 1}]}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a duplicate protected entry name inside one step', () => {
        expectConstructCodeUnknown({
            acceptedSchemaVersions: [1, 2],
            steps: [{...step('a', 1, 2), preservation: {protectedEntries: ['x', 'x']}}]
        }, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a non-string protected entry name inside one step', () => {
        expectConstructCodeUnknown({
            acceptedSchemaVersions: [1, 2],
            steps: [{...step('a', 1, 2), preservation: {protectedEntries: ['x', 1]}}]
        }, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a non-finite/fractional schema version on a declared step', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1, 2], steps: [{...step('a', 1, 2), toSchemaVersion: 1.5}]}, 'ERR_INVALID_ARGUMENT');
        expectConstructCodeUnknown({acceptedSchemaVersions: [1, 2], steps: [{...step('a', 1, 2), toSchemaVersion: NaN}]}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a non-function rebuild adapter', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1, 2], steps: [{...step('a', 1, 2), rebuild: 'not-a-function'}]}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects an extra field on a declared step record', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1, 2], steps: [{...step('a', 1, 2), extra: true}]}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a non-integer/fractional value in acceptedSchemaVersions', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1, 1.5], steps: []}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a duplicate entry in acceptedSchemaVersions', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1, 1], steps: []}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a non-array acceptedSchemaVersions or steps value', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: 'not-an-array', steps: []}, 'ERR_INVALID_ARGUMENT');
        expectConstructCodeUnknown({acceptedSchemaVersions: [1], steps: 'not-an-array'}, 'ERR_INVALID_ARGUMENT');
    });

    it('UK02-07: rejects null registry options as the typed ERR_INVALID_ARGUMENT contract error, not a native TypeError', () => {
        expectConstructCodeUnknown(null, 'ERR_INVALID_ARGUMENT');
    });

    it('UK02-07: rejects undefined registry options as the typed ERR_INVALID_ARGUMENT contract error, not a native TypeError', () => {
        expectConstructCodeUnknown(undefined, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a primitive (string/number/boolean) registry options value', () => {
        expectConstructCodeUnknown('not-options', 'ERR_INVALID_ARGUMENT');
        expectConstructCodeUnknown(42, 'ERR_INVALID_ARGUMENT');
        expectConstructCodeUnknown(true, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects an array as registry options', () => {
        expectConstructCodeUnknown([], 'ERR_INVALID_ARGUMENT');
    });

    it('rejects registry options missing a required field', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1]}, 'ERR_INVALID_ARGUMENT');
        expectConstructCodeUnknown({steps: []}, 'ERR_INVALID_ARGUMENT');
    });

    it('rejects registry options carrying an extra field', () => {
        expectConstructCodeUnknown({acceptedSchemaVersions: [1], steps: [], extra: true}, 'ERR_INVALID_ARGUMENT');
    });

    it('does not throw a native (non-WatchtowerError) exception for any malformed options shape', () => {
        const malformed: readonly unknown[] = [null, undefined, 'x', 42, true, [], {}, {acceptedSchemaVersions: [1]}];
        for (const options of malformed) {
            try {
                new MigrationRegistry(options as ConstructorParameters<typeof MigrationRegistry>[0]);
                fail(`expected construction to throw for ${JSON.stringify(options)}`);
            } catch (error) {
                expect(error instanceof TypeError).toBe(false);
                expect((error as WatchtowerError).code).toBe('ERR_INVALID_ARGUMENT');
            }
        }
    });
});

describe('MigrationRegistry.assertIssuedPlan (UK-02 registry-provenance closure)', () => {
    it('accepts a plan this exact registry issued via plan()', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [step('1-to-2', 1, 2)]});
        const plan = registry.plan(1, 2);
        expect(() => registry.assertIssuedPlan(plan, 'op')).not.toThrow();
    });

    it('accepts a registry-issued no-op plan', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1], steps: []});
        const plan = registry.plan(1, 1);
        expect(() => registry.assertIssuedPlan(plan, 'op')).not.toThrow();
    });

    it('rejects a hand-built plan for an undeclared/fictional version pair, even when structurally well-formed', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1], steps: []});
        const fictional = {fromSchemaVersion: 1, toSchemaVersion: 2, steps: [step('fictional', 1, 2)]};
        expectCode(() => registry.assertIssuedPlan(fictional, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a plan whose version pair is accepted but whose step objects were never issued by this registry', () => {
        const registry = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [step('1-to-2', 1, 2)]});
        const foreignPlan = {fromSchemaVersion: 1, toSchemaVersion: 2, steps: [step('1-to-2', 1, 2)]};
        expectCode(() => registry.assertIssuedPlan(foreignPlan, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a plan issued by a different registry instance declaring the identical transition (distinct step objects)', () => {
        const registryA = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [step('1-to-2', 1, 2)]});
        const registryB = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [step('1-to-2', 1, 2)]});
        const planFromB = registryB.plan(1, 2);
        expectCode(() => registryA.assertIssuedPlan(planFromB, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('CORRECTION-04: rejects a plan issued by a different registry instance even when both registries share the identical step-definition object', () => {
        const sharedStep = step('1-to-2', 1, 2);
        const registryA = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [sharedStep]});
        const registryB = new MigrationRegistry({acceptedSchemaVersions: [1, 2], steps: [sharedStep]});
        const planFromB = registryB.plan(1, 2);
        // The step object is literally shared (===) between both registries' closed step sets; only the
        // plan object's own provenance — not its steps' object identity — may authorize staging.
        expect(planFromB.steps[0]).toBe(sharedStep);
        expectCode(() => registryA.assertIssuedPlan(planFromB, 'op'), 'ERR_INVALID_ARGUMENT');
        expect(() => registryB.assertIssuedPlan(planFromB, 'op')).not.toThrow();
    });
});

function step(id: string, fromSchemaVersion: number, toSchemaVersion: number): MigrationStepDefinition {
    return {
        id, fromSchemaVersion, toSchemaVersion,
        preservation: {protectedEntries: ['fixtureValue']},
        rebuild: (input: MigrationSnapshot) => input
    };
}

function expectConstructCode(options: {acceptedSchemaVersions: readonly number[]; steps: readonly MigrationStepDefinition[]}, code: string): void {
    expectCode(() => new MigrationRegistry(options), code);
}

/** Simulates an untyped/malformed caller: TS's compile-time types cannot be trusted at a runtime trust boundary. */
function expectConstructCodeUnknown(options: unknown, code: string): void {
    expectCode(() => new MigrationRegistry(options as ConstructorParameters<typeof MigrationRegistry>[0]), code);
}

function expectCode(action: () => unknown, code: string): void {
    try {
        action();
        fail(`expected ${code}`);
    } catch (error) {
        expect((error as WatchtowerError).code).toBe(code);
    }
}
