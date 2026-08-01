import {createHash} from 'node:crypto';
import {
    lstatSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync
} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cmd} from '@nirvana/base/terminal';

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
    readonly repositories?: readonly FixtureRepository[];
    readonly claims?: readonly unknown[];
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
        entries.push(`${root}:${relative}:link:${stat.mode}`);
        return;
    }
    if (stat.isFile()) {
        entries.push(`${root}:${relative}:file:${stat.mode}:${createHash('sha256').update(readFileSync(path)).digest('hex')}`);
        return;
    }
    entries.push(`${root}:${relative}:dir:${stat.mode}`);
    for (const name of readdirSync(path)) collect(root, join(path, name), entries);
}
