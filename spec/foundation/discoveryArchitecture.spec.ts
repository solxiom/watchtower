/**
 * FR-14 discovery domain architecture gate.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const DISCOVERY_DIR = join(FOUNDATION, 'discovery');

const OWNED_MODULES = readdirSync(DISCOVERY_DIR)
    .filter((name) => name.endsWith('.ts'))
    .map((name) => join(DISCOVERY_DIR, name));

const L3_PLUS_IMPORT = /from\s+['"]\.\.\/(read|status|init|pack|upgrade)\//;

describe('discovery domain inventory (FR-14)', () => {
    it('owns exactly eight modules plus the barrel', () => {
        const modules = OWNED_MODULES.map((file) => relative(DISCOVERY_DIR, file)).sort();
        expect(modules).toEqual([
            'LaneDiscoveryFileSystem.ts',
            'LaneSelector.ts',
            'RelevantLaneDiscovery.ts',
            'SecondaryDiscovery.ts',
            'homeLaneDiscovery.ts',
            'index.ts',
            'laneDiscovery.ts',
            'laneManifestReader.ts',
            'membershipIndex.ts'
        ]);
    });
});

describe('discovery domain L2 boundary (FR-14)', () => {
    it('never imports L3+ foundation domains', () => {
        expect(L3_PLUS_IMPORT.test("from '../read/LaneListService.js'")).toBeTrue();
        const offenders = OWNED_MODULES
            .map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}))
            .filter(({text}) => L3_PLUS_IMPORT.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });
});
