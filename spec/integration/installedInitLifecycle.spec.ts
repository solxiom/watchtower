/**
 * LC-11 required proof 1 and 5: a **real installed** `wt init --json` creates a
 * usable lane in an isolated control home, and the installed binary then runs
 * the whole `init → status → watch/doctor` sequence against it.
 *
 * Nothing here is a stand-in for the product: the CLI under test is the `wt`
 * executable of a freshly installed package built by the accepted RT-08
 * closure harness from the packaged `dist/` tree, run as a child process with
 * its own `WATCHTOWER_DATA_HOME`. No lane directory is hand-built — the lane
 * exists only because the installed `wt init` created it — and no source-tree
 * module participates in the run.
 *
 * Each spec body is a named module-level function so every function-like span
 * stays inside the RT-05 size gate that owns `spec/integration/`.
 */
import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {
    installFreshPrefix, removeInstalledPrefix, type InstalledPrefix
} from './support/installedPrefixFixture.js';
import {makeInitEffectFixture, type InitEffectFixture} from '../foundation/fixtures/initEffectFixture.js';

const DIST_RUNTIME = join(process.cwd(), 'dist', 'runtime-nvb');
const INSTALL_TIMEOUT = 600_000;
const RUN_TIMEOUT = 120_000;
/** How long the foreground watcher must still be attached before the bound ends it. */
const WATCH_ATTACH_MS = 4_000;

interface CliRun {
    readonly status: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly stdout: string;
    readonly stderr: string;
    /** Wall-clock duration, so a command that must not exit can be proven not to. */
    readonly ms: number;
}

interface AppliedInit {
    readonly applied: boolean;
    readonly changed: readonly string[];
    readonly lane: {readonly id: string; readonly slug: string; readonly lifecycle: string; readonly dir: string};
}

let installed: InstalledPrefix | null = null;
let failure = '';
let prepared: Promise<void> | null = null;
let fixture: InitEffectFixture;

function requireDist(): boolean {
    if (existsSync(join(DIST_RUNTIME, 'task-catalog.json'))) return true;
    it('requires nvb dist output at dist/runtime-nvb/', () => {
        pending('Run `nvb dist` before this proof; dist/runtime-nvb is absent during build-only test runs.');
    });
    return false;
}

async function prepare(): Promise<void> {
    prepared ??= (async () => {
        const outcome = await installFreshPrefix(process.cwd());
        if (!outcome.ok || outcome.installed === undefined) failure = outcome.reason ?? 'install failed';
        else installed = outcome.installed;
    })();
    return prepared;
}

function cleanupInstall(): void {
    if (installed !== null) removeInstalledPrefix(installed);
    installed = null;
}

/** The installed `wt` executable, with only the fixture's data home and a minimal tool PATH. */
function wt(args: readonly string[], timeout = RUN_TIMEOUT): CliRun {
    const prefix = (installed as InstalledPrefix).prefix;
    const started = Date.now();
    const result = spawnSync(join(prefix, 'bin', 'wt'), [...args], {
        cwd: fixture.controlHome, encoding: 'utf8', timeout, killSignal: 'SIGINT',
        env: {PATH: `${dirname(process.execPath)}:/usr/bin:/bin`, HOME: fixture.root,
            WATCHTOWER_DATA_HOME: fixture.dataHome}
    });
    return {status: result.status, signal: result.signal, stdout: result.stdout ?? '',
        stderr: result.stderr ?? '', ms: Date.now() - started};
}

function initArgs(slug: string, extra: readonly string[] = []): string[] {
    return ['init', slug, '--tmux-prefix=lc11', '--impl-pack=pack', '--coordinator-routing=routing.json',
        '--scope=scope.json', '--runtime=1.0.0', '--json', '--no-color', ...extra];
}

/** The single `commandError` code on stderr, or `''` when stderr carries none. */
function errorCodeOf(stderr: string): string {
    const match = /"code":\s*"(ERR_[A-Z_]+)"/u.exec(stderr);
    return match === null ? '' : match[1];
}

function laneDirOf(slug: string): string {
    return join(fixture.controlHome, '.watchtower', 'lanes', slug);
}

function applyInit(slug: string): {readonly run: CliRun; readonly data: AppliedInit} {
    const run = wt(initArgs(slug));
    const parsed = JSON.parse(run.stdout || '{"data":{}}') as {ok?: boolean; command?: string; data: AppliedInit};
    return {run, data: parsed.data};
}

function appliesInit(): void {
    expect(failure).toBe('');
    const slug = fixture.plan.lane.slug;

    const {run, data} = applyInit(slug);

    expect(run.stderr).toBe('');
    expect(run.status).toBe(0);
    expect(data.applied).toBeTrue();
    expect(data.lane.slug).toBe(slug);
    expect(data.lane.lifecycle).toBe('active');
    expect(data.changed).toContain(`.watchtower/lanes/${slug}/lane.json`);
    expect(readFileSync(join(laneDirOf(slug), 'state', 'coordinator-lane-state.txt'), 'utf8'))
        .toBe('lane_status=active\n');
    expect(existsSync(join(laneDirOf(slug), 'coordinator', 'index', 'pack', 'current.json'))).toBeTrue();
}

function servesStatusAndDoctor(): void {
    expect(failure).toBe('');
    const slug = fixture.plan.lane.slug;
    expect(applyInit(slug).run.status).toBe(0);

    const status = wt(['status', `--lane=${slug}`, '--json', '--no-color']);
    const laneStatus = JSON.parse(status.stdout || '{"data":{}}') as {
        data: {lane: {slug: string}; lifecycle: {status: string}};
    };
    expect(status.status).toBe(0);
    expect(laneStatus.data.lane.slug).toBe(slug);
    expect(laneStatus.data.lifecycle.status).toBe('active');

    const doctor = wt(['doctor', `--lane=${slug}`, '--json', '--no-color']);
    const report = JSON.parse(doctor.stdout || '{"data":{}}') as {
        data: {lane: {slug: string}; checks: {id: string; status: string}[]};
    };
    expect(doctor.stderr).toBe('');
    expect(report.data.lane.slug).toBe(slug);
    expect(report.data.checks.filter((check) => check.status === 'fail').map((check) => check.id)).toEqual([]);
}

/**
 * LC-11 correction 01, F-03. `wt watch` succeeds by *staying attached*
 * (`docs/spec/v1.md` §11.4: foreground only, never daemonized), so an exit
 * status can never be its success oracle — asserting one would assert the
 * harness's own kill semantics, which is precisely the timeout false positive
 * this proof must reject. Measured against the real installed binary, all
 * three of `spawnSync` default stdio, inherited stdin, and `killSignal`
 * `SIGINT`/`SIGTERM` return only when the bounded wait elapses, always with
 * the attachment banner on stdout and an empty stderr.
 *
 * What is asserted instead is positive and non-vacuous: the attachment
 * resolved *this* lane by slug and UUID, nothing was refused at any fence, and
 * the process was still attached when the bound elapsed — so an early exit, a
 * silent failure, or a refusal cannot pass. Graceful Ctrl-C shutdown is LC-06's
 * accepted `watchAttachmentProcessProof` (a real, non-`spawnSync` process), and
 * deterministic resolve/index-open for this same lane is proven in-process by
 * `initEffectApply.spec.ts` through `watch`'s own `WatchPreflight` owner.
 */
function attachesTheCreatedLaneForWatch(): void {
    expect(failure).toBe('');
    const slug = fixture.plan.lane.slug;
    const laneId = applyInit(slug).data.lane.id;

    const watch = wt(['watch', `--lane=${slug}`, '--no-color'], WATCH_ATTACH_MS);
    const observed = JSON.stringify({status: watch.status, signal: watch.signal, ms: watch.ms,
        stdout: watch.stdout.slice(0, 400), stderr: watch.stderr.slice(0, 600)});

    expect(watch.stdout).withContext(observed).toContain(`Watching lane ${slug}`);
    expect(watch.stdout).withContext(observed).toContain(laneId);
    expect(watch.stdout).withContext(observed).toContain('Press Ctrl-C to stop.');
    expect(watch.stderr).withContext(observed).toBe('');
    expect(errorCodeOf(watch.stderr)).withContext(observed).toBe('');
    expect(watch.ms).withContext(observed).toBeGreaterThanOrEqual(WATCH_ATTACH_MS);
}

function refusesSecondInit(): void {
    expect(failure).toBe('');
    const slug = fixture.plan.lane.slug;
    expect(applyInit(slug).run.status).toBe(0);
    const marker = readFileSync(join(laneDirOf(slug), 'lane.json'), 'utf8');

    const second = wt(initArgs(slug));

    expect(second.status).not.toBe(0);
    expect(second.stdout).toBe('');
    expect(second.stderr).toContain('ERR_PREFLIGHT_FAILED');
    expect(readFileSync(join(laneDirOf(slug), 'lane.json'), 'utf8')).toBe(marker);
}

function keepsPreviewReadOnly(): void {
    expect(failure).toBe('');
    const before = fixture.inventory();

    const preview = wt(initArgs('preview-lane', ['--dry-run']));

    expect(preview.status).toBe(0);
    expect((JSON.parse(preview.stdout) as {data: {applied: boolean}}).data.applied).toBeFalse();
    expect(fixture.inventory()).toBe(before);
}

describe('installed wt init lifecycle', () => {
    if (!requireDist()) return;

    beforeAll(prepare, INSTALL_TIMEOUT);
    beforeEach(() => { fixture = makeInitEffectFixture(); });
    afterEach(() => { fixture.remove(); });
    afterAll(cleanupInstall);

    it('applies a real installed init and reports the applied mutation', appliesInit, INSTALL_TIMEOUT);
    it('serves status and doctor for the lane it created', servesStatusAndDoctor, INSTALL_TIMEOUT);
    it('attaches the created lane through the installed foreground watcher',
        attachesTheCreatedLaneForWatch, INSTALL_TIMEOUT);
    it('refuses a second init for the same slug without touching the lane', refusesSecondInit, INSTALL_TIMEOUT);
    it('keeps --dry-run read-only through the installed binary', keepsPreviewReadOnly, INSTALL_TIMEOUT);
});
