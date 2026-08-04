/**
 * FR-01 / FR-29 foundation dependency architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION_ROOT = join(SOURCE_ROOT, 'foundation');
const SQL_DRIVER_IMPORT = /@nirvana\/commons\/foundation\/db|better-sqlite3|from\s+['"]node:sqlite['"]/;

const DOMAIN_BARREL_PATTERN = /^\.\.\/foundation\/[a-zA-Z]+\/index\.js$/;
const CAPABILITY_BARREL_PATTERN = /^\.\.\/foundation\/(runtime|task|lane|index)\/index\.js$/;

const L1_DOMAIN = /foundation\/(paths|parsing|presentation|schemaComposition)\//;
const L2_DOMAIN = /foundation\/(discovery|bindings|observation)\//;
const L3_DOMAIN = /foundation\/(read|status)\//;
const L4_DOMAIN = /foundation\/(init|lifecycle|upgrade)\//;
const L4_PACK_DOMAIN = /foundation\/pack\/[^/]+\.ts$/;

const L2_PLUS_IMPORT = /from\s+['"]\.\.\/(discovery|bindings|observation|read|status|init|lifecycle|pack|upgrade|runtime|task|lane|index|storage|hostAdapters|distribution)\//;
const L3_PLUS_IMPORT = /from\s+['"]\.\.\/(read|status|init|lifecycle|pack|upgrade|runtime|task|lane|index|storage|hostAdapters|distribution)\//;
const L4_PLUS_IMPORT = /from\s+['"]\.\.\/(init|lifecycle|pack|upgrade|runtime|task|lane|index|storage|hostAdapters|distribution)\//;
const L4_PEER_IMPORT = /from\s+['"]\.\.\/(init|pack|upgrade|lifecycle)\//;
const L4_SUBCAPSULE_IMPORT = /from\s+['"]\.\.\/(runtime\/(catalog|distribution|knowledge|leaf)|task\/(runtime|catalog)|lane\/(store|writer|coordinator)|index\/(store|query)|pack\/index)\//;
const CHILD_PROCESS_IMPORT = /from\s+['"]node:child_process['"]/;

/** Presentation plan renderers type-import init plans without pulling L4 behavior. */
const L1_INIT_PLAN_TYPE_IMPORT = /import\s+type\s+\{InitPlan\}\s+from\s+['"]\.\.\/init\/index\.js['"]/;

/** Lifecycle orchestration delegates init lock acquisition to the init capsule owner. */
const L4_LIFECYCLE_INIT_LOCK_IMPORT = /from\s+['"]\.\.\/init\/index\.js['"]/;

const MAP_SECTION6_GATE_FILES = [
    'foundationDependencyArchitecture.spec.ts',
    'foundationRootBarrelArchitecture.spec.ts',
    'commandImportArchitecture.spec.ts',
    'pathsArchitecture.spec.ts',
    'parsingArchitecture.spec.ts',
    'discoveryArchitecture.spec.ts',
    'statusArchitecture.spec.ts',
    'initArchitecture.spec.ts',
    'packArchitecture.spec.ts',
    'upgradeArchitecture.spec.ts',
    'taskRuntimeArchitecture.spec.ts',
    'managedAssetsArchitecture.spec.ts',
    'indexQueryArchitecture.spec.ts',
    'foundationCapabilityTreeArchitecture.spec.ts',
    'runtimeCapabilityArchitecture.spec.ts',
    'taskCapabilityArchitecture.spec.ts',
    'laneCapabilityArchitecture.spec.ts',
    'indexCapabilityArchitecture.spec.ts',
    'packIndexArchitecture.spec.ts'
] as const;

function foundationSourceFiles(): string[] {
    return readdirSync(FOUNDATION_ROOT, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(FOUNDATION_ROOT, name));
}

function commandSources(): string[] {
    return readdirSync(join(SOURCE_ROOT, 'commands'), {encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(SOURCE_ROOT, 'commands', name));
}

function extractFoundationImportPaths(source: string): string[] {
    const importPattern = /import(?:\s+type)?[\s\S]*?from\s+['"]((?:\.\.?\/)+foundation(?:\/[^'"]+)?)['"]/g;
    return [...source.matchAll(importPattern)].map((match) => match[1]);
}

function isAllowedCommandFoundationImport(specifier: string): boolean {
    return DOMAIN_BARREL_PATTERN.test(specifier) || CAPABILITY_BARREL_PATTERN.test(specifier);
}

function scanDomain(
    domainPattern: RegExp,
    forbiddenImport: RegExp,
    allow?: (relPath: string, text: string) => boolean
): string[] {
    return foundationSourceFiles()
        .filter((path) => domainPattern.test(relative(SOURCE_ROOT, path)))
        .map((path) => ({rel: relative(SOURCE_ROOT, path), text: readFileSync(path, 'utf8')}))
        .filter(({rel, text}) => forbiddenImport.test(text) && !(allow?.(rel, text) ?? false))
        .map(({rel}) => rel);
}

describe('foundation dependency baseline (FR-01)', () => {
    it('positive control: detects the SQLite driver import pattern', () => {
        expect(SQL_DRIVER_IMPORT.test("import {sqlite} from '@nirvana/commons/foundation/db';")).toBeTrue();
    });

    it('imports the SQLite driver only from foundation/storage/', () => {
        const offenders = foundationSourceFiles()
            .filter((path) => SQL_DRIVER_IMPORT.test(readFileSync(path, 'utf8')))
            .map((path) => relative(SOURCE_ROOT, path));
        expect(offenders).toEqual(['foundation/storage/derivedSqliteStore.ts']);
    });

    it('never imports src/commands/ from foundation', () => {
        const pattern = /from\s+['"].*\/commands\//;
        expect(pattern.test("import x from '../commands/Foo.js';")).toBeTrue();
        const offenders = foundationSourceFiles()
            .filter((path) => pattern.test(readFileSync(path, 'utf8')))
            .map((path) => relative(SOURCE_ROOT, path));
        expect(offenders).toEqual([]);
    });

    it('limits run.ts foundation imports to the presentation barrel', () => {
        const imports = extractFoundationImportPaths(readFileSync(join(SOURCE_ROOT, 'run.ts'), 'utf8'));
        expect(imports).toEqual(['./foundation/presentation/index.js']);
    });

    it('imports foundation from commands only through domain or capability barrels', () => {
        const offenders: Array<{file: string; specifier: string}> = [];
        for (const path of commandSources()) {
            const rel = relative(SOURCE_ROOT, path);
            for (const specifier of extractFoundationImportPaths(readFileSync(path, 'utf8'))) {
                if (!isAllowedCommandFoundationImport(specifier)) {
                    offenders.push({file: rel, specifier});
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});

describe('foundation layer import matrix (FR-29)', () => {
    it('positive control: detects upward layer imports', () => {
        expect(L4_PLUS_IMPORT.test("from '../init/InitPlanner.js'")).toBeTrue();
        expect(L4_SUBCAPSULE_IMPORT.test("from '../runtime/catalog/index.js'")).toBeTrue();
    });

    it('keeps L1 domains from importing L2+ foundation modules', () => {
        const offenders = scanDomain(L1_DOMAIN, L2_PLUS_IMPORT, (rel, text) =>
            rel === 'foundation/presentation/initPlanPresenter.ts' && L1_INIT_PLAN_TYPE_IMPORT.test(text)
        );
        expect(offenders).toEqual([]);
    });

    it('keeps L2 domains from importing L3+ foundation modules', () => {
        expect(scanDomain(L2_DOMAIN, L3_PLUS_IMPORT)).toEqual([]);
    });

    it('keeps L3 domains from importing L4+ foundation modules', () => {
        expect(scanDomain(L3_DOMAIN, L4_PLUS_IMPORT)).toEqual([]);
    });

    it('keeps L4 domains from importing peer L4 modules except lifecycle init-lock delegation', () => {
        const l4Files = foundationSourceFiles()
            .filter((path) => L4_DOMAIN.test(relative(SOURCE_ROOT, path)) || L4_PACK_DOMAIN.test(relative(SOURCE_ROOT, path)))
            .map((path) => relative(SOURCE_ROOT, path));

        const offenders: string[] = [];
        for (const rel of l4Files) {
            const text = readFileSync(join(SOURCE_ROOT, rel), 'utf8');
            if (!L4_PEER_IMPORT.test(text)) continue;
            if (rel.startsWith('foundation/lifecycle/') && L4_LIFECYCLE_INIT_LOCK_IMPORT.test(text)) continue;
            offenders.push(rel);
        }
        expect(offenders).toEqual([]);
    });

    it('keeps L4 domains from importing L5 sub-capsule internals directly', () => {
        const l4Files = foundationSourceFiles()
            .filter((path) => L4_DOMAIN.test(relative(SOURCE_ROOT, path)) || L4_PACK_DOMAIN.test(relative(SOURCE_ROOT, path)))
            .map((path) => relative(SOURCE_ROOT, path));

        const offenders = l4Files.filter((rel) => L4_SUBCAPSULE_IMPORT.test(readFileSync(join(SOURCE_ROOT, rel), 'utf8')));
        expect(offenders).toEqual([]);
    });

    it('keeps L4 domains from importing node:child_process', () => {
        const l4Files = foundationSourceFiles()
            .filter((path) => L4_DOMAIN.test(relative(SOURCE_ROOT, path)) || L4_PACK_DOMAIN.test(relative(SOURCE_ROOT, path)))
            .map((path) => relative(SOURCE_ROOT, path));

        const offenders = l4Files.filter((rel) => CHILD_PROCESS_IMPORT.test(readFileSync(join(SOURCE_ROOT, rel), 'utf8')));
        expect(offenders).toEqual([]);
    });
});

describe('architecture gate inventory (FR-30)', () => {
    it('ships every gate file listed in the implementation map section 6', () => {
        const specDir = join(process.cwd(), 'spec', 'foundation');
        for (const name of MAP_SECTION6_GATE_FILES) {
            expect(existsSync(join(specDir, name))).withContext(name).toBeTrue();
        }
    });
});
