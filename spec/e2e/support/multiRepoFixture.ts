/**
 * REL-02 multi-repository init fixture: a real Git control home (repository
 * `primary`) plus a second real Git worktree (repository `secondary`), each
 * with its own real local bare remote, bound together by one `--scope`
 * document and one accepted, sealed, committed implementation pack that
 * declares both repository IDs.
 *
 * Modeled on `spec/foundation/fixtures/initEffectFixture.ts` (the accepted
 * REL-01 single-repository fixture) but generalized to N writable repository
 * bindings, which that fixture's hardcoded single `REPOSITORY_ID` cannot
 * express. Nothing here doubles for product code under proof: the pack is
 * built by the same real `buildPackFixture`, and the `InitPlan` comes from the
 * real `InitPlanner`, exactly as the REL-01 fixture does.
 */
import {mkdirSync, mkdtempSync, realpathSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {InitPlanner, type InitPlan} from '../../../src/foundation/init/index.js';
import type {InitEffectRequest} from '../../../src/foundation/lane/index.js';
import {RuntimeCatalog} from '../../../src/foundation/runtime/catalog/index.js';
import type {ManifestAsset, RuntimeManifestV1, KnowledgeManifestV1} from '../../../src/contracts/runtimeKnowledgeManifests.js';
import {catalogDocument, digest} from '../../foundation/support/managedAssetsFixtures.js';
import {cleanupFixture} from '../../foundation/support/runtimeCatalogFixtures.js';
import {
    ACCEPTED_INPUT_ACCEPTANCE_REF, ACCEPTED_INPUT_PATH, ACCEPTED_INPUT_SHA256, AUTHOR_LANE_ID, REVIEW_SESSION_ID,
    buildPackFixture, packReviewEvents
} from '../../foundation/fixtures/packFixture.js';

const GIT_IDENTITY = ['-c', 'user.name=watchtower', '-c', 'user.email=watchtower@example.test'];
export const PRIMARY_ID = 'primary';
export const SECONDARY_ID = 'secondary';
export const RUNTIME_VERSION = '1.0.0';
export const KNOWLEDGE_VERSION = '1.0.0';

export interface MultiRepoBinding {
    readonly id: string;
    readonly path: string;
    readonly remotePath: string;
    readonly branch: string;
    /** The `base` commit's SHA — every batch commit's expected ancestry root. */
    readonly baseline: string;
}

export interface MultiRepoFixture {
    readonly root: string;
    readonly controlHome: string;
    readonly dataHome: string;
    readonly packRoot: string;
    readonly laneDir: string;
    readonly plan: InitPlan;
    readonly request: InitEffectRequest;
    readonly primary: MultiRepoBinding;
    readonly secondary: MultiRepoBinding;
    readonly remove: () => void;
}

export interface MultiRepoFixtureOptions {
    readonly slug?: string;
}

export function makeMultiRepoFixture(options: MultiRepoFixtureOptions = {}): MultiRepoFixture {
    const root = realpathSync(mkdtempSync(join(tmpdir(), 'wt-rel02-mr-')));
    const controlHome = join(root, 'control');
    const secondaryPath = join(root, 'secondary');
    const dataHome = join(root, 'data');
    for (const dir of [controlHome, secondaryPath, dataHome]) mkdirSync(dir, {recursive: true});
    const primaryRemote = bareRemote(root, 'primary');
    const secondaryRemote = bareRemote(root, 'secondary');
    const primaryBaseline = stageWorkingRepo(controlHome, primaryRemote);
    const secondaryBaseline = stageWorkingRepo(secondaryPath, secondaryRemote);
    writeFileSync(join(controlHome, '.gitignore'), '/.watchtower/\n');
    stagePack(controlHome, primaryBaseline, secondaryBaseline);
    writeFileSync(join(controlHome, 'scope.json'), `${JSON.stringify(scope(controlHome, secondaryPath), null, 2)}\n`);
    writeFileSync(join(controlHome, 'routing.json'), `${JSON.stringify(routingPolicy(), null, 2)}\n`);
    commitControlHome(controlHome);
    stageAuthoringLane(controlHome);
    stageRuntime(dataHome);
    stageKnowledge(dataHome);
    const previousDataHome = process.env.WATCHTOWER_DATA_HOME;
    process.env.WATCHTOWER_DATA_HOME = dataHome;
    const slug = options.slug ?? 'multi-repo';
    const plan = new InitPlanner().buildInitPlan({
        slug, tmuxPrefix: 'mr', implPackPath: join(controlHome, 'pack'),
        coordinatorRoutingPath: join(controlHome, 'routing.json'), scopePath: join(controlHome, 'scope.json'),
        runtimeVersion: RUNTIME_VERSION, workspacePath: controlHome, updateGitignore: false, dryRun: false, cwd: controlHome
    });
    return {
        root, controlHome, dataHome, packRoot: join(controlHome, 'pack'), laneDir: plan.laneDir, plan,
        request: {plan, dataHome},
        primary: {id: PRIMARY_ID, path: controlHome, remotePath: primaryRemote, branch: 'main', baseline: primaryBaseline},
        secondary: {id: SECONDARY_ID, path: secondaryPath, remotePath: secondaryRemote, branch: 'main', baseline: secondaryBaseline},
        remove: () => {
            if (previousDataHome === undefined) delete process.env.WATCHTOWER_DATA_HOME;
            else process.env.WATCHTOWER_DATA_HOME = previousDataHome;
            cleanupFixture(root);
        }
    };
}

function git(cwd: string, args: readonly string[]): string {
    return execFileSync('git', [...args], {cwd, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore']});
}

/** A real local bare remote, so a real `git push` has somewhere to land. */
function bareRemote(root: string, name: string): string {
    const remote = join(root, 'remotes', `${name}.git`);
    mkdirSync(remote, {recursive: true});
    git(remote, ['init', '--quiet', '--bare', '--initial-branch=main']);
    return remote;
}

/** Initializes a real worktree, wires the bare remote as `origin`, and returns its baseline revision. */
function stageWorkingRepo(path: string, remote: string): string {
    git(path, ['init', '--quiet', '--initial-branch=main']);
    git(path, ['remote', 'add', 'origin', remote]);
    writeFileSync(join(path, 'README.md'), `# ${path}\n`);
    git(path, ['add', '--all']);
    git(path, [...GIT_IDENTITY, 'commit', '--quiet', '--message=base']);
    return git(path, ['rev-parse', 'HEAD']).trim();
}

function stagePack(controlHome: string, primaryBaseline: string, secondaryBaseline: string): void {
    const manifest = {
        packRepository: PRIMARY_ID,
        repositories: [{id: PRIMARY_ID, role: 'primary', access: 'write'}, {id: SECONDARY_ID, role: 'integration', access: 'write'}],
        sourceBaselines: {[PRIMARY_ID]: {revision: primaryBaseline, dirty: false}, [SECONDARY_ID]: {revision: secondaryBaseline, dirty: false}},
        acceptedInputs: [{repository: PRIMARY_ID, path: ACCEPTED_INPUT_PATH, sha256: ACCEPTED_INPUT_SHA256, acceptanceRef: ACCEPTED_INPUT_ACCEPTANCE_REF}],
        batches: [{id: 'B1', title: 'Batch one', dependsOn: [], primaryRepository: PRIMARY_ID,
            workBrief: 'work-batches/B1.md', reviewBrief: 'review-batches/B1.md', requirements: ['REQ-1'],
            repositories: [{id: PRIMARY_ID, access: 'write', paths: ['src/**'], claimMode: 'exclusive-write'},
                {id: SECONDARY_ID, access: 'write', paths: ['src/**'], claimMode: 'exclusive-write'}],
            implementationReasoning: 'R5', reviewReasoning: 'R5', workload: 'large', proofClasses: ['unit']}],
        requirements: [{id: 'REQ-1', repository: PRIMARY_ID, source: 'requirements-traceability.md', workBatches: ['B1'], reviewBatches: ['B1']}]
    };
    const draft = buildPackFixture({manifest});
    writeFixtureFiles(controlHome, draft, (path) => !path.endsWith('/pack-acceptance.json') && !path.endsWith('/implementation-pack.lock.json'));
    writeFileSync(join(controlHome, ACCEPTED_INPUT_ACCEPTANCE_REF), `${JSON.stringify({
        verdict: 'accept', repository: PRIMARY_ID, inputPath: ACCEPTED_INPUT_PATH,
        inputSha256: ACCEPTED_INPUT_SHA256, reviewSessionId: REVIEW_SESSION_ID
    }, null, 2)}\n`);
    git(controlHome, ['add', '--all']);
    git(controlHome, [...GIT_IDENTITY, 'commit', '--quiet', '--message=candidate']);
    const reviewedCommit = git(controlHome, ['rev-parse', 'HEAD']).trim();
    const published = buildPackFixture({manifest, acceptance: {reviewedCommit}});
    writeFixtureFiles(controlHome, published, (path) => path.endsWith('/pack-acceptance.json') || path.endsWith('/implementation-pack.lock.json'));
}

function writeFixtureFiles(controlHome: string, fixture: ReturnType<typeof buildPackFixture>, accept: (path: string) => boolean): void {
    for (const [absolute, bytes] of fixture.files) {
        if (!accept(absolute)) continue;
        const target = join(controlHome, absolute.slice('/repo/'.length));
        mkdirSync(dirname(target), {recursive: true});
        writeFileSync(target, bytes);
    }
}

function commitControlHome(controlHome: string): void {
    git(controlHome, ['add', '--all']);
    git(controlHome, [...GIT_IDENTITY, 'commit', '--quiet', '--message=publication']);
}

function stageAuthoringLane(controlHome: string): void {
    const laneDir = join(controlHome, '.watchtower', 'lanes', 'pack-author');
    mkdirSync(join(laneDir, 'state'), {recursive: true});
    writeFileSync(join(laneDir, 'lane.json'), `${JSON.stringify({
        schemaVersion: 1, laneId: AUTHOR_LANE_ID, kind: 'implementation', slug: 'pack-author',
        initiativeId: 'watchtower-v1', controlHomeRepository: PRIMARY_ID, laneDir: '.watchtower/lanes/pack-author',
        repositories: [{id: PRIMARY_ID, role: 'primary', access: 'write'}], createdAt: '2026-08-11T10:00:00Z'
    }, null, 2)}\n`);
    writeFileSync(join(laneDir, 'repositories.local.json'), `${JSON.stringify({
        schemaVersion: 1, repositories: [{id: PRIMARY_ID, path: controlHome, branch: 'main', worktreeMode: 'dedicated', role: 'primary', access: 'write'}]
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

function scope(controlHome: string, secondaryPath: string) {
    return {
        schemaVersion: 1,
        repositories: [
            {id: PRIMARY_ID, path: controlHome, branch: 'main', worktreeMode: 'dedicated', role: 'primary', access: 'write'},
            {id: SECONDARY_ID, path: secondaryPath, branch: 'main', worktreeMode: 'dedicated', role: 'integration', access: 'write'}
        ]
    };
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
