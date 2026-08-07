/**
 * FR-38 REF-03 integration gate — foundation capability tree layout.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const REPO_ROOT = process.cwd();
const SOURCE_ROOT = join(REPO_ROOT, 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');

/** Normative top-level foundation directories after REF-03. */
const ALLOWED_TOP_LEVEL_DIRS = [
    'bindings',
    'broker',
    'discovery',
    'distribution',
    'effect',
    'endpoint',
    'hostAdapters',
    'index',
    'init',
    'lane',
    'lifecycle',
    'observation',
    'pack',
    'parsing',
    'paths',
    'presentation',
    'proposal',
    'read',
    'runtime',
    'scheduling',
    'schemaComposition',
    'status',
    'storage',
    'task',
    'upgrade'
] as const;

/** Flat prefix clusters forbidden at foundation root after REF-03. */
const FORBIDDEN_FLAT_PREFIX_DIRS = [
    'runtimeCatalog',
    'runtimeDistribution',
    'managedAssets',
    'runtimeKnowledgeManifest',
    'taskRuntime',
    'taskCatalogComposition',
    'laneStore',
    'transactionalWriter',
    'coordinatorBaseline',
    'packIndex',
    'indexStore',
    'indexQuery'
] as const;

const SCAN_ROOTS = [
    join(REPO_ROOT, 'src'),
    join(REPO_ROOT, 'spec'),
    join(REPO_ROOT, 'runtime-nvb')
];

function foundationTopLevelEntries(): {dirs: string[]; files: string[]} {
    const entries = readdirSync(FOUNDATION, {withFileTypes: true});
    return {
        dirs: entries.filter((entry) => entry.isDirectory()).map((entry) => entry.name).sort(),
        files: entries.filter((entry) => entry.isFile()).map((entry) => entry.name).sort()
    };
}

function collectTypeScriptFiles(root: string): string[] {
    if (!existsSync(root)) return [];
    return readdirSync(root, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(root, name));
}

function forbiddenFlatPathPattern(): RegExp {
    const names = FORBIDDEN_FLAT_PREFIX_DIRS.join('|');
    return new RegExp(`foundation/(?:${names})(?:/|['"])`, 'g');
}

describe('foundation capability tree layout (FR-38)', () => {
    it('keeps only index.ts as a root-level foundation file', () => {
        const {files} = foundationTopLevelEntries();
        expect(files).toEqual(['index.ts']);
    });

    it('allows only the normative top-level capability and domain directories', () => {
        const {dirs} = foundationTopLevelEntries();
        expect(dirs).toEqual([...ALLOWED_TOP_LEVEL_DIRS]);
    });

    it('forbids all retired flat prefix clusters at foundation root', () => {
        const {dirs} = foundationTopLevelEntries();
        expect(dirs.filter((name) => (FORBIDDEN_FLAT_PREFIX_DIRS as readonly string[]).includes(name))).toEqual([]);
    });

    it('does not reference retired flat prefix paths from src, spec, or runtime-nvb imports', () => {
        const pattern = forbiddenFlatPathPattern();
        const offenders: string[] = [];
        for (const root of SCAN_ROOTS) {
            for (const file of collectTypeScriptFiles(root)) {
                const text = readFileSync(file, 'utf8');
                pattern.lastIndex = 0;
                if (pattern.test(text)) {
                    offenders.push(relative(REPO_ROOT, file));
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('foundation capability tree integration (FR-38)', () => {
    const PER_TREE_GATES = [
        'runtimeCapabilityArchitecture.spec.ts',
        'taskCapabilityArchitecture.spec.ts',
        'laneCapabilityArchitecture.spec.ts',
        'packIndexArchitecture.spec.ts',
        'indexCapabilityArchitecture.spec.ts',
        'brokerCapabilityArchitecture.spec.ts',
        'endpointArchitecture.spec.ts'
    ] as const;

    it('ships per-capability architecture gates for each REF-03 tree', () => {
        const specDir = join(REPO_ROOT, 'spec', 'foundation');
        for (const name of PER_TREE_GATES) {
            expect(existsSync(join(specDir, name))).withContext(name).toBeTrue();
        }
    });
});
