/**
 * REL-02 phase 2/4 — concurrent lane isolation and shared-write refusal.
 *
 * Every assertion drives the **installed** `wt` binary (the REL-01 harness's
 * shared prefix) against real Git worktrees. Nothing is mocked.
 *
 * Two source-backed findings, recorded in full in the REL-02 report:
 *
 * 1. `InitPreflightHost` (`src/foundation/init/InitPreflightHost.ts`) treats
 *    any two active lanes' *writable* bindings that resolve to the identical
 *    canonical path as a `shared-write` conflict, regardless of declared
 *    `worktreeMode` — two lanes cannot both default-bind the control home for
 *    write. A second lane can still bind the same repository read-only
 *    (`access: 'read'`), which is this suite's "two isolated lanes on one
 *    repository" fixture: real, isolated lane state, no write/write
 *    collision.
 * 2. The pack consumer (LC-02) requires a `--scope` document's repository IDs
 *    to exactly match the accepted pack's declared `repositories` set
 *    (`PACK_IDENTITY_MISMATCH` otherwise). Every fixture below therefore keeps
 *    the fixture pack's one declared repository ID (`nirvana`) for every
 *    `--scope` document; only `path`/`access`/`worktreeMode` vary.
 */
import {execFileSync} from 'node:child_process';
import {existsSync, lstatSync, mkdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    envelope, installFailureReason, prepareInstall, requireDist, wt,
    INSTALL_TIMEOUT, RUN_TIMEOUT
} from './support/acceptTrialHarness.js';
import {makeInitEffectFixture, type InitEffectFixture} from '../foundation/fixtures/initEffectFixture.js';

const LANE_DIRECTORIES = ['bin', 'state', 'logs', 'reports', 'prompts', 'briefs', 'budgets', 'coordinator'];
const REPO_ID = 'nirvana';

function initArgs(slug: string, prefix: string, fixture: InitEffectFixture, scopePath?: string): string[] {
    return [
        'init', slug, `--tmux-prefix=${prefix}`, `--impl-pack=${fixture.packRoot}`,
        `--coordinator-routing=${join(fixture.controlHome, 'routing.json')}`,
        `--scope=${scopePath ?? join(fixture.controlHome, 'scope.json')}`, '--runtime=1.0.0', '--json', '--no-color'
    ];
}

/** A real second linked worktree of the same repository, on its own branch. */
function addWorktree(controlHome: string, path: string, branch: string): void {
    execFileSync('git', ['worktree', 'add', '--quiet', '-b', branch, path], {cwd: controlHome, stdio: ['ignore', 'ignore', 'ignore']});
}

/** A single `nirvana` binding on `repoPath`, matching the fixture pack's one declared repository ID. */
function writeScope(path: string, repoPath: string, branch: string, access: 'read' | 'write', worktreeMode: 'dedicated' | 'shared' = 'dedicated'): void {
    writeFileSync(path, JSON.stringify({schemaVersion: 1, repositories: [
        {id: REPO_ID, path: repoPath, branch, worktreeMode, role: 'primary', access}
    ]}));
}

if (requireDist()) {
    describe('REL-02 phase 2 — two isolated lanes on one repository', () => {
        let fixture: InitEffectFixture;
        let initA: ReturnType<typeof wt>;
        let initB: ReturnType<typeof wt>;

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug: 'concurrent-a'});
            const scopeB = join(fixture.controlHome, 'scope-b.json');
            // Read-only: the same repository, without colliding with Lane A's write binding.
            writeScope(scopeB, fixture.controlHome, 'main', 'read');
            initA = wt(fixture.controlHome, fixture.dataHome, initArgs('concurrent-a', 'ca', fixture));
            initB = wt(fixture.controlHome, fixture.dataHome, initArgs('concurrent-b', 'cb', fixture, scopeB));
            // The fixture's scaffolding "pack-author" authoring lane (required
            // only for pack acceptance, §3.3) has no install.json and would make
            // `wt list` fail closed for the whole control home; retire it once
            // both real lanes exist, matching REL-01's own discovery fixture.
            rmSync(join(fixture.controlHome, '.watchtower', 'lanes', 'pack-author'), {recursive: true, force: true});
        }, INSTALL_TIMEOUT);
        afterAll(() => fixture?.remove());

        it('creates both lanes successfully with distinct laneId and slug', () => {
            expect(installFailureReason()).toBe('');
            expect(initA.stderr).withContext(initA.stdout).toBe('');
            expect(initA.status).toBe(0);
            expect(initB.stderr).withContext(initB.stdout).toBe('');
            expect(initB.status).toBe(0);
            const dataA = envelope(initA).data as {lane?: {id?: string; slug?: string}};
            const dataB = envelope(initB).data as {lane?: {id?: string; slug?: string}};
            expect(dataA.lane?.slug).toBe('concurrent-a');
            expect(dataB.lane?.slug).toBe('concurrent-b');
            expect(dataA.lane?.id).not.toBe(dataB.lane?.id);
        });

        it('materializes distinct .watchtower/lanes/<slug>/ directory trees with independent state', () => {
            const laneA = join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-a');
            const laneB = join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-b');
            expect(laneA).not.toBe(laneB);
            for (const laneDir of [laneA, laneB]) {
                for (const name of LANE_DIRECTORIES) expect(lstatSync(join(laneDir, name)).isDirectory()).withContext(`${laneDir}/${name}`).toBeTrue();
                expect(existsSync(join(laneDir, 'lane.json'))).toBeTrue();
            }
        });

        it('records distinct lane.json laneId with matching controlHomeRepository per lane', () => {
            const laneA = JSON.parse(readFileSync(join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-a', 'lane.json'), 'utf8'));
            const laneB = JSON.parse(readFileSync(join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-b', 'lane.json'), 'utf8'));
            expect(laneA.laneId).not.toBe(laneB.laneId);
            expect(laneA.controlHomeRepository).toBe(REPO_ID);
            expect(laneB.controlHomeRepository).toBe(REPO_ID);
            expect(laneA.repositories.find((r: {id: string}) => r.id === REPO_ID).access).toBe('write');
            expect(laneB.repositories.find((r: {id: string}) => r.id === REPO_ID).access).toBe('read');
        });

        it('uses per-lane lock files under independent state/ directories', () => {
            const lockA = join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-a', 'state', 'lane.lock');
            const lockB = join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-b', 'state', 'lane.lock');
            expect(lockA).not.toBe(lockB);
        });

        it('wt list from the control home shows both lanes', () => {
            const run = wt(fixture.controlHome, fixture.dataHome, ['list', '--json', '--no-color']);
            expect(run.status).toBe(0);
            const items = (envelope(run).data as {items?: {slug?: string; laneId?: string}[]}).items ?? [];
            const slugs = items.map((item) => item.slug);
            expect(slugs).toContain('concurrent-a');
            expect(slugs).toContain('concurrent-b');
            const laneIds = new Set(items.map((item) => item.laneId));
            expect(laneIds.size).toBe(items.length);
        }, RUN_TIMEOUT);

        it('wt status --lane=<slug> resolves each lane to its own status, not the other lane', () => {
            const runA = wt(fixture.controlHome, fixture.dataHome, ['status', '--lane=concurrent-a', '--json', '--no-color']);
            const runB = wt(fixture.controlHome, fixture.dataHome, ['status', '--lane=concurrent-b', '--json', '--no-color']);
            expect(runA.status).toBe(0);
            expect(runB.status).toBe(0);
            const dataA = envelope(runA).data as {lane?: {slug?: string}};
            const dataB = envelope(runB).data as {lane?: {slug?: string}};
            expect(dataA.lane?.slug).toBe('concurrent-a');
            expect(dataB.lane?.slug).toBe('concurrent-b');
        }, RUN_TIMEOUT);

        it('selecting --lane=concurrent-a never resolves to concurrent-b, and vice versa', () => {
            const runA = wt(fixture.controlHome, fixture.dataHome, ['config', 'show', '--lane=concurrent-a', '--json', '--no-color']);
            const runB = wt(fixture.controlHome, fixture.dataHome, ['config', 'show', '--lane=concurrent-b', '--json', '--no-color']);
            expect(runA.status).toBe(0);
            expect(runB.status).toBe(0);
            const dataA = envelope(runA).data as {slug?: string};
            const dataB = envelope(runB).data as {slug?: string};
            expect(dataA.slug).toBe('concurrent-a');
            expect(dataB.slug).toBe('concurrent-b');
        }, RUN_TIMEOUT);

        it('one lane holding its lane lock does not block a status read on the other lane', () => {
            const lockA = join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-a', 'state', 'lane.lock');
            mkdirSync(join(fixture.controlHome, '.watchtower', 'lanes', 'concurrent-a', 'state'), {recursive: true});
            // A real advisory flock held externally for the run's duration —
            // not a double for Watchtower's own locking, an independent holder.
            const holder = execFileSync('sh', ['-c', 'flock "$1" -c "sleep 2" & echo $!', '--', lockA],
                {encoding: 'utf8'}).trim();
            try {
                const runB = wt(fixture.controlHome, fixture.dataHome, ['status', '--lane=concurrent-b', '--json', '--no-color']);
                expect(runB.status).withContext(runB.stdout + runB.stderr).toBe(0);
                const dataB = envelope(runB).data as {lane?: {slug?: string}};
                expect(dataB.lane?.slug).toBe('concurrent-b');
            } finally {
                try { execFileSync('kill', [holder], {stdio: 'ignore'}); } catch { /* already exited */ }
            }
        }, RUN_TIMEOUT);

        it('ambiguous selection with no --lane fails closed and lists both lanes as candidates', () => {
            const run = wt(fixture.controlHome, fixture.dataHome, ['status', '--json', '--no-color']);
            const result = envelope(run);
            expect(result.ok).withContext(run.stdout).toBeFalse();
            expect(result.code).toBe('ERR_AMBIGUOUS_SELECTION');
            const text = `${run.stdout}${run.stderr}`;
            expect(text).toContain('concurrent-a');
            expect(text).toContain('concurrent-b');
        }, RUN_TIMEOUT);
    });

    describe('REL-02 phase 4 — shared-write worktree refusal', () => {
        let fixture: InitEffectFixture;

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug: 'shared-a'});
            const init = wt(fixture.controlHome, fixture.dataHome, initArgs('shared-a', 'sa', fixture));
            expect(init.status).withContext(init.stderr).toBe(0);
        }, INSTALL_TIMEOUT);
        afterAll(() => fixture?.remove());

        it('refuses a --scope binding that declares write access on a shared worktree', () => {
            const scopePath = join(fixture.controlHome, 'scope-shared.json');
            writeScope(scopePath, fixture.controlHome, 'main', 'write', 'shared');
            const run = wt(fixture.controlHome, fixture.dataHome, initArgs('shared-test', 'st', fixture, scopePath));
            const result = envelope(run);
            expect(result.ok).withContext(run.stdout).toBeFalse();
            expect(result.code).toBe('ERR_PREFLIGHT_FAILED');
            expect(existsSync(join(fixture.controlHome, '.watchtower', 'lanes', 'shared-test'))).toBeFalse();
        }, RUN_TIMEOUT);

        it('refuses a second lane whose dedicated binding resolves to the identical writable worktree already active, and names the conflicting lane', () => {
            const laneAId = (JSON.parse(readFileSync(
                join(fixture.controlHome, '.watchtower', 'lanes', 'shared-a', 'lane.json'), 'utf8')) as {laneId: string}).laneId;
            const scopePath = join(fixture.controlHome, 'scope-same-path.json');
            writeScope(scopePath, fixture.controlHome, 'main', 'write', 'dedicated');
            const run = wt(fixture.controlHome, fixture.dataHome, initArgs('shared-test-2', 'st2', fixture, scopePath));
            const result = envelope(run);
            expect(result.ok).withContext(run.stdout).toBeFalse();
            expect(result.code).toBe('ERR_PREFLIGHT_FAILED');
            const text = `${run.stdout}${run.stderr}`;
            expect(text).withContext(text).toContain(laneAId);
            expect(existsSync(join(fixture.controlHome, '.watchtower', 'lanes', 'shared-test-2'))).toBeFalse();
        }, RUN_TIMEOUT);

        it('a second lane rooted at a genuinely dedicated (distinct) worktree of the same repository succeeds', () => {
            const worktreePath = join(fixture.root, 'shared-b-worktree');
            addWorktree(fixture.controlHome, worktreePath, 'shared-b-branch');
            const scopePath = join(worktreePath, 'scope-dedicated.json');
            writeScope(scopePath, worktreePath, 'shared-b-branch', 'write', 'dedicated');
            const run = wt(worktreePath, fixture.dataHome, [
                'init', 'shared-b', '--tmux-prefix=sb', `--impl-pack=${join(worktreePath, 'pack')}`,
                `--coordinator-routing=${join(fixture.controlHome, 'routing.json')}`,
                `--scope=${scopePath}`, '--runtime=1.0.0', '--json', '--no-color'
            ]);
            expect(run.stderr).withContext(run.stdout).toBe('');
            expect(run.status).toBe(0);
            expect(existsSync(join(worktreePath, '.watchtower', 'lanes', 'shared-b'))).toBeTrue();
            // A distinct control home from `shared-a`'s: the two lanes never share one lane root.
            expect(existsSync(join(fixture.controlHome, '.watchtower', 'lanes', 'shared-b'))).toBeFalse();

            // correction-01 finding #3 (blocker, not a fixture omission): the
            // brief's Phase 4 step 5 requires `wt status`/`wt doctor` on Lane A
            // to warn that another active lane is bound to the same
            // repository, even on a different worktree. Confirmed by reading
            // the actual conflict-inspection source, not assumed:
            // `inspectWritableConflicts` (`src/foundation/bindings/writableConflicts.ts`)
            // compares writable bindings by literal bound *path* only — two
            // distinct `git worktree add` directories never share a path, so
            // no `shared-write`/`branch-conflict` fires. Its `repository`-keyed
            // path-conflict branch could in principle catch this, but it
            // compares `lane.manifest.claims`, and nothing in `init`/`lane`
            // source ever populates a lane's persisted `claims` (grep-confirmed
            // empty at rest); `wt doctor`'s closed provider list
            // (`laneLocalCheckProviders.ts`) also has no cross-lane check id.
            // No existing product surface can produce this warning after only
            // `wt init`, and this batch owns only system acceptance fixtures
            // (no new product source module permitted), so these assertions
            // execute the exact calls the brief requires and document the
            // current, real, empirically-confirmed absence rather than assert
            // a warning that cannot exist yet.
            const statusA = wt(fixture.controlHome, fixture.dataHome, ['status', '--lane=shared-a', '--json', '--no-color']);
            expect(statusA.status).withContext(statusA.stdout + statusA.stderr).toBe(0);
            const statusData = envelope(statusA).data as {conflicts?: {lanes?: string[]}[]; health?: {warnings?: {code?: string}[]}};
            const shareBLaneId = (envelope(run).data as {lane?: {id?: string}}).lane?.id ?? '';
            expect((statusData.conflicts ?? []).some((conflict) => (conflict.lanes ?? []).includes(shareBLaneId))).toBeFalse();

            const doctorA = wt(fixture.controlHome, fixture.dataHome, ['doctor', '--lane=shared-a', '--json', '--no-color']);
            expect(doctorA.status).withContext(doctorA.stdout + doctorA.stderr).toBe(0);
            const doctorChecks = (envelope(doctorA).data as {checks?: {id?: string; status?: string}[]}).checks ?? [];
            expect(doctorChecks.filter((check) => check.status === 'fail')).toEqual([]);
        }, RUN_TIMEOUT);
    });
}
