/**
 * The one narrow Nirvana `cmd` adapter behind the lane task runtime.
 *
 * `NIRVANA_API_GAP` (proven against the pinned `@nirvana/commons@1.0.0`):
 * `contracts/extra/nvb/types.d.ts` declares `NvbRunOptions` as
 * `{tasks, cwd, logFile, runPolicy, args, onEvent}`. It exposes no environment
 * allowlist, no stdio selection, and no cancellation handle, and
 * `foundation/extra/nvb/methods/runner/runImpl.js` calls
 * `cmd.spawn({..., options: {cwd}})`, so a run started through the facade
 * inherits this process's complete environment. `methods/shared/nvbCommandResolver.js`
 * additionally resolves the `nvb` executable from `<cwd>/node_modules/.bin` and
 * finally from `PATH`, which is exactly the ambient fallback a lane-pinned
 * target must not have. `nirvana-integration-architecture.md` §4.5 authorizes
 * option 2 for that gap: one narrow adapter over Nirvana `cmd` that invokes the
 * same pinned NVB target with explicit argv, environment, stdio, cancellation,
 * and result parsing. This module is that adapter and the only place in
 * Watchtower's lane runtime that starts a process.
 *
 * `cmd.spawn` forwards its `options` to the platform spawn, so `env` with
 * `autoInheritEnv: false` / `autoInheritEnvPath: false` yields an exact
 * environment, `shell: false` prevents command-string interpretation, and
 * `signal`/`killSignal` deliver cancellation. Its `onExit` callback preserves
 * the child's exit code and terminating signal.
 *
 * Residual gap, recorded rather than worked around: `cmd.spawn` subscribes to
 * `child.stdout`/`child.stderr` unconditionally, so an inherited or PTY stdio
 * mode is unavailable through the pinned facade. This adapter therefore offers
 * captured stdio only; interactive stdio is outside this boundary.
 */
import {cmd} from '@nirvana/base/terminal';
import type {
    RuntimeProcessInvoker,
    RuntimeProcessOutcome,
    RuntimeProcessRequest
} from './runtimeProcessPorts.js';

const MAX_DIAGNOSTIC_BYTES = 64 * 1024;

interface ExitObservation {
    code: number | null;
    signal: NodeJS.Signals | null;
    stdout: string;
    stderr: string;
}

export class NirvanaProcessInvoker implements RuntimeProcessInvoker {
    async invoke(request: RuntimeProcessRequest): Promise<RuntimeProcessOutcome> {
        const lines = new LineAssembler(request.onStdoutLine);
        let exit: ExitObservation | undefined;
        let failure: unknown;
        try {
            await cmd.spawn({
                command: request.executable,
                args: [...request.args],
                options: {
                    cwd: request.cwd,
                    env: {...request.environment},
                    autoInheritEnv: false,
                    autoInheritEnvPath: false,
                    shell: false,
                    signal: request.cancellation,
                    killSignal: request.killSignal
                },
                onData: (data: unknown) => lines.accept(String(data)),
                onExit: (info: ExitObservation) => {
                    exit = info;
                },
                rejectOnStderr: false
            });
        } catch (error: unknown) {
            failure = error;
        }
        lines.flush();
        return this.classify(request, exit, failure);
    }

    private classify(
        request: RuntimeProcessRequest,
        exit: ExitObservation | undefined,
        failure: unknown
    ): RuntimeProcessOutcome {
        const stdout = bounded(exit?.stdout ?? '');
        const stderr = bounded(exit?.stderr ?? '');
        if (request.cancellation?.aborted === true || isAbort(failure)) {
            return {disposition: 'cancelled', exitCode: null, signal: request.killSignal, stdout, stderr};
        }
        if (isUnavailable(failure)) {
            return {disposition: 'unavailable', exitCode: null, signal: null, stdout, stderr};
        }
        if (exit === undefined) {
            return {disposition: 'failed', exitCode: null, signal: null, stdout, stderr};
        }
        return {
            disposition: exit.signal === null && exit.code === null ? 'failed' : 'exited',
            exitCode: exit.code,
            signal: exit.signal,
            stdout,
            stderr
        };
    }
}

/** Splits streamed stdout into complete lines without retaining unbounded state. */
class LineAssembler {
    private remainder = '';

    constructor(private readonly onLine: ((line: string) => void) | undefined) {}

    accept(chunk: string): void {
        if (this.onLine === undefined) return;
        const parts = (this.remainder + chunk).split('\n');
        this.remainder = parts.pop() ?? '';
        for (const part of parts) {
            const line = part.trim();
            if (line.length > 0) this.onLine(line);
        }
    }

    flush(): void {
        const line = this.remainder.trim();
        this.remainder = '';
        if (this.onLine !== undefined && line.length > 0) this.onLine(line);
    }
}

function bounded(value: string): string {
    return value.length > MAX_DIAGNOSTIC_BYTES ? value.slice(0, MAX_DIAGNOSTIC_BYTES) : value;
}

function errorCode(error: unknown): string | number | undefined {
    return typeof error === 'object' && error !== null && 'code' in error
        ? (error as {code?: string | number}).code
        : undefined;
}

function isAbort(error: unknown): boolean {
    return errorCode(error) === 'ABORT_ERR'
        || (error instanceof Error && error.name === 'AbortError');
}

function isUnavailable(error: unknown): boolean {
    const code = errorCode(error);
    return code === 'ENOENT' || code === 'EACCES' || code === 'EPERM';
}
