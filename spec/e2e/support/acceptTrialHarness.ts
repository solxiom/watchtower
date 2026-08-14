/**
 * REL-01 release-trial harness: one freshly installed `wt` package, shared by
 * every acceptance phase in `spec/e2e/`.
 *
 * The binary under test is the one an operator gets. It is built by the
 * accepted RT-08 closure harness from the packaged `dist/` tree
 * (`installedPrefixFixture`), installed into a throwaway prefix, and executed
 * as a child process with an isolated `WATCHTOWER_DATA_HOME`. No source-tree
 * module participates in any assertion, and no lane directory is ever
 * hand-built — every lane exists only because the installed `wt init` created
 * it.
 *
 * `NIRVANA_API_GAP`: driving an installed executable and observing its exit
 * status, signal disposition, and wall-clock attachment has no pinned Nirvana
 * command API — `cmd.execSync` neither returns a signal disposition nor
 * supports the non-exiting foreground case the watch proof needs. The
 * `node:child_process` use is confined to this one test-only module, matching
 * the narrow adapter the batch brief permits and the precedent already
 * accepted in `spec/integration/`.
 */
import {spawnSync} from 'node:child_process';
import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {
    installFreshPrefix, removeInstalledPrefix, type InstalledPrefix
} from '../../integration/support/installedPrefixFixture.js';

const DIST_RUNTIME = join(process.cwd(), 'dist', 'runtime-nvb');
export const RUN_TIMEOUT = 120_000;
export const INSTALL_TIMEOUT = 600_000;

export interface CliRun {
    readonly status: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly stdout: string;
    readonly stderr: string;
    /** Wall-clock duration, so a command that must not exit can be proven not to. */
    readonly ms: number;
}

/** The decoded `--json` envelope every REL-01 assertion reads. */
export interface Envelope {
    readonly ok: boolean;
    readonly code: string;
    readonly exitCode: number | null;
    readonly data: Record<string, unknown>;
}

let installed: InstalledPrefix | null = null;
let installFailure = '';
let preparing: Promise<void> | null = null;

/**
 * `nvb dist` is a precondition: the installed package is packed from `dist/`.
 * A build-only run reports this as pending rather than a false failure.
 */
export function requireDist(): boolean {
    if (existsSync(join(DIST_RUNTIME, 'task-catalog.json'))) return true;
    it('requires nvb dist output at dist/runtime-nvb/', () => {
        pending('Run `nvb dist` before this proof; dist/runtime-nvb is absent during build-only test runs.');
    });
    return false;
}

/**
 * Install once for the whole `spec/e2e/` run and tear down at process exit.
 *
 * Per-suite teardown is deliberately not offered: Jasmine runs every spec file
 * in one process in random order, so a suite that removed the shared prefix in
 * its own `afterAll` would break whichever suite happened to run next — which
 * is exactly the `PACK_FAILED` cascade this harness is written to avoid.
 */
export async function prepareInstall(): Promise<void> {
    preparing ??= (async () => {
        const outcome = await installFreshPrefix(process.cwd());
        if (!outcome.ok || outcome.installed === undefined) {
            installFailure = outcome.reason ?? 'install failed';
            return;
        }
        installed = outcome.installed;
        process.once('exit', () => {
            if (installed === null) return;
            try {
                removeInstalledPrefix(installed);
            } catch {
                // A failed teardown of a throwaway prefix must never mask a result.
            }
            installed = null;
        });
    })();
    return preparing;
}

export function installedPrefix(): InstalledPrefix {
    if (installed === null) throw new Error(`installed prefix unavailable: ${installFailure}`);
    return installed;
}

export function installFailureReason(): string {
    return installFailure;
}

/**
 * Run the installed `wt` with only the fixture's data home and a minimal tool
 * `PATH`, so nothing resolves back into this checkout.
 */
export function wt(
    controlHome: string, dataHome: string, args: readonly string[], timeout = RUN_TIMEOUT
): CliRun {
    const started = Date.now();
    const result = spawnSync(join(installedPrefix().prefix, 'bin', 'wt'), [...args], {
        cwd: controlHome, encoding: 'utf8', timeout, killSignal: 'SIGINT',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {PATH: `${dirname(process.execPath)}:/usr/bin:/bin`, HOME: controlHome, WATCHTOWER_DATA_HOME: dataHome}
    });
    return {
        status: result.status, signal: result.signal,
        stdout: result.stdout ?? '', stderr: result.stderr ?? '', ms: Date.now() - started
    };
}

/**
 * Run the installed `wt` under a real controlling terminal.
 *
 * `wt coordinator session`/`attach` enforce the accepted v1 §4
 * `SESSION_COMMAND_TERMINAL_REQUIRED` fence, which no piped-stdio harness can
 * satisfy. `script -qec` allocates a genuine PTY, so the operator-session
 * lifecycle is exercised through the same interface an operator has instead of
 * being recorded as unexecutable. The fence is still proven — `wt()` above
 * drives the refusal path.
 *
 * `NIRVANA_API_GAP`: no pinned Nirvana command API allocates a controlling
 * terminal for a child process. This stays inside the one narrow test-only
 * adapter this module already owns.
 */
export function wtPty(
    controlHome: string, dataHome: string, args: readonly string[], timeout = RUN_TIMEOUT
): CliRun {
    const started = Date.now();
    const command = [join(installedPrefix().prefix, 'bin', 'wt'), ...args].map(shellQuote).join(' ');
    const result = spawnSync('script', ['-qec', command, '/dev/null'], {
        cwd: controlHome, encoding: 'utf8', timeout, killSignal: 'SIGINT',
        stdio: ['ignore', 'pipe', 'pipe'],
        env: {
            PATH: `${dirname(process.execPath)}:/usr/bin:/bin`, HOME: controlHome,
            WATCHTOWER_DATA_HOME: dataHome, TERM: 'xterm-256color'
        }
    });
    return {
        status: result.status, signal: result.signal,
        stdout: result.stdout ?? '', stderr: result.stderr ?? '', ms: Date.now() - started
    };
}

/** Single-quote for `sh -c`, so fixture paths and question text cannot inject. */
function shellQuote(value: string): string {
    return `'${value.split("'").join(`'\\''`)}'`;
}

/** `script` is util-linux, not one of the lane's declared required tools. */
export function ptyAvailable(): boolean {
    return spawnSync('script', ['--version'], {encoding: 'utf8'}).status === 0;
}

/** Decode the single-line `--json` envelope, tolerating a leading banner line. */
export function envelope(run: CliRun): Envelope {
    const text = `${run.stdout}${run.stderr}`;
    const start = text.indexOf('{');
    if (start < 0) return {ok: false, code: 'NO_JSON_ENVELOPE', exitCode: run.status, data: {}};
    const end = text.indexOf('\n', start);
    try {
        const parsed = JSON.parse(text.slice(start, end < 0 ? undefined : end)) as {
            ok?: boolean; error?: {code?: string; exitCode?: number}; data?: Record<string, unknown>;
        };
        return {
            ok: parsed.ok === true, code: parsed.error?.code ?? '',
            exitCode: parsed.error?.exitCode ?? run.status, data: parsed.data ?? {}
        };
    } catch {
        return {ok: false, code: 'UNPARSEABLE_ENVELOPE', exitCode: run.status, data: {}};
    }
}
