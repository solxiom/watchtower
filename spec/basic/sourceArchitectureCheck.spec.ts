import {readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const moduleCollectionDeclaration = /^(?:export\s+)?(?:const|let|var)\s+\w+\s*=\s*new\s+(?:WeakSet|WeakMap|Map|Set)\b/m;

// Only this adapter may import a SQLite driver or the commons SQLite facade.
const SANCTIONED_SQLITE_OWNER = join('foundation', 'storage', 'derivedSqliteStore.ts');
const DRIVER_IMPORT = /from\s+['"](?:better-sqlite3|node:sqlite|@nirvana\/commons\/foundation\/db(?:\/sqlite)?['"/])/;

// Only these two modules may contain SQLite statement text.
const SQL_OWNERS = ['sqliteSchemaSql.ts', 'sqliteStoreQueries.ts'];
const SQL_TEXT = /\b(?:SELECT\s|INSERT\s+INTO|DELETE\s+FROM|CREATE\s+TABLE|PRAGMA\s)/;

// Any member that would hand a caller a filesystem location or lock file.
const PATH_MEMBER = /^\s*(?:readonly\s+)?(?:root|path|dir|file|filePath|lockPath|databasePath|stagingPath)\s*\??\s*:/m;

// Names that must never reach the storage barrel.
const FORBIDDEN_EXPORTS = [
    'DerivedStoreLocation', 'openDerivedStore', 'OpenDerivedStoreOptions', 'rebuildStore',
    'RebuildRequest', 'acquireWriteLock', 'WriteLock', 'WriteLockOptions', 'SqlRunner',
    'resolveStoreFile', 'toCommonsConfig'
];

const STORAGE_CAPSULE = join(process.cwd(), 'src', 'foundation', 'storage');
const STORAGE_BARREL = join(STORAGE_CAPSULE, 'index.ts');

function sourceFiles(root: string): string[] {
    return readdirSync(root, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(root, name));
}

/** Every name the barrel re-exports, as values or as types. */
function barrelExports(): Set<string> {
    const names = new Set<string>();
    for (const block of readFileSync(STORAGE_BARREL, 'utf8').matchAll(/export\s+(?:type\s+)?\{([\s\S]*?)\}/g)) {
        for (const entry of block[1].split(',')) {
            const name = entry.trim().split(/\s+as\s+/).pop()?.trim();
            if (name) {
                names.add(name);
            }
        }
    }
    return names;
}

/** Declaration bodies of every exported interface/object type in the capsule. */
function capsuleTypeBodies(): Map<string, string> {
    const bodies = new Map<string, string>();
    for (const path of sourceFiles(STORAGE_CAPSULE)) {
        const text = readFileSync(path, 'utf8');
        for (const match of text.matchAll(/export\s+(?:interface|type)\s+(\w+)[^{;]*\{([\s\S]*?)\n\}/g)) {
            bodies.set(match[1], match[2]);
        }
    }
    return bodies;
}

describe('contract source architecture', function () {
    it('rejects module-scope mutable collection or registry declarations', function () {
        expect(moduleCollectionDeclaration.test('const approvedPayloads = new WeakSet<object>();')).toBeTrue();
        const contractsDirectory = join(process.cwd(), 'src', 'contracts');
        const contractSources = readdirSync(contractsDirectory)
            .filter((name) => name.endsWith('.ts'))
            .map((name) => readFileSync(join(contractsDirectory, name), 'utf8'));
        for (const source of contractSources) {
            expect(moduleCollectionDeclaration.test(source)).toBeFalse();
        }
    });
});

describe('command facade architecture', function () {
    it('keeps commands free of direct filesystem, process output, and external JSON parsing', function () {
        const commandDirectory = join(process.cwd(), 'src', 'commands');
        const offenders = sourceFiles(commandDirectory).filter((path) => {
            const source = readFileSync(path, 'utf8');
            return /from\s+['"]node:fs|process\.(?:stdout|stderr)|JSON\.parse|new\s+RuntimeCatalog/u.test(source);
        });
        expect(offenders).toEqual([]);
    });
});

describe('SQLite driver boundary', function () {
    it('confines SQLite driver and facade imports to the one sanctioned adapter', function () {
        expect(DRIVER_IMPORT.test("import x from 'better-sqlite3';")).toBeTrue();
        const offenders = sourceFiles(join(process.cwd(), 'src'))
            .filter((path) => DRIVER_IMPORT.test(readFileSync(path, 'utf8')))
            .filter((path) => !path.endsWith(SANCTIONED_SQLITE_OWNER));
        expect(offenders).toEqual([]);
    });

    it('confines SQLite statement text to the sanctioned SQL owners', function () {
        expect(SQL_TEXT.test('SELECT * FROM "item"')).toBeTrue();
        const offenders = sourceFiles(STORAGE_CAPSULE)
            .filter((path) => SQL_TEXT.test(readFileSync(path, 'utf8')))
            .filter((path) => !SQL_OWNERS.some((owner) => path.endsWith(owner)));
        expect(offenders).toEqual([]);
    });

    it('exposes no SQLite extension-loading control anywhere in the capsule', function () {
        const offenders = sourceFiles(STORAGE_CAPSULE)
            .filter((path) => /enable_?load_?extension|loadExtension/i.test(readFileSync(path, 'utf8')));
        expect(offenders).toEqual([]);
    });
});

describe('derived storage capsule surface', function () {
    it('keeps raw SQL, driver, path, and facade tokens out of the barrel statements', function () {
        const statements = readFileSync(STORAGE_BARREL, 'utf8')
            .split('\n')
            .filter((line) => /^\s*(?:import|export)\b/.test(line))
            .join('\n');
        for (const forbidden of ['@nirvana', 'better-sqlite3', 'node:sqlite', 'SqliteService', 'BoundSql', 'sqliteSchemaSql', 'openSqliteConnection', 'SqliteDriver', 'databasePath']) {
            expect(statements.includes(forbidden)).toBeFalse();
        }
    });

    it('re-exports no construction, rebuild, or lock name that accepts a caller path', function () {
        const exported = barrelExports();
        expect(exported.has('openDerivedStorage')).toBeTrue();
        for (const forbidden of FORBIDDEN_EXPORTS) {
            expect({name: forbidden, exported: exported.has(forbidden)}).toEqual({name: forbidden, exported: false});
        }
    });

    it('exposes no filesystem-location or lock-path member on any exported type', function () {
        const bodies = capsuleTypeBodies();
        // Positive controls: the detector must flag the current capsule-internal
        // location type and a lock-path member, so a regression that re-exports
        // either one fails this fixture rather than passing silently.
        expect(PATH_MEMBER.test(bodies.get('DerivedStoreLocation') as string)).toBeTrue();
        expect(PATH_MEMBER.test('    readonly lockPath: string;')).toBeTrue();
        expect(PATH_MEMBER.test('    readonly lockTimeoutMs?: number;')).toBeFalse();

        for (const name of barrelExports()) {
            const body = bodies.get(name);
            if (body !== undefined) {
                expect({name, pathBearing: PATH_MEMBER.test(body)}).toEqual({name, pathBearing: false});
            }
        }
    });
});
