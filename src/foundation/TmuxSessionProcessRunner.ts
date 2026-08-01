import {spawn} from 'node:child_process';
import type {ChildProcess} from 'node:child_process';
import type {TmuxCommandPort, TmuxCommandRequest} from './NirvanaTmuxObserver.js';

const TERMINATION_GRACE_MS = 25;

/**
 * Compatibility leaf for the pinned Nirvana command-facade gap: `cmd.spawn`
 * exposes neither a cancellable child nor a live stdout byte limit. This runner
 * accepts only the closed tmux-list request minted by `NirvanaTmuxObserver`.
 */
export class TmuxSessionProcessRunner implements TmuxCommandPort {
    async listSessions(request: TmuxCommandRequest): Promise<string> {
        assertFixedTmuxListRequest(request);
        return new Promise<string>((resolve, reject) => {
            const child = spawn(request.command, [...request.args], {
                cwd: request.cwd,
                env: request.environment,
                shell: false,
                stdio: ['ignore', 'pipe', 'ignore']
            });
            const state = new ProcessState(child, request, resolve, reject);
            child.stdout.on('data', chunk => state.acceptOutput(toBuffer(chunk)));
            child.once('error', error => state.reject(error));
            child.once('close', code => state.complete(code));
        });
    }
}

class ProcessState {
    private readonly output: Buffer[] = [];
    private readonly timeout: NodeJS.Timeout;
    private outputBytes = 0;
    private settled = false;

    constructor(
        private readonly child: ChildProcess,
        private readonly request: TmuxCommandRequest,
        private readonly resolve: (value: string) => void,
        private readonly rejectPromise: (reason: Error) => void
    ) {
        this.timeout = setTimeout(() => this.reject(new Error('Tmux session observation timed out.')), request.timeoutMs);
    }

    acceptOutput(chunk: Buffer): void {
        if (this.settled) return;
        this.outputBytes += chunk.length;
        if (this.outputBytes > this.request.maxOutputBytes) {
            this.reject(new RangeError('Tmux session output exceeds the observation limit.'));
            return;
        }
        this.output.push(chunk);
    }

    complete(code: number | null): void {
        if (this.settled) return;
        if (code !== 0) {
            this.reject(new Error(`Tmux session observation exited with code ${code}.`));
            return;
        }
        this.settled = true;
        clearTimeout(this.timeout);
        this.resolve(Buffer.concat(this.output).toString('utf8'));
    }

    reject(error: Error): void {
        if (this.settled) return;
        this.settled = true;
        clearTimeout(this.timeout);
        terminate(this.child);
        this.rejectPromise(error);
    }
}

function terminate(child: ChildProcess): void {
    if (child.exitCode !== null || child.killed) return;
    child.kill('SIGTERM');
    setTimeout(() => {
        if (child.exitCode === null) child.kill('SIGKILL');
    }, TERMINATION_GRACE_MS).unref();
}

function toBuffer(chunk: string | Buffer): Buffer {
    return Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk);
}

function assertFixedTmuxListRequest(request: TmuxCommandRequest): void {
    if (request.command !== 'tmux'
        || request.args.length !== 3
        || request.args[0] !== 'list-sessions'
        || request.args[1] !== '-F'
        || request.args[2] !== '#{session_name}') {
        throw new TypeError('Tmux session runner accepts only the fixed list-sessions request.');
    }
}
