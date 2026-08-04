/**
 * The automated size gate for every file `RT-05` owns.
 *
 * A hand-written inventory drifts the moment code moves, so the limits are
 * checked by walking the real TypeScript AST of the owned source *and* spec
 * trees rather than by counting braces or trusting a report. Two rules apply to
 * every function, method, constructor, accessor, function expression, and arrow:
 *
 * 1. no span may exceed the 80-line hard limit; and
 * 2. a span in the 41–80-line warning band must be a Jasmine `describe` suite
 *    callback — a declarative grouping container, not logic — and must appear by
 *    name in `WARNING_BAND` below with its justification.
 *
 * Anything else in the warning band fails, so a long production function or a
 * long `it` body cannot be added silently. `SYNTHETIC_BREACHES` is the positive
 * control: the same detector must flag a deliberately oversized function and a
 * deliberately oversized non-suite arrow, so a gate that has stopped detecting
 * anything cannot pass.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join, relative} from 'node:path';
import ts from 'typescript';

const HARD_LIMIT = 80;
const WARNING_LIMIT = 40;
const MODULE_LIMIT = 300;
const ROOT = process.cwd();

/** Every 41–80-line span RT-05 owns, by suite name, with its justification. */
const WARNING_BAND: ReadonlyMap<string, string> = new Map([
    ['cataloged leaf invocation', 'suite container: one leaf refusal class per `it`'],
    ['lane task runner typed outcomes', 'suite container: one outcome mapping per `it`'],
    ['lane task runtime real-filesystem interpretation', 'suite container: one real-root behaviour per `it`'],
    ['pinned task runtime target containment', 'suite container: one pin containment rule per `it`'],
    ['lane runtime task account and access fences', 'suite container: one access fence per `it`'],
    ['lane task catalog identity and digest', 'suite container: one catalog identity rule per `it`'],
    ['real leaf executable symlink matrix', 'suite container: one link shape per `it`'],
    ['runtime invocation environment', 'suite container: one environment rule per `it`'],
    ['lane runtime real invocation envelope authority', 'suite container: one real envelope fence per `it`'],
    ['pinned NVB records are exact in every member', 'suite container: one exactness rule per `it`'],
    ['invocation envelopes are addressed, timely, and single use',
        'suite container: one envelope addressing or lifetime rule per `it`'],
    ['installed-package runtime execution against the package tree itself',
        'suite container: one installed-root resolution or execution proof per `it`']
]);

const OWNED_SPECS = [
    'laneRuntimeEnvironmentAndAccess.spec.ts', 'laneTaskCatalog.spec.ts', 'laneTaskRunner.spec.ts',
    'laneTaskRuntimePin.spec.ts', 'leafRuntimeInvoker.spec.ts', 'nvbRunStreamBinding.spec.ts',
    'taskLeafCapability.spec.ts', 'taskRuntimeArchitecture.spec.ts', 'taskRuntimeSizeGate.spec.ts',
    'laneInvocationEnvelope.spec.ts'
];

const SYNTHETIC_BREACHES = [
    `function tooLong() {\n${'    const x = 1;\n'.repeat(90)}}`,
    `const wide = () => {\n${'    const y = 2;\n'.repeat(50)}};`
];

interface Span {
    readonly file: string;
    readonly line: number;
    readonly lines: number;
    readonly suite: string | null;
}

/**
 * RT-05-owned modules under `spec/foundation/support`. That directory is shared
 * with other batches, so this cannot be a glob; the completeness test below
 * proves the list has not fallen behind what the owned specs actually import.
 */
const OWNED_SUPPORT = [
    'laneTaskRuntimeFixtures.ts', 'laneTaskRunnerHarness.ts', 'nvbStreamLines.ts', 'laneEnvelopeFixtures.ts'
];

/**
 * Owned artifacts that are authored as plain ESM rather than TypeScript: the
 * installed-package probe runs inside a fresh prefix, so it cannot be compiled
 * from this tree. It is still owned code and is held to the same limits.
 */
const OWNED_PROBES = [join(ROOT, 'spec', 'integration', 'support', 'installedRuntimeProbe.mjs')];

function ownedFiles(): readonly string[] {
    return [
        ...OWNED_PROBES,
        join(ROOT, 'src', 'contracts', 'taskRuntime.ts'),
        join(ROOT, 'src', 'contracts', 'leafRuntime.ts'),
        ...typeScriptFiles(join(ROOT, 'src', 'foundation', 'task', 'runtime')),
        ...typeScriptFiles(join(ROOT, 'src', 'foundation', 'runtime')),
        ...typeScriptFiles(join(ROOT, 'spec', 'integration')),
        ...OWNED_SUPPORT.map((name) => join(ROOT, 'spec', 'foundation', 'support', name)),
        ...OWNED_SPECS.map((name) => join(ROOT, 'spec', 'foundation', name))
    ];
}

/** Every `./support/*.js` module the owned foundation specs import. */
function importedSupportModules(): readonly string[] {
    const seen = new Set<string>();
    for (const name of OWNED_SPECS) {
        const text = readFileSync(join(ROOT, 'spec', 'foundation', name), 'utf8');
        for (const match of text.matchAll(/from '\.\/support\/([A-Za-z0-9]+)\.js'/gu)) {
            seen.add(`${match[1]}.ts`);
        }
    }
    return [...seen].sort();
}

function typeScriptFiles(root: string): string[] {
    return readdirSync(root, {recursive: true, encoding: 'utf8'})
        .filter((name) => name.endsWith('.ts'))
        .map((name) => join(root, name));
}

/** The name of the `describe` suite this callback belongs to, when it is one. */
function suiteName(node: ts.Node): string | null {
    const parent = node.parent;
    if (parent === undefined || !ts.isCallExpression(parent) || parent.arguments[1] !== node) return null;
    const callee = parent.expression;
    const called = ts.isIdentifier(callee) ? callee.text : '';
    const label = parent.arguments[0];
    return (called === 'describe' || called === 'fdescribe') && label !== undefined && ts.isStringLiteral(label)
        ? label.text
        : null;
}

function isFunctionLike(node: ts.Node): boolean {
    return ts.isFunctionDeclaration(node) || ts.isMethodDeclaration(node) || ts.isConstructorDeclaration(node)
        || ts.isFunctionExpression(node) || ts.isArrowFunction(node)
        || ts.isGetAccessorDeclaration(node) || ts.isSetAccessorDeclaration(node);
}

/** Every function-like span in `text`, measured in physical lines. */
export function spansOf(file: string, text: string): readonly Span[] {
    const source = ts.createSourceFile(file, text, ts.ScriptTarget.ESNext, true);
    const found: Span[] = [];
    const visit = (node: ts.Node): void => {
        if (isFunctionLike(node)) {
            const line = source.getLineAndCharacterOfPosition(node.getStart(source)).line + 1;
            const end = source.getLineAndCharacterOfPosition(node.getEnd()).line + 1;
            found.push({file, line, lines: end - line + 1, suite: suiteName(node)});
        }
        ts.forEachChild(node, visit);
    };
    ts.forEachChild(source, visit);
    return found;
}

function ownedSpans(): readonly Span[] {
    return ownedFiles().flatMap((file) => spansOf(relative(ROOT, file), readFileSync(file, 'utf8')));
}

function describeSpan(span: Span): string {
    return `${span.file}:${span.line} (${span.lines} lines)`;
}

describe('RT-05 owned function and constructor size gate', () => {
    it('detects both a hard-limit and a warning-band breach in synthetic source', () => {
        const spans = SYNTHETIC_BREACHES.flatMap((text, index) => spansOf(`synthetic-${index}.ts`, text));
        expect(spans.filter((span) => span.lines > HARD_LIMIT).length).toBe(1);
        expect(spans.filter((span) => span.lines > WARNING_LIMIT && span.suite === null).length).toBe(2);
    });

    it('keeps every owned function-like span inside the 80-line hard limit', () => {
        expect(ownedSpans().filter((span) => span.lines > HARD_LIMIT).map(describeSpan)).toEqual([]);
    });

    it('allows a warning-band span only for an inventoried suite container', () => {
        const uninventoried = ownedSpans()
            .filter((span) => span.lines > WARNING_LIMIT)
            .filter((span) => span.suite === null || !WARNING_BAND.has(span.suite));
        expect(uninventoried.map(describeSpan)).toEqual([]);
    });

    it('keeps the warning-band inventory free of entries that no longer breach', () => {
        const live = new Set(ownedSpans()
            .filter((span) => span.lines > WARNING_LIMIT && span.suite !== null)
            .map((span) => span.suite as string));
        expect([...WARNING_BAND.keys()].filter((name) => !live.has(name))).toEqual([]);
    });

    it('covers every support module the owned specs actually import', () => {
        expect(importedSupportModules().filter((name) => !OWNED_SUPPORT.includes(name))).toEqual([]);
    });

    it('keeps every owned module inside its 300-line limit', () => {
        const oversized = ownedFiles()
            .map((file) => ({file: relative(ROOT, file), lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > MODULE_LIMIT);
        expect(oversized).toEqual([]);
    });
});
