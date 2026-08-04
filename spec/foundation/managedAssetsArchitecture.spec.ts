/**
 * Architecture and size gate for RT-06's managed-asset/task-profile
 * foundation. Mirrors the method other packs use (walk the real source tree
 * rather than trust a hand-written inventory) scoped to this batch's exclusive
 * owners only.
 */
import {existsSync, mkdirSync, readdirSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join, relative} from 'node:path';
import {ManagedAssets, LaneTaskProfileInstaller} from '../../src/foundation/managedAssets/index.js';
import {
    ASSET_KEY,
    CLI_VERSION,
    PROFILE_ID,
    RUNTIME_VERSION,
    cleanupFixture,
    installManifestFor,
    makeManagedAssetsFixture
} from './support/managedAssetsFixtures.js';

const SOURCE_ROOT = join(process.cwd(), 'src');
const SYMLINK_IMPORT = /\bsymlinkSync\b|\bfs\.promises\.symlink\b|from\s+['"]node:fs\/promises['"][\s\S]{0,200}\bsymlink\b/;
const MANAGED_LINK_FILE_SYSTEM_OWNER = join('foundation', 'managedAssets', 'managedLinkFileSystem.ts');

const OWNED_MODULE_LIMIT = 200;
const OWNED_MODULES = readdirSync(join(SOURCE_ROOT, 'foundation', 'managedAssets'))
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(SOURCE_ROOT, 'foundation', 'managedAssets', name));
const OWNED_CONTRACT_LIMIT = 240;
const OWNED_CONTRACT = join(SOURCE_ROOT, 'contracts', 'manifests.ts');

function sourceFiles(root: string): string[] {
    return readdirSync(root, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(root, name));
}

describe('managed-asset link ownership', () => {
    it('creates managed symlinks only through the ManagedAssets composition', () => {
        // Positive control: the detector must see the pattern it is guarding against.
        expect(SYMLINK_IMPORT.test('symlinkSync(target, source);')).toBeTrue();
        const offenders = sourceFiles(SOURCE_ROOT)
            .filter((path) => SYMLINK_IMPORT.test(readFileSync(path, 'utf8')))
            .map((path) => relative(SOURCE_ROOT, path))
            .filter((path) => path !== MANAGED_LINK_FILE_SYSTEM_OWNER);
        expect(offenders).toEqual([]);
    });

    it('keeps every owned foundation module inside its preferred size band', () => {
        const oversized = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > OWNED_MODULE_LIMIT);
        expect(oversized).toEqual([]);
    });

    it('keeps the owned contracts module inside its preferred size band', () => {
        expect(readFileSync(OWNED_CONTRACT, 'utf8').split('\n').length).toBeLessThanOrEqual(OWNED_CONTRACT_LIMIT);
    });
});

describe('managed-asset install never touches a participating repository nvb.json', () => {
    it('leaves a malicious project nvb.json byte-for-byte unchanged across createLinks and profile install', () => {
        const fixture = makeManagedAssetsFixture();
        const projectRoot = join(tmpdir(), `watchtower-malicious-project-${process.pid}-${Date.now()}`);
        mkdirSync(projectRoot, {recursive: true});
        const maliciousNvbJson = JSON.stringify({
            tasks: {'wt:runtime:smoke': {handle: {handler: 'InjectedHandler', args: ['rm -rf /']}}}
        });
        const nvbJsonPath = join(projectRoot, 'nvb.json');
        writeFileSync(nvbJsonPath, maliciousNvbJson);
        try {
            new ManagedAssets().createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
            new LaneTaskProfileInstaller(fixture.runtimeCatalog).install({
                runtimeVersion: RUNTIME_VERSION,
                profile: PROFILE_ID,
                cliVersion: CLI_VERSION,
                configTargetRelative: 'runtime-nvb/runtime-nvb.json',
                moduleTargetRelative: 'runtime-nvb/runtime-nvb.js'
            });
            expect(existsSync(nvbJsonPath)).toBeTrue();
            expect(readFileSync(nvbJsonPath, 'utf8')).toBe(maliciousNvbJson);
            expect(existsSync(join(fixture.laneDir, ASSET_KEY))).toBeTrue();
        } finally {
            rmSync(projectRoot, {recursive: true, force: true});
            cleanupFixture(fixture.root);
        }
    });

    it('never references process.cwd() or an nvb.json literal from the owned managed-asset/task-profile modules', () => {
        const offenders = readdirSync(join(SOURCE_ROOT, 'foundation', 'managedAssets'))
            .filter((name) => name.endsWith('.ts'))
            .map((name) => join(SOURCE_ROOT, 'foundation', 'managedAssets', name))
            .map((path) => ({path, text: readFileSync(path, 'utf8')}))
            .filter(({text}) => text.includes('process.cwd(') || text.includes("'nvb.json'") || text.includes('"nvb.json"'))
            .map(({path}) => relative(SOURCE_ROOT, path));
        expect(offenders).toEqual([]);
    });
});
