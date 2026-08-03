import {LeafRuntimeError, type LeafInvocation} from '../../src/contracts/leafRuntime.js';
import {LaneTaskCatalog} from '../../src/foundation/taskRuntime/LaneTaskCatalog.js';
import {LeafRuntimeInvoker} from '../../src/foundation/runtime/LeafRuntimeInvoker.js';
import type {JsonObject} from '../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import type {FakeEntry, FakeRuntimeFileSystem} from './support/laneTaskRuntimeFixtures.js';
import {
    ACTION_ID,
    CONTROL_HOME,
    FakeProcessInvoker,
    LANE_DIR,
    LEAF_DIGEST,
    LEAF_ID,
    LEAF_PATH,
    RUNTIME_ROOT,
    TASK_ID,
    catalogDocument,
    laneContext,
    leafEntry,
    pinFor,
    stagedFileSystem,
    taskEntry
} from './support/laneTaskRuntimeFixtures.js';

const OTHER_ACTION = 'runtime.other';
const OTHER_TASK = 'wt:runtime:other';

/** The owning task declares the leaf; a second cataloged action does not. */
function documentFor(mutationClass = 'read-only'): JsonObject {
    return catalogDocument({
        leaves: {[LEAF_ID]: leafEntry()},
        tasks: {
            [TASK_ID]: taskEntry({leafIds: [LEAF_ID], mutationClass}),
            [OTHER_TASK]: taskEntry()
        },
        actions: {[ACTION_ID]: {taskId: TASK_ID}, [OTHER_ACTION]: {taskId: OTHER_TASK}},
        profiles: {'implementation-v1': {taskIds: [TASK_ID, OTHER_TASK]}}
    });
}

const STAGED_LEAF: FakeEntry = {
    kind: 'file', mode: 0o555, executable: true, readable: true, digest: LEAF_DIGEST
};

interface Built {
    readonly invoker: LeafRuntimeInvoker;
    readonly processes: FakeProcessInvoker;
    readonly files: FakeRuntimeFileSystem;
}

function build(options: {
    leaf?: FakeEntry | 'absent';
    processes?: FakeProcessInvoker;
    mutationClass?: string;
    overlayWritable?: boolean;
} = {}): Built {
    const document = documentFor(options.mutationClass);
    const leaf = options.leaf ?? STAGED_LEAF;
    const files = stagedFileSystem(document, leaf === 'absent' ? {} : {[LEAF_PATH]: leaf});
    if (options.overlayWritable === false) {
        files.set(LANE_DIR, {kind: 'directory', readable: true, traversable: true, writable: false});
    }
    const processes = options.processes ?? new FakeProcessInvoker([]);
    const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, files);
    return {invoker: new LeafRuntimeInvoker({catalog, files, processes}), processes, files};
}

function request(overrides: Record<string, unknown> = {}): LeafInvocation {
    return {leafId: LEAF_ID, owningActionId: ACTION_ID, args: [], context: laneContext(), ...overrides} as LeafInvocation;
}

async function reasonOf(action: () => Promise<unknown>): Promise<string> {
    try {
        await action();
    } catch (error) {
        return error instanceof LeafRuntimeError ? error.reason : `unexpected:${String(error)}`;
    }
    return 'no-error';
}

describe('cataloged leaf invocation', () => {
    it('runs the manifest-declared executable with argv only, the control home cwd, and lane env', async () => {
        const {invoker, processes} = build();
        const result = await invoker.invoke(request({args: ['--once', 'demo']}));
        expect(result.outcome).toBe('completed');
        const sent = processes.lastRequest;
        expect(sent.executable).toBe(LEAF_PATH);
        expect(sent.args).toEqual(['--once', 'demo']);
        expect(sent.cwd).toBe(CONTROL_HOME);
        expect(Object.keys(sent.environment).sort()).toContain('WT_LANE_DIR');
        expect(sent.killSignal).toBe('SIGTERM');
    });

    it('refuses an unknown leaf, a missing leaf, and a non-executable leaf', async () => {
        expect(await reasonOf(() => build().invoker.invoke(request({leafId: 'absent.leaf'}))))
            .toBe('LEAF_NOT_DECLARED_BY_TASK');
        expect(await reasonOf(() => build({leaf: 'absent'}).invoker.invoke(request()))).toBe('LEAF_MISSING');
        expect(await reasonOf(() => build({leaf: {...STAGED_LEAF, executable: false, mode: 0o444}}).invoker
            .invoke(request()))).toBe('LEAF_NOT_EXECUTABLE');
    });

    it('refuses a leaf whose canonical target escapes the immutable runtime root', async () => {
        const escaping = {...STAGED_LEAF, canonicalPath: '/tmp/outside/coordinatorWatch.sh'};
        expect(await reasonOf(() => build({leaf: escaping}).invoker.invoke(request()))).toBe('LEAF_PATH_ESCAPE');
    });

    it('refuses leaf bytes that do not match the packaged manifest digest', async () => {
        expect(await reasonOf(() => build({leaf: {...STAGED_LEAF, digest: `sha256:${'b'.repeat(64)}`}}).invoker
            .invoke(request()))).toBe('LEAF_DIGEST_MISMATCH');
    });

    it('refuses non-string, oversized, control-character, and unbounded argument lists', async () => {
        const {invoker} = build();
        expect(await reasonOf(() => invoker.invoke(request({args: [1]})))).toBe('LEAF_ARGUMENT_INVALID');
        expect(await reasonOf(() => invoker.invoke(request({args: new Array(65).fill('x')}))))
            .toBe('LEAF_ARGUMENT_INVALID');
        expect(await reasonOf(() => invoker.invoke(request({args: 'string'})))).toBe('LEAF_ARGUMENT_INVALID');
    });

    it('never executes anything when a refusal happens', async () => {
        const processes = new FakeProcessInvoker([]);
        const {invoker} = build({leaf: {...STAGED_LEAF, digest: `sha256:${'c'.repeat(64)}`}, processes});
        await reasonOf(() => invoker.invoke(request()));
        expect(processes.requests.length).toBe(0);
    });

    it('preserves a non-zero exit status and a terminating signal', async () => {
        const failed = await build({processes: new FakeProcessInvoker([], {exitCode: 3, stderr: 'boom'})})
            .invoker.invoke(request());
        expect(failed).toEqual(jasmine.objectContaining({outcome: 'failed', exitCode: 3, signal: null}));
        const signalled = await build({processes: new FakeProcessInvoker([], {exitCode: null, signal: 'SIGKILL'})})
            .invoker.invoke(request());
        expect(signalled).toEqual(jasmine.objectContaining({outcome: 'failed', signal: 'SIGKILL'}));
    });

    it('reports cancellation and an unavailable executable distinctly', async () => {
        const cancelled = await build({
            processes: new FakeProcessInvoker([], {disposition: 'cancelled', exitCode: null, signal: 'SIGTERM'})
        }).invoker.invoke(request());
        expect(cancelled).toEqual(jasmine.objectContaining({outcome: 'cancelled', signal: 'SIGTERM'}));
        expect(await reasonOf(() => build({processes: new FakeProcessInvoker([], {disposition: 'unavailable'})})
            .invoker.invoke(request()))).toBe('LEAF_UNAVAILABLE');
    });
});

describe('cataloged leaf owning-task authority', () => {
    it('refuses a request that names no owning action', async () => {
        expect(await reasonOf(() => build().invoker.invoke(request({owningActionId: undefined}))))
            .toBe('LEAF_REQUEST_INVALID');
    });

    it('refuses an owning action the catalog does not allowlist', async () => {
        expect(await reasonOf(() => build().invoker.invoke(request({owningActionId: 'runtime.absent'}))))
            .toBe('LEAF_OWNING_ACTION_UNKNOWN');
    });

    it('refuses a leaf the owning task declares but the catalog does not define', async () => {
        const dangling = catalogDocument({tasks: {[TASK_ID]: taskEntry({leafIds: [LEAF_ID]})}, leaves: {}});
        const files = stagedFileSystem(dangling);
        const catalog = LaneTaskCatalog.open(pinFor(dangling), RUNTIME_ROOT, files);
        const invoker = new LeafRuntimeInvoker({catalog, files, processes: new FakeProcessInvoker([])});
        expect(await reasonOf(() => invoker.invoke(request()))).toBe('LEAF_UNKNOWN');
    });

    it('refuses a cataloged action whose task does not declare this leaf', async () => {
        const {invoker, processes} = build();
        expect(await reasonOf(() => invoker.invoke(request({owningActionId: OTHER_ACTION}))))
            .toBe('LEAF_NOT_DECLARED_BY_TASK');
        expect(processes.requests.length).toBe(0);
    });
});

describe('cataloged leaf mutation-class access fence', () => {
    it('runs a read-only leaf against a non-writable overlay', async () => {
        const result = await build({overlayWritable: false}).invoker.invoke(request());
        expect(result.outcome).toBe('completed');
    });

    it('refuses a lane-writing leaf when the effective account cannot write the overlay', async () => {
        const {invoker, processes} = build({mutationClass: 'journaled-mutation', overlayWritable: false});
        expect(await reasonOf(() => invoker.invoke(request()))).toBe('LEAF_ACCESS_DENIED');
        expect(processes.requests.length).toBe(0);
    });

    it('refuses a leaf owned by a runtime-writing task and a writable runtime root', async () => {
        expect(await reasonOf(() => build({mutationClass: 'managed-runtime-write'}).invoker.invoke(request())))
            .toBe('LEAF_ACCESS_DENIED');
        const writable = build();
        writable.files.set(RUNTIME_ROOT, {kind: 'directory', readable: true, traversable: true, writable: true});
        expect(await reasonOf(() => writable.invoker.invoke(request()))).toBe('LEAF_ACCESS_DENIED');
    });

    it('refuses a control home that is not an accessible directory', async () => {
        const built = build();
        built.files.remove(CONTROL_HOME);
        expect(await reasonOf(() => built.invoker.invoke(request()))).toBe('LEAF_WORKING_DIRECTORY_INVALID');
    });
});
