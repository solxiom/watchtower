import {LaneTaskRuntimeError} from '../../../src/contracts/taskRuntime.js';
import {LaneInstallIdentityReader, type LaneInstallIdentity} from '../../../src/foundation/read/index.js';
import {NirvanaLaneTaskRunner} from '../../../src/foundation/task/runtime/NirvanaLaneTaskRunner.js';
import type {NvbRunnerBinding} from '../../../src/foundation/task/runtime/packagedNvbRunner.js';
import type {RuntimeRootResolver, TaskRuntimePinSource}
    from '../../../src/foundation/task/runtime/LaneTaskRunner.js';
import type {JsonObject} from '../../../src/foundation/schemaComposition/schemaCompositionContracts.js';
import type {RuntimeProcessOutcome} from '../../../src/foundation/runtime/leaf/runtimeProcessPorts.js';
import type {FakeEntry} from './laneTaskRuntimeFixtures.js';
import {
    FakeProcessInvoker,
    RUNTIME_ROOT,
    catalogDocument,
    configDocument,
    fixedClock,
    pinDocument,
    stagedFileSystem
} from './laneTaskRuntimeFixtures.js';
import {runResultLine, runStartedLine} from './nvbStreamLines.js';

export const RUNNER: NvbRunnerBinding = {
    nodeExecutable: '/usr/bin/node',
    runnerScript: '/opt/wt/builder/bin/nvb.js'
};

class StubIdentityReader extends LaneInstallIdentityReader {
    constructor(private readonly identity: LaneInstallIdentity) {
        super();
    }

    read(): LaneInstallIdentity {
        return this.identity;
    }
}

export interface Harness {
    readonly runner: NirvanaLaneTaskRunner;
    readonly processes: FakeProcessInvoker;
}

export interface HarnessOptions {
    document?: JsonObject;
    config?: JsonObject;
    lines?: readonly string[];
    outcome?: Partial<RuntimeProcessOutcome>;
    pinOverrides?: Record<string, unknown>;
    installedVersion?: string;
    /** Extra staged filesystem entries, such as a prepared invocation envelope. */
    extra?: Record<string, FakeEntry>;
}

/** The production runner wired to in-memory bytes and one injected process seam. */
export function harness(options: HarnessOptions = {}): Harness {
    const document = options.document ?? catalogDocument();
    const processes = new FakeProcessInvoker(options.lines ?? [runStartedLine(), runResultLine()], options.outcome);
    const pins: TaskRuntimePinSource = {readTaskRuntime: () => pinDocument(document, options.pinOverrides ?? {})};
    const runtimeRoots: RuntimeRootResolver = {resolveRuntimeRoot: () => RUNTIME_ROOT};
    const identity = new StubIdentityReader({
        cliVersion: '1.0.0', runtimeVersion: options.installedVersion ?? '1.0.0', knowledgeVersion: '1.0.0'
    });
    const runner = new NirvanaLaneTaskRunner({
        runtimeRoots, pins, identity, processes, runner: RUNNER, now: fixedClock(),
        files: stagedFileSystem(document, options.extra ?? {}, options.config ?? configDocument())
    });
    return {runner, processes};
}

/** The stable reason of a refusal, or a describable non-refusal outcome. */
export async function reasonOf(action: () => Promise<unknown>): Promise<string> {
    try {
        await action();
    } catch (error) {
        return error instanceof LaneTaskRuntimeError ? error.reason : `unexpected:${String(error)}`;
    }
    return 'no-error';
}

/** The reason a started run failed with, or the outcome name when it did not fail. */
export async function failureReasonOf(run: Promise<{outcome: string; reason?: string}>): Promise<string> {
    const result = await run;
    return result.outcome === 'failed' ? result.reason ?? 'no-reason' : result.outcome;
}
