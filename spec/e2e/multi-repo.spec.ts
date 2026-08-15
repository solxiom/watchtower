/**
 * REL-02 phases 3, 5, 6, 7 — multi-repository commit set, partial push
 * recovery, idempotency replay, and the copied-template fixture.
 *
 * Init, discovery, and status are driven through the installed `wt` binary,
 * exactly like `concurrent.spec.ts`. `GitAcceptanceAdapter` publication has no
 * CLI front door yet (`docs/spec/v1.md` §10's command table has no
 * `accept`/`publish` entry — it is a coordinator-cycle effect); this suite
 * drives that accepted foundation class directly, exactly as
 * `acceptTrialPhase7.spec.ts`'s `operatorWitnessCycleCapsule.ts` already does
 * for a different capability with no CLI surface. Every `publish-commits` call
 * still really executes `git push` through the real `LeafRuntimeInvoker` and
 * the shipped `git.push` leaf (`spec/e2e/support/gitAcceptanceRealPublish.ts`)
 * against real local bare remotes — nothing about Git is mocked. See that
 * module's header comment for the precise source-backed mapping.
 */
import {execFileSync} from 'node:child_process';
import {chmodSync, existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {envelope, installFailureReason, prepareInstall, requireDist, wt, INSTALL_TIMEOUT, RUN_TIMEOUT} from './support/acceptTrialHarness.js';
import {makeMultiRepoFixture, type MultiRepoFixture} from './support/multiRepoFixture.js';
import {acceptDeps, makeRealPublishFixture, publishDeps, type RealPublishFixture} from './support/gitAcceptanceRealPublish.js';
import {readPushJournal, terminalPublishRecord} from './support/pushJournalAssertions.js';
import {makeDetachedCopiedTemplate, assertMarkerUntouched, type DetachedCopiedTemplate} from './support/copiedTemplateFixture.js';
import {GitAcceptanceAdapter} from '../../src/foundation/gitAcceptance/GitAcceptance.js';
import {readEffectJournal} from '../../src/foundation/effect/index.js';
import {nodeEffectFileSystem} from '../../src/foundation/effect/nodeEffectFileSystem.js';
import type {CommitSet} from '../../src/contracts/gitAcceptance.js';

const GIT_IDENTITY = ['-c', 'user.name=watchtower', '-c', 'user.email=watchtower@example.test'];
const BATCH_ID = 'REL-02-B1';
const REVIEWER_SESSION = 'reviewer-session-rel02';
const SLUG = 'multi-repo';

function initArgs(fixture: MultiRepoFixture): string[] {
    return [
        'init', SLUG, '--tmux-prefix=mr', `--impl-pack=${fixture.packRoot}`,
        `--coordinator-routing=${join(fixture.controlHome, 'routing.json')}`,
        `--scope=${join(fixture.controlHome, 'scope.json')}`, '--runtime=1.0.0', '--json', '--no-color'
    ];
}

function git(cwd: string, args: readonly string[]): string {
    return execFileSync('git', [...args], {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
}

/** Commits one new file in `repoPath`, representing the batch's per-repository change. */
function commitBatchChange(repoPath: string, fileName: string): string {
    writeFileSync(join(repoPath, fileName), `# ${fileName}\n`);
    git(repoPath, ['add', '--all']);
    git(repoPath, [...GIT_IDENTITY, 'commit', '--quiet', `--message=${fileName}`]);
    return git(repoPath, ['rev-parse', 'HEAD']).trim();
}

function seedAcceptEvent(laneDir: string, laneId: string, commits: Readonly<Record<string, string>>): void {
    mkdirSync(join(laneDir, 'coordinator', 'journal'), {recursive: true});
    nodeEffectFileSystem.appendLine(join(laneDir, 'coordinator', 'journal', 'worker-events.jsonl'), JSON.stringify({
        schemaVersion: 1, eventId: 'rel-02-accept-1', type: 'accept', sequence: 0, at: '2026-08-11T12:00:00.000Z',
        laneId, producer: 'reviewer-1', correlationId: BATCH_ID, causationId: null, policyVersion: 'shipping-v1',
        payload: {role: 'reviewer', batch: BATCH_ID, session: REVIEWER_SESSION, commits}
    }));
}

if (requireDist()) {
    describe('REL-02 phase 3 — multi-repository init and bindings', () => {
        let fixture: MultiRepoFixture;
        let init: ReturnType<typeof wt>;

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeMultiRepoFixture({slug: SLUG});
            init = wt(fixture.controlHome, fixture.dataHome, initArgs(fixture));
        }, INSTALL_TIMEOUT);
        afterAll(() => fixture?.remove());

        it('creates the lane binding both declared repositories', () => {
            expect(installFailureReason()).toBe('');
            expect(init.stderr).withContext(init.stdout).toBe('');
            expect(init.status).toBe(0);
        });

        it('repositories.local.json records both bindings with correct roles and write access', () => {
            const bindings = JSON.parse(readFileSync(join(fixture.laneDir, 'repositories.local.json'), 'utf8')) as {
                repositories: {id: string; role: string; access: string; path: string}[];
            };
            const byId = new Map(bindings.repositories.map((entry) => [entry.id, entry]));
            expect(byId.get('primary')).toEqual(jasmine.objectContaining({role: 'primary', access: 'write', path: fixture.controlHome}));
            expect(byId.get('secondary')).toEqual(jasmine.objectContaining({role: 'integration', access: 'write', path: fixture.secondary.path}));
        });

        it('wt status reports both repositories for the lane', () => {
            const run = wt(fixture.controlHome, fixture.dataHome, ['status', `--lane=${SLUG}`, '--json', '--no-color']);
            expect(run.status).toBe(0);
            const data = envelope(run).data as {repositories?: {id: string}[]};
            const ids = (data.repositories ?? []).map((entry) => entry.id);
            expect(ids).toContain('primary');
            expect(ids).toContain('secondary');
        }, RUN_TIMEOUT);
    });

    describe('REL-02 phases 3, 5, 6 — commit set, partial push recovery, and idempotency replay', () => {
        let fixture: MultiRepoFixture;
        let publish: RealPublishFixture;
        let laneId = '';
        let primaryBase = '';
        let primarySha = '';
        let secondarySha = '';
        let commitSet: CommitSet;

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeMultiRepoFixture({slug: SLUG});
            const init = wt(fixture.controlHome, fixture.dataHome, initArgs(fixture));
            expect(init.status).withContext(init.stderr).toBe(0);
            laneId = (envelope(init).data as {lane?: {id?: string}}).lane?.id ?? '';
            primaryBase = git(fixture.primary.path, ['rev-parse', 'HEAD']).trim();
            primarySha = commitBatchChange(fixture.primary.path, 'batch-primary.md');
            secondarySha = commitBatchChange(fixture.secondary.path, 'batch-secondary.md');
            commitSet = {commits: [
                {repositoryId: 'primary', sha: primarySha, expectedBase: primaryBase, expectedFiles: expectedTree(fixture.primary.path)},
                {repositoryId: 'secondary', sha: secondarySha, expectedBase: fixture.secondary.baseline, expectedFiles: expectedTree(fixture.secondary.path)}
            ]};
            seedAcceptEvent(fixture.laneDir, laneId, {primary: primarySha, secondary: secondarySha});
            publish = makeRealPublishFixture();
        }, INSTALL_TIMEOUT);
        afterAll(() => { fixture?.remove(); publish?.remove(); });

        function repositories() {
            return [
                {id: 'primary', role: 'primary' as const, access: 'write' as const, path: fixture.primary.path, branch: 'main', worktreeMode: 'dedicated' as const, remote: fixture.primary.remotePath},
                {id: 'secondary', role: 'integration' as const, access: 'write' as const, path: fixture.secondary.path, branch: 'main', worktreeMode: 'dedicated' as const, remote: fixture.secondary.remotePath}
            ];
        }

        function workspaceFor(targetId: string): string {
            return targetId === 'primary' ? fixture.primary.path : fixture.secondary.path;
        }

        it('validateCommitSet accepts a real, well-formed two-repository commit set', async () => {
            const deps = acceptDeps(publish.target);
            const adapter = new GitAcceptanceAdapter(deps);
            const result = await adapter.validateCommitSet(commitSet, repositories());
            expect(result).withContext(JSON.stringify(result)).toEqual({ok: true, errors: []});
        }, RUN_TIMEOUT);

        it('acceptProposal records a durable batch-accepted effect bound to the reviewer-owned accept event', async () => {
            const deps = acceptDeps(publish.target);
            const adapter = new GitAcceptanceAdapter(deps);
            const outcome = await adapter.acceptProposal(
                {laneDir: fixture.laneDir, laneId, cycleId: 'rel-02-cycle-1', snapshotDigest: `sha256:${'a'.repeat(64)}`, policyVersion: 'shipping-v1', runtimeContext: runtimeContextStub(fixture, publish)},
                {laneId, batchId: BATCH_ID, cycleId: 'rel-02-cycle-1', reviewerSessionId: REVIEWER_SESSION}
            );
            expect(outcome.status).toBe('applied');
            const journal = readEffectJournal(fixture.laneDir, nodeEffectFileSystem);
            expect(journal.records.map((record) => record.payload.effect)).toContain('record-acceptance');
        }, RUN_TIMEOUT);

        // Jasmine runs with `random: true` (matching every other REL-01/REL-02
        // suite), so the publish-then-replay sequence must be one `it`: two
        // separate `it`s sharing this `beforeAll` could be reordered, and the
        // replay assertion is meaningless unless the real push happened first.
        it('publishes both repositories with a real git push, then replays the same cycle without pushing again', async () => {
            const first = await new GitAcceptanceAdapter(publishDeps(publish, workspaceFor)).publishCommits(
                {laneDir: fixture.laneDir, laneId, cycleId: 'rel-02-cycle-2', snapshotDigest: `sha256:${'b'.repeat(64)}`, policyVersion: 'shipping-v1', runtimeContext: runtimeContextStub(fixture, publish)},
                commitSet, {ok: true, errors: []}, repositories()
            );
            expect(first.ok).withContext(JSON.stringify(first)).toBeTrue();
            expect(git(fixture.primary.remotePath, ['rev-parse', 'refs/heads/main']).trim()).toBe(primarySha);
            expect(git(fixture.secondary.remotePath, ['rev-parse', 'refs/heads/main']).trim()).toBe(secondarySha);
            const journal = readEffectJournal(fixture.laneDir, nodeEffectFileSystem);
            const publishRecords = journal.records.filter((record) => record.payload.effect === 'publish-commits');
            expect(publishRecords.length).toBeGreaterThan(0);

            const replayDeps = publishDeps(publish, workspaceFor);
            const replay = await new GitAcceptanceAdapter(replayDeps).publishCommits(
                {laneDir: fixture.laneDir, laneId, cycleId: 'rel-02-cycle-2', snapshotDigest: `sha256:${'b'.repeat(64)}`, policyVersion: 'shipping-v1', runtimeContext: runtimeContextStub(fixture, publish)},
                commitSet, {ok: true, errors: []}, repositories()
            );
            expect(replay.ok).toBeTrue();
            expect(replayDeps.runner.invocations.length).toBe(0);
        }, RUN_TIMEOUT);

        it('a broken remote produces a partial recovery without revoking the durable accept event', async () => {
            // Dedicated bare remotes, isolated from the "publishes/replays"
            // test above: that test's push and this one race under Jasmine's
            // `random: true` order, and reusing one shared remote would make a
            // later push here look like a rejected non-fast-forward instead of
            // the broken-remote failure this scenario is actually proving.
            const freshPrimaryRemote = join(mkdtempSync(join(tmpdir(), 'wt-rel02-remote-')), 'primary.git');
            const freshSecondaryRemote = join(mkdtempSync(join(tmpdir(), 'wt-rel02-remote-')), 'secondary.git');
            for (const remote of [freshPrimaryRemote, freshSecondaryRemote]) {
                mkdirSync(remote, {recursive: true});
                execFileSync('git', ['init', '--quiet', '--bare', '--initial-branch=main'], {cwd: remote});
            }
            const brokenRemote = join(publish.root, 'not-a-remote');
            const brokenRepositories = [
                {id: 'primary', role: 'primary' as const, access: 'write' as const, path: fixture.primary.path, branch: 'main', worktreeMode: 'dedicated' as const, remote: freshPrimaryRemote},
                {id: 'secondary', role: 'integration' as const, access: 'write' as const, path: fixture.secondary.path, branch: 'main', worktreeMode: 'dedicated' as const, remote: brokenRemote}
            ];
            const brokenPrimary = commitBatchChange(fixture.primary.path, 'batch-primary-2.md');
            const brokenSecondary = commitBatchChange(fixture.secondary.path, 'batch-secondary-2.md');
            const brokenCommitSet: CommitSet = {commits: [
                {repositoryId: 'primary', sha: brokenPrimary, expectedBase: primarySha, expectedFiles: expectedTree(fixture.primary.path)},
                {repositoryId: 'secondary', sha: brokenSecondary, expectedBase: secondarySha, expectedFiles: expectedTree(fixture.secondary.path)}
            ]};
            // A fresh, dedicated effect journal directory: `publishCommits`
            // recognizes a repository ID as "already pushed" the first time it
            // is ever verified for *any* commit, cross-cycle (see
            // `gitAcceptancePublication.ts`'s `alreadyVerified`) — the shared
            // `fixture.laneDir` journal already verified `primary`/`secondary`
            // in the test above, so this scenario needs its own journal to
            // observe a genuine first attempt rather than a replay.
            const brokenLaneDir = mkdtempSync(join(tmpdir(), 'wt-rel02-broken-'));
            const deps = publishDeps(publish, workspaceFor);
            const adapter = new GitAcceptanceAdapter(deps);
            const result = await adapter.publishCommits(
                {laneDir: brokenLaneDir, laneId, cycleId: 'rel-02-cycle-3', snapshotDigest: `sha256:${'c'.repeat(64)}`, policyVersion: 'shipping-v1', runtimeContext: runtimeContextStub(fixture, publish)},
                brokenCommitSet, {ok: true, errors: []}, brokenRepositories
            );
            expect(result.ok).withContext(JSON.stringify(result)).toBeFalse();
            expect(result.partialRecovery).toBeTrue();
            const primaryResult = result.repositoryResults.find((entry) => entry.repositoryId === 'primary');
            const secondaryResult = result.repositoryResults.find((entry) => entry.repositoryId === 'secondary');
            expect(primaryResult?.success).toBeTrue();
            expect(secondaryResult?.success).toBeFalse();
            expect(git(freshPrimaryRemote, ['rev-parse', 'refs/heads/main']).trim()).toBe(brokenPrimary);

            // Per-repository push-journal integrity (correction-01 finding #2):
            // `readPushJournal` re-parses and structurally validates the raw
            // JSONL bytes independent of `readEffectJournal`, then locates each
            // repository's own terminal `publish-commits` record by targetIds.
            const journalAfterBroken = readPushJournal(brokenLaneDir);
            const primaryRecord = terminalPublishRecord(journalAfterBroken, 'primary');
            const secondaryRecord = terminalPublishRecord(journalAfterBroken, 'secondary');
            expect(primaryRecord?.payload.phase).withContext(JSON.stringify(journalAfterBroken)).toBe('verified');
            expect(primaryRecord?.laneId).toBe(laneId);
            expect(primaryRecord?.producer).toBe('watchtower-effect-executor');
            expect(primaryRecord?.payload.targetIds).toEqual(['primary']);
            // Publish is an `external`-scope effect (`effectActionRegistry.ts`), so
            // an unverifiable Git push settles as `uncertain`, not `failed`
            // (`effectVerification.ts`'s `classifyIncomplete`) — that is the exact
            // per-repository failure reason this record must carry.
            expect(secondaryRecord?.payload.phase).toBe('uncertain');
            expect(secondaryRecord?.payload.targetIds).toEqual(['secondary']);
            expect(secondaryRecord?.payload.outcome).withContext(secondaryRecord?.payload.outcome ?? '')
                .toContain('TASK_RUNTIME_TASK_EXECUTION_FAILED');

            // The reviewer `accept` worker event this suite's `beforeAll` wrote
            // is a durable journal line the push outcome never touches — read
            // directly, independent of any other spec's derived effect state.
            const workerEvents = readFileSync(join(fixture.laneDir, 'coordinator', 'journal', 'worker-events.jsonl'), 'utf8')
                .trim().split('\n').map((line) => JSON.parse(line) as {type: string; payload: {batch: string}});
            expect(workerEvents.some((event) => event.type === 'accept' && event.payload.batch === BATCH_ID)).toBeTrue();
            // correction-01 finding #1 (blocker, not a fixture omission): the
            // brief requires `wt status` to report the partial-push state with
            // a stable warning (`docs/spec/v1.md` §11.3/§14). Confirmed by
            // reading the actual status-building source, not assumed:
            // `src/contracts/statusModels.ts`'s closed `StatusWarningCode`
            // union has no push/publish/git-acceptance member, and
            // `StatusProjection.ts` never reads `coordinator/effects` or
            // `coordinator/journal/effect-events.jsonl` — status has zero
            // awareness of git-acceptance/push-journal state at all. No
            // existing product surface can produce this warning, and this
            // batch owns only system acceptance fixtures (no new product
            // source module is permitted), so the assertion below documents
            // the current, real behavior precisely instead of asserting a
            // warning that cannot exist yet: `wt status` still succeeds and
            // its warnings/conflicts carry no push-related entry.
            const status = wt(fixture.controlHome, fixture.dataHome, ['status', `--lane=${SLUG}`, '--json', '--no-color']);
            expect(status.status).withContext(status.stdout + status.stderr).toBe(0);
            const statusData = envelope(status).data as {health?: {warnings?: {code?: string}[]}; conflicts?: {kind?: string}[]};
            const warningCodes = (statusData.health?.warnings ?? []).map((warning) => warning.code ?? '');
            expect(warningCodes.some((code) => /push|publish|git.?accept/iu.test(code))).withContext(warningCodes.join(',')).toBeFalse();

            // Retry after the remote is repaired: only the failed repository is re-attempted.
            const repairedRepositories = brokenRepositories.map((entry) => entry.id === 'secondary' ? {...entry, remote: freshSecondaryRemote} : entry);
            const retryDeps = publishDeps(publish, workspaceFor);
            const retryAdapter = new GitAcceptanceAdapter(retryDeps);
            const retry = await retryAdapter.publishCommits(
                {laneDir: brokenLaneDir, laneId, cycleId: 'rel-02-cycle-4', snapshotDigest: `sha256:${'d'.repeat(64)}`, policyVersion: 'shipping-v1', runtimeContext: runtimeContextStub(fixture, publish)},
                brokenCommitSet, {ok: true, errors: []}, repairedRepositories
            );
            expect(retry.ok).withContext(JSON.stringify(retry)).toBeTrue();
            expect(retryDeps.runner.invocations.length).toBe(1);
            expect((retryDeps.runner.invocations[0].input as {targetId: string}).targetId).toBe('secondary');
            expect(git(freshSecondaryRemote, ['rev-parse', 'refs/heads/main']).trim()).toBe(brokenSecondary);

            // The retry updates only the repository that previously failed: a
            // fresh `verified` record for secondary at a later sequence, while
            // primary's original journal record — same event, same sequence —
            // is never re-appended or overwritten.
            const journalAfterRetry = readPushJournal(brokenLaneDir);
            const primaryAfterRetry = terminalPublishRecord(journalAfterRetry, 'primary');
            const secondaryAfterRetry = terminalPublishRecord(journalAfterRetry, 'secondary');
            expect(primaryAfterRetry?.eventId).toBe(primaryRecord?.eventId);
            expect(primaryAfterRetry?.sequence).toBe(primaryRecord?.sequence);
            expect(secondaryAfterRetry?.payload.phase).toBe('verified');
            expect(secondaryAfterRetry?.eventId).not.toBe(secondaryRecord?.eventId);
            expect(secondaryAfterRetry?.sequence ?? -1).toBeGreaterThan(secondaryRecord?.sequence ?? -1);

            rmSync(brokenLaneDir, {recursive: true, force: true});
        }, RUN_TIMEOUT);
    });

    describe('REL-02 phase 7 — copied-template lane is never discovered or modified', () => {
        let fixture: MultiRepoFixture;
        let copiedMarker = '';
        let beforeBytes = '';
        let detached: DetachedCopiedTemplate;

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeMultiRepoFixture({slug: SLUG});
            const init = wt(fixture.controlHome, fixture.dataHome, initArgs(fixture));
            expect(init.status).withContext(init.stderr).toBe(0);
            // See concurrent.spec.ts: the pack-authoring scaffolding lane has no
            // install.json and would make `wt list` fail closed for the whole
            // control home, masking this phase's actual proof.
            rmSync(join(fixture.controlHome, '.watchtower', 'lanes', 'pack-author'), {recursive: true, force: true});
            const templateDir = join(fixture.controlHome, 'copied-template', '.watchtower', 'lanes', 'old-lane');
            mkdirSync(templateDir, {recursive: true});
            copiedMarker = join(templateDir, 'lane.json');
            writeFileSync(copiedMarker, '{"not": "a valid lane.json"}\n');
            chmodSync(copiedMarker, 0o444);
            beforeBytes = readFileSync(copiedMarker, 'utf8');
            detached = makeDetachedCopiedTemplate(fixture.root);
        }, INSTALL_TIMEOUT);
        afterAll(() => { if (copiedMarker !== '') chmodSync(copiedMarker, 0o644); fixture?.remove(); });

        it('wt list from the control home discovers only the real lane, ignoring the copied-template directory', () => {
            const run = wt(fixture.controlHome, fixture.dataHome, ['list', '--json', '--no-color']);
            expect(run.status).withContext(run.stdout + run.stderr).toBe(0);
            const items = (envelope(run).data as {items?: {slug?: string}[]}).items ?? [];
            expect(items.map((item) => item.slug)).toEqual([SLUG]);
        }, RUN_TIMEOUT);

        it('wt status from the real lane directory succeeds and never touches the copied-template bytes', () => {
            const run = wt(fixture.laneDir, fixture.dataHome, ['status', `--lane=${SLUG}`, '--json', '--no-color']);
            expect(run.status).toBe(0);
            expect(readFileSync(copiedMarker, 'utf8')).toBe(beforeBytes);
        }, RUN_TIMEOUT);

        it('the copied-template marker is untouched after both commands: same bytes, unwritable permissions preserved', () => {
            expect(existsSync(copiedMarker)).toBeTrue();
            expect(readFileSync(copiedMarker, 'utf8')).toBe(beforeBytes);
        });

        // correction-01 finding #4: workspace resolution prefers a Git
        // toplevel over ancestor `.watchtower/lanes` search, so a
        // copied-template nested inside the `control` repository (above) is
        // unreachable from any cwd in that repository regardless of location.
        // The ancestor walk-up path (`docs/spec/v1.md` §9.1 step 3) only
        // matters outside a Git worktree — `detached` exercises exactly that.
        it('wt list from the fixture root — a true ancestor of the detached copied-template, outside any Git repository — discovers nothing and never touches either marker', () => {
            const run = wt(fixture.root, fixture.dataHome, ['list', '--json', '--no-color']);
            expect(run.status).withContext(run.stdout + run.stderr).toBe(0);
            const items = (envelope(run).data as {items?: {slug?: string}[]}).items ?? [];
            expect(items).toEqual([]);
            assertMarkerUntouched(detached);
        }, RUN_TIMEOUT);

        it('wt list and wt status from inside, and nested below, a copied-template rooted outside any Git repository fail closed via the real ancestor walk-up, never modifying the marker', () => {
            for (const cwd of [detached.dir, detached.nestedDir]) {
                const list = wt(cwd, fixture.dataHome, ['list', '--json', '--no-color']);
                expect(list.status).withContext(`${cwd}: ${list.stdout}${list.stderr}`).not.toBe(0);
                expect(envelope(list).code).withContext(list.stdout).toBe('ERR_INVALID_LANE_CONFIG');

                const status = wt(cwd, fixture.dataHome, ['status', `--lane=${SLUG}`, '--json', '--no-color']);
                expect(status.status).withContext(`${cwd}: ${status.stdout}${status.stderr}`).not.toBe(0);
                expect(envelope(status).code).withContext(status.stdout).toBe('ERR_INVALID_LANE_CONFIG');
            }
            assertMarkerUntouched(detached);
        }, RUN_TIMEOUT);
    });
}

function expectedTree(repoPath: string): string[] {
    return git(repoPath, ['ls-tree', '-r', '--name-only', 'HEAD']).trim().split('\n').filter((line) => line.length > 0);
}

function runtimeContextStub(fixture: MultiRepoFixture, publish: RealPublishFixture) {
    return {
        workspace: fixture.controlHome, laneId: 'rel-02-multi-repo', initiativeId: 'watchtower-v1', laneSlug: SLUG,
        laneDir: fixture.laneDir, homeRepositoryId: 'primary', repositoriesFile: join(fixture.laneDir, 'repositories.local.json'),
        runtimeRoot: publish.runtimeRoot, runtimeVersion: '1.0.0', knowledgeRoot: join(publish.root, 'knowledge'),
        baseEnvironment: {path: process.env.PATH ?? '/usr/bin:/bin', home: process.env.HOME ?? '/tmp'}
    };
}
