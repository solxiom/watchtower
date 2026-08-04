/**
 * FR-12 paths domain architecture gate.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const PATHS_DIR = join(FOUNDATION, 'paths');

const OWNED_MODULES = readdirSync(PATHS_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(PATHS_DIR, name));

const L2_PLUS_IMPORT = /from\s+['"]\.\.\/(discovery|bindings|read|status|init|pack|upgrade|observation|lifecycle)\//;

describe('paths domain inventory (FR-12)', () => {
    it('owns exactly four modules plus the barrel', () => {
        const modules = OWNED_MODULES.map((file) => relative(PATHS_DIR, file)).sort();
        expect(modules).toEqual([
            'DataRoot.ts',
            'canonicalPaths.ts',
            'dataHomeResolver.ts',
            'index.ts',
            'workspaceResolver.ts'
        ]);
    });
});

describe('paths domain L1 boundary (FR-12)', () => {
    it('never imports L2+ foundation domains', () => {
        expect(L2_PLUS_IMPORT.test("from '../discovery/laneDiscovery.js'")).toBeTrue();
        const offenders = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}))
            .filter(({text}) => L2_PLUS_IMPORT.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });
});
