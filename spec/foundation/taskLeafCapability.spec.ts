/**
 * Leaf authority is task-bound and non-forgeable (Correction 04 finding 2).
 *
 * The question this suite answers is not "does the invoker check the action?" —
 * it is "can anything that is not the executing TaskHandler reach a leaf at
 * all?". So the adversary here is a normal application service holding the
 * correct action ID, the correct leaf ID, a valid catalog, and a working process
 * invoker, and it still must not obtain the capability.
 */
import {LeafRuntimeError, type TaskLeafCapability} from '../../src/contracts/leafRuntime.js';
import {LaneTaskCatalog} from '../../src/foundation/taskRuntime/LaneTaskCatalog.js';
// The internal, argv-injectable core — imported directly (not through any
// public barrel) so this suite can exercise every argv shape. The exported
// `grantExecutingTaskLeafCapability` (Correction 05 finding 1) takes no `argv`
// field; its own non-forgeability is proved in the second describe block below
// via the real public barrel with no override at all.
import {grantTaskLeafCapabilityFromArgv} from '../../src/foundation/runtime/taskLeafCapability.js';
import {grantExecutingTaskLeafCapability} from '../../src/foundation/runtime/index.js';
import type {JsonObject} from '../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import {
    ACTION_ID,
    CONFIG_TARGET,
    CONTROL_HOME,
    FakeProcessInvoker,
    LANE_DIR,
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
const OTHER_LEAF = 'runtime.other-leaf';
const OTHER_LEAF_PATH = `${RUNTIME_ROOT}/runtime-nvb/leaves/otherLeaf.sh`;

/** The argv the pinned runner is started with for one packaged task run. */
function packagedArgv(taskId = TASK_ID, configTarget = CONFIG_TARGET): readonly string[] {
    return [
        '/usr/bin/node', '/opt/wt/builder/bin/nvb.js', taskId, '--events-json', '--result-json',
        `--cwd=${CONTROL_HOME}`, `--jsonfile=${configTarget}`, '--jsfile=/x/runtime-nvb.js', '--series'
    ];
}

/** Two cataloged tasks, each owning a different leaf. */
function documentFor(mutationClass = 'read-only'): JsonObject {
    return catalogDocument({
        leaves: {
            [LEAF_ID]: leafEntry(),
            [OTHER_LEAF]: {executable: true, mode: '0555', path: './leaves/otherLeaf.sh',
                sha256: `sha256:${'a'.repeat(64)}`}
        },
        tasks: {
            [TASK_ID]: taskEntry({leafIds: [LEAF_ID], mutationClass}),
            [OTHER_TASK]: taskEntry({leafIds: [OTHER_LEAF]})
        },
        actions: {[ACTION_ID]: {taskId: TASK_ID}, [OTHER_ACTION]: {taskId: OTHER_TASK}},
        profiles: {'implementation-v1': {taskIds: [TASK_ID, OTHER_TASK]}}
    });
}

function build(options: {argv?: readonly string[]; mutationClass?: string; overlayWritable?: boolean} = {}): {
    grant: () => TaskLeafCapability;
    processes: FakeProcessInvoker;
} {
    const document = documentFor(options.mutationClass);
    const staged = {kind: 'file' as const, mode: 0o555, executable: true, readable: true,
        digest: `sha256:${'a'.repeat(64)}`};
    const files = stagedFileSystem(document, {[LEAF_PATH]: staged, [OTHER_LEAF_PATH]: staged});
    if (options.overlayWritable === false) {
        files.set(LANE_DIR, {kind: 'directory', readable: true, traversable: true, writable: false});
    }
    const processes = new FakeProcessInvoker([]);
    const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, files);
    return {
        grant: () => grantTaskLeafCapabilityFromArgv({
            catalog, files, processes, argv: options.argv ?? packagedArgv()
        }),
        processes
    };
}

function reasonOfSync(action: () => unknown): string {
    try {
        action();
    } catch (error) {
        return error instanceof LeafRuntimeError ? error.reason : `unexpected:${String(error)}`;
    }
    return 'no-error';
}

async function reasonOf(action: () => Promise<unknown>): Promise<string> {
    try {
        await action();
    } catch (error) {
        return error instanceof LeafRuntimeError ? error.reason : `unexpected:${String(error)}`;
    }
    return 'no-error';
}

describe('leaf authority cannot be constructed outside a packaged task run', () => {
    it('refuses an application service that holds the correct action and leaf identifiers', () => {
        // The argv of an ordinary `wt` process: no task name, no pinned target.
        const argv = ['/usr/bin/node', '/opt/wt/bin/wt.js', 'lane', 'status', `--action=${ACTION_ID}`];
        expect(reasonOfSync(() => build({argv}).grant())).toBe('LEAF_TASK_AUTHORITY_INVALID');
    });

    it('refuses a forged argv whose pinned config is not inside the immutable runtime root', () => {
        const forged = packagedArgv(TASK_ID, '/tmp/attacker/runtime-nvb.json');
        expect(reasonOfSync(() => build({argv: forged}).grant())).toBe('LEAF_TASK_AUTHORITY_INVALID');
    });

    it('refuses a syntactically valid task name the catalog does not allowlist', () => {
        expect(reasonOfSync(() => build({argv: packagedArgv('wt:runtime:absent')}).grant()))
            .toBe('LEAF_TASK_AUTHORITY_INVALID');
    });

    it('never starts a process while authority is being decided', () => {
        const built = build({argv: ['/usr/bin/node', '/opt/wt/bin/wt.js']});
        reasonOfSync(() => built.grant());
        expect(built.processes.requests.length).toBe(0);
    });
});

/**
 * Correction 05 finding 1: the previous regression only ever called the
 * internal, argv-injectable core. It never proved that the exported,
 * application-service-facing `grantExecutingTaskLeafCapability` itself resists
 * forgery, because that function no longer accepts an `argv` override at all.
 * This suite calls the *real* public function through the *real* public
 * barrel, with a syntactically valid task ID and a real in-root config path —
 * both public information an ordinary caller could read off the catalog and
 * the filesystem — and proves it is still refused, because authority comes
 * from this process's own real `process.argv` (the Jasmine test runner's own
 * argv), which no caller can substitute.
 */
describe('the exported grant function cannot be forged by a non-handler caller', () => {
    it('refuses even a caller that knows a real task id and a real in-root config path', () => {
        const document = documentFor();
        const staged = {kind: 'file' as const, mode: 0o555, executable: true, readable: true,
            digest: `sha256:${'a'.repeat(64)}`};
        const files = stagedFileSystem(document, {[LEAF_PATH]: staged, [OTHER_LEAF_PATH]: staged});
        const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, files);
        // No `argv` field exists on this call: an application service running as
        // this real test process has no way to claim it is a pinned NVB child,
        // regardless of how much it knows about the catalog's real shape.
        expect(reasonOfSync(() => grantExecutingTaskLeafCapability({catalog, files})))
            .toBe('LEAF_TASK_AUTHORITY_INVALID');
    });

    it('rejects an argv override at compile time, and ignores it at runtime if bypassed', () => {
        const document = documentFor();
        const files = stagedFileSystem(document, {});
        const catalog = LaneTaskCatalog.open(pinFor(document), RUNTIME_ROOT, files);
        // @ts-expect-error `argv` is not a member of the public grant options: a
        // caller cannot pass it without bypassing TypeScript entirely. Even then,
        // the public function always overwrites it with the real process.argv
        // (this test runner's own), so the forged value has no runtime effect
        // either — it refuses for the same reason as the test above.
        expect(reasonOfSync(() => grantExecutingTaskLeafCapability({catalog, files, argv: packagedArgv()})))
            .toBe('LEAF_TASK_AUTHORITY_INVALID');
    });
});

describe('the raw leaf boundary is not reachable through any public barrel', () => {
    it('exports no leaf invoker, process port, or runner escape hatch', async () => {
        const forbidden = [
            'LeafRuntimeInvoker', 'NirvanaProcessInvoker', 'RuntimeProcessRequest',
            'resolvePackagedNvbRunner', 'planLaneTaskInvocation', 'grantTaskLeafCapabilityFromArgv'
        ];
        for (const barrel of ['../../src/foundation/index.js', '../../src/index.js']) {
            const exported = Object.keys(await import(barrel) as Record<string, unknown>);
            for (const name of forbidden) {
                expect({barrel, name, exported: exported.includes(name)})
                    .toEqual({barrel, name, exported: false});
            }
        }
    });

    it('exposes only the task-scoped grant from the runtime capsule', async () => {
        const capsule = Object.keys(await import('../../src/foundation/runtime/index.js'));
        expect(capsule).toEqual(['grantExecutingTaskLeafCapability']);
    });
});

describe('a granted capability reaches only the leaves its own task declares', () => {
    it('binds the capability to the executing task and its declared leaves', () => {
        const capability = build().grant();
        expect(capability.taskId).toBe(TASK_ID);
        expect(capability.leafIds).toEqual([LEAF_ID]);
    });

    it('invokes the leaf its task declares, with argv only and the control-home cwd', async () => {
        const built = build();
        const result = await built.grant().invoke({leafId: LEAF_ID, args: ['--once'], context: laneContext()});
        expect(result.outcome).toBe('completed');
        expect(built.processes.lastRequest.executable).toBe(LEAF_PATH);
        expect(built.processes.lastRequest.args).toEqual(['--once']);
        expect(built.processes.lastRequest.cwd).toBe(CONTROL_HOME);
    });

    it('refuses another cataloged task\'s leaf even though the leaf itself is valid', async () => {
        const built = build();
        expect(await reasonOf(() => built.grant().invoke({
            leafId: OTHER_LEAF, args: [], context: laneContext()
        }))).toBe('LEAF_NOT_DECLARED_BY_TASK');
        expect(built.processes.requests.length).toBe(0);
    });

    it('keeps the owning task\'s mutation-class write fence', async () => {
        const built = build({mutationClass: 'journaled-mutation', overlayWritable: false});
        expect(await reasonOf(() => built.grant().invoke({leafId: LEAF_ID, args: [], context: laneContext()})))
            .toBe('LEAF_ACCESS_DENIED');
        expect(built.processes.requests.length).toBe(0);
    });
});
