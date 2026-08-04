/**
 * Side-effect-free construction of the exact process request for one pinned NVB
 * invocation. Nothing here touches the filesystem, the environment, or a clock:
 * given already-authorized inputs it returns the complete argv, working
 * directory, and environment that the process boundary will use, so a spec can
 * assert the pinned target without starting anything.
 *
 * The argv mirrors the pinned facade's own run contract
 * (`@nirvana/commons/foundation/extra/nvb/methods/runner/shared.js`
 * `buildRunCommandArgs`): task names first, then `--events-json --result-json
 * --cwd=<dir> --jsonfile=<config> --jsfile=<module>`, with `--series` forcing
 * deterministic ordering rather than the facade's default parallel policy.
 *
 * Both pinned targets are forwarded. The accepted target contract names both a
 * `configTarget` and a `moduleTarget` and the pinned commons facade forwards
 * both (`nirvana-integration-architecture.md` §4.5:
 * `nvb.target(root, {configFile, jsFile})`), so this adapter must not silently
 * invoke only one half of the pinned target. `--cwd` is the lane **control
 * home** (`context.workspace`), never the `.watchtower` overlay.
 *
 * PREDECESSOR/SPEC DEPENDENCY (routed, not worked around): the currently
 * packaged `runtime-nvb.js` exports a module descriptor rather than NVB task
 * definitions, so the pinned NVB rejects it as a `--jsfile` at registration.
 * That accepted packaged-module artifact defect is owned by the predecessor
 * (RT-09 aggregate / RT-03 dist / RT-10 module), not RT-05, and is recorded in
 * the correction report. RT-05 forwards exactly the pinned resolved targets and
 * fails closed until the predecessor emits a loadable module; it does not weaken
 * the target to preserve a green path.
 */
import type {PinnedTaskRuntimeTarget} from '../../contracts/taskRuntime.js';
import type {RuntimeProcessRequest} from '../runtime/leaf/runtimeProcessPorts.js';
import type {NvbRunnerBinding} from './packagedNvbRunner.js';

const ENVELOPE_FLAG = '--wt-invocation-envelope';
const CANCELLATION_SIGNAL: NodeJS.Signals = 'SIGTERM';

export interface LaneTaskPlanInput {
    readonly runner: NvbRunnerBinding;
    readonly target: PinnedTaskRuntimeTarget;
    readonly taskId: string;
    readonly workingDirectory: string;
    readonly environment: Readonly<Record<string, string>>;
    /** Pre-encoded `--wt-task-request=<token>` argument for the typed request. */
    readonly requestArgument: string;
    readonly invocationEnvelope: string | undefined;
    readonly cancellation: AbortSignal | undefined;
    readonly onStdoutLine: (line: string) => void;
}

/** Build the complete, argv-only process request for one pinned invocation. */
export function planLaneTaskInvocation(input: LaneTaskPlanInput): RuntimeProcessRequest {
    return {
        executable: input.runner.nodeExecutable,
        args: [
            input.runner.runnerScript,
            input.taskId,
            '--events-json',
            '--result-json',
            `--cwd=${input.workingDirectory}`,
            `--jsonfile=${input.target.configTarget}`,
            `--jsfile=${input.target.moduleTarget}`,
            '--series',
            input.requestArgument,
            ...envelopeArgument(input.invocationEnvelope)
        ],
        cwd: input.workingDirectory,
        environment: input.environment,
        cancellation: input.cancellation,
        killSignal: CANCELLATION_SIGNAL,
        onStdoutLine: input.onStdoutLine
    };
}

/** The signal a cancelled invocation delivers to the pinned runner. */
export function cancellationSignal(): NodeJS.Signals {
    return CANCELLATION_SIGNAL;
}

/** The validated envelope path travels as one argv token (§7), never as syntax. */
function envelopeArgument(canonicalPath: string | undefined): readonly string[] {
    return canonicalPath === undefined ? [] : [`${ENVELOPE_FLAG}=${canonicalPath}`];
}
