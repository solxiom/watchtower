import {readdirSync, readFileSync} from 'node:fs';
import {basename, join} from 'node:path';
import ts from 'typescript';

const SOURCE_ROOT = join(process.cwd(), 'src', 'foundation', 'schemaComposition');
const HANDLER_ROOT = join(process.cwd(), 'runtime-nvb', 'handlers');
const FRAGMENT_ROOT = join(process.cwd(), 'docs', 'spec', 'schemas', 'v1');

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

describe('schema composition architecture', function () {
    it('keeps the generated aggregate parseable and every fragment authoritative and bounded', function () {
        expect(() => JSON.parse(readFileSync(
            join(process.cwd(), 'docs', 'spec', 'schemas', 'v1.schema.json'), 'utf8'
        ))).not.toThrow();
        const fragments = readdirSync(FRAGMENT_ROOT).filter((name) => name.endsWith('.schema.json'));
        expect(fragments.length).toBe(18);
        for (const name of fragments) {
            const path = join(FRAGMENT_ROOT, name);
            expect(physicalLines(path)).toBeLessThanOrEqual(240);
            const parsed: unknown = JSON.parse(readFileSync(path, 'utf8'));
            expect(typeof parsed).toBe('object');
        }
    });

    it('keeps composer, adapter, contract, and TaskHandler modules in their preferred bands', function () {
        const files = [
            ...readdirSync(SOURCE_ROOT).map((name) => join(SOURCE_ROOT, name)),
            join(HANDLER_ROOT, 'SchemaCompositionTaskHandler.ts'),
            ...readdirSync(join(HANDLER_ROOT, 'schema')).map((name) => join(HANDLER_ROOT, 'schema', name))
        ];
        for (const path of files) {
            const limit = basename(path) === 'SchemaCompositionTaskHandler.ts' ? 120 : 240;
            expect({file: basename(path), withinLimit: physicalLines(path) <= limit}).toEqual({
                file: basename(path), withinLimit: true
            });
        }
    });
});

describe('schema composition function architecture', function () {
    it('keeps every changed source and focused-spec function in the preferred band', function () {
        const files = [
            ...readdirSync(SOURCE_ROOT).map((name) => join(SOURCE_ROOT, name)),
            join(HANDLER_ROOT, 'SchemaCompositionTaskHandler.ts'),
            ...readdirSync(join(HANDLER_ROOT, 'schema')).map((name) => join(HANDLER_ROOT, 'schema', name)),
            ...readdirSync(join(process.cwd(), 'spec', 'schemaComposition'))
                .map((name) => join(process.cwd(), 'spec', 'schemaComposition', name))
        ];
        const violations = files.flatMap((path) => functionLineCounts(path)
            .filter((lines) => lines > 40).map((lines) => ({file: basename(path), lines})));
        expect(violations).toEqual([]);
    });

    it('keeps composition out of the root NVB registry and CLI hosts', function () {
        const rootNvb = readFileSync(join(process.cwd(), 'nvb.json'), 'utf8');
        const cli = readFileSync(join(process.cwd(), 'src', 'cli.ts'), 'utf8');
        const run = readFileSync(join(process.cwd(), 'src', 'run.ts'), 'utf8');
        expect(rootNvb.includes('wt:schema:')).toBeFalse();
        expect(cli.includes('schemaComposition')).toBeFalse();
        expect(run.includes('schemaComposition')).toBeFalse();
    });
});
