/**
 * FR-01 baseline dependency architecture gate.
 * Tighten the layer matrix in FR-29 (REF-02); do not add new violations here.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION_ROOT = join(SOURCE_ROOT, 'foundation');
const SQL_DRIVER_IMPORT = /@nirvana\/commons\/foundation\/db|better-sqlite3|from\s+['"]node:sqlite['"]/;

const DOMAIN_BARREL_PATTERN = /^\.\.\/foundation\/[a-zA-Z]+\/index\.js$/;
const CAPABILITY_BARREL_PATTERN = /^\.\.\/foundation\/(runtime|task|lane|index)\/index\.js$/;

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
