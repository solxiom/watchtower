import {readdirSync, readFileSync} from 'node:fs';
import {basename, join} from 'node:path';

import ts from 'typescript';

import {isJsonObject} from '../../src/foundation/schemaComposition/jsonCanonicalizer.js';

const SOURCE_ROOT = join(process.cwd(), 'src', 'foundation', 'taskCatalogComposition');
const HANDLER_ROOT = join(process.cwd(), 'runtime-nvb', 'handlers');
const DEVELOPMENT_LEAF = join(process.cwd(), 'scripts', 'composeRuntimeTaskCatalog.mjs');
const SPEC_ROOT = join(process.cwd(), 'spec', 'taskCatalogComposition');

function physicalLines(path: string): number {
    return readFileSync(path, 'utf8').split('\n').length - 1;
}

function functionLineCounts(path: string): number[] {
    const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
    const counts: number[] = [];
    const visit = (node: ts.Node): void => {
        if (ts.isFunctionDeclaration(node) || ts.isFunctionExpression(node) || ts.isArrowFunction(node) ||
            ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)) {
            const start = source.getLineAndCharacterOfPosition(node.getStart(source)).line;
            const end = source.getLineAndCharacterOfPosition(node.end).line;
            counts.push(end - start + 1);
        }
        ts.forEachChild(node, visit);
    };
    visit(source);
    return counts;
}

function sourceFiles(): string[] {
    return [
        ...readdirSync(SOURCE_ROOT).map((name) => join(SOURCE_ROOT, name)),
        join(HANDLER_ROOT, 'TaskCatalogCompositionTaskHandler.ts'),
        DEVELOPMENT_LEAF
    ];
}

describe('task catalog generated ownership and exact inclusion', function () {
    it('keeps both aggregates parseable and every capability/profile source bounded', function () {
        expect(() => JSON.parse(readFileSync(join('runtime-nvb', 'runtime-nvb.json'), 'utf8'))).not.toThrow();
        expect(() => JSON.parse(readFileSync(join('runtime-nvb', 'task-catalog.json'), 'utf8'))).not.toThrow();
        const fragments = readdirSync(join('runtime-nvb', 'catalog', 'capabilities'));
        const profiles = readdirSync(join('runtime-nvb', 'profiles'));
        expect(fragments).toEqual([
            'catalogComposition.catalog.json', 'scaffold.catalog.json',
            'schemaComposition.catalog.json'
        ]);
        expect(profiles).toEqual(['implementationV1.profile.json']);
        for (const path of [...fragments.map((name) =>
            join('runtime-nvb', 'catalog', 'capabilities', name)),
            ...profiles.map((name) => join('runtime-nvb', 'profiles', name))]) {
            expect(physicalLines(path)).toBeLessThanOrEqual(240);
        }
    });

    it('catalogs every TaskHandler entry module and no undeclared handler', function () {
        const catalog: unknown = JSON.parse(readFileSync(join('runtime-nvb', 'task-catalog.json'), 'utf8'));
        expect(isJsonObject(catalog) && isJsonObject(catalog.handlers)).toBeTrue();
        if (!isJsonObject(catalog) || !isJsonObject(catalog.handlers)) return;
        const declared = Object.values(catalog.handlers).flatMap((entry) =>
            isJsonObject(entry) && typeof entry.module === 'string' ? [entry.module] : []).sort();
        const actual = readdirSync(HANDLER_ROOT).filter((name) => name.endsWith('TaskHandler.ts'))
            .map((name) => `./handlers/${name.replace(/\.ts$/, '.js')}`).sort();
        expect(declared).toEqual(actual);
    });

    it('keeps repository-development declarations out of the executable projection', function () {
        const runtime = JSON.parse(readFileSync(join('runtime-nvb', 'runtime-nvb.json'), 'utf8')) as {
            handlers: string[]; tasks: Record<string, unknown>;
        };
        expect(runtime.handlers).toEqual(['./handlers/HelloRuntimeTaskHandler.js']);
        expect(Object.keys(runtime.tasks)).toEqual(['wt:check:hello']);
    });
});

describe('task catalog module and function architecture', function () {
    it('uses PascalCase only for class-owning capsule modules', function () {
        const violations = readdirSync(SOURCE_ROOT).flatMap((name) => {
            const path = join(SOURCE_ROOT, name);
            const source = ts.createSourceFile(path, readFileSync(path, 'utf8'), ts.ScriptTarget.Latest, true);
            const ownsClass = source.statements.some((statement) => ts.isClassDeclaration(statement));
            const startsUppercase = /^[A-Z]/.test(name);
            return startsUppercase === ownsClass ? [] : [name];
        });
        expect(violations).toEqual([]);
    });

    it('keeps every owner in its preferred physical-line band', function () {
        for (const path of sourceFiles()) {
            const limit = path.includes('/scripts/') ? 120 : 240;
            expect({file: basename(path), withinLimit: physicalLines(path) <= limit}).toEqual({
                file: basename(path), withinLimit: true
            });
        }
    });

    it('keeps every changed source and focused-spec function at forty lines or fewer', function () {
        const files = [...sourceFiles(), ...readdirSync(SPEC_ROOT).map((name) => join(SPEC_ROOT, name))];
        const violations = files.flatMap((path) => functionLineCounts(path)
            .filter((lines) => lines > 40).map((lines) => ({file: basename(path), lines})));
        expect(violations).toEqual([]);
    });

    it('keeps catalog composition out of CLI hosts and the project-root NVB registry', function () {
        const rootNvb = readFileSync('nvb.json', 'utf8');
        const cli = readFileSync(join('src', 'cli.ts'), 'utf8');
        const run = readFileSync(join('src', 'run.ts'), 'utf8');
        expect(rootNvb.includes('runtime-nvb:catalog:')).toBeFalse();
        expect(cli.includes('taskCatalogComposition')).toBeFalse();
        expect(run.includes('taskCatalogComposition')).toBeFalse();
    });
});
