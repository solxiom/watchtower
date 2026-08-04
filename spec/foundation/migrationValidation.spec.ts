import type {WatchtowerError} from '../../src/contracts/errors.js';
import type {MigrationSnapshot, MigrationStagingPlan, MigrationStepDefinition} from '../../src/contracts/migration.js';
import {
    validateMigrationSnapshot, validatePreservationPolicy, validateRegistryOptions, validateSchemaVersion, validateStagingPlan,
    validateStepDefinition
} from '../../src/foundation/upgrade/index.js';

function validStep(id = 'a-to-b', fromSchemaVersion = 1, toSchemaVersion = 2): MigrationStepDefinition {
    return {id, fromSchemaVersion, toSchemaVersion, preservation: {protectedEntries: ['x']}, rebuild: (input: MigrationSnapshot) => input};
}

describe('validateSchemaVersion (UK-02 closed runtime contract)', () => {
    it('accepts a positive integer', () => { expect(() => validateSchemaVersion(1, 'op', 't')).not.toThrow(); });

    const badCases: ReadonlyArray<[string, unknown]> = [
        ['zero', 0], ['negative', -1], ['fractional', 1.5], ['NaN', NaN], ['Infinity', Infinity],
        ['numeric string', '1'], ['null', null], ['undefined', undefined], ['empty object', {}]
    ];
    for (const [label, bad] of badCases) {
        it(`rejects ${label}`, () => expectCode(() => validateSchemaVersion(bad, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    }
});

describe('validatePreservationPolicy', () => {
    it('accepts unique non-empty protected entries', () => expect(() => validatePreservationPolicy({protectedEntries: ['a', 'b']}, 'op', 't')).not.toThrow());
    it('rejects an empty protectedEntries array', () => expectCode(() => validatePreservationPolicy({protectedEntries: []}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a duplicate protected entry name', () => expectCode(() => validatePreservationPolicy({protectedEntries: ['a', 'a']}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a non-string protected entry name', () => expectCode(() => validatePreservationPolicy({protectedEntries: ['a', 1]}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an empty-string protected entry name', () => expectCode(() => validatePreservationPolicy({protectedEntries: ['']}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an extra field on the policy record', () => expectCode(() => validatePreservationPolicy({protectedEntries: ['a'], extra: 1}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
});

describe('validateStepDefinition', () => {
    it('accepts a well-formed step', () => expect(() => validateStepDefinition(validStep(), 'op', 't')).not.toThrow());
    it('rejects a numeric id', () => expectCode(() => validateStepDefinition({...validStep(), id: 1}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an empty-string id', () => expectCode(() => validateStepDefinition({...validStep(), id: ''}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a fractional schema version', () => expectCode(() => validateStepDefinition({...validStep(), toSchemaVersion: 1.5}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a non-function rebuild adapter', () => expectCode(() => validateStepDefinition({...validStep(), rebuild: 'not-a-function'}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an extra field on the step record', () => expectCode(() => validateStepDefinition({...validStep(), extra: true}, 'op', 't'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a missing field on the step record', () => {
        const {rebuild: _omit, ...rest} = validStep();
        expectCode(() => validateStepDefinition(rest, 'op', 't'), 'ERR_INVALID_ARGUMENT');
    });
    it('rejects a non-object step', () => expectCode(() => validateStepDefinition('not-a-step', 'op', 't'), 'ERR_INVALID_ARGUMENT'));
});

describe('validateStagingPlan', () => {
    it('accepts an empty no-op plan', () => {
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 1, steps: []};
        expect(() => validateStagingPlan(plan, 'op')).not.toThrow();
    });

    it('accepts a correctly chained multi-step plan', () => {
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 3, steps: [validStep('1-2', 1, 2), validStep('2-3', 2, 3)]};
        expect(() => validateStagingPlan(plan, 'op')).not.toThrow();
    });

    it('rejects an empty step list whose from/to disagree (fabricated no-op)', () => {
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 2, steps: []};
        expectCode(() => validateStagingPlan(plan, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a plan whose first step does not start at fromSchemaVersion', () => {
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 3, steps: [validStep('2-3', 2, 3)]};
        expectCode(() => validateStagingPlan(plan, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a plan whose steps do not chain consecutively', () => {
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 4, steps: [validStep('1-2', 1, 2), validStep('3-4', 3, 4)]};
        expectCode(() => validateStagingPlan(plan, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a plan whose resolved chain does not end at toSchemaVersion', () => {
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 4, steps: [validStep('1-2', 1, 2)]};
        expectCode(() => validateStagingPlan(plan, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects a plan with a duplicate step id', () => {
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 3, steps: [validStep('dup', 1, 2), validStep('dup', 2, 3)]};
        expectCode(() => validateStagingPlan(plan, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects an oversized step array', () => {
        const steps = Array.from({length: 65}, (_v, index) => validStep(`s${index}`, index + 1, index + 2));
        const plan: MigrationStagingPlan = {fromSchemaVersion: 1, toSchemaVersion: 66, steps};
        expectCode(() => validateStagingPlan(plan, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects an extra field on the plan record', () => expectCode(() => validateStagingPlan({fromSchemaVersion: 1, toSchemaVersion: 1, steps: [], extra: 1}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a non-object plan', () => expectCode(() => validateStagingPlan(null, 'op'), 'ERR_INVALID_ARGUMENT'));
});

describe('validateMigrationSnapshot', () => {
    it('accepts a well-formed snapshot with json and bytes entries', () => {
        const snapshot = {a: {kind: 'json', value: {nested: [1, 'two', true, null]}}, b: {kind: 'bytes', value: new Uint8Array([1, 2, 3])}};
        expect(() => validateMigrationSnapshot(snapshot, 'op')).not.toThrow();
    });

    it('rejects a non-object snapshot', () => {
        expectCode(() => validateMigrationSnapshot(['not', 'a', 'snapshot'], 'op'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => validateMigrationSnapshot(null, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects an entry with an undefined json value', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json', value: undefined}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an entry with a function json value', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json', value: () => 1}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an entry with a NaN json value', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json', value: NaN}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an entry with an Infinity json value', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json', value: Infinity}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a nested array containing an undefined element', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json', value: [1, undefined]}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a nested object containing a function value', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json', value: {b: () => 1}}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a "bytes" entry whose value is not a Uint8Array', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'bytes', value: 'not-bytes'}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an entry with an unknown kind', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'xml', value: 1}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an entry with an extra field', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json', value: 1, extra: true}}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an entry missing the value field', () => expectCode(() => validateMigrationSnapshot({a: {kind: 'json'}}, 'op'), 'ERR_INVALID_ARGUMENT'));
});

describe('validateRegistryOptions (UK02-07 null/malformed registry options closure)', () => {
    it('accepts a well-formed closed {acceptedSchemaVersions, steps} record', () => {
        expect(() => validateRegistryOptions({acceptedSchemaVersions: [1], steps: []}, 'op')).not.toThrow();
    });

    it('rejects null before any property is dereferenced (no native TypeError)', () => {
        expect(() => validateRegistryOptions(null, 'op')).toThrowError();
        expectCode(() => validateRegistryOptions(null, 'op'), 'ERR_INVALID_ARGUMENT');
    });

    it('rejects undefined', () => expectCode(() => validateRegistryOptions(undefined, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a string', () => expectCode(() => validateRegistryOptions('options', 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a number', () => expectCode(() => validateRegistryOptions(42, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an array', () => expectCode(() => validateRegistryOptions([], 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an object missing steps', () => expectCode(() => validateRegistryOptions({acceptedSchemaVersions: [1]}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an object missing acceptedSchemaVersions', () => expectCode(() => validateRegistryOptions({steps: []}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects an object with an extra field', () => expectCode(() => validateRegistryOptions({acceptedSchemaVersions: [1], steps: [], extra: 1}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a non-array acceptedSchemaVersions', () => expectCode(() => validateRegistryOptions({acceptedSchemaVersions: 'x', steps: []}, 'op'), 'ERR_INVALID_ARGUMENT'));
    it('rejects a non-array steps', () => expectCode(() => validateRegistryOptions({acceptedSchemaVersions: [1], steps: 'x'}, 'op'), 'ERR_INVALID_ARGUMENT'));
});

function expectCode(action: () => unknown, code: string): void {
    try {
        action();
        fail(`expected ${code}`);
    } catch (error) {
        expect((error as WatchtowerError).code).toBe(code);
    }
}
