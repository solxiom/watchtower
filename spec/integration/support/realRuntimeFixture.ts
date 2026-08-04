/**
 * A real, relocated, immutable lane runtime root on disk.
 *
 * Nothing here is linked to the source worktree, `process.cwd()/node_modules`,
 * or the machine Nirvana ecosystem: the tree is built from bytes this module
 * writes, so containment, permission, and symlink proof is about the fixture and
 * not about the developer's machine. The runtime root is left at `0555` so every
 * spec exercises the same immutability fence production enforces.
 */
import {chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {semanticDigest} from '../../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import type {LaneRuntimeContext, LaneTaskInvocation, PinnedTaskRuntimeTarget}
    from '../../../src/contracts/taskRuntime.js';
import {LaneInstallIdentityReader, type LaneInstallIdentity} from '../../../src/foundation/read/index.js';
import {LaneTaskCatalog} from '../../../src/foundation/taskRuntime/LaneTaskCatalog.js';
import {NirvanaLaneTaskRunner} from '../../../src/foundation/taskRuntime/NirvanaLaneTaskRunner.js';
import {nodeRuntimeFileSystem} from '../../../src/foundation/taskRuntime/runtimeFileSystem.js';
import type {RuntimeRootResolver, TaskRuntimePinSource}
    from '../../../src/foundation/taskRuntime/LaneTaskRunner.js';
import type {RuntimeProcessInvoker, RuntimeProcessOutcome, RuntimeProcessRequest}
    from '../../../src/foundation/runtime/leaf/runtimeProcessPorts.js';

export const CATALOG_ID = 'watchtower-runtime-nvb/v1';
export const PROFILE_ID = 'implementation-v1';
export const ACTION_ID = 'runtime.smoke';
export const TASK_ID = 'wt:runtime:smoke';
export const LEAF_ID = 'runtime.echo';
export const INPUT_SCHEMA = 'watchtower://runtime/schemas/runtime-smoke-input/v1';
export const RESULT_SCHEMA = 'watchtower://runtime/schemas/runtime-smoke-result/v1';
export const NOT_BEFORE = '2026-08-03T00:00:00.000Z';
export const RUN_AT = '2026-08-03T00:00:01.000Z';
export const DECLARED_INPUT = {schemaVersion: 1, operation: 'runtime-smoke'};
/** The caller's typed per-invocation request for the fixture action. */
export const TASK_REQUEST = {schemaVersion: 1, operation: 'runtime-smoke', requestId: 'req-01'};

const RESULT_SCHEMA_DOC = JSON.stringify({type: 'object', required: ['ok'], properties: {ok: {type: 'boolean'}}});
const INPUT_SCHEMA_DOC = JSON.stringify({type: 'object', required: ['operation']});
const LEAF_SOURCE = '#!/bin/sh\nexit 0\n';

/** Replays exact captured pinned-NVB stdout lines against the production reader. */
export class CapturedNvbProcess implements RuntimeProcessInvoker {
    readonly requests: RuntimeProcessRequest[] = [];

    constructor(
        private readonly lines: readonly string[],
        private readonly outcome: Partial<RuntimeProcessOutcome> = {}
    ) {}

    async invoke(request: RuntimeProcessRequest): Promise<RuntimeProcessOutcome> {
        this.requests.push(request);
        for (const line of this.lines) request.onStdoutLine?.(line);
        return {disposition: 'exited', exitCode: 0, signal: null, stdout: '', stderr: '', ...this.outcome};
    }
}

class StubIdentityReader extends LaneInstallIdentityReader {
    read(): LaneInstallIdentity {
        return {cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0'};
    }
}

export function digestOf(text: string): string {
    return `sha256:${createHash('sha256').update(text).digest('hex')}`;
}

export interface Fixture {
    readonly root: string;
    readonly runtimeRoot: string;
    readonly catalogDirectory: string;
    readonly controlHome: string;
    readonly laneDir: string;
    readonly document: JsonObject;
}

interface FixtureOptions {
    /** Stage the task as an effect-authority task that requires an envelope. */
    readonly effect?: boolean;
}

function catalogFor(leafDigest: string, options: FixtureOptions = {}): JsonObject {
    return {
        schemaVersion: 1, catalogId: CATALOG_ID, catalogVersion: 1, fragments: ['runtime-smoke'],
        minimumRuntime: {cliVersion: '0.1.0', nodeVersion: '26.4.0'},
        handlers: {RuntimeSmokeTaskHandler: {module: './handlers/RuntimeSmokeTaskHandler.js'}},
        tasks: {[TASK_ID]: {
            executionScope: 'lane-runtime', handlerId: 'RuntimeSmokeTaskHandler',
            inputSchema: INPUT_SCHEMA, resultSchema: RESULT_SCHEMA, leafIds: [LEAF_ID],
            mutationClass: options.effect === true ? 'journaled-mutation' : 'read-only',
            requiresInvocationEnvelope: options.effect === true
        }},
        groups: {}, actions: {[ACTION_ID]: {taskId: TASK_ID}},
        leaves: {[LEAF_ID]: {executable: true, mode: '0555', path: './leaves/echo.sh', sha256: leafDigest}},
        profiles: {[PROFILE_ID]: {taskIds: [TASK_ID]}},
        schemas: {
            [INPUT_SCHEMA]: {path: './schemas/in.schema.json', sha256: digestOf(INPUT_SCHEMA_DOC)},
            [RESULT_SCHEMA]: {path: './schemas/out.schema.json', sha256: digestOf(RESULT_SCHEMA_DOC)}
        }
    };
}

function configProjection(): string {
    return JSON.stringify({
        groups: {}, handlers: ['./handlers/RuntimeSmokeTaskHandler.js'],
        tasks: {[TASK_ID]: {
            doc: {summary: 'Packaged runtime smoke.'},
            handle: {args: [DECLARED_INPUT], handler: 'RuntimeSmokeTaskHandler', preferType: 'async', type: 'auto'},
            runnerOpts: {}
        }}
    });
}

/** Stage a real, relocated immutable runtime root plus a real control home. */
export function makeFixture(options: FixtureOptions = {}): Fixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-rt05-'));
    const runtimeRoot = join(root, 'runtimes', '1.0.0');
    const catalogDirectory = join(runtimeRoot, 'runtime-nvb');
    const controlHome = join(root, 'control');
    const laneDir = join(controlHome, '.watchtower', 'lanes', 'demo');
    for (const dir of [join(catalogDirectory, 'leaves'), join(catalogDirectory, 'schemas'), laneDir]) {
        mkdirSync(dir, {recursive: true});
    }
    const leafPath = join(catalogDirectory, 'leaves', 'echo.sh');
    writeFileSync(leafPath, LEAF_SOURCE);
    chmodSync(leafPath, 0o555);
    writeFileSync(join(catalogDirectory, 'schemas', 'in.schema.json'), INPUT_SCHEMA_DOC);
    writeFileSync(join(catalogDirectory, 'schemas', 'out.schema.json'), RESULT_SCHEMA_DOC);
    writeFileSync(join(catalogDirectory, 'runtime-nvb.json'), configProjection());
    writeFileSync(join(catalogDirectory, 'runtime-nvb.js'), 'export {};\n');
    const document = catalogFor(digestOf(LEAF_SOURCE), options);
    writeFileSync(join(catalogDirectory, 'task-catalog.json'), JSON.stringify(document));
    chmodSync(runtimeRoot, 0o555);
    return {root, runtimeRoot, catalogDirectory, controlHome, laneDir, document};
}

/**
 * Write a real §7 invocation envelope into the lane overlay: a real file, with a
 * real owner and a real mode, so ownership and containment are filesystem facts
 * rather than fixture assertions.
 */
export function writeEnvelope(
    fixture: Fixture,
    overrides: Record<string, unknown> = {},
    options: {readonly mode?: number; readonly directory?: string} = {}
): string {
    const directory = options.directory ?? join(fixture.laneDir, 'effects');
    mkdirSync(directory, {recursive: true});
    const path = join(directory, 'envelope-01.json');
    const body: JsonObject = {
        schemaVersion: 1, actionId: ACTION_ID, laneId: contextFor(fixture).laneId,
        catalogId: CATALOG_ID, catalogSha256: semanticDigest(fixture.document), taskId: TASK_ID,
        inputSchema: INPUT_SCHEMA, parameters: {reason: 'demo'},
        preconditionDigest: digestOf('precondition') as string,
        idempotencyKey: 'idem-01', lockId: 'lane/demo/effect',
        createdAt: '2026-08-02T23:00:00.000Z', expiresAt: '2026-08-03T01:00:00.000Z',
        resultDestination: join(directory, 'envelope-01.result.json'),
        journalDestination: join(directory, 'envelope-01.journal.jsonl'),
        consumer: {handlerId: 'RuntimeSmokeTaskHandler', singleUse: true},
        ...overrides
    };
    const {checksum, ...rest} = body;
    writeFileSync(path, JSON.stringify({
        ...rest, checksum: typeof checksum === 'string' ? checksum : semanticDigest(rest)
    }));
    chmodSync(path, options.mode ?? 0o600);
    return path;
}

/** Run `mutate` with the immutable root temporarily writable, then re-seal it. */
export function whileMutable(fixture: Fixture, mutate: () => void): void {
    chmodSync(fixture.runtimeRoot, 0o755);
    try {
        mutate();
    } finally {
        chmodSync(fixture.runtimeRoot, 0o555);
    }
}

export function removeFixture(fixture: Fixture): void {
    chmodSync(fixture.runtimeRoot, 0o755);
    rmSync(fixture.root, {recursive: true, force: true});
}

export function pinFor(fixture: Fixture, overrides: Partial<PinnedTaskRuntimeTarget> = {}): PinnedTaskRuntimeTarget {
    return {
        catalogId: CATALOG_ID, catalogSha256: semanticDigest(fixture.document), profile: PROFILE_ID,
        configTarget: join(fixture.catalogDirectory, 'runtime-nvb.json'),
        moduleTarget: join(fixture.catalogDirectory, 'runtime-nvb.js'),
        ...overrides
    };
}

export function realCatalog(fixture: Fixture): LaneTaskCatalog {
    return LaneTaskCatalog.open(pinFor(fixture), fixture.runtimeRoot, nodeRuntimeFileSystem);
}

export function contextFor(fixture: Fixture): LaneRuntimeContext {
    return {
        workspace: fixture.controlHome, laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', initiativeId: 'watchtower-v1',
        laneSlug: 'demo', laneDir: fixture.laneDir, homeRepositoryId: 'watchtower',
        repositoriesFile: join(fixture.laneDir, 'repositories.json'), runtimeRoot: fixture.runtimeRoot,
        runtimeVersion: '1.0.0', knowledgeRoot: join(fixture.root, 'knowledge'),
        baseEnvironment: {path: process.env.PATH ?? '/usr/bin:/bin', home: process.env.HOME ?? '/tmp'}
    };
}

/** One typed invocation of the fixture action, with the caller request supplied. */
export function invocationFor(fixture: Fixture, overrides: Partial<LaneTaskInvocation> = {}): LaneTaskInvocation {
    return {actionId: ACTION_ID, context: contextFor(fixture), input: TASK_REQUEST, ...overrides};
}

export function runnerFor(fixture: Fixture, processes: RuntimeProcessInvoker): NirvanaLaneTaskRunner {
    const pins: TaskRuntimePinSource = {readTaskRuntime: () => pinFor(fixture)};
    const runtimeRoots: RuntimeRootResolver = {resolveRuntimeRoot: () => fixture.runtimeRoot};
    return new NirvanaLaneTaskRunner({
        runtimeRoots, pins, identity: new StubIdentityReader(), files: nodeRuntimeFileSystem, processes,
        now: () => new Date(NOT_BEFORE),
        runner: {nodeExecutable: process.execPath, runnerScript: join(fixture.catalogDirectory, 'x.js')}
    });
}

/** The exact closed event shape the pinned runner emits, bound to this fixture. */
export function realEvent(fixture: Fixture, overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        version: 1, runId: 'run-1', sequence: 1, timestamp: RUN_AT, type: 'run.started', source: 'runner',
        cwd: fixture.controlHome, taskName: null,
        payload: {requestedTasks: [TASK_ID], runType: 'series', isServe: false}, ...overrides
    });
}

/** The exact closed run-result shape the pinned runner emits, bound to this fixture. */
export function realResult(fixture: Fixture, structuredOutput: unknown, overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        runId: 'run-1', status: 'finished', cwd: fixture.controlHome, isServe: false, serveName: null,
        sessionId: null, stopReason: null, cancellationReason: null, failurePhase: null,
        requestedTasks: [TASK_ID], startedAt: RUN_AT, finishedAt: RUN_AT, failedTask: null, framework: null,
        structuredOutput, interpretation: null, error: null, observerDiagnostics: [], ...overrides
    });
}
