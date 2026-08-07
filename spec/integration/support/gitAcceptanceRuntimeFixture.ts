/**
 * A real, relocated, immutable lane runtime root staging the CA-12
 * `git.publish-commits` task and its cataloged `git.push` leaf — the same
 * fixture shape RT-05's `realRuntimeFixture.ts` uses for `runtime.smoke`,
 * parameterized for this capability instead of modifying that shared file.
 */
import {chmodSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {createHash} from 'node:crypto';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {semanticDigest} from '../../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import type {LaneRuntimeContext, LaneTaskInvocation, PinnedTaskRuntimeTarget} from '../../../src/contracts/taskRuntime.js';
import {LaneInstallIdentityReader, type LaneInstallIdentity} from '../../../src/foundation/read/index.js';
import {LaneTaskCatalog} from '../../../src/foundation/task/runtime/LaneTaskCatalog.js';
import {NirvanaLaneTaskRunner} from '../../../src/foundation/task/runtime/NirvanaLaneTaskRunner.js';
import {nodeRuntimeFileSystem} from '../../../src/foundation/task/runtime/runtimeFileSystem.js';
import type {RuntimeRootResolver, TaskRuntimePinSource} from '../../../src/foundation/task/runtime/LaneTaskRunner.js';
import type {RuntimeProcessInvoker, RuntimeProcessOutcome, RuntimeProcessRequest} from '../../../src/foundation/runtime/leaf/runtimeProcessPorts.js';

export const CATALOG_ID = 'watchtower-git-acceptance-fixture/v1';
export const PROFILE_ID = 'implementation-v1';
export const ACTION_ID = 'git.publish-commits';
export const TASK_ID = 'wt:git:publish-commits';
export const LEAF_ID = 'git.push';
export const HANDLER_ID = 'GitAcceptanceTaskHandler';
export const INPUT_SCHEMA = 'watchtower://runtime/schemas/git-publish-commits-input/v1';
export const RESULT_SCHEMA = 'watchtower://runtime/schemas/git-publish-commits-result/v1';
export const NOT_BEFORE = '2026-08-07T00:00:00.000Z';
export const RUN_AT = '2026-08-07T00:00:01.000Z';
export const DECLARED_INPUT = {schemaVersion: 1, targetId: 'unset', sha: '0'.repeat(40), ref: 'refs/heads/unset', remote: 'origin'};
export const TASK_REQUEST = {schemaVersion: 1, targetId: 'repo-a', sha: 'a'.repeat(40), ref: 'refs/heads/main', remote: 'origin'};

const RESULT_SCHEMA_DOC = JSON.stringify({
    type: 'object', required: ['applied', 'changed', 'unchanged', 'warnings'],
    properties: {applied: {type: 'boolean'}, changed: {type: 'array'}, unchanged: {type: 'array'}, warnings: {type: 'array'}}
});
const INPUT_SCHEMA_DOC = JSON.stringify({type: 'object', required: ['targetId', 'sha', 'ref', 'remote']});
/** The actual shipped leaf source — read from disk so the fixture can never drift from what ships. */
const LEAF_SOURCE = readFileSync(join(process.cwd(), 'runtime-nvb', 'leaves', 'gitPush.sh'), 'utf8');

export class CapturedNvbProcess implements RuntimeProcessInvoker {
    readonly requests: RuntimeProcessRequest[] = [];
    constructor(private readonly lines: readonly string[], private readonly outcome: Partial<RuntimeProcessOutcome> = {}) {}
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

function catalogFor(leafDigest: string): JsonObject {
    return {
        schemaVersion: 1, catalogId: CATALOG_ID, catalogVersion: 1, fragments: ['git-acceptance'],
        minimumRuntime: {cliVersion: '0.1.0', nodeVersion: '26.4.0'},
        handlers: {[HANDLER_ID]: {module: './handlers/GitAcceptanceTaskHandler.js'}},
        tasks: {[TASK_ID]: {
            executionScope: 'lane-runtime', handlerId: HANDLER_ID,
            inputSchema: INPUT_SCHEMA, resultSchema: RESULT_SCHEMA, leafIds: [LEAF_ID],
            mutationClass: 'external-effect', requiresInvocationEnvelope: true
        }},
        groups: {}, actions: {[ACTION_ID]: {taskId: TASK_ID}},
        leaves: {[LEAF_ID]: {executable: true, mode: '0555', path: './leaves/gitPush.sh', sha256: leafDigest}},
        profiles: {[PROFILE_ID]: {taskIds: [TASK_ID]}},
        schemas: {
            [INPUT_SCHEMA]: {path: './schemas/in.schema.json', sha256: digestOf(INPUT_SCHEMA_DOC)},
            [RESULT_SCHEMA]: {path: './schemas/out.schema.json', sha256: digestOf(RESULT_SCHEMA_DOC)}
        }
    };
}

function configProjection(): string {
    return JSON.stringify({
        groups: {}, handlers: ['./handlers/GitAcceptanceTaskHandler.js'],
        tasks: {[TASK_ID]: {
            doc: {summary: 'Fixture publish-commits task.'},
            handle: {args: [DECLARED_INPUT], handler: HANDLER_ID, preferType: 'async', type: 'auto'},
            runnerOpts: {}
        }}
    });
}

/** Stage a real, relocated immutable runtime root plus a real control home and a real executable Git leaf. */
export function makeFixture(): Fixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-ca12-leaf-'));
    const runtimeRoot = join(root, 'runtimes', '1.0.0');
    const catalogDirectory = join(runtimeRoot, 'runtime-nvb');
    const controlHome = join(root, 'control');
    const laneDir = join(controlHome, '.watchtower', 'lanes', 'demo');
    for (const dir of [join(catalogDirectory, 'leaves'), join(catalogDirectory, 'schemas'), laneDir]) {
        mkdirSync(dir, {recursive: true});
    }
    const leafPath = join(catalogDirectory, 'leaves', 'gitPush.sh');
    writeFileSync(leafPath, LEAF_SOURCE);
    chmodSync(leafPath, 0o555);
    writeFileSync(join(catalogDirectory, 'schemas', 'in.schema.json'), INPUT_SCHEMA_DOC);
    writeFileSync(join(catalogDirectory, 'schemas', 'out.schema.json'), RESULT_SCHEMA_DOC);
    writeFileSync(join(catalogDirectory, 'runtime-nvb.json'), configProjection());
    writeFileSync(join(catalogDirectory, 'runtime-nvb.js'), 'export {};\n');
    const document = catalogFor(digestOf(LEAF_SOURCE));
    writeFileSync(join(catalogDirectory, 'task-catalog.json'), JSON.stringify(document));
    chmodSync(runtimeRoot, 0o555);
    return {root, runtimeRoot, catalogDirectory, controlHome, laneDir, document};
}

export function whileMutable(fixture: Fixture, mutate: () => void): void {
    chmodSync(fixture.runtimeRoot, 0o755);
    try { mutate(); } finally { chmodSync(fixture.runtimeRoot, 0o555); }
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
        workspace: fixture.controlHome, laneId: '9d0ee3d2-0000-4fb7-b112-8438f04f57d2', initiativeId: 'watchtower-v1',
        laneSlug: 'demo', laneDir: fixture.laneDir, homeRepositoryId: 'watchtower',
        repositoriesFile: join(fixture.laneDir, 'repositories.json'), runtimeRoot: fixture.runtimeRoot,
        runtimeVersion: '1.0.0', knowledgeRoot: join(fixture.root, 'knowledge'),
        baseEnvironment: {path: process.env.PATH ?? '/usr/bin:/bin', home: process.env.HOME ?? '/tmp'}
    };
}

/**
 * Write a real §7 invocation envelope into the lane overlay — `publish-commits`
 * declares `requiresInvocationEnvelope: true` (it is a real external effect),
 * so every runner-level fixture call needs one, exactly as RT-05's own fixture
 * writes one for its effect-mode scenarios.
 */
export function writeEnvelope(fixture: Fixture, overrides: Record<string, unknown> = {}): string {
    const directory = join(fixture.laneDir, 'effects');
    mkdirSync(directory, {recursive: true});
    const path = join(directory, 'envelope-01.json');
    const body: JsonObject = {
        schemaVersion: 1, actionId: ACTION_ID, laneId: contextFor(fixture).laneId,
        catalogId: CATALOG_ID, catalogSha256: semanticDigest(fixture.document), taskId: TASK_ID,
        inputSchema: INPUT_SCHEMA, parameters: TASK_REQUEST,
        preconditionDigest: digestOf('precondition') as string,
        idempotencyKey: 'idem-01', lockId: 'lane/demo/effect',
        createdAt: '2026-08-06T23:00:00.000Z', expiresAt: '2026-08-07T01:00:00.000Z',
        resultDestination: join(directory, 'envelope-01.result.json'),
        journalDestination: join(directory, 'envelope-01.journal.jsonl'),
        consumer: {handlerId: HANDLER_ID, singleUse: true},
        ...overrides
    };
    const {checksum, ...rest} = body;
    writeFileSync(path, JSON.stringify({...rest, checksum: typeof checksum === 'string' ? checksum : semanticDigest(rest)}));
    chmodSync(path, 0o600);
    return path;
}

export function invocationFor(fixture: Fixture, overrides: Partial<LaneTaskInvocation> = {}): LaneTaskInvocation {
    return {actionId: ACTION_ID, context: contextFor(fixture), input: TASK_REQUEST, invocationEnvelope: writeEnvelope(fixture), ...overrides};
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

export function realEvent(fixture: Fixture, overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        version: 1, runId: 'run-1', sequence: 1, timestamp: RUN_AT, type: 'run.started', source: 'runner',
        cwd: fixture.controlHome, taskName: null,
        payload: {requestedTasks: [TASK_ID], runType: 'series', isServe: false}, ...overrides
    });
}

export function realResult(fixture: Fixture, structuredOutput: unknown, overrides: Record<string, unknown> = {}): string {
    return JSON.stringify({
        runId: 'run-1', status: 'finished', cwd: fixture.controlHome, isServe: false, serveName: null,
        sessionId: null, stopReason: null, cancellationReason: null, failurePhase: null,
        requestedTasks: [TASK_ID], startedAt: RUN_AT, finishedAt: RUN_AT, failedTask: null, framework: null,
        structuredOutput, interpretation: null, error: null, observerDiagnostics: [], ...overrides
    });
}
