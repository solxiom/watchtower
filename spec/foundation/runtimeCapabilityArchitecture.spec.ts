/**
 * FR-32 runtime capability tree architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const RUNTIME_DIR = join(FOUNDATION, 'runtime');

const FORBIDDEN_FLAT_RUNTIME_DIRS = [
    'runtimeCatalog',
    'managedAssets',
    'runtimeKnowledgeManifest',
    'runtimeDistribution'
];

const SUB_CAPSULES = ['catalog', 'distribution', 'knowledge', 'leaf'] as const;

describe('runtime capability tree inventory (FR-32)', () => {
    it('nests catalog, distribution, knowledge, and leaf under runtime/', () => {
        for (const sub of SUB_CAPSULES) {
            expect(existsSync(join(RUNTIME_DIR, sub))).withContext(sub).toBeTrue();
            expect(existsSync(join(RUNTIME_DIR, sub, 'index.ts'))).withContext(sub).toBeTrue();
        }
        expect(existsSync(join(RUNTIME_DIR, 'index.ts'))).toBeTrue();
    });

    it('removes interim flat runtime prefix clusters from foundation root', () => {
        const foundationDirs = readdirSync(FOUNDATION, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        expect(foundationDirs.filter((name) => FORBIDDEN_FLAT_RUNTIME_DIRS.includes(name))).toEqual([]);
    });

    it('keeps the capability parent barrel as the only runtime/index.ts at foundation root', () => {
        expect(existsSync(join(FOUNDATION, 'runtime', 'index.ts'))).toBeTrue();
        const rootRuntimeFiles = readdirSync(RUNTIME_DIR)
            .filter((name) => name.endsWith('.ts') && name !== 'index.ts');
        expect(rootRuntimeFiles).toEqual([]);
    });
});

describe('runtime capability L5 boundary (FR-32)', () => {
    it('imports sibling foundation domains only through ../../ paths from sub-capsules', () => {
        const offenders: string[] = [];
        for (const sub of SUB_CAPSULES) {
            const dir = join(RUNTIME_DIR, sub);
            for (const name of readdirSync(dir).filter((file) => file.endsWith('.ts'))) {
                const file = join(dir, name);
                const text = readFileSync(file, 'utf8');
                if (/from\s+['"]\.\.\/(runtimeCatalog|managedAssets|runtimeKnowledgeManifest)\//.test(text)) {
                    offenders.push(relative(SOURCE_ROOT, file));
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
