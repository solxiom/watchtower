/**
 * FR-01 baseline dependency architecture gate.
 * Tighten the layer matrix in FR-29 (REF-02); do not add new violations here.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION_ROOT = join(SOURCE_ROOT, 'foundation');
const SQL_DRIVER_IMPORT = /@nirvana\/commons\/foundation\/db|better-sqlite3|from\s+['"]node:sqlite['"]/;

/** Deep command imports allowed until FR-28 replaces them with domain barrels. */
const BASELINE_COMMAND_DEEP_IMPORTS: Readonly<Record<string, readonly string[]>> = {
    'commands/InitCommand.ts': ['../foundation/InitPlanner.js', '../foundation/initPlanPresenter.js'],
    'commands/UpgradeCommand.ts': [
        '../foundation/UpgradePlanner.js',
        '../foundation/UpgradePreviewSource.js',
        '../foundation/upgradePlanPresenter.js'
    ],
    'commands/initCommandOptions.ts': ['../foundation/InitContracts.js'],
    'commands/SkillInstallCommand.ts': ['../foundation/hostAdapters/replaceConfirmation.js']
};

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

function isRootBarrelImport(specifier: string): boolean {
    return specifier.endsWith('/foundation/index.js');
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

    it('limits run.ts foundation imports to the root barrel', () => {
        const imports = extractFoundationImportPaths(readFileSync(join(SOURCE_ROOT, 'run.ts'), 'utf8'));
        expect(imports).toEqual(['./foundation/index.js']);
    });

    it('records the baseline command deep-import debt without allowing new escape paths', () => {
        const observed = new Map<string, string[]>();
        for (const path of commandSources()) {
            const rel = relative(SOURCE_ROOT, path);
            const deep = extractFoundationImportPaths(readFileSync(path, 'utf8'))
                .filter((specifier) => !isRootBarrelImport(specifier));
            if (deep.length > 0) observed.set(rel, deep.sort());
        }

        const expected = Object.fromEntries(
            Object.entries(BASELINE_COMMAND_DEEP_IMPORTS).map(([file, imports]) => [file, [...imports].sort()])
        );
        expect(Object.fromEntries(observed)).toEqual(expected);
    });

    it('allows only foundation/index.js or documented deep imports from commands', () => {
        for (const path of commandSources()) {
            const rel = relative(SOURCE_ROOT, path);
            const allowedDeep = new Set(BASELINE_COMMAND_DEEP_IMPORTS[rel] ?? []);
            for (const specifier of extractFoundationImportPaths(readFileSync(path, 'utf8'))) {
                const ok = isRootBarrelImport(specifier) || allowedDeep.has(specifier);
                expect({file: rel, specifier, ok}).toEqual({file: rel, specifier, ok: true});
            }
        }
    });
});
