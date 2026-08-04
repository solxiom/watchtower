/**
 * The typed per-invocation request reaches a real TaskHandler unchanged
 * (`docs/spec/nirvana-integration-architecture.md` §7, Correction 04 finding 3).
 *
 * This suite starts the **real pinned NVB runner** through the production process
 * adapter, with argv built by the production planner, against a scratch NVB
 * target whose handler reads the request only through the pinned public
 * `TaskHandler.argMap` accessor. Nothing about the channel is simulated: if the
 * pinned CLI dropped, reordered, or truncated the argument, or if
 * `argUtil.makeKeyValueMap` mangled the encoding, the decoded request in the
 * run's structured output would not equal the caller's value.
 *
 * The scratch target stands in for the *packaged* runtime module because the
 * accepted packaged catalog declares no action and its module is not a loadable
 * NVB target; adopting this channel inside `RuntimeSmokeTaskHandler` is RT-10's
 * to land, and is routed rather than repaired here.
 */
import {chmodSync, mkdirSync, mkdtempSync, rmSync, writeFileSync} from 'node:fs';
import {createRequire} from 'node:module';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {NirvanaProcessInvoker} from '../../src/foundation/runtime/leaf/NirvanaProcessInvoker.js';
import {planLaneTaskInvocation} from '../../src/foundation/task/runtime/laneTaskInvocationPlan.js';
import {encodeTaskRequest} from '../../src/foundation/task/runtime/laneTaskRequest.js';
import {NvbRunOutputReader} from '../../src/foundation/task/runtime/nvbRunOutput.js';
import type {JsonValue} from '../../src/foundation/schemaComposition/schemaCompositionContracts.js';

const TASK_ID = 'wt:probe:echo';
const DECLARED_INPUT = {schemaVersion: 1, operation: 'probe'};
const TIMEOUT = 120_000;

/**
 * A request that is hostile to the pinned argument parser: `makeKeyValueMap`
 * splits on the first `=` and keeps one segment, so a value carrying `=`, quotes,
 * spaces, and non-ASCII proves the encoding, not just the plumbing.
 */
const REQUEST = {
    schemaVersion: 1,
    operation: 'probe',
    filter: 'name="a=b" and c=d',
    note: 'ünïcode ✅',
    nested: {list: [1, 2, 3], flag: true, empty: null}
};

interface Target {
    readonly root: string;
    readonly configTarget: string;
    readonly moduleTarget: string;
}

function builderEntry(): string {
    return join(dirname(createRequire(import.meta.url).resolve('@nirvana/builder')), 'bin', 'nvb.js');
}

/** A scratch NVB target whose handler echoes what the pinned channel delivered. */
function makeTarget(): Target {
    const root = mkdtempSync(join(tmpdir(), 'wt-rt05-request-'));
    mkdirSync(join(root, 'handlers'), {recursive: true});
    const builder = dirname(createRequire(import.meta.url).resolve('@nirvana/builder'));
    writeFileSync(join(root, 'handlers', 'EchoHandler.js'), handlerSource(builder));
    writeFileSync(join(root, 'nvb-target.js'), 'export {};\n');
    writeFileSync(join(root, 'nvb-target.json'), JSON.stringify({
        groups: {},
        handlers: ['./handlers/EchoHandler.js'],
        tasks: {[TASK_ID]: {
            doc: {summary: 'Echo the pinned per-invocation request channel.'},
            handle: {args: [DECLARED_INPUT], handler: 'EchoHandler', preferType: 'async', type: 'auto'},
            runnerOpts: {}
        }}
    }));
    chmodSync(root, 0o755);
    return {root, configTarget: join(root, 'nvb-target.json'), moduleTarget: join(root, 'nvb-target.js')};
}

/**
 * The handler resolves `@nirvana/builder` by absolute path, so the scratch target
 * needs no `node_modules` of its own and nothing is linked into the fixture.
 */
function handlerSource(builderRoot: string): string {
    return [
        `import {TaskHandler} from ${JSON.stringify(join(builderRoot, 'index.js'))};`,
        '',
        "const FLAG = '--wt-task-request';",
        '',
        'export default class EchoHandler extends TaskHandler {',
        "    static handlerName = 'EchoHandler';",
        '',
        '    constructor({taskName}) {',
        '        super({taskName, handlerName: EchoHandler.handlerName, hasSyncHandler: false,',
        '               hasAsyncHandler: true, waitForDoneSignalOnAsync: true});',
        '    }',
        '',
        '    async handleAsync(input) {',
        '        // The pinned public per-invocation channel, and nothing else.',
        '        const token = this.argMap.get(FLAG);',
        '        const request = typeof token === "string"',
        '            ? JSON.parse(Buffer.from(token, "base64url").toString("utf8"))',
        '            : null;',
        '        this.onResult({structuredOutput: {ok: true, declaredInput: input ?? null, request, token}});',
        '        this.doneSignal(undefined);',
        '    }',
        '}',
        ''
    ].join('\n');
}

interface RunObservation {
    readonly exitCode: number | null;
    readonly problem: string | null;
    readonly structuredOutput: Record<string, unknown> | null;
}

/** Build the production plan, run the real pinned runner, read the real stream. */
async function runWith(target: Target, request: JsonValue): Promise<RunObservation> {
    const notBefore = new Date().toISOString();
    const reader = new NvbRunOutputReader({taskId: TASK_ID, workingDirectory: target.root, notBefore});
    const outcome = await new NirvanaProcessInvoker().invoke(planLaneTaskInvocation({
        runner: {nodeExecutable: process.execPath, runnerScript: builderEntry()},
        target: {
            catalogId: 'scratch', catalogSha256: `sha256:${'0'.repeat(64)}`, profile: 'scratch',
            configTarget: target.configTarget, moduleTarget: target.moduleTarget
        },
        taskId: TASK_ID,
        workingDirectory: target.root,
        environment: {PATH: process.env.PATH ?? '/usr/bin:/bin', HOME: process.env.HOME ?? target.root},
        requestArgument: encodeTaskRequest(request, TASK_ID),
        invocationEnvelope: undefined,
        cancellation: undefined,
        onStdoutLine: (line) => reader.acceptLine(line)
    }));
    return {
        exitCode: outcome.exitCode,
        problem: reader.problem,
        structuredOutput: (reader.result?.structuredOutput ?? null) as Record<string, unknown> | null
    };
}

describe('typed request channel against the real pinned NVB runner', () => {
    let target: Target;
    beforeEach(() => {
        target = makeTarget();
    });
    afterEach(() => rmSync(target.root, {recursive: true, force: true}));

    it('delivers the exact caller request to the TaskHandler, byte for byte', async () => {
        const observed = await runWith(target, REQUEST);
        expect(observed.exitCode).toBe(0);
        expect(observed.problem).toBeNull();
        expect(observed.structuredOutput?.request as unknown).toEqual(REQUEST);
    }, TIMEOUT);

    it('keeps the caller request and the static configuration argument distinct', async () => {
        const observed = await runWith(target, REQUEST);
        expect(observed.structuredOutput?.declaredInput as unknown).toEqual(DECLARED_INPUT);
        expect(observed.structuredOutput?.declaredInput as unknown).not.toEqual(REQUEST);
    }, TIMEOUT);

    it('carries an encoding the pinned argument parser cannot truncate', async () => {
        const observed = await runWith(target, REQUEST);
        expect(String(observed.structuredOutput?.token)).not.toContain('=');
        expect(/^[A-Za-z0-9_-]+$/u.test(String(observed.structuredOutput?.token))).toBeTrue();
    }, TIMEOUT);

    it('produces a stream the production reader accepts as one bound run', async () => {
        const observed = await runWith(target, {schemaVersion: 1, operation: 'probe'});
        expect(observed.problem).toBeNull();
        expect(observed.structuredOutput?.ok as unknown).toBeTrue();
    }, TIMEOUT);
});
