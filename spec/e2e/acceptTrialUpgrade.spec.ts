/**
 * REL-01 release qualification — phase 10, managed runtime upgrade.
 *
 * Split from `accept-trial.spec.ts` per the brief's "split by trial phase"
 * allowance: this phase needs a second staged runtime version and a destructive
 * apply, so it owns an isolated lane rather than sharing the phase 3/5/9 one.
 *
 * The upgrade itself is driven only through the installed `wt` binary. The
 * second runtime version is *staged* through the same accepted RT-04
 * `RuntimeCatalog` the accepted `initEffectFixture` already uses — that is
 * fixture construction, not an assertion path. Every expectation below reads
 * the real filesystem or the CLI's own `--json` envelope.
 */
import {chmodSync, cpSync, readFileSync, readdirSync, statSync, writeFileSync, mkdirSync} from 'node:fs';
import {join} from 'node:path';
import {
    envelope, prepareInstall, requireDist, wt, INSTALL_TIMEOUT, RUN_TIMEOUT, type CliRun
} from './support/acceptTrialHarness.js';
import {makeInitEffectFixture, type InitEffectFixture} from '../foundation/fixtures/initEffectFixture.js';
import {RuntimeCatalog} from '../../src/foundation/runtime/catalog/index.js';
import type {KnowledgeManifestV1, ManifestAsset, RuntimeManifestV1} from '../../src/contracts/runtimeKnowledgeManifests.js';
import {digest} from '../foundation/support/managedAssetsFixtures.js';

const SLUG = 'rel-one-upgrade';
const CURRENT = '1.0.0';
const TARGET = '1.1.0';
const OLDER = '0.9.0';
/** Knowledge version the lane installs with, plus the fixture's own baseline. */
const KNOWLEDGE = '1.1.0';
const KNOWLEDGE_VERSIONS = ['1.0.0', KNOWLEDGE] as const;
/** Lane-owned files the upgrade must never rewrite. */
const LANE_OWNED = ['lane.config.env', 'repositories.local.json'];

function initArgs(fixture: InitEffectFixture): string[] {
    return [
        'init', SLUG, '--tmux-prefix=relup', `--impl-pack=${fixture.packRoot}`,
        `--coordinator-routing=${join(fixture.controlHome, 'routing.json')}`,
        `--scope=${join(fixture.controlHome, 'scope.json')}`, `--runtime=${CURRENT}`, '--json', '--no-color'
    ];
}

/**
 * Stage another runtime version from the fixture's own runtime source, changing
 * one managed asset so the plan has real work to report. Reusing the accepted
 * catalog keeps checksum/staging validation authoritative instead of guessed.
 */
function stageRuntimeVersion(fixture: InitEffectFixture, version: string, body: string): void {
    const source = join(fixture.root, `runtime-source-${version}`);
    cpSync(join(fixture.root, 'runtime-source'), source, {recursive: true});
    writeFileSync(join(source, 'runtime-nvb', 'runtime-nvb.js'), body);
    // The upgrade applier requires an executable mode on the runtime module it
    // relinks (`upgradeApplyValidation.assertChecksum`).
    chmodSync(join(source, 'runtime-nvb', 'runtime-nvb.js'), 0o755);
    const read = (name: string): string => readFileSync(join(source, 'runtime-nvb', name), 'utf8');
    const assets: ManifestAsset[] = [
        {path: 'runtime-nvb/runtime-nvb.js', sha256: digest(body), mode: '0755'},
        {path: 'runtime-nvb/runtime-nvb.json', sha256: digest(read('runtime-nvb.json')), mode: '0644'},
        {path: 'runtime-nvb/task-catalog.json', sha256: digest(read('task-catalog.json')), mode: '0644'}
    ];
    const manifest: RuntimeManifestV1 = {
        schemaVersion: 1, manifestId: 'watchtower-runtime/v1', runtimeVersion: version,
        minimumCliVersion: '0.1.0', compatibleLaneSchemaVersions: [1], compatibleKnowledgeVersions: [...KNOWLEDGE_VERSIONS],
        assets, actions: [], requiredCommands: []
    };
    new RuntimeCatalog({dataRoot: () => fixture.dataHome}).stageRuntime(version, manifest, source);
}

/** Byte snapshot of the files the upgrade must never rewrite. */
function laneOwnedBytes(laneDir: string): Record<string, string> {
    const snapshot: Record<string, string> = {};
    for (const name of LANE_OWNED) snapshot[name] = readFileSync(join(laneDir, name), 'utf8');
    return snapshot;
}

/**
 * Stage a knowledge version that declares every runtime version this phase
 * moves between. The accepted fixture stages knowledge `1.0.0` compatible with
 * runtime `1.0.0` only, and the planner requires *bidirectional* declarations,
 * so an upgrade needs a knowledge manifest that names the target too.
 */
function stageKnowledgeVersion(fixture: InitEffectFixture, version: string, runtimes: readonly string[]): void {
    const source = join(fixture.root, `knowledge-source-${version}`);
    mkdirSync(source, {recursive: true});
    const playbook = '# playbook\n';
    writeFileSync(join(source, 'playbook.md'), playbook);
    const manifest: KnowledgeManifestV1 = {
        schemaVersion: 1, manifestId: 'watchtower-knowledge/v1', knowledgeVersion: version,
        // The manifest parser requires strictly ascending, de-duplicated versions.
        compatibleRuntimeVersions: [...runtimes].sort(),
        provenance: {repository: 'watchtower', commit: 'c'.repeat(40), importRecordSha256: digest('import-record')},
        assets: [{path: 'playbook.md', sha256: digest(playbook), mode: '0644'}]
    };
    new RuntimeCatalog({dataRoot: () => fixture.dataHome}).stageKnowledge(version, manifest, source);
}

function installedRuntime(laneDir: string): string {
    const install = JSON.parse(readFileSync(join(laneDir, 'install.json'), 'utf8')) as {runtimeVersion?: string};
    return install.runtimeVersion ?? '';
}

function upgrade(fixture: InitEffectFixture, args: readonly string[]): CliRun {
    return wt(fixture.controlHome, fixture.dataHome,
        ['upgrade', `--lane=${SLUG}`, ...args, '--json', '--no-color']);
}

if (requireDist()) {
    describe('REL-01 phase 10 — managed runtime upgrade', () => {
        let fixture: InitEffectFixture;
        let laneDir = '';
        let sessionTurn = '';

        beforeAll(async () => {
            await prepareInstall();
            fixture = makeInitEffectFixture({slug: SLUG});
            laneDir = join(fixture.controlHome, '.watchtower', 'lanes', SLUG);
            stageRuntimeVersion(fixture, TARGET, '// runtime-nvb module v1.1.0\n');
            stageRuntimeVersion(fixture, OLDER, '// runtime-nvb module v0.9.0\n');
            stageKnowledgeVersion(fixture, KNOWLEDGE, [CURRENT, TARGET, OLDER]);
            const init = wt(fixture.controlHome, fixture.dataHome, initArgs(fixture));
            expect(init.status).withContext(init.stderr).toBe(0);

            // Operator-session history the upgrade must preserve. It is written
            // directly because session *creation* is fenced by the accepted v1
            // §4 `SESSION_COMMAND_TERMINAL_REQUIRED` rule; the upgrade contract
            // under test is only that manifest-owned paths never claim it.
            sessionTurn = join(laneDir, 'coordinator', 'operator-sessions', 'rel-one-turn.json');
            mkdirSync(join(laneDir, 'coordinator', 'operator-sessions'), {recursive: true});
            writeFileSync(sessionTurn, '{"turn":1,"note":"rel-01 phase 10 preservation probe"}\n');
        }, INSTALL_TIMEOUT);

        afterAll(() => fixture?.remove());

        // Jasmine randomizes spec order, so the preview→apply sequence — which is
        // inherently ordered and destructive — is proven inside one spec. The
        // downgrade refusal below is written to hold in either runtime state.
        it('previews without writing, then applies only manifest-owned paths', () => {
            const beforeOwned = laneOwnedBytes(laneDir);
            const beforeInstall = readFileSync(join(laneDir, 'install.json'), 'utf8');
            const beforeBin = readdirSync(join(laneDir, 'bin')).sort();
            const beforeMtimes = beforeBin.map((name) => statSync(join(laneDir, 'bin', name)).mtimeMs);

            const preview = upgrade(fixture, [`--to=${TARGET}`]);
            expect(preview.status).withContext(preview.stderr).toBe(0);
            const plan = envelope(preview).data as {conflicted?: unknown[]};
            expect(plan.conflicted ?? []).withContext(preview.stdout).toEqual([]);

            expect(laneOwnedBytes(laneDir)).toEqual(beforeOwned);
            expect(readFileSync(join(laneDir, 'install.json'), 'utf8')).toBe(beforeInstall);
            expect(readdirSync(join(laneDir, 'bin')).sort()).toEqual(beforeBin);
            expect(beforeBin.map((name) => statSync(join(laneDir, 'bin', name)).mtimeMs)).toEqual(beforeMtimes);

            const applied = upgrade(fixture, [`--to=${TARGET}`, '--apply']);
            expect(applied.status).withContext(applied.stderr).toBe(0);
            expect(installedRuntime(laneDir)).withContext(applied.stdout).toBe(TARGET);

            expect(laneOwnedBytes(laneDir)).toEqual(beforeOwned);
            expect(readFileSync(sessionTurn, 'utf8')).toContain('rel-01 phase 10 preservation probe');
            expect(new RuntimeCatalog({dataRoot: () => fixture.dataHome}).listInstalledRuntimes()).toContain(CURRENT);
        }, RUN_TIMEOUT);

        /**
         * UK-03 relink correction: digest-equal assets in a new runtime root must
         * still be relinked when their declared target path advances.
         */
        it('leaves every managed link consistent with install.json after an apply', () => {
            expect(upgrade(fixture, [`--to=${TARGET}`, '--apply']).status).withContext('apply before doctor').toBe(0);

            const doctor = wt(fixture.controlHome, fixture.dataHome, ['doctor', `--lane=${SLUG}`, '--json', '--no-color']);
            const checks = (envelope(doctor).data as {checks?: {id: string; status: string}[]}).checks ?? [];
            expect(checks.filter((check) => check.status === 'fail')).withContext(doctor.stdout).toEqual([]);
        }, RUN_TIMEOUT);

        it('refuses a downgrade unless --allow-downgrade is passed', () => {
            const before = installedRuntime(laneDir);

            const run = upgrade(fixture, [`--to=${OLDER}`, '--apply']);

            expect(run.status).withContext(run.stdout).not.toBe(0);
            expect(envelope(run).code).withContext(run.stdout).toBe('ERR_UNSAFE_MUTATION');
            expect(installedRuntime(laneDir)).toBe(before);
        }, RUN_TIMEOUT);
    });
}
