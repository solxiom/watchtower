import {Buffer} from 'node:buffer';
import {parseTmuxSessionNames} from './runtimeObservations.js';
import {TmuxSessionProcessRunner} from './TmuxSessionProcessRunner.js';

const TMUX_COMMAND = 'tmux';
const TMUX_ARGUMENTS = ['list-sessions', '-F', '#{session_name}'];
const MAX_OUTPUT_BYTES = 64 * 1024;
const DEFAULT_TIMEOUT_MS = 5_000;

export interface TmuxCommandRequest {
    readonly command: 'tmux';
    readonly args: readonly ['list-sessions', '-F', '#{session_name}'];
    readonly cwd: string;
    readonly environment: Readonly<Record<string, string>>;
    readonly timeoutMs: number;
    readonly maxOutputBytes: number;
}

/** Injectable, narrowly scoped command capability used only for session listing. */
export interface TmuxCommandPort {
    listSessions(request: TmuxCommandRequest): Promise<string>;
}

export interface NirvanaTmuxObserverOptions {
    readonly cwd: string;
    readonly path: string;
    readonly timeoutMs?: number;
    readonly commandPort?: TmuxCommandPort;
}

/** The sole read-only tmux execution adapter. It exposes no arbitrary argv or mutation operation. */
export class NirvanaTmuxObserver {
    private readonly timeoutMs: number;
    private readonly commandPort: TmuxCommandPort;

    constructor(private readonly options: NirvanaTmuxObserverOptions) {
        this.timeoutMs = validateTimeout(options.timeoutMs ?? DEFAULT_TIMEOUT_MS);
        this.commandPort = options.commandPort ?? new TmuxSessionProcessRunner();
    }

    async listSessionNames(): Promise<string[]> {
        const output = await this.commandPort.listSessions({
            command: TMUX_COMMAND,
            args: ['list-sessions', '-F', '#{session_name}'],
            cwd: this.options.cwd,
            environment: {PATH: this.options.path},
            timeoutMs: this.timeoutMs,
            maxOutputBytes: MAX_OUTPUT_BYTES
        });
        return parseTmuxSessionNames(assertBoundedOutput(output));
    }
}

function validateTimeout(value: number): number {
    if (!Number.isSafeInteger(value) || value <= 0) {
        throw new TypeError('Tmux observation timeout must be a positive integer.');
    }
    return value;
}

function assertBoundedOutput(output: string): string {
    if (Buffer.byteLength(output, 'utf8') > MAX_OUTPUT_BYTES) {
        throw new RangeError('Tmux session output exceeds the observation limit.');
    }
    return output;
}
