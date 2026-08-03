/**
 * Real-filesystem integration proof for the lane task runtime.
 *
 * Every spec here stages a real on-disk immutable runtime root (chmod 0555), a
 * real control home, and a real overlay, with real content-addressed digests and
 * real schema files, then drives the production `NirvanaLaneTaskRunner`,
 * `LaneTaskCatalog`, and `LeafRuntimeInvoker` through the real
 * `nodeRuntimeFileSystem`. The only injected seams are the clock and the process
 * boundary, which replays the *actual* `--events-json --result-json` line shapes
 * the pinned NVB runner emits (captured from a real `@nirvana/builder` run).
 *
 * The exact packaged bytes are proved separately in
 * `laneTaskRuntimeDistClosure.spec.ts`; the real symlink matrix is in
 * `laneRuntimeSymlinkMatrix.spec.ts`.
 */
import {chmodSync, existsSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {LeafRuntimeError} from '../../src/contracts/leafRuntime.js';
import {LaneTaskRuntimeError} from '../../src/contracts/taskRuntime.js';
import {LeafRuntimeInvoker} from '../../src/foundation/runtime/LeafRuntimeInvoker.js';
import {resolvePackagedNvbRunner} from '../../src/foundation/taskRuntime/packagedNvbRunner.js';
import {nodeRuntimeFileSystem} from '../../src/foundation/taskRuntime/runtimeFileSystem.js';
import {
    ACTION_ID,
    invocationFor,
    CapturedNvbProcess,
    DECLARED_INPUT,
    type Fixture,
    LEAF_ID,
    contextFor,
    makeFixture,
    realCatalog,
    realEvent,
    realResult,
    removeFixture,
    runnerFor,
    whileMutable,
    writeEnvelope
} from './support/realRuntimeFixture.js';

async function reasonOf(action: () => Promise<unknown>): Promise<string> {
    try {
        await action();
    } catch (error) {
        if (error instanceof LaneTaskRuntimeError || error instanceof LeafRuntimeError) return error.reason;
        return `unexpected:${String(error)}`;
    }
    return 'no-error';
}

function leafRequest(fixture: Fixture, overrides: Record<string, unknown> = {}): never {
    return {
        leafId: LEAF_ID, owningActionId: ACTION_ID, args: [], context: contextFor(fixture), ...overrides
    } as never;
}

describe('lane task runtime real-filesystem interpretation', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = makeFixture();
    });
    afterEach(() => removeFixture(fixture));

    it('runs against a real immutable root with the control home as cwd and both targets', async () => {
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {ok: true})]);
        const result = await runnerFor(fixture, processes).run(invocationFor(fixture));
        expect(result.outcome).toBe('completed');
        expect(processes.requests[0].cwd).toBe(fixture.controlHome);
        expect(processes.requests[0].args).toContain(`--jsfile=${join(fixture.catalogDirectory, 'runtime-nvb.js')}`);
    });

    it('delivers the same typed input it validated: the pinned config bytes the child reads', async () => {
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {ok: true})]);
        await runnerFor(fixture, processes).run(invocationFor(fixture));
        const flag = processes.requests[0].args.find((value) => value.startsWith('--jsonfile='));
        const configPath = (flag ?? '').slice('--jsonfile='.length);
        const projection = JSON.parse(readFileSync(configPath, 'utf8')) as {
            tasks: Record<string, {handle: {args: unknown[]}}>;
        };
        expect(projection.tasks['wt:runtime:smoke'].handle.args).toEqual([DECLARED_INPUT]);
    });

    it('refuses before starting when the pinned projection input violates the declared schema', async () => {
        whileMutable(fixture, () => {
            const path = join(fixture.catalogDirectory, 'runtime-nvb.json');
            const projection = JSON.parse(readFileSync(path, 'utf8')) as {
                tasks: Record<string, {handle: {args: unknown[]}}>;
            };
            projection.tasks['wt:runtime:smoke'].handle.args = [{schemaVersion: 1}];
            writeFileSync(path, JSON.stringify(projection));
        });
        const processes = new CapturedNvbProcess([]);
        expect(await reasonOf(() => runnerFor(fixture, processes)
            .run(invocationFor(fixture)))).toBe('TASK_RUNTIME_INPUT_INVALID');
        expect(processes.requests.length).toBe(0);
    });

    it('fails closed on a null structured result and on a schema-invalid one', async () => {
        const nullResult = await runnerFor(fixture,
            new CapturedNvbProcess([realEvent(fixture), realResult(fixture, null)]))
            .run(invocationFor(fixture));
        expect(nullResult.outcome === 'failed' && nullResult.reason).toBe('TASK_RUNTIME_TASK_RESULT_MISSING');
        const invalid = await runnerFor(fixture,
            new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {schemaVersion: 1})]))
            .run(invocationFor(fixture));
        expect(invalid.outcome === 'failed' && invalid.reason).toBe('TASK_RUNTIME_RESULT_SCHEMA_INVALID');
    });

    it('refuses to run against a writable (non-immutable) runtime root', async () => {
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {ok: true})]);
        chmodSync(fixture.runtimeRoot, 0o755);
        expect(await reasonOf(() => runnerFor(fixture, processes)
            .run(invocationFor(fixture)))).toBe('TASK_RUNTIME_ROOT_WRITABLE');
        expect(processes.requests.length).toBe(0);
    });
});

describe('lane runtime real leaf execution and runner resolution', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = makeFixture();
    });
    afterEach(() => removeFixture(fixture));

    it('resolves the packaged runner from the installed closure, not cwd or PATH', () => {
        const binding = resolvePackagedNvbRunner(nodeRuntimeFileSystem, process.execPath);
        expect(binding.runnerScript.endsWith(join('bin', 'nvb.js'))).toBeTrue();
        expect(binding.nodeExecutable).toBe(process.execPath);
    });

    it('executes a real cataloged leaf from the control home for its owning action', async () => {
        const invoker = new LeafRuntimeInvoker({catalog: realCatalog(fixture), files: nodeRuntimeFileSystem});
        const result = await invoker.invoke(leafRequest(fixture));
        expect(result.outcome).toBe('completed');
    });

    it('refuses a real leaf selected through an action that does not own it', async () => {
        const invoker = new LeafRuntimeInvoker({catalog: realCatalog(fixture), files: nodeRuntimeFileSystem});
        expect(await reasonOf(() => invoker.invoke(leafRequest(fixture, {owningActionId: 'runtime.absent'}))))
            .toBe('LEAF_OWNING_ACTION_UNKNOWN');
    });

    it('rejects real catalog bytes that drift from the lane pin digest', () => {
        whileMutable(fixture, () => writeFileSync(join(fixture.catalogDirectory, 'task-catalog.json'),
            JSON.stringify({...fixture.document, catalogVersion: 2})));
        expect(() => realCatalog(fixture)).toThrowMatching((error) =>
            error instanceof LaneTaskRuntimeError && error.reason === 'TASK_RUNTIME_CATALOG_DIGEST_MISMATCH');
    });
});

/**
 * Envelope authority against real filesystem facts: a real file, a real owner, a
 * real mode, and a real symlink out of the lane. The in-memory document matrix is
 * in `spec/foundation/laneInvocationEnvelope.spec.ts`.
 */
describe('lane runtime real invocation envelope authority', () => {
    let fixture: Fixture;
    beforeEach(() => {
        fixture = makeFixture({effect: true});
    });
    afterEach(() => removeFixture(fixture));

    function run(envelope: string | undefined): Promise<string> {
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {ok: true})]);
        return reasonOf(async () => {
            const result = await runnerFor(fixture, processes)
                .run(invocationFor(fixture, {invocationEnvelope: envelope}));
            return processes.requests.length === 1 ? result.outcome : `started:${processes.requests.length}`;
        });
    }

    it('accepts a real operator-owned, mode-restricted, lane-contained envelope', async () => {
        const envelope = writeEnvelope(fixture);
        const processes = new CapturedNvbProcess([realEvent(fixture), realResult(fixture, {ok: true})]);
        const result = await runnerFor(fixture, processes)
            .run(invocationFor(fixture, {invocationEnvelope: envelope}));
        expect(result.outcome).toBe('completed');
        expect(processes.requests[0].args).toContain(`--wt-invocation-envelope=${envelope}`);
    });

    it('refuses the effect task with no envelope at all', async () => {
        expect(await run(undefined)).toBe('TASK_RUNTIME_ENVELOPE_REQUIRED');
    });

    it('refuses a real envelope whose mode is not restricted to its owner', async () => {
        const envelope = writeEnvelope(fixture, {}, {mode: 0o644});
        expect(await run(envelope)).toBe('TASK_RUNTIME_ENVELOPE_MODE_INVALID');
    });

    it('refuses a real envelope symlinked in from outside the lane overlay', async () => {
        const outside = writeEnvelope(fixture, {}, {directory: join(fixture.root, 'outside')});
        const inside = join(fixture.laneDir, 'effects', 'linked.json');
        mkdirSync(join(fixture.laneDir, 'effects'), {recursive: true});
        symlinkSync(outside, inside);
        expect(await run(inside)).toBe('TASK_RUNTIME_ENVELOPE_PATH_ESCAPE');
    });

    it('refuses a real envelope the effect executor already consumed', async () => {
        const envelope = writeEnvelope(fixture);
        writeFileSync(`${envelope}.consumed`, '{}');
        expect(await run(envelope)).toBe('TASK_RUNTIME_ENVELOPE_CONSUMED');
    });

    it('refuses a real envelope whose bytes were edited after sealing', async () => {
        const envelope = writeEnvelope(fixture);
        const document = JSON.parse(readFileSync(envelope, 'utf8')) as Record<string, unknown>;
        chmodSync(envelope, 0o600);
        writeFileSync(envelope, JSON.stringify({...document, parameters: {reason: 'escalated'}}));
        expect(await run(envelope)).toBe('TASK_RUNTIME_ENVELOPE_CHECKSUM_MISMATCH');
    });

    it('leaves the lane unchanged when an envelope is refused', async () => {
        const envelope = writeEnvelope(fixture, {}, {mode: 0o644});
        const before = readFileSync(envelope, 'utf8');
        await run(envelope);
        expect(readFileSync(envelope, 'utf8')).toBe(before);
        expect(existsSync(`${envelope}.consumed`)).toBeFalse();
    });
});
