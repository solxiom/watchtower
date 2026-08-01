import {createHash} from 'node:crypto';
import {
    existsSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, readlinkSync, readdirSync, rmSync, symlinkSync,
    writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import type {WorkerEventRecord} from '../../src/contracts/index.js';
import {semanticDigest} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';

export interface FixtureRepository {
    readonly id: string;
    readonly path: string;
    readonly role: string;
    readonly access: 'read' | 'write';
    readonly worktreeMode: 'dedicated' | 'shared';
}

export interface LaneFixtureOptions {
    readonly slug?: string;
    readonly laneId?: string;
    readonly initiativeId?: string;
    readonly lifecycle?: string;
    readonly activeBatch?: string;
    readonly runtimeVersion?: string;
    readonly configLines?: readonly string[];
    readonly install?: unknown;
    readonly packAvailable?: boolean;
    readonly runtimeAvailable?: boolean;
    readonly repositories?: readonly FixtureRepository[];
    readonly claims?: readonly unknown[];
    readonly nestedPackLock?: boolean;
    readonly acceptanceRef?: string;
    readonly acceptedAt?: string;
    readonly acceptanceFindings?: readonly Readonly<Record<string, string>>[];
    readonly omitReviewAuthority?: boolean;
    readonly baselineRevision?: string;
    readonly proofInputs?: readonly Readonly<{repository: string; path: string; optional: boolean}>[];
    readonly batchProofInputs?: readonly Readonly<{repository: string; path: string; optional: boolean}>[];
    readonly missingPackPath?: string;
    readonly reviewedSymlinkPath?: string;
    readonly requirementBatchId?: string;
    readonly packRequirements?: readonly Readonly<{
        id: string;
        workBatches: readonly string[];
        reviewBatches: readonly string[];
    }>[];
    readonly packBatches?: readonly Readonly<{
        id: string;
        requirements: readonly string[];
        workBrief: string;
        reviewBrief: string;
    }>[];
}

export interface ReadCommandFixture {
    readonly root: string;
    readonly controlHome: string;
    readonly dataHome: string;
    readonly secondary: string;
    remove(): void;
}

export function createReadCommandFixture(): ReadCommandFixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-rm10-'));
    const controlHome = createRepository(join(root, 'control-home'));
    const secondary = createRepository(join(root, 'secondary'));
    const dataHome = join(root, 'data-home');
    mkdirSync(join(dataHome, 'index'), {recursive: true});
    return {root, controlHome, dataHome, secondary, remove: () => rmSync(root, {recursive: true, force: true})};
}

export function createRepository(path: string): string {
    mkdirSync(path, {recursive: true});
    cmd.execSync({command: 'git', args: ['init', '-b', 'main'], options: {cwd: path, stdio: ['ignore', 'ignore', 'ignore']}});
    git(path, ['config', 'user.email', 'watchtower-fixture@example.invalid']);
    git(path, ['config', 'user.name', 'Watchtower-Fixture']);
    writeFileSync(join(path, 'accepted-input.md'), 'accepted input\n');
    git(path, ['add', 'accepted-input.md']);
    git(path, ['commit', '-m', 'fixture-baseline']);
    return path;
}

export function createLane(fixture: ReadCommandFixture, options: LaneFixtureOptions = {}): string {
    const slug = options.slug ?? 'lane-a';
    const laneId = options.laneId ?? '11111111-1111-4111-8111-111111111111';
    const initiativeId = options.initiativeId ?? 'initiative-a';
    const repositories = options.repositories ?? [repository('main', fixture.controlHome, 'primary', 'write')];
    const laneDir = join(fixture.controlHome, '.watchtower', 'lanes', slug);
    mkdirSync(join(laneDir, 'state'), {recursive: true});
    const manifestRepositories = repositories.map(({id, role, access}) => ({id, role, access}));
    writeJson(join(laneDir, 'lane.json'), {
        schemaVersion: 1, laneId, kind: 'implementation', slug, initiativeId,
        controlHomeRepository: 'main', laneDir: `.watchtower/lanes/${slug}`,
        implementationPack: {repository: 'main', path: 'docs/spec/implementation/test-pack'},
        repositories: manifestRepositories,
        ...(options.claims === undefined ? {} : {claims: options.claims})
    });
    writeJson(join(laneDir, 'repositories.local.json'), {
        schemaVersion: 1,
        repositories: repositories.map(item => ({id: item.id, path: item.path, branch: 'main',
            worktreeMode: item.worktreeMode, role: item.role, access: item.access}))
    });
    const install = options.install ?? {schemaVersion: 1, cliVersion: '1.0.0',
        runtimeVersion: options.runtimeVersion ?? '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'};
    writeJson(join(laneDir, 'install.json'), install);
    const defaultConfig = [
        `LANE_ID="${laneId}"`, `LANE_SLUG="${slug}"`, `INITIATIVE_ID="${initiativeId}"`,
        'HOME_REPOSITORY_ID="main"', `WORKSPACE="${fixture.controlHome}"`, 'TMUX_PREFIX="wt"',
        'IMPL_PACK_REL="docs/spec/implementation/test-pack"'
    ];
    writeFileSync(join(laneDir, 'lane.config.env'), `${(options.configLines ?? defaultConfig).join('\n')}\n`);
    const active = options.activeBatch === undefined ? '' : `\nactive_batch=${options.activeBatch}`;
    writeFileSync(join(laneDir, 'state', 'coordinator-lane-state.txt'),
        `lane_status=${options.lifecycle ?? 'active'}${active}\n`);
    if (options.packAvailable !== false) {
        createAcceptedPack(fixture.controlHome, laneId, laneDir, options);
    }
    if (options.runtimeAvailable !== false) {
        mkdirSync(join(fixture.dataHome, 'runtimes', options.runtimeVersion ?? '1.0.0'), {recursive: true});
    }
    return laneDir;
}

export function repository(id: string, path: string, role: string,
    access: 'read' | 'write', worktreeMode: 'dedicated' | 'shared' = 'dedicated'): FixtureRepository {
    return {id, path, role, access, worktreeMode};
}

export function writeMembershipIndex(fixture: ReadCommandFixture,
    entries: Readonly<Record<string, {readonly laneId: string; readonly laneHome: string}>>): void {
    writeJson(join(fixture.dataHome, 'index', 'repository-memberships.json'), entries);
}

export function replaceWithSymlink(path: string, target: string): void {
    rmSync(path);
    symlinkSync(target, path);
}

export function writeJson(path: string, value: unknown): void {
    writeFileSync(path, `${JSON.stringify(value, null, 2)}\n`);
}

export function treeSnapshot(...roots: readonly string[]): string {
    const entries: string[] = [];
    for (const root of roots) collect(root, root, entries);
    return createHash('sha256').update(entries.sort().join('\n')).digest('hex');
}

function collect(root: string, path: string, entries: string[]): void {
    const stat = lstatSync(path);
    const relative = path.slice(root.length) || '.';
    if (stat.isSymbolicLink()) {
        entries.push(`${root}:${relative}:link:${stat.mode}:${stat.uid}:${stat.gid}:${Buffer.from(readlinkSync(path)).toString('hex')}`);
        return;
    }
    if (stat.isFile()) {
        entries.push(`${root}:${relative}:file:${stat.mode}:${stat.uid}:${stat.gid}:${stat.size}:` +
            createHash('sha256').update(readFileSync(path)).digest('hex'));
        return;
    }
    const names = readdirSync(path).sort();
    entries.push(`${root}:${relative}:dir:${stat.mode}:${stat.uid}:${stat.gid}:${names.join('\\0')}`);
    for (const name of names) collect(root, join(path, name), entries);
}

function createAcceptedPack(repositoryPath: string, authorLaneId: string, laneDir: string,
    options: LaneFixtureOptions): void {
    const root = join(repositoryPath, 'docs', 'spec', 'implementation', 'test-pack');
    if (existsSync(root)) return;
    mkdirSync(join(root, 'work-batches'), {recursive: true});
    mkdirSync(join(root, 'review-batches'), {recursive: true});
    const inputDigest = digest(readFileSync(join(repositoryPath, 'accepted-input.md')));
    const artifacts = {
        readme: 'README.md', traceability: 'requirements-traceability.md', implementationMap: 'implementation-map.md',
        qualityRules: 'implementation-quality-and-agent-rules.md', roadmap: 'implementation-roadmap.md',
        tracker: 'implementation-tracker.md', acceptance: 'pack-acceptance.json', seal: 'implementation-pack.lock.json'
    };
    const declaredRepositories = options.repositories ?? [repository('main', repositoryPath, 'primary', 'write')];
    const requirements = options.packRequirements ?? [{id: 'REQ-1',
        workBatches: [options.requirementBatchId ?? 'WB-1'],
        reviewBatches: [options.requirementBatchId ?? 'WB-1']}];
    const batches = options.packBatches ?? [{id: 'WB-1', requirements: ['REQ-1'],
        workBrief: 'work-batches/WB-1.md', reviewBrief: 'review-batches/RB-1.md'}];
    const manifest = {schemaVersion: 1, packId: 'test-pack', initiativeId: 'initiative-a',
        authoredByLaneId: authorLaneId, kind: 'implementation', status: 'accepted',
        packRepository: 'main', repositories: declaredRepositories.map(item => ({id: item.id, role: item.role,
            access: item.access})), sourceBaselines: Object.fromEntries(declaredRepositories.map(item => [item.id,
            {revision: item.id === 'main' && options.baselineRevision !== undefined ? options.baselineRevision :
                git(item.path, ['rev-parse', 'HEAD']).trim(), dirty: false}])),
        acceptedInputs: [{repository: 'main', path: 'accepted-input.md', sha256: inputDigest,
            acceptanceRef: options.acceptanceRef ?? 'review-batches/RB-1.md'}], artifacts,
        ...(options.proofInputs === undefined ? {} : {proofInputs: [...options.proofInputs]}),
        requirements: requirements.map(item => ({...item, workBatches: [...item.workBatches],
            reviewBatches: [...item.reviewBatches], repository: 'main', source: 'accepted-input.md'})),
        batches: batches.map(item => ({...item, requirements: [...item.requirements], title: 'Fixture',
            dependsOn: [], primaryRepository: 'main',
            repositories: [{id: 'main', access: 'write', paths: ['src'], claimMode: 'exclusive-write'}],
            implementationReasoning: 'R1', reviewReasoning: 'R1', workload: 'small', proofClasses: ['test'],
            ...(options.batchProofInputs === undefined ? {} : {proofInputs: [...options.batchProofInputs]})}))};
    writeJson(join(root, 'implementation-pack.json'), manifest);
    const packPaths = new Set(['README.md', 'requirements-traceability.md', 'implementation-map.md',
        'implementation-quality-and-agent-rules.md', 'implementation-roadmap.md', 'implementation-tracker.md',
        ...batches.flatMap(batch => [batch.workBrief, batch.reviewBrief])]);
    for (const path of packPaths) writeFileSync(join(root, path), `# ${path}\n`);
    if (options.missingPackPath !== undefined) rmSync(join(root, options.missingPackPath));
    if (options.reviewedSymlinkPath !== undefined) {
        rmSync(join(root, options.reviewedSymlinkPath));
        symlinkSync('reviewed-symlink-target', join(root, options.reviewedSymlinkPath));
    }
    if (options.nestedPackLock === true) writeFileSync(join(root, 'work-batches',
        'implementation-pack.lock.json'), '{"nested":true}\n');
    git(repositoryPath, ['add', 'docs/spec/implementation/test-pack']);
    git(repositoryPath, ['commit', '-m', 'fixture-reviewed-candidate']);
    const reviewedCommit = git(repositoryPath, ['rev-parse', 'HEAD']).trim();
    if (options.reviewedSymlinkPath !== undefined) {
        rmSync(join(root, options.reviewedSymlinkPath));
        writeFileSync(join(root, options.reviewedSymlinkPath), 'reviewed-symlink-target');
    }
    const acceptance = {schemaVersion: 1, packId: 'test-pack', verdict: 'accept', reviewerId: 'reviewer-1',
        reviewSessionId: 'review-session-1', acceptedManifestDigest: semanticDigest(manifest),
        findings: [...(options.acceptanceFindings ?? [])], reviewedCommit,
        acceptedAt: options.acceptedAt ?? '2026-08-01T10:00:00Z'};
    writeJson(join(root, 'pack-acceptance.json'), acceptance);
    const files = sealedFiles(root);
    const lockBody = {schemaVersion: 1, packId: 'test-pack', manifestDigest: semanticDigest(manifest),
        acceptanceDigest: semanticDigest(acceptance), sourceBaselines: manifest.sourceBaselines, files};
    writeJson(join(root, 'implementation-pack.lock.json'), {...lockBody,
        sealId: semanticDigest(lockBody), generatedAt: '2026-08-01T10:00:01Z'});
    git(repositoryPath, ['add', 'docs/spec/implementation/test-pack']);
    git(repositoryPath, ['commit', '-m', 'fixture-acceptance-publication']);
    if (options.omitReviewAuthority !== true) writeFileSync(join(laneDir, 'state', 'pack-review-events.jsonl'),
        `${JSON.stringify(packReviewEvent(authorLaneId, 'handoff', 'implementer', 'pack-author-session-1',
            'pack-author-1', 'pack-author-event'))}\n${JSON.stringify(packReviewEvent(authorLaneId, 'accept', 'reviewer',
            'review-session-1', 'reviewer-1', 'pack-review-event'))}\n`);
}

function sealedFiles(root: string): Array<{path: string; sha256: string; bytes: number}> {
    const result: Array<{path: string; sha256: string; bytes: number}> = [];
    const visit = (directory: string): void => {
        for (const name of readdirSync(directory).sort()) {
            const path = join(directory, name);
            if (lstatSync(path).isDirectory()) visit(path);
            else if (path.slice(root.length + 1) !== 'implementation-pack.lock.json') {
                const bytes = readFileSync(path);
                result.push({path: path.slice(root.length + 1), sha256: digest(bytes), bytes: bytes.length});
            }
        }
    };
    visit(root); return result.sort((a, b) => a.path.localeCompare(b.path));
}
function digest(bytes: Buffer): string { return `sha256:${createHash('sha256').update(bytes).digest('hex')}`; }
function git(cwd: string, args: string[]): string {
    return String(cmd.execSync({command: 'git', args, options: {cwd, stdio: ['ignore', 'pipe', 'ignore']}}));
}

function packReviewEvent(laneId: string, type: 'handoff' | 'accept', role: 'implementer' | 'reviewer',
    session: string, producer: string, eventId: string): WorkerEventRecord {
    return {schemaVersion: 1, eventId, type, sequence: type === 'handoff' ? 0 : 1,
        at: type === 'handoff' ? '2026-08-01T09:59:00Z' : '2026-08-01T10:00:00Z', laneId, producer,
        correlationId: 'pack-review:test-pack', causationId: type === 'accept' ? 'pack-author-event' : null,
        policyVersion: 'v1', payload: {role, batch: 'test-pack', session}};
}
