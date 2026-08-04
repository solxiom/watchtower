import {Buffer} from 'node:buffer';
import {LaneTaskRuntimeError} from '../../src/contracts/taskRuntime.js';
import {canonicalJson} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';
import {readDeclaredTaskInput} from '../../src/foundation/task/runtime/laneTaskConfigInput.js';
import {TASK_REQUEST_FLAG, decodeTaskRequest} from '../../src/foundation/task/runtime/laneTaskRequest.js';
import {RUNNER, harness, reasonOf} from './support/laneTaskRunnerHarness.js';
import {
    ACTION_ID,
    CONFIG_TARGET,
    CONTROL_HOME,
    DECLARED_INPUT,
    MODULE_TARGET,
    TASK_ID,
    TASK_REQUEST,
    catalogDocument,
    configDocument,
    invocation,
    laneContext,
    stagedFileSystem,
    taskEntry
} from './support/laneTaskRuntimeFixtures.js';
import {ENVELOPE_PATH, envelopeDocument, envelopeEntry} from './support/laneEnvelopeFixtures.js';
import {runResultLine, runStartedLine} from './support/nvbStreamLines.js';

describe('lane task runner pinned target', () => {
    it('invokes exactly the pinned config and module targets from the control home', async () => {
        const {runner, processes} = harness();
        await runner.run(invocation());
        const request = processes.lastRequest;
        expect(request.executable).toBe(RUNNER.nodeExecutable);
        expect(request.args).toEqual([
            RUNNER.runnerScript, TASK_ID, '--events-json', '--result-json',
            `--cwd=${CONTROL_HOME}`, `--jsonfile=${CONFIG_TARGET}`, `--jsfile=${MODULE_TARGET}`, '--series',
            `${TASK_REQUEST_FLAG}=${encodedRequest(TASK_REQUEST)}`
        ]);
        expect(request.cwd).toBe(CONTROL_HOME);
        expect(request.killSignal).toBe('SIGTERM');
    });

    it('forwards both pinned targets, never only one half of the target', async () => {
        const {runner, processes} = harness();
        await runner.run(invocation());
        const args = processes.lastRequest.args;
        expect(args).toContain(`--jsonfile=${CONFIG_TARGET}`);
        expect(args).toContain(`--jsfile=${MODULE_TARGET}`);
    });

    it('passes only the validated WT_ environment and no ambient variables', async () => {
        process.env.WT_LEAKED = 'leak';
        try {
            const {runner, processes} = harness();
            await runner.run(invocation());
            const environment = processes.lastRequest.environment;
            expect(Object.keys(environment)).not.toContain('WT_LEAKED');
            expect(environment.WT_LANE_DIR).toBe(laneContext().laneDir);
            expect(environment.WT_WORKSPACE).toBe(CONTROL_HOME);
        } finally {
            delete process.env.WT_LEAKED;
        }
    });
});

describe('lane task runner failure order', () => {
    it('refuses a malformed request before reading any lane bytes', async () => {
        const {runner, processes} = harness();
        expect(await reasonOf(() => runner.run(invocation({actionId: 'Bad Action'}))))
            .toBe('TASK_RUNTIME_REQUEST_INVALID');
        expect(await reasonOf(() => runner.run(invocation({context: null as never}))))
            .toBe('TASK_RUNTIME_REQUEST_INVALID');
        expect(processes.requests.length).toBe(0);
    });

    it('refuses a context that disagrees with the installed runtime version or root', async () => {
        expect(await reasonOf(() => harness({installedVersion: '2.0.0'}).runner
            .run(invocation())))
            .toBe('TASK_RUNTIME_REQUEST_INVALID');
        expect(await reasonOf(() => harness().runner
            .run(invocation({context: laneContext({runtimeRoot: '/data/watchtower/runtimes/9.9.9'})}))))
            .toBe('TASK_RUNTIME_ROOT_INVALID');
    });

    it('refuses a stale pin digest before resolving an action', async () => {
        const {runner, processes} = harness({pinOverrides: {catalogSha256: `sha256:${'0'.repeat(64)}`}});
        expect(await reasonOf(() => runner.run(invocation())))
            .toBe('TASK_RUNTIME_CATALOG_DIGEST_MISMATCH');
        expect(processes.requests.length).toBe(0);
    });
});

describe('lane task runner invocation envelope', () => {
    const effectDocument = catalogDocument({
        tasks: {[TASK_ID]: taskEntry({mutationClass: 'authoritative-effect', requiresInvocationEnvelope: true})}
    });

    it('requires a prepared envelope for an effect-authority task', async () => {
        const {runner, processes} = harness({document: effectDocument});
        expect(await reasonOf(() => runner.run(invocation()))).toBe('TASK_RUNTIME_ENVELOPE_REQUIRED');
        expect(processes.requests.length).toBe(0);
    });

    it('refuses a syntax-only envelope label that names no lane artifact', async () => {
        const {runner, processes} = harness({document: effectDocument});
        expect(await reasonOf(() => runner.run(invocation({invocationEnvelope: 'envelope-01'}))))
            .toBe('TASK_RUNTIME_ENVELOPE_INVALID');
        expect(processes.requests.length).toBe(0);
    });

    it('refuses an envelope supplied to a task that declares no effect authority', async () => {
        const {runner, processes} = harness({
            extra: {[ENVELOPE_PATH]: envelopeEntry(envelopeDocument(catalogDocument()))}
        });
        expect(await reasonOf(() => runner.run(invocation({invocationEnvelope: ENVELOPE_PATH}))))
            .toBe('TASK_RUNTIME_ENVELOPE_INVALID');
        expect(processes.requests.length).toBe(0);
    });

    it('forwards a fully validated envelope path as one explicit argument', async () => {
        const {runner, processes} = harness({
            document: effectDocument,
            extra: {[ENVELOPE_PATH]: envelopeEntry(envelopeDocument(effectDocument))}
        });
        await runner.run(invocation({invocationEnvelope: ENVELOPE_PATH}));
        expect(processes.lastRequest.args).toContain(`--wt-invocation-envelope=${ENVELOPE_PATH}`);
    });
});

describe('lane task runner typed per-invocation request', () => {
    it('delivers the exact caller request to the task, unchanged, as one argv token', async () => {
        const {runner, processes} = harness();
        await runner.run(invocation());
        const token = processes.lastRequest.args.find((value) => value.startsWith(`${TASK_REQUEST_FLAG}=`));
        expect(token).toBeDefined();
        expect(decodeTaskRequest((token ?? '').slice(TASK_REQUEST_FLAG.length + 1)) as unknown)
            .toEqual(TASK_REQUEST);
    });

    it('refuses a request that does not satisfy the declared input schema before starting', async () => {
        const {runner, processes} = harness();
        expect(await reasonOf(() => runner.run(invocation({input: {schemaVersion: 1}}))))
            .toBe('TASK_RUNTIME_INPUT_INVALID');
        expect(processes.requests.length).toBe(0);
    });

    it('refuses a missing or non-JSON request', async () => {
        const {runner} = harness();
        expect(await reasonOf(() => runner.run(invocation({input: undefined as never}))))
            .toBe('TASK_RUNTIME_REQUEST_INVALID');
        expect(await reasonOf(() => runner.run(invocation({input: (() => 1) as never}))))
            .toBe('TASK_RUNTIME_REQUEST_INVALID');
    });

    it('refuses a request beyond the bounded per-invocation size', async () => {
        const {runner, processes} = harness();
        const oversized = {schemaVersion: 1, operation: 'runtime-smoke', filler: 'x'.repeat(40_000)};
        expect(await reasonOf(() => runner.run(invocation({input: oversized})))).toBe('TASK_RUNTIME_INPUT_INVALID');
        expect(processes.requests.length).toBe(0);
    });
});

describe('lane task runner packaged typed input', () => {
    it('validates exactly the input the pinned config hands the task', async () => {
        const {runner, processes} = harness();
        await runner.run(invocation());
        const configPath = configTargetFrom(processes.lastRequest.args);
        const files = stagedFileSystem(catalogDocument());
        expect(readDeclaredTaskInput(files, configPath, TASK_ID) as unknown).toEqual(DECLARED_INPUT);
    });

    it('refuses packaged input that does not satisfy the declared input schema before starting', async () => {
        const {runner, processes} = harness({config: configDocument([{schemaVersion: 1}])});
        expect(await reasonOf(() => runner.run(invocation()))).toBe('TASK_RUNTIME_INPUT_INVALID');
        expect(processes.requests.length).toBe(0);
    });

    it('refuses a projection with no, or more than one, declared handler argument', async () => {
        expect(await reasonOf(() => harness({config: configDocument([])}).runner.run(invocation())))
            .toBe('TASK_RUNTIME_INPUT_INVALID');
        expect(await reasonOf(() => harness({config: configDocument([DECLARED_INPUT, DECLARED_INPUT])}).runner
            .run(invocation()))).toBe('TASK_RUNTIME_INPUT_INVALID');
    });

    it('refuses a projection that omits the selected task or is not well formed', async () => {
        expect(await reasonOf(() => harness({config: {groups: {}, handlers: [], tasks: {}}}).runner
            .run(invocation()))).toBe('TASK_RUNTIME_TASK_NOT_IN_CONFIG');
        const files = stagedFileSystem(catalogDocument());
        files.set(CONFIG_TARGET, {kind: 'file', readable: true, text: '{"tasks": {}, "tasks": {}}'});
        expect(() => readDeclaredTaskInput(files, CONFIG_TARGET, TASK_ID))
            .toThrowMatching((error) => error instanceof LaneTaskRuntimeError
                && error.reason === 'TASK_RUNTIME_CONFIG_INVALID');
    });
});

describe('lane task runner typed outcomes', () => {
    it('returns a completed result carrying the task structured output and events', async () => {
        const {runner} = harness();
        const result = await runner.run(invocation());
        expect(result.outcome).toBe('completed');
        if (result.outcome !== 'completed') return;
        expect(result.taskId).toBe(TASK_ID);
        expect(result.runId).toBe('run-1');
        expect(result.result as Record<string, unknown>)
            .toEqual({schemaVersion: 1, ok: true, operation: 'runtime-smoke'});
        expect(result.events.map((event) => event.type)).toEqual(['run.started']);
    });

    it('fails closed when a finished run produces no result for a declared schema', async () => {
        const {runner} = harness({lines: [runStartedLine(), runResultLine({structuredOutput: null})]});
        const result = await runner.run(invocation());
        expect(result.outcome === 'failed' && result.reason).toBe('TASK_RUNTIME_TASK_RESULT_MISSING');
    });

    it('maps a failed run to a typed failure with a redacted diagnostic', async () => {
        const {runner} = harness({
            lines: [runStartedLine(), runResultLine({
                status: 'failed', failedTask: TASK_ID, structuredOutput: null,
                error: {name: 'Error', message: 'deliberate failure at /home/kavan/secret/path', stack: 'at x'}
            })],
            outcome: {exitCode: 1}
        });
        const result = await runner.run(invocation());
        expect(result.outcome).toBe('failed');
        if (result.outcome !== 'failed') return;
        expect(result.reason).toBe('TASK_RUNTIME_TASK_EXECUTION_FAILED');
        expect(result.diagnostic).not.toContain('/home/kavan');
        expect(result.diagnostic).toContain('<path>');
    });

    it('reports cancellation with the delivered signal rather than an exit status', async () => {
        const {runner} = harness({
            lines: [runStartedLine()],
            outcome: {disposition: 'cancelled', exitCode: null, signal: 'SIGTERM'}
        });
        const result = await runner.run(invocation());
        expect(result.outcome === 'cancelled' && result.signal).toBe('SIGTERM');
    });

    it('refuses when the pinned runner cannot be executed', async () => {
        const {runner} = harness({lines: [], outcome: {disposition: 'unavailable', exitCode: null}});
        const result = await runner.run(invocation());
        expect(result.outcome === 'failed' && result.reason).toBe('TASK_RUNTIME_RUNNER_UNAVAILABLE');
    });

    it('rejects structured output that does not satisfy the declared result schema', async () => {
        const lines = [runStartedLine(), runResultLine({structuredOutput: {schemaVersion: 999, unexpected: true}})];
        const result = await harness({lines}).runner.run(invocation());
        expect(result.outcome === 'failed' && result.reason).toBe('TASK_RUNTIME_RESULT_SCHEMA_INVALID');
    });

    it('refuses schema resolution failure before the process starts', async () => {
        const {runner, processes} = harness({document: catalogDocument({schemas: {}})});
        expect(await reasonOf(() => runner.run(invocation())))
            .toBe('TASK_RUNTIME_RESULT_SCHEMA_UNAVAILABLE');
        expect(processes.requests.length).toBe(0);
    });
});

function encodedRequest(request: Record<string, unknown>): string {
    return Buffer.from(canonicalJson(request as never), 'utf8').toString('base64url');
}

function configTargetFrom(args: readonly string[]): string {
    const flag = args.find((value) => value.startsWith('--jsonfile='));
    return (flag ?? '').slice('--jsonfile='.length);
}
