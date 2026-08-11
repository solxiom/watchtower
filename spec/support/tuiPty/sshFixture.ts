import {spawnSync} from 'node:child_process';
import {existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

/**
 * A genuinely isolated SSH target for the CA-23 conformance matrix.
 *
 * The required `ssh` and `ssh+tmux` tuples are only real evidence if a remote
 * process is started through an actual SSH client over an actual remote PTY.
 * Setting `SSH_*` environment variables locally proves nothing, so this fixture
 * runs an unprivileged `sshd` bound to loopback with its own host key, its own
 * client key, its own `authorized_keys`, and its own `known_hosts`, all inside
 * one temporary directory. It never reads or writes the operator's `~/.ssh`,
 * never uses agent or password authentication, and is torn down with the suite.
 *
 * If the target cannot be created the fixture throws: the SSH tuples then fail
 * closed rather than silently degrading to a local run.
 */
export interface IsolatedSshTarget {
    readonly host: string; readonly port: number; readonly user: string;
    readonly identity: string; readonly knownHosts: string; readonly directory: string;
}

export class IsolatedSshUnavailableError extends Error {
    constructor(detail: string) { super(`isolated sshd unavailable: ${detail}`); this.name = 'IsolatedSshUnavailableError'; }
}

const SSHD = '/usr/sbin/sshd';

export function startIsolatedSshd(): IsolatedSshTarget {
    if (!existsSync(SSHD)) throw new IsolatedSshUnavailableError(`${SSHD} is not installed`);
    const directory = mkdtempSync(join(tmpdir(), 'wt-ca23-sshd-'));
    const target = {
        host: '127.0.0.1', port: 0, user: currentUser(), directory,
        identity: join(directory, 'client_key'), knownHosts: join(directory, 'known_hosts')
    };
    keygen(join(directory, 'host_key'));
    keygen(target.identity);
    writeFileSync(join(directory, 'authorized_keys'), readFileSync(`${target.identity}.pub`, 'utf8'), {mode: 0o600});
    for (const port of candidatePorts()) {
        const attempt = {...target, port};
        if (launch(attempt)) return Object.freeze(attempt);
    }
    rmSync(directory, {recursive: true, force: true});
    throw new IsolatedSshUnavailableError('no loopback port accepted an unprivileged sshd');
}

export function stopIsolatedSshd(target: IsolatedSshTarget): void {
    const pidFile = join(target.directory, 'sshd.pid');
    if (existsSync(pidFile)) {
        const pid = Number.parseInt(readFileSync(pidFile, 'utf8').trim(), 10);
        if (Number.isInteger(pid) && pid > 0) { try { process.kill(pid, 'SIGTERM'); } catch { /* already exited */ } }
    }
    rmSync(target.directory, {recursive: true, force: true});
}

/** Explicit argv for one remote command: no shell string is handed to the local side. */
export function sshArgv(target: IsolatedSshTarget, remoteCommand: string): readonly string[] {
    return Object.freeze([
        '-tt', '-p', String(target.port), '-i', target.identity,
        '-o', 'BatchMode=yes', '-o', 'IdentitiesOnly=yes', '-o', 'StrictHostKeyChecking=no',
        '-o', `UserKnownHostsFile=${target.knownHosts}`, '-o', 'PreferredAuthentications=publickey',
        `${target.user}@${target.host}`, remoteCommand
    ]);
}

function launch(target: IsolatedSshTarget): boolean {
    const config = join(target.directory, 'sshd_config');
    writeFileSync(config, [
        `Port ${target.port}`, `ListenAddress ${target.host}`, `HostKey ${join(target.directory, 'host_key')}`,
        `AuthorizedKeysFile ${join(target.directory, 'authorized_keys')}`, `PidFile ${join(target.directory, 'sshd.pid')}`,
        'StrictModes no', 'UsePAM no', 'PasswordAuthentication no', 'KbdInteractiveAuthentication no',
        'PubkeyAuthentication yes', 'PermitUserEnvironment no', 'X11Forwarding no', 'PrintMotd no', 'LogLevel VERBOSE', ''
    ].join('\n'));
    const started = spawnSync(SSHD, ['-f', config, '-E', join(target.directory, 'sshd.log')], {encoding: 'utf8', timeout: 30000});
    if (started.status !== 0) return false;
    for (let attempt = 0; attempt < 40; attempt += 1) {
        const probe = spawnSync('ssh', [...sshArgv(target, 'printf CA23_SSH_READY')], {encoding: 'utf8', timeout: 30000});
        if (`${probe.stdout ?? ''}`.includes('CA23_SSH_READY')) return true;
        sleep(100);
    }
    return false;
}

function keygen(path: string): void {
    const result = spawnSync('ssh-keygen', ['-q', '-t', 'ed25519', '-N', '', '-C', 'wt-ca23-fixture', '-f', path], {encoding: 'utf8', timeout: 30000});
    if (result.status !== 0) throw new IsolatedSshUnavailableError(`ssh-keygen failed: ${result.stderr ?? ''}`);
}

function currentUser(): string {
    const result = spawnSync('id', ['-un'], {encoding: 'utf8', timeout: 10000});
    const user = `${result.stdout ?? ''}`.trim();
    if (user === '') throw new IsolatedSshUnavailableError('the current user could not be resolved');
    return user;
}

/** Deterministic per-process candidates so parallel checkouts do not collide. */
function candidatePorts(): readonly number[] {
    const base = 20000 + (process.pid % 8000);
    return Object.freeze([base, base + 101, base + 211, base + 331, base + 457]);
}

function sleep(milliseconds: number): void { Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, milliseconds); }
