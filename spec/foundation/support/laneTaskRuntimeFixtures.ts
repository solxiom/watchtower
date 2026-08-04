import {semanticDigest} from '../../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import type {
    LaneRuntimeContext,
    LaneTaskInvocation,
    PinnedTaskRuntimeTarget
} from '../../../src/contracts/taskRuntime.js';
import type {
    RuntimeAccount,
    RuntimeFileSystem,
    RuntimePathObservation
} from '../../../src/foundation/task/runtime/runtimeFileSystem.js';
import type {
    RuntimeProcessInvoker,
    RuntimeProcessOutcome,
    RuntimeProcessRequest
} from '../../../src/foundation/runtime/leaf/runtimeProcessPorts.js';

export const RUNTIME_ROOT = '/data/watchtower/runtimes/1.0.0';
export const CATALOG_DIRECTORY = `${RUNTIME_ROOT}/runtime-nvb`;
export const CONFIG_TARGET = `${CATALOG_DIRECTORY}/runtime-nvb.json`;
export const MODULE_TARGET = `${CATALOG_DIRECTORY}/runtime-nvb.js`;
export const CATALOG_TARGET = `${CATALOG_DIRECTORY}/task-catalog.json`;
/** The lane control home (`workspace`) is the explicit process cwd. */
export const CONTROL_HOME = '/home/kavan/control';
/** The `.watchtower` overlay (`laneDir`, exported as `WT_LANE_DIR`); never the cwd. */
export const LANE_DIR = `${CONTROL_HOME}/.watchtower/lanes/demo`;
export const CATALOG_ID = 'watchtower-runtime-nvb/v1';
export const PROFILE_ID = 'implementation-v1';
export const ACTION_ID = 'runtime.smoke';
export const TASK_ID = 'wt:runtime:smoke';
export const LEAF_ID = 'coordinator.watch';
export const LEAF_PATH = `${CATALOG_DIRECTORY}/leaves/coordinatorWatch.sh`;
export const LEAF_DIGEST = `sha256:${'a'.repeat(64)}` as const;
export const INPUT_SCHEMA_ID = 'watchtower://runtime/schemas/runtime-smoke-input/v1';
export const RESULT_SCHEMA_ID = 'watchtower://runtime/schemas/runtime-smoke-result/v1';
export const INPUT_SCHEMA_PATH = `${CATALOG_DIRECTORY}/schemas/runtimeSmokeInput.schema.json`;
export const RESULT_SCHEMA_PATH = `${CATALOG_DIRECTORY}/schemas/runtimeSmokeResult.schema.json`;
export const INPUT_SCHEMA_DIGEST = `sha256:${'1'.repeat(64)}` as const;
export const RESULT_SCHEMA_DIGEST = `sha256:${'2'.repeat(64)}` as const;
/** A permissive-but-real schema: a completed smoke result must be an object with `ok`. */
export const RESULT_SCHEMA_TEXT = JSON.stringify({type: 'object', required: ['ok'], properties: {ok: {type: 'boolean'}}});
export const INPUT_SCHEMA_TEXT = JSON.stringify({type: 'object', required: ['operation']});

/** The typed input the pinned executable projection declares for the task. */
export const DECLARED_INPUT = {schemaVersion: 1, operation: 'runtime-smoke'};
/** The caller's typed per-invocation request (`nirvana-integration-architecture.md` §7). */
export const TASK_REQUEST = {schemaVersion: 1, operation: 'runtime-smoke', requestId: 'req-01'};
/** The caller-established instant an accepted run may not precede. */
export const NOT_BEFORE = '2026-08-03T00:00:00.000Z';
export const RUN_STARTED_AT = '2026-08-03T00:00:01.000Z';
export const RUN_FINISHED_AT = '2026-08-03T00:00:02.000Z';

export function fixedClock(instant = NOT_BEFORE): () => Date {
    return () => new Date(instant);
}

interface TaskOverrides {
    readonly executionScope?: string;
    readonly mutationClass?: string;
    readonly requiresInvocationEnvelope?: boolean;
    readonly leafIds?: readonly string[];
}

export interface CatalogOverrides {
    readonly actions?: JsonObject;
    readonly tasks?: JsonObject;
    readonly profiles?: JsonObject;
    readonly leaves?: JsonObject;
    readonly schemas?: JsonObject;
    readonly catalogId?: string;
    readonly schemaVersion?: number;
}

/** A catalog aggregate in the exact shape `RT-09` composes. */
export function catalogDocument(overrides: CatalogOverrides = {}): JsonObject {
    return {
        schemaVersion: overrides.schemaVersion ?? 1,
        catalogId: overrides.catalogId ?? CATALOG_ID,
        catalogVersion: 1,
        fragments: ['runtime-smoke'],
        minimumRuntime: {cliVersion: '0.1.0', nodeVersion: '26.4.0'},
        handlers: {RuntimeSmokeTaskHandler: {module: './handlers/RuntimeSmokeTaskHandler.js'}},
        tasks: overrides.tasks ?? {[TASK_ID]: taskEntry()},
        groups: {},
        actions: overrides.actions ?? {[ACTION_ID]: {taskId: TASK_ID}},
        leaves: overrides.leaves ?? {},
        profiles: overrides.profiles ?? {[PROFILE_ID]: {taskIds: [TASK_ID]}},
        schemas: overrides.schemas ?? {
            [INPUT_SCHEMA_ID]: {path: './schemas/runtimeSmokeInput.schema.json', sha256: INPUT_SCHEMA_DIGEST},
            [RESULT_SCHEMA_ID]: {path: './schemas/runtimeSmokeResult.schema.json', sha256: RESULT_SCHEMA_DIGEST}
        }
    };
}

export function taskEntry(overrides: TaskOverrides = {}): JsonObject {
    return {
        executionScope: overrides.executionScope ?? 'lane-runtime',
        handlerId: 'RuntimeSmokeTaskHandler',
        inputSchema: INPUT_SCHEMA_ID,
        resultSchema: RESULT_SCHEMA_ID,
        leafIds: [...overrides.leafIds ?? []],
        mutationClass: overrides.mutationClass ?? 'read-only',
        requiresInvocationEnvelope: overrides.requiresInvocationEnvelope ?? false
    };
}

export function leafEntry(): JsonObject {
    return {executable: true, mode: '0555', path: './leaves/coordinatorWatch.sh', sha256: LEAF_DIGEST};
}

/** The pinned executable projection in the exact shape `RT-09` composes. */
export function configDocument(args: readonly unknown[] = [DECLARED_INPUT]): JsonObject {
    return {
        groups: {},
        handlers: ['./handlers/RuntimeSmokeTaskHandler.js'],
        tasks: {
            [TASK_ID]: {
                doc: {summary: 'Verify that the packaged runtime TaskHandler emits a structured result.'},
                handle: {args: [...args], handler: 'RuntimeSmokeTaskHandler', preferType: 'async', type: 'auto'},
                runnerOpts: {}
            }
        }
    } as JsonObject;
}

export function pinFor(document: JsonObject, overrides: Partial<PinnedTaskRuntimeTarget> = {}): PinnedTaskRuntimeTarget {
    return {
        catalogId: CATALOG_ID,
        catalogSha256: semanticDigest(document),
        profile: PROFILE_ID,
        configTarget: CONFIG_TARGET,
        moduleTarget: MODULE_TARGET,
        ...overrides
    };
}

export function pinDocument(document: JsonObject, overrides: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        catalogId: CATALOG_ID,
        catalogSha256: semanticDigest(document),
        profile: PROFILE_ID,
        configTarget: CONFIG_TARGET,
        moduleTarget: MODULE_TARGET,
        ...overrides
    };
}

export function laneContext(overrides: Partial<LaneRuntimeContext> = {}): LaneRuntimeContext {
    return {
        workspace: CONTROL_HOME,
        laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2',
        initiativeId: 'watchtower-v1',
        laneSlug: 'demo',
        laneDir: LANE_DIR,
        homeRepositoryId: 'watchtower',
        repositoriesFile: `${LANE_DIR}/repositories.json`,
        runtimeRoot: RUNTIME_ROOT,
        runtimeVersion: '1.0.0',
        knowledgeRoot: '/data/watchtower/knowledge/1.0.0',
        baseEnvironment: {path: '/usr/bin:/bin', home: '/home/kavan'},
        ...overrides
    };
}

/** One typed invocation of the fixture action, with the caller request supplied. */
export function invocation(overrides: Partial<LaneTaskInvocation> = {}): LaneTaskInvocation {
    return {actionId: ACTION_ID, context: laneContext(), input: TASK_REQUEST, ...overrides};
}

export interface FakeEntry {
    readonly kind: 'file' | 'directory' | 'other';
    readonly owner?: RuntimeAccount;
    readonly canonicalPath?: string;
    readonly text?: string;
    readonly digest?: string;
    readonly mode?: number;
    readonly executable?: boolean;
    readonly readable?: boolean;
    readonly writable?: boolean;
    readonly traversable?: boolean;
}

/** In-memory `RuntimeFileSystem` so specs control kind, mode, and permission. */
export class FakeRuntimeFileSystem implements RuntimeFileSystem {
    constructor(
        private readonly entries: Map<string, FakeEntry>,
        private readonly identity: RuntimeAccount = {uid: 1000, gid: 1000}
    ) {}

    static of(entries: Record<string, FakeEntry>, identity?: RuntimeAccount): FakeRuntimeFileSystem {
        return new FakeRuntimeFileSystem(new Map(Object.entries(entries)), identity);
    }

    set(path: string, entry: FakeEntry): void {
        this.entries.set(path, entry);
    }

    remove(path: string): void {
        this.entries.delete(path);
    }

    observe(path: string): RuntimePathObservation {
        const entry = this.entries.get(path);
        if (entry === undefined) {
            return {kind: 'missing', canonicalPath: '', executable: false, mode: null, owner: null};
        }
        return {
            kind: entry.kind,
            canonicalPath: entry.canonicalPath ?? path,
            executable: entry.executable ?? false,
            mode: entry.mode ?? (entry.kind === 'directory' ? 0o755 : 0o644),
            owner: entry.owner ?? this.identity
        };
    }

    isReadable(path: string): boolean {
        return this.entries.get(path)?.readable ?? this.entries.has(path);
    }

    isWritable(path: string): boolean {
        return this.entries.get(path)?.writable ?? false;
    }

    isTraversable(path: string): boolean {
        return this.entries.get(path)?.traversable ?? this.entries.has(path);
    }

    readText(path: string): string | null {
        return this.entries.get(path)?.text ?? null;
    }

    digest(path: string): `sha256:${string}` | null {
        const value = this.entries.get(path)?.digest;
        return value === undefined ? null : value as `sha256:${string}`;
    }

    account(): RuntimeAccount {
        return this.identity;
    }
}

/** A fully staged, permission-correct runtime root, control home, and overlay. */
export function stagedFileSystem(
    document: JsonObject,
    extra: Record<string, FakeEntry> = {},
    config: JsonObject = configDocument()
): FakeRuntimeFileSystem {
    return FakeRuntimeFileSystem.of({
        [RUNTIME_ROOT]: {kind: 'directory', readable: true, traversable: true, writable: false},
        [CATALOG_DIRECTORY]: {kind: 'directory', readable: true, traversable: true},
        [CONFIG_TARGET]: {kind: 'file', readable: true, text: JSON.stringify(config)},
        [MODULE_TARGET]: {kind: 'file', readable: true},
        [CATALOG_TARGET]: {kind: 'file', readable: true, text: JSON.stringify(document)},
        [INPUT_SCHEMA_PATH]: {kind: 'file', readable: true, digest: INPUT_SCHEMA_DIGEST, text: INPUT_SCHEMA_TEXT},
        [RESULT_SCHEMA_PATH]: {kind: 'file', readable: true, digest: RESULT_SCHEMA_DIGEST, text: RESULT_SCHEMA_TEXT},
        [CONTROL_HOME]: {kind: 'directory', readable: true, traversable: true, writable: true},
        [LANE_DIR]: {kind: 'directory', readable: true, traversable: true, writable: true},
        ...extra
    });
}

/** Records the exact process request and replays scripted stdout lines. */
export class FakeProcessInvoker implements RuntimeProcessInvoker {
    readonly requests: RuntimeProcessRequest[] = [];

    constructor(
        private readonly lines: readonly string[],
        private readonly outcome: Partial<RuntimeProcessOutcome> = {}
    ) {}

    async invoke(request: RuntimeProcessRequest): Promise<RuntimeProcessOutcome> {
        this.requests.push(request);
        for (const line of this.lines) request.onStdoutLine?.(line);
        return {
            disposition: 'exited',
            exitCode: 0,
            signal: null,
            stdout: this.lines.join('\n'),
            stderr: '',
            ...this.outcome
        };
    }

    get lastRequest(): RuntimeProcessRequest {
        return this.requests[this.requests.length - 1];
    }
}
