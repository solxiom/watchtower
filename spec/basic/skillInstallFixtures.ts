import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {dirname, join} from 'node:path';
import {createClaudeHostAdapter, createCodexHostAdapter} from '../../src/foundation/index.js';
import type {HostAdapter} from '../../src/foundation/index.js';

export const FIXTURE_KNOWLEDGE_VERSION = '0.1.0';

/** The two shared-`DirectoryHostAdapter` hosts, parameterized for both `skill-install.spec.ts` and `skillInstallDirectoryTransaction.spec.ts`. */
export const directoryHosts: ReadonlyArray<{
    readonly name: 'codex' | 'claude'; readonly segments: readonly string[];
    readonly create: (home: string) => HostAdapter;
}> = [
    {name: 'codex', segments: ['.codex', 'skills', 'watchtower-coordinator'], create: createCodexHostAdapter},
    {name: 'claude', segments: ['.claude', 'skills', 'watchtower-coordinator'], create: createClaudeHostAdapter}
];

const ASSET_CONTENTS: Readonly<Record<string, string>> = {
    'AGENTS.md': '# agents\n',
    'skill/SKILL.md': '# skill\nplaybook reference only.\n',
    'skill/AGENTS.md': '# skill agents\n',
    'guides/README.md': '# guides\n',
    'guides/example.md': '# example guide\n'
};

export interface KnowledgePackFixture {
    readonly root: string;
    readonly dataHome: string;
    readonly home: string;
    readonly projectRoot: string;
    readonly packRoot: string;
    readonly version: string;
    remove(): void;
}

export interface KnowledgePackFixtureOptions {
    readonly assetContents?: Readonly<Record<string, string>>;
    readonly tamperAssetAfterManifest?: string;
    readonly symlinkAsset?: string;
    readonly omitManifest?: boolean;
}

/** Builds an isolated `WATCHTOWER_DATA_HOME/knowledge/<version>/` pack plus fake host home/project roots. */
export function createKnowledgePackFixture(options: KnowledgePackFixtureOptions = {}): KnowledgePackFixture {
    const root = mkdtempSync(join(tmpdir(), 'wt-uk04-'));
    const dataHome = join(root, 'data-home');
    const home = join(root, 'home');
    const projectRoot = join(root, 'project');
    const packRoot = join(dataHome, 'knowledge', FIXTURE_KNOWLEDGE_VERSION);
    mkdirSync(home, {recursive: true});
    mkdirSync(projectRoot, {recursive: true});
    const contents = options.assetContents ?? ASSET_CONTENTS;
    for (const [path, content] of Object.entries(contents)) {
        const target = join(packRoot, path);
        mkdirSync(dirname(target), {recursive: true});
        writeFileSync(target, content);
    }
    if (options.omitManifest !== true) {
        writeFileSync(join(packRoot, 'manifest.json'), JSON.stringify(buildManifest(contents)));
    }
    if (options.tamperAssetAfterManifest !== undefined) {
        writeFileSync(join(packRoot, options.tamperAssetAfterManifest), 'tampered content\n');
    }
    if (options.symlinkAsset !== undefined) {
        rmSync(join(packRoot, options.symlinkAsset));
        symlinkSync('/etc/hostname', join(packRoot, options.symlinkAsset));
    }
    return {
        root, dataHome, home, projectRoot, packRoot, version: FIXTURE_KNOWLEDGE_VERSION,
        remove: () => rmSync(root, {recursive: true, force: true})
    };
}

/** Seeds one of the three legal interrupted transaction states for read-only/recovery proof. */
export function seedLegalRecoveryState(
    home: string, segments: readonly string[], state: 'abandoned-before-first-rename' | 'interrupted-between-renames' | 'landed-pending-previous-cleanup' | 'committed-pending-marker-cleanup'
): {readonly destination: string; readonly staging: string; readonly previous: string; readonly markerPath: string} {
    const destination = join(home, ...segments);
    const siblingDir = join(home, segments[0], segments[1]);
    const staging = join(siblingDir, 'watchtower-coordinator.staging-AbCd12');
    const previous = join(siblingDir, 'watchtower-coordinator.previous-11111111-1111-4111-8111-111111111111');
    const markerPath = `${destination}.install-transaction.json`;
    mkdirSync(siblingDir, {recursive: true});
    if (state === 'abandoned-before-first-rename') {
        mkdirSync(destination, {recursive: true});
        writeFileSync(join(destination, 'AGENTS.md'), 'old\n');
        mkdirSync(staging, {recursive: true});
        writeFileSync(join(staging, 'AGENTS.md'), 'staged\n');
    } else if (state === 'interrupted-between-renames') {
        mkdirSync(staging, {recursive: true});
        writeFileSync(join(staging, 'AGENTS.md'), 'staged\n');
        mkdirSync(previous, {recursive: true});
        writeFileSync(join(previous, 'AGENTS.md'), 'old\n');
    } else if (state === 'landed-pending-previous-cleanup') {
        mkdirSync(destination, {recursive: true});
        writeFileSync(join(destination, 'AGENTS.md'), 'new\n');
        writeFileSync(join(destination, '.watchtower-version'), `${JSON.stringify({knowledgeVersion: FIXTURE_KNOWLEDGE_VERSION, installedAt: '2026-01-01T00:00:00Z'})}\n`);
        mkdirSync(previous, {recursive: true});
        writeFileSync(join(previous, 'AGENTS.md'), 'old\n');
    } else {
        mkdirSync(destination, {recursive: true});
        writeFileSync(join(destination, 'AGENTS.md'), 'new\n');
        writeFileSync(join(destination, '.watchtower-version'), `${JSON.stringify({knowledgeVersion: FIXTURE_KNOWLEDGE_VERSION, installedAt: '2026-01-01T00:00:00Z'})}\n`);
    }
    writeFileSync(markerPath, `${JSON.stringify({staging, previous})}\n`);
    return {destination, staging, previous, markerPath};
}

/** Full sibling-directory inventory including marker and transaction paths. */
export function hostDestinationSiblingInventory(home: string, segments: readonly string[]): readonly string[] {
    const siblingDir = join(home, segments[0], segments[1]);
    if (!existsSync(siblingDir)) return [];
    return readdirSync(siblingDir).sort();
}

/** A deterministic before/after byte inventory of a destination tree, for partial-write proof. */
export function destinationInventory(root: string): readonly string[] {
    if (!existsSync(root)) return [];
    const entries: string[] = [];
    collectInventory(root, '', entries);
    return entries.sort();
}

function collectInventory(root: string, relative: string, entries: string[]): void {
    for (const name of readdirSync(join(root, relative)).sort()) {
        const childRelative = relative === '' ? name : `${relative}/${name}`;
        const childPath = join(root, childRelative);
        if (readdirSyncSafeIsDirectory(childPath)) {
            entries.push(`dir:${childRelative}`);
            collectInventory(root, childRelative, entries);
        } else {
            entries.push(`file:${childRelative}:${readFileSync(childPath).toString('hex')}`);
        }
    }
}

function readdirSyncSafeIsDirectory(path: string): boolean {
    try { readdirSync(path); return true; } catch { return false; }
}

function buildManifest(contents: Readonly<Record<string, string>>): unknown {
    return {
        schemaVersion: 1, manifestId: 'watchtower-knowledge/v1', knowledgeVersion: FIXTURE_KNOWLEDGE_VERSION,
        compatibleRuntimeVersions: ['0.1.0'],
        provenance: {
            repository: 'fixture-repository', commit: '0'.repeat(40),
            importRecordSha256: `sha256:${'0'.repeat(64)}`
        },
        assets: Object.entries(contents).map(([path, content]) => ({
            path, sha256: `sha256:${createHash('sha256').update(content).digest('hex')}`, mode: '0644'
        })).sort((a, b) => (a.path < b.path ? -1 : a.path > b.path ? 1 : 0))
    };
}
