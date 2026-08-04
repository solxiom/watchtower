import {composeTaskCatalog} from '../../src/foundation/task/catalog/index.js';
import type {
    JsonObject,
    TaskCatalogCompositionFailureCode,
    TaskCatalogCompositionInput
} from '../../src/foundation/task/catalog/taskCatalogContracts.js';
import {
    fragmentValue,
    profileValue,
    schemaSources,
    source,
    validCompositionInput
} from './catalogCompositionFixtures.js';

function failureCode(input: unknown): TaskCatalogCompositionFailureCode | null {
    const result = composeTaskCatalog(input);
    return result.ok ? null : result.failure.code;
}

function composeFragments(
    fragments: readonly JsonObject[],
    profiles: readonly JsonObject[] = [profileValue()]
): TaskCatalogCompositionInput {
    return {
        fragments: fragments.map((fragment, index) => source(`fragment${index}.catalog.json`, fragment)),
        profiles: profiles.map((profile, index) => source(`profile${index}.profile.json`, profile)),
        schemas: schemaSources()
    };
}

function groupValue(taskId: string): JsonObject {
    return {
        catalog: {
            executionScope: 'repository-development',
            inputSchema: 'watchtower://runtime/schemas/fixture-input/v1',
            leafIds: [], mutationClass: 'read-only', requiresInvocationEnvelope: false,
            resultSchema: 'watchtower://runtime/schemas/fixture-result/v1'
        },
        doc: {summary: 'Fixture group.'}, runnerOpts: {multiExecPolicy: 'series'}, tasks: [taskId]
    };
}

describe('task catalog deterministic composition', function () {
    it('builds byte-identical aggregates regardless of source input order', function () {
        const alpha = fragmentValue({fragmentId: 'alpha', declaredHandlerId: 'AlphaHandler'});
        const beta = fragmentValue({
            fragmentId: 'beta', includes: ['alpha'], declaredHandlerId: 'BetaHandler'
        });
        const forward = composeTaskCatalog(composeFragments([alpha, beta]));
        const reverse = composeTaskCatalog(composeFragments([beta, alpha]));
        expect(forward.ok).toBeTrue();
        expect(reverse.ok).toBeTrue();
        if (forward.ok && reverse.ok) {
            expect([...forward.runtimeConfigBytes]).toEqual([...reverse.runtimeConfigBytes]);
            expect([...forward.taskCatalogBytes]).toEqual([...reverse.taskCatalogBytes]);
            expect(forward.catalogSha256).toBe(reverse.catalogSha256);
        }
    });

    it('accepts the minimum closed fragment and profile contract', function () {
        const result = composeTaskCatalog(validCompositionInput());
        expect(result.ok).toBeTrue();
        if (result.ok) {
            expect(result.fragmentIds).toEqual(['fixture']);
            expect(result.profileIds).toEqual(['implementation-v1']);
            expect(result.taskIds).toEqual(['wt:check:fixture']);
        }
    });
});

describe('task catalog malformed and duplicate rejection', function () {
    it('rejects malformed JSON, duplicate properties, missing fields, and extra fields', function () {
        const profile = source('profile.profile.json', profileValue());
        const malformed = {fragments: [{source: 'bad.catalog.json', bytes: new TextEncoder().encode('{')}],
            profiles: [profile], schemas: schemaSources()};
        const duplicate = {fragments: [{source: 'bad.catalog.json', bytes: new TextEncoder().encode(
            '{"fragmentId":"one","fragmentId":"two"}'
        )}], profiles: [profile], schemas: schemaSources()};
        const extra = fragmentValue({fragmentId: 'extra'});
        expect(failureCode(malformed)).toBe('TASK_CATALOG_JSON_INVALID');
        expect(failureCode(duplicate)).toBe('TASK_CATALOG_PROPERTY_DUPLICATE');
        expect(failureCode(composeFragments([{...extra, unsupported: true}]))).
            toBe('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID');
        expect(failureCode({fragments: [], profiles: [], schemas: []})).
            toBe('TASK_CATALOG_COMPOSITION_INPUT_INVALID');
    });
});

describe('task catalog schema registry rejection', function () {
    it('rejects malformed, duplicate, and dangling schema contracts', function () {
        const malformedSchema = source('bad.schema.json', {$schema: 'wrong', $id: 'bad'});
        const duplicateSchemas = [...schemaSources(), schemaSources()[0]];
        const danglingFragment = fragmentValue({
            fragmentId: 'dangling',
            inputSchema: 'watchtower://runtime/schemas/missing/v1'
        });
        expect(failureCode({...validCompositionInput(), schemas: [malformedSchema]})).
            toBe('TASK_CATALOG_SCHEMA_INVALID');
        expect(failureCode({...validCompositionInput(), schemas: duplicateSchemas})).
            toBe('TASK_CATALOG_SCHEMA_ID_DUPLICATE');
        expect(failureCode(composeFragments([danglingFragment]))).
            toBe('TASK_CATALOG_SCHEMA_DANGLING');
    });
});

describe('task catalog identity collision rejection', function () {
    it('rejects duplicate fragment, handler, task, group, action, and leaf identities', function () {
        const duplicateCases: ReadonlyArray<{
            readonly fragments: readonly JsonObject[];
            readonly code: TaskCatalogCompositionFailureCode;
        }> = [
            {fragments: [fragmentValue({fragmentId: 'same'}), fragmentValue({fragmentId: 'same'})],
                code: 'TASK_CATALOG_FRAGMENT_ID_DUPLICATE'},
            {fragments: [fragmentValue({fragmentId: 'one'}), fragmentValue({fragmentId: 'two'})],
                code: 'TASK_CATALOG_HANDLER_DUPLICATE'},
            {fragments: [
                fragmentValue({fragmentId: 'one', declaredHandlerId: 'OneHandler', taskId: 'wt:check:same'}),
                fragmentValue({fragmentId: 'two', declaredHandlerId: 'TwoHandler', taskId: 'wt:check:same'})
            ], code: 'TASK_CATALOG_TASK_DUPLICATE'},
            {fragments: duplicateGroupFragments(), code: 'TASK_CATALOG_GROUP_DUPLICATE'},
            {fragments: duplicateActionFragments(), code: 'TASK_CATALOG_ACTION_DUPLICATE'},
            {fragments: duplicateLeafFragments(), code: 'TASK_CATALOG_LEAF_DUPLICATE'}
        ];
        for (const fixture of duplicateCases) {
            expect(failureCode(composeFragments(fixture.fragments))).toBe(fixture.code);
        }
    });
});

function duplicateGroupFragments(): readonly JsonObject[] {
    return [
        fragmentValue({fragmentId: 'one', declaredHandlerId: 'OneHandler',
            groups: {'wt:check:group': groupValue('wt:check:one')}}),
        fragmentValue({fragmentId: 'two', declaredHandlerId: 'TwoHandler',
            groups: {'wt:check:group': groupValue('wt:check:two')}})
    ];
}

function duplicateActionFragments(): readonly JsonObject[] {
    return [
        fragmentValue({fragmentId: 'one', declaredHandlerId: 'OneHandler',
            actions: {'watchtower.check': {taskId: 'wt:check:one'}}}),
        fragmentValue({fragmentId: 'two', declaredHandlerId: 'TwoHandler',
            actions: {'watchtower.check': {taskId: 'wt:check:two'}}})
    ];
}

function duplicateLeafFragments(): readonly JsonObject[] {
    const leaf = {executable: true, mode: '0555', path: './leaves/check.sh',
        sha256: `sha256:${'a'.repeat(64)}`};
    return [
        fragmentValue({fragmentId: 'one', declaredHandlerId: 'OneHandler', leaves: {check: leaf}}),
        fragmentValue({fragmentId: 'two', declaredHandlerId: 'TwoHandler', leaves: {check: leaf}})
    ];
}
