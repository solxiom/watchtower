import type {JsonObject, JsonValue, TaskCatalogCompositionInput} from
    '../../src/foundation/task/catalog/taskCatalogContracts.js';

export interface FragmentFixtureOptions {
    readonly fragmentId: string;
    readonly includes?: readonly string[];
    readonly taskId?: string;
    readonly declaredHandlerId?: string;
    readonly taskHandlerId?: string;
    readonly runnerPreTasks?: readonly string[];
    readonly taskLeafIds?: readonly string[];
    readonly leaves?: JsonObject;
    readonly actions?: JsonObject;
    readonly groups?: JsonObject;
    readonly executionScope?: 'repository-development' | 'lane-runtime';
    readonly mutationClass?: 'read-only' | 'managed-lane-write';
    readonly requiresInvocationEnvelope?: boolean;
    readonly inputSchema?: string;
    readonly resultSchema?: string;
}

function catalogMetadata(options: FragmentFixtureOptions): JsonObject {
    return {
        executionScope: options.executionScope ?? 'repository-development',
        inputSchema: options.inputSchema ?? 'watchtower://runtime/schemas/fixture-input/v1',
        leafIds: [...(options.taskLeafIds ?? [])],
        mutationClass: options.mutationClass ?? 'read-only',
        requiresInvocationEnvelope: options.requiresInvocationEnvelope ?? false,
        resultSchema: options.resultSchema ?? 'watchtower://runtime/schemas/fixture-result/v1'
    };
}

function taskValue(options: FragmentFixtureOptions): JsonObject {
    return {
        catalog: catalogMetadata(options),
        doc: {summary: 'Fixture task.'},
        handle: {handler: options.taskHandlerId ?? options.declaredHandlerId ?? 'FixtureHandler', type: 'auto'},
        runnerOpts: options.runnerPreTasks === undefined ? {} : {preTasks: [...options.runnerPreTasks]}
    };
}

export function fragmentValue(options: FragmentFixtureOptions): JsonObject {
    const handlerId = options.declaredHandlerId ?? 'FixtureHandler';
    const taskId = options.taskId ?? `wt:check:${options.fragmentId}`;
    const handlers: {[key: string]: JsonValue} = {};
    handlers[handlerId] = {module: `./handlers/${handlerId}.js`};
    const tasks: {[key: string]: JsonValue} = {};
    tasks[taskId] = taskValue(options);
    return {
        actions: options.actions ?? {},
        fragmentId: options.fragmentId,
        groups: options.groups ?? {},
        handlers,
        includes: [...(options.includes ?? [])],
        leaves: options.leaves ?? {},
        schemaVersion: 1,
        tasks
    };
}

export function profileValue(taskIds: readonly string[] = []): JsonObject {
    return {
        catalogId: 'watchtower-runtime-nvb/v1',
        profileId: 'implementation-v1',
        schemaVersion: 1,
        taskIds: [...taskIds]
    };
}

export function source(sourceName: string, value: JsonValue):
    {readonly source: string; readonly bytes: Uint8Array} {
    return {source: sourceName, bytes: new TextEncoder().encode(`${JSON.stringify(value)}\n`)};
}

export function schemaSources(): readonly {readonly source: string; readonly bytes: Uint8Array}[] {
    const ids = [
        'fixture-input', 'fixture-result', 'lane-task-profile', 'runtime-nvb-config',
        'task-catalog-fragment', 'task-catalog'
    ];
    return ids.map((id) => source(`${id}.schema.json`, {
        $schema: 'http://json-schema.org/draft-07/schema#',
        $id: `watchtower://runtime/schemas/${id}/v1`,
        type: 'object', additionalProperties: false
    }));
}

export function validCompositionInput(): TaskCatalogCompositionInput {
    return {
        fragments: [source('fixture.catalog.json', fragmentValue({fragmentId: 'fixture'}))],
        profiles: [source('implementationV1.profile.json', profileValue())],
        schemas: schemaSources()
    };
}
