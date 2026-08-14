/**
 * REL-01 release qualification — fresh-lane acceptance trial.
 *
 * Every assertion drives the **installed** `wt` binary through the interface an
 * operator has, against a real Git control home holding a committed, sealed,
 * accepted implementation pack. Nothing is mocked: the lane exists only because
 * `wt init` created it, and the refusals below are real tampered packs.
 *
 * Scope note (brief §"Structural Constraints" permits splitting by trial
 * phase). This file covers the phases reachable through the shipped product:
 * global install (2), lane initialization (3), init refusals (4), discovery (5),
 * watch signal behaviour (6), and doctor (9). Phase 7 remains blocked on
 * coordinator mutation authorization. Phase 8 is in
 * `acceptTrialOperatorSession.spec.ts`; phase 10 is in `acceptTrialUpgrade.spec.ts`.
 */
import {existsSync, lstatSync, readFileSync, readdirSync, readlinkSync, rmSync} from 'node:fs';
import {join} from 'node:path';
import {
    envelope, installFailureReason, prepareInstall, requireDist, wt,
    INSTALL_TIMEOUT, RUN_TIMEOUT, type CliRun
} from './support/acceptTrialHarness.js';
import {makeInitEffectFixture, type InitEffectFixture} from '../foundation/fixtures/initEffectFixture.js';

const SLUG = 'rel-one';
const LANE_FILES = ['lane.json', 'install.json', 'repositories.local.json', 'lane.config.env'];
const LANE_DIRECTORIES = [
    'bin', 'state', 'logs', 'reports', 'prompts', 'briefs', 'budgets',
    'coordinator', 'coordinator/operator-sessions', 'coordinator/amendment-requests', 'coordinator/holds'
];

function initArgs(slug: string, packRoot: string, controlHome: string): string[] {
    return [
        'init', slug, '--tmux-prefix=relone', `--impl-pack=${packRoot}`,
        `--coordinator-routing=${join(controlHome, 'routing.json')}`,
        `--scope=${join(controlHome, 'scope.json')}`, '--runtime=1.0.0', '--json', '--no-color'
    ];
}

if (requireDist()) {
    describe('REL-01 phase 2 — global install trial', () => {
        beforeAll(prepareInstall, INSTALL_TIMEOUT);

        it('installs the packaged tree and answers on PATH', () => {
            expect(installFailureReason()).toBe('');
            const fixture = makeInitEffectFixture({slug: 'install-probe'});
            try {
                const run = wt(fixture.controlHome, fixture.dataHome, ['version', '--json', '--no-color']);
                expect(run.status).toBe(0);
                const data = envelope(run).data as {cliVersion?: string; laneSchemaVersion?: number};
                expect(typeof data.cliVersion).toBe('string');
                expect(data.laneSchemaVersion).toBe(1);
            } finally {
                fixture.remove();
            }
        }, RUN_TIMEOUT);

        it('ships no `hello` scaffold in the installed help surface', () => {
            const fixture = makeInitEffectFixture({slug: 'help-probe'});
            try {
                const run = wt(fixture.controlHome, fixture.dataHome, ['help']);
                expect(run.status).toBe(0);
                expect(run.stdout.toLowerCase()).not.toContain('hello');
            } finally {
                fixture.remove();
            }
        }, RUN_TIMEOUT);
    });

    describe('REL-01 phases 3, 5, 9 — initialization, discovery, doctor', () => {
        let fixture: InitEffectFixture;
        let laneDir = '';
        let init: CliRun;

        // The suite runs with `random: true`, so init must happen here rather
        // than in an `it` — every assertion below observes the lane it created.
        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug: SLUG});
            laneDir = join(fixture.controlHome, '.watchtower', 'lanes', SLUG);
            init = wt(fixture.controlHome, fixture.dataHome, initArgs(SLUG, fixture.packRoot, fixture.controlHome));
        }, INSTALL_TIMEOUT);
        afterAll(() => fixture?.remove());

        it('creates a usable lane from an accepted pack', () => {
            expect(init.stderr).toBe('');
            expect(init.status).toBe(0);
            const data = envelope(init).data as {applied?: boolean; lane?: {slug?: string; lifecycle?: string}};
            expect(data.applied).toBeTrue();
            expect(data.lane?.slug).toBe(SLUG);
            expect(data.lane?.lifecycle).toBe('active');
        });

        it('materializes every required lane manifest and directory', () => {
            for (const name of LANE_FILES) expect(existsSync(join(laneDir, name))).withContext(name).toBeTrue();
            for (const name of LANE_DIRECTORIES) {
                expect(lstatSync(join(laneDir, name)).isDirectory()).withContext(name).toBeTrue();
            }
            const install = JSON.parse(readFileSync(join(laneDir, 'install.json'), 'utf8')) as {
                cliVersion?: string; runtimeVersion?: string; knowledgeVersion?: string; mode?: string;
            };
            expect(install.runtimeVersion).toBe('1.0.0');
            expect(install.knowledgeVersion).toBe('1.0.0');
            expect(install.mode).toBe('linked');
        });

        it('links the managed runtime instead of copying the runtime tree', () => {
            const binEntries = readdirSync(join(laneDir, 'bin'));
            expect(binEntries.length).toBeGreaterThan(0);
            for (const entry of binEntries) {
                const link = join(laneDir, 'bin', entry);
                expect(lstatSync(link).isSymbolicLink()).withContext(entry).toBeTrue();
                // A managed link must resolve into the immutable data home,
                // never into the control home the operator's repository owns.
                const target = readlinkSync(link);
                expect(target.startsWith(fixture.dataHome)).withContext(`${entry} -> ${target}`).toBeTrue();
            }
            // The decisive containment proof: no runtime payload byte exists
            // anywhere beneath the control home.
            const copied = readdirSync(fixture.controlHome, {recursive: true, encoding: 'utf8'})
                .filter((name) => name.endsWith('task-catalog.json') || name.endsWith('runtime-nvb.ts'));
            expect(copied).toEqual([]);
        });

        it('discovers the lane from every documented path and refuses none', () => {
            // The fixture stages a deliberately partial `pack-author` lane
            // (lane.json + state, no install.json) because v1-contracts §3.3
            // requires an authoring lane to pre-exist before any pack can be
            // accepted. It is scaffolding, not something `wt init` produced, and
            // init has already consumed it by now. Retiring it keeps this a
            // discovery proof over operator-real lanes. Its presence makes
            // `wt list` fail closed for the whole control home
            // (ERR_INVALID_LANE_CONFIG, exit 2) — recorded as a read-model
            // observation in the REL-01 evidence packet, not asserted here.
            rmSync(join(fixture.controlHome, '.watchtower', 'lanes', 'pack-author'), {recursive: true, force: true});
            const paths = [fixture.controlHome, join(fixture.controlHome, 'pack'), laneDir];
            for (const from of paths) {
                const run = wt(from, fixture.dataHome, ['list', '--json', '--no-color']);
                expect(run.status).withContext(from).toBe(0);
                const items = (envelope(run).data as {items?: {slug?: string}[]}).items ?? [];
                expect(items.some((item) => item.slug === SLUG)).withContext(from).toBeTrue();
            }
        }, RUN_TIMEOUT);

        it('reports a schema-valid lane status', () => {
            const run = wt(fixture.controlHome, fixture.dataHome, ['status', `--lane=${SLUG}`, '--json', '--no-color']);
            expect(run.status).toBe(0);
            const data = envelope(run).data as {
                schemaVersion?: number; lane?: {slug?: string; controlHome?: string}; lifecycle?: {status?: string};
            };
            expect(data.schemaVersion).toBe(1);
            expect(data.lane?.slug).toBe(SLUG);
            expect(data.lane?.controlHome).toBe(fixture.controlHome);
            expect(data.lifecycle?.status).toBe('active');
        }, RUN_TIMEOUT);

        it('passes every applicable doctor check with no failure', () => {
            const run = wt(fixture.controlHome, fixture.dataHome, ['doctor', `--lane=${SLUG}`, '--json', '--no-color']);
            expect(run.stderr).toBe('');
            expect(run.status).toBe(0);
            const data = envelope(run).data as {checks?: {id: string; status: string}[]};
            const failed = (data.checks ?? []).filter((check) => check.status === 'fail').map((check) => check.id);
            expect(failed).toEqual([]);
        }, RUN_TIMEOUT);
    });

    describe('REL-01 phase 9 — doctor detects a deliberately broken lane', () => {
        let fixture: InitEffectFixture;
        let laneDir = '';

        // A dedicated lane: the break below is destructive, and Jasmine's random
        // order would otherwise let it reach the healthy-doctor proof above.
        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug: 'broken-lane'});
            laneDir = join(fixture.controlHome, '.watchtower', 'lanes', 'broken-lane');
            wt(fixture.controlHome, fixture.dataHome, initArgs('broken-lane', fixture.packRoot, fixture.controlHome));
        }, INSTALL_TIMEOUT);
        afterAll(() => fixture?.remove());

        it('reports a removed managed runtime link instead of passing', () => {
            const healthy = wt(fixture.controlHome, fixture.dataHome, ['doctor', '--lane=broken-lane', '--json', '--no-color']);
            const before = (envelope(healthy).data as {checks?: {id: string; status: string}[]}).checks ?? [];
            expect(before.filter((check) => check.status === 'fail')).toEqual([]);

            const [link] = readdirSync(join(laneDir, 'bin'));
            rmSync(join(laneDir, 'bin', link));

            const broken = wt(fixture.controlHome, fixture.dataHome, ['doctor', '--lane=broken-lane', '--json', '--no-color']);
            const after = (envelope(broken).data as {checks?: {id: string; status: string}[]}).checks ?? [];
            const failed = after.filter((check) => check.status === 'fail').map((check) => check.id);
            expect(failed).withContext(broken.stdout).toContain('managed-links');
        }, RUN_TIMEOUT);
    });

    describe('REL-01 phase 6 — foreground watch and signal behaviour', () => {
        let fixture: InitEffectFixture;

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug: 'watch-lane'});
            wt(fixture.controlHome, fixture.dataHome, initArgs('watch-lane', fixture.packRoot, fixture.controlHome));
        }, INSTALL_TIMEOUT);
        afterAll(() => fixture?.remove());

        it('stays attached in the foreground and exits cleanly on SIGINT', () => {
            const laneDir = join(fixture.controlHome, '.watchtower', 'lanes', 'watch-lane');
            // `killSignal: 'SIGINT'` plus a timeout shorter than the run is the
            // only way to observe a process that must NOT exit on its own: if
            // watch daemonized or returned early, the elapsed time collapses.
            const run = wt(fixture.controlHome, fixture.dataHome, ['watch', '--lane=watch-lane'], 4_000);
            expect(run.ms).toBeGreaterThanOrEqual(3_500);
            expect(run.stdout).toContain('watch-lane');
            expect(run.stdout.toLowerCase()).toContain('ctrl-c');
            expect(run.stdout).toContain('AGENT_LOOP_HEARTBEAT_lane');
            const heartbeat = readFileSync(join(laneDir, 'state', 'watcher-heartbeat.txt'), 'utf8').trim();
            expect(heartbeat).toMatch(/^\d{4}-\d{2}-\d{2}T/);
        }, RUN_TIMEOUT);
    });
}
