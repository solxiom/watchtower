import {composeTaskCatalog} from '../../src/foundation/taskCatalogComposition/index.js';
import {isJsonObject} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject, TaskCatalogCompositionFailureCode} from
    '../../src/foundation/taskCatalogComposition/taskCatalogContracts.js';
import {fragmentValue, profileValue, schemaSources, source} from './catalogCompositionFixtures.js';

function rejectedCode(fragments: readonly JsonObject[], profiles: readonly JsonObject[] = [profileValue()]):
    TaskCatalogCompositionFailureCode | null {
    const result = composeTaskCatalog({
        fragments: fragments.map((value, index) => source(`fragment${index}.catalog.json`, value)),
        profiles: profiles.map((value, index) => source(`profile${index}.profile.json`, value)),
        schemas: schemaSources()
    });
    return result.ok ? null : result.failure.code;
}

describe('task catalog include and reference rejection', function () {
    it('rejects missing and circular fragment inclusion', function () {
        expect(rejectedCode([fragmentValue({fragmentId: 'one', includes: ['missing']})])).
            toBe('TASK_CATALOG_INCLUDE_MISSING');
        expect(rejectedCode([
            fragmentValue({fragmentId: 'one', includes: ['two'], declaredHandlerId: 'OneHandler'}),
            fragmentValue({fragmentId: 'two', includes: ['one'], declaredHandlerId: 'TwoHandler'})
        ])).toBe('TASK_CATALOG_INCLUDE_CIRCULAR');
    });

    it('rejects noncanonical identity ordering inside a capability fragment', function () {
        const base = fragmentValue({fragmentId: 'ordering'});
        const baseTasks = base.tasks;
        if (!isJsonObject(baseTasks)) throw new Error('fixture tasks are invalid');
        const template = baseTasks['wt:check:ordering'];
        const noncanonical = {...base, tasks: {'wt:check:zulu': template, 'wt:check:alpha': template}};
        expect(rejectedCode([noncanonical])).toBe('TASK_CATALOG_ORDER_INVALID');
    });

    it('rejects dangling handler, runner, action, and leaf references', function () {
        const cases: ReadonlyArray<{readonly value: JsonObject; readonly code: TaskCatalogCompositionFailureCode}> = [
            {value: fragmentValue({fragmentId: 'handler', taskHandlerId: 'MissingHandler'}),
                code: 'TASK_CATALOG_HANDLER_DANGLING'},
            {value: fragmentValue({fragmentId: 'runner', runnerPreTasks: ['wt:check:missing']}),
                code: 'TASK_CATALOG_RUNNABLE_DANGLING'},
            {value: fragmentValue({fragmentId: 'action',
                actions: {'watchtower.missing': {taskId: 'wt:check:missing'}}}),
                code: 'TASK_CATALOG_ACTION_DANGLING'},
            {value: fragmentValue({fragmentId: 'leaf', taskLeafIds: ['missing']}),
                code: 'TASK_CATALOG_LEAF_DANGLING'}
        ];
        for (const fixture of cases) expect(rejectedCode([fixture.value])).toBe(fixture.code);
    });
});

describe('catalog asset path confinement', function () {
    it('rejects traversal in declared handler and leaf paths', function () {
        const handler = {...fragmentValue({fragmentId: 'handler-traversal'}),
            handlers: {FixtureHandler: {module: './handlers/../Escape.js'}}};
        const leaf = fragmentValue({fragmentId: 'leaf-traversal', leaves: {
            escape: {executable: true, mode: '0555', path: './leaves/../escape',
                sha256: `sha256:${'a'.repeat(64)}`}
        }});
        const checksum = fragmentValue({fragmentId: 'leaf-checksum', leaves: {
            invalid: {executable: true, mode: '0555', path: './leaves/check', sha256: 'sha256:invalid'}
        }});
        expect(rejectedCode([handler])).toBe('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID');
        expect(rejectedCode([leaf])).toBe('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID');
        expect(rejectedCode([checksum])).toBe('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID');
    });
});

describe('catalog invocation authority', function () {
    it('requires envelopes only for mutating lane-runtime work', function () {
        const laneMutation = fragmentValue({
            fragmentId: 'lane-mutation', executionScope: 'lane-runtime',
            mutationClass: 'managed-lane-write', requiresInvocationEnvelope: false
        });
        const developmentEnvelope = fragmentValue({
            fragmentId: 'development-envelope', requiresInvocationEnvelope: true
        });
        expect(rejectedCode([laneMutation])).toBe('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID');
        expect(rejectedCode([developmentEnvelope])).toBe('TASK_CATALOG_FRAGMENT_SCHEMA_INVALID');
    });
});

describe('lane task profile authority', function () {
    it('rejects fields that could add tasks, handlers, code, or actions', function () {
        const fragment = fragmentValue({fragmentId: 'fixture'});
        for (const field of ['tasks', 'handlers', 'code', 'actions']) {
            expect(rejectedCode([fragment], [{...profileValue(), [field]: {}}])).
                toBe('TASK_PROFILE_FIELD_FORBIDDEN');
        }
    });

    it('rejects catalog mismatch, dangling task IDs, duplicate profiles, and development tasks', function () {
        const fragment = fragmentValue({fragmentId: 'fixture'});
        expect(rejectedCode([fragment], [{...profileValue(), catalogId: 'watchtower-runtime-nvb/v2'}])).
            toBe('TASK_PROFILE_CATALOG_MISMATCH');
        expect(rejectedCode([fragment], [profileValue(['wt:check:missing'])])).
            toBe('TASK_PROFILE_TASK_DANGLING');
        expect(rejectedCode([fragment], [profileValue(), profileValue()])).
            toBe('TASK_PROFILE_ID_DUPLICATE');
        expect(rejectedCode([fragment], [profileValue(['wt:check:fixture'])])).
            toBe('TASK_PROFILE_TASK_SCOPE_INVALID');
    });

    it('allows only declared lane-runtime tasks and requires canonical task ordering', function () {
        const laneTask = fragmentValue({fragmentId: 'lane', executionScope: 'lane-runtime'});
        expect(rejectedCode([laneTask], [profileValue(['wt:check:lane'])])).toBeNull();
        expect(rejectedCode([laneTask], [profileValue(['wt:check:lane', 'wt:check:lane'])])).
            toBe('TASK_CATALOG_ORDER_INVALID');
    });

    it('rejects a lane-runtime runnable that reaches repository-development work', function () {
        const development = fragmentValue({fragmentId: 'development'});
        const lane = fragmentValue({
            fragmentId: 'lane', declaredHandlerId: 'LaneHandler', executionScope: 'lane-runtime',
            runnerPreTasks: ['wt:check:development']
        });
        expect(rejectedCode([development, lane], [profileValue(['wt:check:lane'])])).
            toBe('TASK_CATALOG_SCOPE_REFERENCE_INVALID');
    });
});
