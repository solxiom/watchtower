import {spawnSync} from 'node:child_process';
import {cpSync, existsSync, mkdtempSync, readFileSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join, resolve} from 'node:path';
import {fileURLToPath} from 'node:url';
import type {TuiPtyTuple} from '../../../src/contracts/tuiAccessibility.js';
import {environmentFor} from './ptyMatrixFixtures.js';
import {IsolatedSshUnavailableError, sshArgv, type IsolatedSshTarget} from './sshFixture.js';

/**
 * Runs the CA-23 lifecycle child under a real PTY. `script(1)` allocates the
 * terminal, so the captured stream contains the actual control sequences the
 * production port wrote; a detached `tmux` server supplies the multiplexed
 * invocation modes with their own `$TERM`. The `global-install` half of the
 * matrix runs against a relocated copy of the packaged `dist` tree, which
 * proves the same behaviour outside the source checkout.
 */
export interface PtyResult { readonly output: string; readonly exitCode: number | null; readonly marks: readonly string[]; }

const here = dirname(fileURLToPath(import.meta.url));
const repositoryRoot = resolve(here, '..', '..', '..', '..');
const childProgram = join(here, 'terminalLifecycleChild.js');

export function repositoryPath(...segments: readonly string[]): string { return join(repositoryRoot, ...segments); }

export function sourceRootFor(installPath: TuiPtyTuple['installPath'], relocatedRoot: string): string {
    return installPath === 'source' ? join(repositoryRoot, 'build', 'src') : join(relocatedRoot, 'src');
}

/** Copies the packaged distribution to a temporary location so the run is genuinely relocated. */
export function relocateDistribution(): string {
    const distribution = join(repositoryRoot, 'dist', 'src');
    if (!existsSync(distribution)) throw new Error(`nvb dist output is missing at ${distribution}`);
    const target = mkdtempSync(join(tmpdir(), 'wt-ca23-dist-'));
    cpSync(distribution, join(target, 'src'), {recursive: true});
    return target;
}

export function removeTemporary(root: string): void { rmSync(root, {recursive: true, force: true}); }

export function runUnderPty(scenario: string, tuple: TuiPtyTuple, sourceRoot: string, ssh: IsolatedSshTarget | null = null): PtyResult {
    const directory = mkdtempSync(join(tmpdir(), 'wt-ca23-pty-'));
    const transcript = join(directory, 'transcript');
    const command = `node ${quote(childProgram)} ${quote(scenario)} ${quote(sourceRoot)}; printf 'MARKEXIT:%s\\n' "$?"`;
    const environment = {...process.env, ...environmentFor(tuple), TMUX: undefined, WT_CA23_INVOCATION: tuple.invocation, WT_CA23_INSTALL: tuple.installPath};
    const remote = tuple.sshMode === 'direct';
    try {
        if (remote) runOverSsh(requireTarget(ssh, tuple), tuple, transcript, command);
        else if (tuple.invocation === 'tmux') runInsideTmux(directory, transcript, command, environment);
        else spawnSync('script', ['-qec', command, transcript], {encoding: 'utf8', timeout: 60000, env: environment});
        const output = existsSync(transcript) ? readFileSync(transcript, 'utf8') : '';
        const marks = [...output.matchAll(/MARK:([^\r\n]*)/gu)].map((match) => match[1]);
        const exit = [...output.matchAll(/MARKEXIT:(\d+)/gu)].at(-1)?.[1];
        return Object.freeze({output, exitCode: exit === undefined ? null : Number.parseInt(exit, 10), marks: Object.freeze(marks)});
    } finally {
        removeTemporary(directory);
    }
}

/**
 * Runs the scenario on the far side of a real SSH connection. `ssh -tt`
 * allocates a remote PTY, and the remote command sets the tuple's `$TERM` and
 * locale itself, because the client is not permitted to push environment. For
 * `ssh+tmux` the tmux client is attached to the SSH PTY, which is exactly the
 * "SSH inside tmux" tuple. There is no local fallback: a missing target throws.
 */
function runOverSsh(target: IsolatedSshTarget, tuple: TuiPtyTuple, transcript: string, command: string): void {
    const exported = `TERM=${tuple.termFamily} LANG=${tuple.locale} LC_ALL=${tuple.locale} WT_CA23_INVOCATION=${tuple.invocation} WT_CA23_INSTALL=${tuple.installPath}`;
    const inner = `script -qec ${quote(command)} ${quote(transcript)}`;
    const remoteCommand = tuple.invocation === 'ssh+tmux'
        ? `env ${exported} tmux -f /dev/null -S ${quote(`${transcript}.sock`)} new-session -x 140 -y 40 -- ${inner}`
        : `env ${exported} ${inner}`;
    const result = spawnSync('ssh', [...sshArgv(target, remoteCommand)], {encoding: 'utf8', timeout: 120000});
    if (result.error !== undefined) throw new IsolatedSshUnavailableError(`ssh client failed: ${result.error.message}`);
    if (!existsSync(transcript)) throw new IsolatedSshUnavailableError(`the remote session produced no transcript: ${result.stderr ?? ''}`);
}

function requireTarget(ssh: IsolatedSshTarget | null, tuple: TuiPtyTuple): IsolatedSshTarget {
    if (ssh === null) throw new IsolatedSshUnavailableError(`the ${tuple.invocation} tuple requires a real isolated SSH target`);
    return ssh;
}

function runInsideTmux(directory: string, transcript: string, command: string, environment: NodeJS.ProcessEnv): void {
    const socket = join(directory, 'tmux.sock');
    const tmux = (...args: readonly string[]): ReturnType<typeof spawnSync> => spawnSync('tmux', ['-S', socket, '-f', '/dev/null', ...args], {encoding: 'utf8', timeout: 60000, env: environment});
    tmux('new-session', '-d', '-x', '140', '-y', '40', 'script', '-qec', command, transcript);
    try {
        const deadline = Date.now() + 60000;
        while (Date.now() < deadline && tmux('has-session').status === 0) sleep(50);
    } finally {
        tmux('kill-server');
    }
}

function sleep(milliseconds: number): void { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds); }
function quote(value: string): string { return `'${value.replaceAll("'", `'\\''`)}'`; }
