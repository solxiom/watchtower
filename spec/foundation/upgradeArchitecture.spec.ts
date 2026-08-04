/**
 * FR-20 upgrade domain architecture gate.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const UPGRADE_DIR = join(FOUNDATION, 'upgrade');

const OWNED_MODULES = readdirSync(UPGRADE_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(UPGRADE_DIR, name));

const L4_PEER_IMPORT = /from\s+['"]\.\.\/(init|pack|status|read|lifecycle)\//;
const L4_RUNTIME_SUBCAPSULE = /from\s+['"]\.\.\/runtime\/(catalog|distribution|knowledge|leaf)\//;
const OWNED_MODULE_LIMIT = 200;

describe('upgrade domain inventory (FR-20)', () => {
    it('owns exactly six modules plus the barrel', () => {
        const modules = OWNED_MODULES.map((file) => relative(UPGRADE_DIR, file)).sort();
        expect(modules).toEqual([
            'MigrationRegistry.ts',
            'MigrationSteps.ts',
            'UpgradePlanner.ts',
            'UpgradePreviewSource.ts',
            'index.ts',
            'migrationValidation.ts',
            'upgradeFileSystem.ts'
        ]);
    });

    it('keeps every owned module inside its preferred size band', () => {
        const oversized = OWNED_MODULES
            .filter((file) => !file.endsWith('index.ts'))
            .map((file) => ({file: relative(SOURCE_ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > OWNED_MODULE_LIMIT);
        expect(oversized).toEqual([]);
    });
});

describe('upgrade domain L4 boundary (FR-20)', () => {
    it('never imports peer L4 foundation domains or runtime sub-capsule internals', () => {
        expect(L4_PEER_IMPORT.test("from '../pack/PackConsumer.js'")).toBeTrue();
        expect(L4_RUNTIME_SUBCAPSULE.test("from '../runtime/distribution/index.js'")).toBeTrue();
        const offenders = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}))
            .filter(({text}) => L4_PEER_IMPORT.test(text) || L4_RUNTIME_SUBCAPSULE.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });
});
