/**
 * FR-13 parsing domain architecture gate.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const PARSING_DIR = join(FOUNDATION, 'parsing');

const OWNED_MODULES = readdirSync(PARSING_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(PARSING_DIR, name));

const L2_PLUS_IMPORT = /from\s+['"]\.\.\/(discovery|bindings|read|status|init|pack|upgrade|observation|lifecycle)\//;

describe('parsing domain inventory (FR-13)', () => {
    it('owns exactly six modules plus the barrel', () => {
        const modules = OWNED_MODULES.map((file) => relative(PARSING_DIR, file)).sort();
        expect(modules).toEqual([
            'JsonlParser.ts',
            'envParser.ts',
            'index.ts',
            'laneLifecycle.ts',
            'scalarLineParser.ts',
            'stateParser.ts',
            'stateRecordParser.ts'
        ]);
    });
});

describe('parsing domain L1 boundary (FR-13)', () => {
    it('never imports L2+ foundation domains', () => {
        expect(L2_PLUS_IMPORT.test("from '../discovery/laneDiscovery.js'")).toBeTrue();
        const offenders = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}))
            .filter(({text}) => L2_PLUS_IMPORT.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });
});
