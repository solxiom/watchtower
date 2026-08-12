/**
 * A real, on-disk init environment for the LC-11 effect proof: a Git control
 * home holding a committed, accepted, sealed implementation pack, the
 * authoring lane whose durable pack-review journal proves reviewer
 * independence, an isolated data home with one staged runtime and knowledge
 * version, and the `InitPlan` the accepted LC-01 planner builds from them.
 *
 * Nothing here is a double for a batch under proof: the plan comes from the
 * real `InitPlanner`, the pack is consumed by the real LC-02 host adapters,
 * and the runtime/knowledge versions are staged through the real RT-04
 * catalog. The only hand-built lane is the *authoring* lane, which
 * `v1-contracts.md` §3.3 requires to already exist before any pack can be
 * accepted; the lane under proof is always created by the effect itself.
 */
import {mkdirSync, mkdtempSync, readdirSync, realpathSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {randomUUID} from 'node:crypto';
import {InitPlanner, type InitPlan} from '../../../src/foundation/init/index.js';
import type {InitEffectRequest} from '../../../src/foundation/lane/index.js';
import {RuntimeCatalog} from '../../../src/foundation/runtime/catalog/index.js';
import type {ManifestAsset, RuntimeManifestV1, KnowledgeManifestV1} from '../../../src/contracts/runtimeKnowledgeManifests.js';
import {catalogDocument, digest} from '../support/managedAssetsFixtures.js';
import {cleanupFixture} from '../support/runtimeCatalogFixtures.js';
import {
    ACCEPTED_INPUT_ACCEPTANCE_REF, ACCEPTED_INPUT_PATH, ACCEPTED_INPUT_SHA256, AUTHOR_LANE_ID, REVIEW_SESSION_ID,
    buildPackFixture, packReviewEvents
} from './packFixture.js';

const GIT_IDENTITY = ['-c', 'user.name=watchtower', '-c', 'user.email=watchtower@example.test'];
const REPOSITORY_ID = 'nirvana';
export const RUNTIME_VERSION = '1.0.0';
export const KNOWLEDGE_VERSION = '1.0.0';
export const LANE_SLUG = 'lc-eleven';

export interface InitEffectFixture {
    readonly root: string;
    readonly controlHome: string;
    readonly dataHome: string;
    readonly packRoot: string;
    readonly laneDir: string;
    readonly plan: InitPlan;
    readonly request: InitEffectRequest;
    readonly inventory: () => string;
    readonly remove: () => void;
}

export interface InitEffectFixtureOptions {
    readonly slug?: string;
    /** Manifest/acceptance overrides applied consistently to the sealed candidate and its publication. */
    readonly packManifest?: Record<string, unknown>;
    readonly packAcceptance?: Record<string, unknown>;
    /** Declares a second repository the accepted pack does not name, for the mismatch refusal. */
    readonly extraRepository?: boolean;
    readonly runtimeVersion?: string | undefined;
    readonly updateGitignore?: boolean;
    /** Omit the `/.watchtower/` ignore line so `--update-gitignore` has work to do. */
    readonly gitignoreCovered?: boolean;
}

export function makeInitEffectFixture(options: InitEffectFixtureOptions = {}): InitEffectFixture {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'wt-lc11-')));
    const controlHome = join(root, 'control');
    const dataHome = join(root, 'data');
    mkdirSync(controlHome, {recursive: true});
    mkdirSync(dataHome, {recursive: true});
    stageControlHome(controlHome, options);
    if (options.extraRepository === true) stageExtraRepository(root, controlHome);
    stageAuthoringLane(controlHome);
    stageRuntime(dataHome);
    stageKnowledge(dataHome);
    // Restored by `remove()` so this fixture never leaks its isolated data
    // home into another spec running in the same Jasmine process.
    const previousDataHome = process.env.WATCHTOWER_DATA_HOME;
    process.env.WATCHTOWER_DATA_HOME = dataHome;
    const slug = options.slug ?? LANE_SLUG;
    const plan = new InitPlanner().buildInitPlan({
        slug, tmuxPrefix: 'lc11', implPackPath: join(controlHome, 'pack'),
        coordinatorRoutingPath: join(controlHome, 'routing.json'), scopePath: join(controlHome, 'scope.json'),
        runtimeVersion: 'runtimeVersion' in options ? options.runtimeVersion : RUNTIME_VERSION,
        workspacePath: controlHome, updateGitignore: options.updateGitignore ?? false, dryRun: false, cwd: controlHome
    });
    return {
        root, controlHome, dataHome, packRoot: join(controlHome, 'pack'), laneDir: plan.laneDir, plan,
        request: {plan, dataHome},
        inventory: () => inventory(controlHome),
        remove: () => {
            if (previousDataHome === undefined) delete process.env.WATCHTOWER_DATA_HOME;
            else process.env.WATCHTOWER_DATA_HOME = previousDataHome;
            cleanupFixture(root);
        }
    };
}

/**
 * Every path under the control home, so a rollback proof can compare exactly.
 * The data home is deliberately excluded: `<dataHome>/index/` is the lock
 * scope's own directory, created before any lane mutation and legitimately
 * left behind; membership publication is asserted by name instead.
 */
export function inventory(controlHome: string): string {
    return readdirSync(controlHome, {recursive: true, encoding: 'utf8'})
        .map((name) => join(controlHome, name)).sort().join('\n');
}

function git(cwd: string, args: readonly string[]): string {
    return execFileSync('git', [...args], {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
}

function stageControlHome(controlHome: string, options: InitEffectFixtureOptions): void {
    git(controlHome, ['init', '--quiet', '--initial-branch=main']);
    writeFileSync(join(controlHome, '.gitignore'), options.gitignoreCovered === false ? 'node_modules/\n' : '/.watchtower/\n');
    writeFileSync(join(controlHome, 'routing.json'), `${JSON.stringify(routingPolicy(), null, 2)}\n`);
    writeFileSync(join(controlHome, 'scope.json'), `${JSON.stringify(scope(controlHome), null, 2)}\n`);
    git(controlHome, ['add', '--all']);
    git(controlHome, [...GIT_IDENTITY, 'commit', '--quiet', '--message=base']);
    const baseline = git(controlHome, ['rev-parse', 'HEAD']).trim();
    const manifest = {sourceBaselines: {[REPOSITORY_ID]: {revision: baseline, dirty: false}}, ...options.packManifest};
    const draft = buildPackFixture({manifest, acceptance: options.packAcceptance});
    writeFixtureFiles(controlHome, draft, (path) => !path.endsWith('/pack-acceptance.json')
        && !path.endsWith('/implementation-pack.lock.json'));
    writeFileSync(join(controlHome, ACCEPTED_INPUT_ACCEPTANCE_REF), `${JSON.stringify(acceptanceEvidence(), null, 2)}\n`);
    git(controlHome, ['add', '--all']);
    git(controlHome, [...GIT_IDENTITY, 'commit', '--quiet', '--message=candidate']);
    const reviewedCommit = git(controlHome, ['rev-parse', 'HEAD']).trim();
    const published = buildPackFixture({manifest, acceptance: {reviewedCommit, ...options.packAcceptance}});
    writeFixtureFiles(controlHome, published, (path) => path.endsWith('/pack-acceptance.json')
        || path.endsWith('/implementation-pack.lock.json'));
    git(controlHome, ['add', '--all']);
    git(controlHome, [...GIT_IDENTITY, 'commit', '--quiet', '--message=publication']);
}

/** Copies the in-memory pack fixture's `/repo`-rooted byte map onto the real control home. */
function writeFixtureFiles(
    controlHome: string, fixture: ReturnType<typeof buildPackFixture>, accept: (path: string) => boolean
): void {
    for (const [absolute, bytes] of fixture.files) {
        if (!accept(absolute)) continue;
        const target = join(controlHome, absolute.slice('/repo/'.length));
        mkdirSync(dirname(target), {recursive: true});
        writeFileSync(target, bytes);
    }
}

/**
 * The pack author's lane. §3.3 makes its durable `pack-review-events.jsonl`
 * the only reviewer-independence authority, so a pack can never be accepted
 * without one already existing.
 */
function stageAuthoringLane(controlHome: string): void {
    const laneDir = join(controlHome, '.watchtower', 'lanes', 'pack-author');
    mkdirSync(join(laneDir, 'state'), {recursive: true});
    writeFileSync(join(laneDir, 'lane.json'), `${JSON.stringify({
        schemaVersion: 1, laneId: AUTHOR_LANE_ID, kind: 'implementation', slug: 'pack-author',
        initiativeId: 'watchtower-v1', controlHomeRepository: REPOSITORY_ID, laneDir: '.watchtower/lanes/pack-author',
        repositories: [{id: REPOSITORY_ID, role: 'primary', access: 'write'}], createdAt: '2026-07-31T10:00:00Z'
    }, null, 2)}\n`);
    writeFileSync(join(laneDir, 'repositories.local.json'), `${JSON.stringify({
        schemaVersion: 1, repositories: [binding(controlHome)]
    }, null, 2)}\n`);
    writeFileSync(join(laneDir, 'state', 'coordinator-lane-state.txt'), 'lane_status=complete\n');
    writeFileSync(join(laneDir, 'state', 'pack-review-events.jsonl'),
        `${packReviewEvents().map((event) => JSON.stringify(event)).join('\n')}\n`);
}

function stageRuntime(dataHome: string): void {
    const source = join(dirname(dataHome), 'runtime-source');
    mkdirSync(join(source, 'runtime-nvb'), {recursive: true});
    const catalog = `${JSON.stringify(catalogDocument())}`;
    const config = JSON.stringify({tasks: {}});
    const runtimeModule = '// runtime-nvb module\n';
    writeFileSync(join(source, 'runtime-nvb', 'task-catalog.json'), catalog);
    writeFileSync(join(source, 'runtime-nvb', 'runtime-nvb.json'), config);
    writeFileSync(join(source, 'runtime-nvb', 'runtime-nvb.js'), runtimeModule);
    const assets: ManifestAsset[] = [
        {path: 'runtime-nvb/runtime-nvb.js', sha256: digest(runtimeModule), mode: '0644'},
        {path: 'runtime-nvb/runtime-nvb.json', sha256: digest(config), mode: '0644'},
        {path: 'runtime-nvb/task-catalog.json', sha256: digest(catalog), mode: '0644'}
    ];
    const manifest: RuntimeManifestV1 = {
        schemaVersion: 1, manifestId: 'watchtower-runtime/v1', runtimeVersion: RUNTIME_VERSION,
        minimumCliVersion: '0.1.0', compatibleLaneSchemaVersions: [1], compatibleKnowledgeVersions: [KNOWLEDGE_VERSION],
        assets, actions: [], requiredCommands: []
    };
    new RuntimeCatalog({dataRoot: () => dataHome}).stageRuntime(RUNTIME_VERSION, manifest, source);
}

function stageKnowledge(dataHome: string): void {
    const source = join(dirname(dataHome), 'knowledge-source');
    mkdirSync(source, {recursive: true});
    const playbook = '# playbook\n';
    writeFileSync(join(source, 'playbook.md'), playbook);
    const manifest: KnowledgeManifestV1 = {
        schemaVersion: 1, manifestId: 'watchtower-knowledge/v1', knowledgeVersion: KNOWLEDGE_VERSION,
        compatibleRuntimeVersions: [RUNTIME_VERSION],
        provenance: {repository: 'watchtower', commit: 'c'.repeat(40), importRecordSha256: digest('import-record')},
        assets: [{path: 'playbook.md', sha256: digest(playbook), mode: '0644'}]
    };
    new RuntimeCatalog({dataRoot: () => dataHome}).stageKnowledge(KNOWLEDGE_VERSION, manifest, source);
}

/**
 * A second real worktree declared in `--scope` but absent from the accepted
 * pack's `repositories`, so the consumer's one-to-one repository-fact rule
 * refuses the mismatch.
 */
function stageExtraRepository(root: string, controlHome: string): void {
    const extra = join(root, 'extra');
    mkdirSync(extra, {recursive: true});
    git(extra, ['init', '--quiet', '--initial-branch=main']);
    writeFileSync(join(extra, 'README.md'), '# extra\n');
    git(extra, ['add', '--all']);
    git(extra, [...GIT_IDENTITY, 'commit', '--quiet', '--message=extra']);
    writeFileSync(join(controlHome, 'scope.json'), `${JSON.stringify({schemaVersion: 1, repositories: [
        binding(controlHome),
        {id: 'extra', path: extra, branch: 'main', worktreeMode: 'dedicated', role: 'integration', access: 'read'}
    ]}, null, 2)}\n`);
}

function binding(controlHome: string) {
    return {id: REPOSITORY_ID, path: controlHome, branch: 'main', worktreeMode: 'dedicated',
        role: 'primary', access: 'write'};
}

function scope(controlHome: string) {
    return {schemaVersion: 1, repositories: [binding(controlHome)]};
}

function acceptanceEvidence() {
    return {verdict: 'accept', repository: REPOSITORY_ID, inputPath: ACCEPTED_INPUT_PATH,
        inputSha256: ACCEPTED_INPUT_SHA256, reviewSessionId: REVIEW_SESSION_ID};
}

function routingPolicy(): object {
    const endpoint = {endpointId: 'high', hostId: 'local', osUser: 'operator', adapterId: 'opencode-cli',
        provider: 'openai', accountId: 'primary', model: 'configured', effort: 'high', capabilityClass: 'C5'};
    const classes = {D1: {minimumCapability: 'C2', primary: 'high', fallbacks: []},
        D2: {minimumCapability: 'C3', primary: 'high', fallbacks: []},
        D3: {minimumCapability: 'C5', primary: 'high', fallbacks: []}};
    const sessions = {D1: {primary: 'high', fallbacks: []}, D2: {primary: 'high', fallbacks: []},
        D3: {primary: 'high', fallbacks: []}};
    return {schemaVersion: 1, endpoints: [endpoint], classes, operatorSessionClasses: sessions,
        operatorSessionBudgetPolicyRef: 'context-policy.json#operatorSession'};
}

/** A distinct lane slug per call, so two fixtures in one suite never collide. */
export function uniqueSlug(): string {
    return `lc-${randomUUID().slice(0, 8)}`;
}
