/**
 * The single injected process port used by the lane task runtime. Both the
 * pinned NVB target adapter and the cataloged leaf invoker depend on this port,
 * so argv construction, shell-mode prevention, environment allowlisting, and
 * exit/signal preservation have exactly one owner.
 */

/** An argv-only request; no member can carry a shell string or a command line. */
export interface RuntimeProcessRequest {
    /** Absolute executable path. Never a name resolved through `PATH`. */
    readonly executable: string;
    readonly args: readonly string[];
    readonly cwd: string;
    /** The complete child environment. Nothing is inherited from this process. */
    readonly environment: Readonly<Record<string, string>>;
    /** Cancellation source; when aborted the child receives `killSignal`. */
    readonly cancellation?: AbortSignal;
    /** Signal delivered on cancellation. */
    readonly killSignal: NodeJS.Signals;
    readonly onStdoutLine?: (line: string) => void;
}

export type RuntimeProcessDisposition = 'exited' | 'cancelled' | 'unavailable' | 'failed';

/**
 * The observed process outcome. `exitCode` and `signal` preserve what the child
 * reported; `disposition` classifies how the process ended so a caller never has
 * to infer cancellation from an exit code.
 */
export interface RuntimeProcessOutcome {
    readonly disposition: RuntimeProcessDisposition;
    readonly exitCode: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly stdout: string;
    readonly stderr: string;
}

export interface RuntimeProcessInvoker {
    invoke(request: RuntimeProcessRequest): Promise<RuntimeProcessOutcome>;
}
