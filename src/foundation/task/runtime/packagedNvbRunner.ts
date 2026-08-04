/**
 * Resolves the pinned NVB runner executable from the installed Watchtower
 * dependency closure.
 *
 * The pinned facade resolves `nvb` from `<cwd>/node_modules/.bin` and finally
 * from `PATH` (`@nirvana/commons/foundation/extra/nvb/methods/shared/nvbCommandResolver.js`).
 * A lane must never execute whichever `nvb` happens to sit beside its working
 * directory or on an operator's `PATH`, so this module resolves the runner
 * through Node module resolution anchored at Watchtower's own module identity.
 * That follows the package wherever it is installed or relocated and has no
 * source-tree or ambient-configuration fallback.
 */
import {createRequire} from 'node:module';
import {dirname, join} from 'node:path';
import {LaneTaskRuntimeError} from '../../../contracts/taskRuntime.js';
import type {RuntimeFileSystem} from './runtimeFileSystem.js';

const BUILDER_PACKAGE = '@nirvana/builder';
const RUNNER_SCRIPT = join('bin', 'nvb.js');

/** The exact executable pair used to start a pinned NVB target. */
export interface NvbRunnerBinding {
    /** Absolute Node executable running this process. */
    readonly nodeExecutable: string;
    /** Absolute NVB runner script inside the installed closure. */
    readonly runnerScript: string;
}

export type BuilderEntryResolver = () => string;

/** Resolve the packaged runner, or refuse when the closure cannot provide it. */
export function resolvePackagedNvbRunner(
    files: RuntimeFileSystem,
    nodeExecutable: string,
    resolveBuilderEntry: BuilderEntryResolver = defaultBuilderEntry
): NvbRunnerBinding {
    let entry: string;
    try {
        entry = resolveBuilderEntry();
    } catch {
        throw unavailable(BUILDER_PACKAGE, 'The installed dependency closure does not provide the NVB runner package.');
    }
    const runnerScript = join(dirname(entry), RUNNER_SCRIPT);
    if (files.observe(runnerScript).kind !== 'file') {
        throw unavailable(RUNNER_SCRIPT, 'The installed NVB runner script is missing from the dependency closure.');
    }
    if (files.observe(nodeExecutable).kind !== 'file') {
        throw unavailable('node', 'The Node executable running this process cannot be resolved.');
    }
    return {nodeExecutable, runnerScript};
}

function defaultBuilderEntry(): string {
    return createRequire(import.meta.url).resolve(BUILDER_PACKAGE);
}

function unavailable(subject: string, message: string): LaneTaskRuntimeError {
    return new LaneTaskRuntimeError('TASK_RUNTIME_RUNNER_UNAVAILABLE', subject, message);
}
