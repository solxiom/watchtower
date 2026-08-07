/**
 * CA-17 architecture gate. The batch's acceptance claim includes "no
 * proposal/effect authority", which is a structural property of the capsule
 * rather than a behavior any single unit test can demonstrate. These gates
 * pin it to source: the capsule performs no I/O, holds no mutable module
 * state, reaches no adjacent batch's owner, and exports nothing that could
 * create a proposal or commit an effect.
 */
import {readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';
import * as capsule from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';

const SOURCE_ROOT = join(process.cwd(), 'src');
const CAPSULE = join(SOURCE_ROOT, 'foundation', 'lane', 'coordinator', 'sessionRouting');

const OWNED_MODULES = [
    'index.ts', 'sessionBudgetGrants.ts', 'sessionBudgetLedger.ts', 'sessionBudgetOverflow.ts',
    'sessionGrantAllowance.ts', 'sessionGrantBinding.ts', 'sessionGrantConsumption.ts',
    'sessionGrantValidation.ts', 'sessionReserves.ts', 'sessionRouteSelector.ts', 'sessionRoutingErrors.ts',
    'sessionRoutingValidation.ts', 'sessionTurnClassifier.ts'
] as const;

/** Any of these in the capsule would mean CA-17 grew effect, I/O, or foreign-batch authority. */
const FORBIDDEN_IMPORTS: readonly RegExp[] = Object.freeze([
    /from\s+['"]node:fs['"]/, /from\s+['"]node:fs\/promises['"]/, /from\s+['"]node:child_process['"]/,
    /from\s+['"]node:sqlite['"]/, /better-sqlite3/, /from\s+['"][^'"]*\/proposal\//,
    /from\s+['"][^'"]*\/session\/index\.js['"]/, /from\s+['"][^'"]*\/index\/sessions\//,
    /from\s+['"][^'"]*\/broker\//, /from\s+['"][^'"]*\/storage\//, /from\s+['"][^'"]*\/writer\//
]);

function capsuleFiles(): readonly string[] {
    return readdirSync(CAPSULE).filter(name => name.endsWith('.ts')).map(name => join(CAPSULE, name));
}

describe('CA-17 session routing capsule inventory', () => {
    it('owns exactly the declared focused modules', () => {
        expect(readdirSync(CAPSULE).filter(name => name.endsWith('.ts')).sort()).toEqual([...OWNED_MODULES].sort());
    });

    it('exposes the capsule only through its barrel, with no directory-shadow module', () => {
        const siblings = readdirSync(join(SOURCE_ROOT, 'foundation', 'lane', 'coordinator'), {withFileTypes: true});
        expect(siblings.some(entry => entry.isFile() && entry.name === 'sessionRouting.ts')).toBeFalse();
    });

    it('keeps every module within the pack size bands', () => {
        const bands: Readonly<Record<string, number>> = {'index.ts': 120};
        for (const file of capsuleFiles()) {
            const lines = readFileSync(file, 'utf8').split('\n').length;
            const name = relative(CAPSULE, file);
            expect(lines).withContext(`${name} has ${lines} lines`).toBeLessThanOrEqual(bands[name] ?? 200);
        }
    });
});

describe('CA-17 has no proposal, effect, or I/O authority', () => {
    it('positive control: the forbidden-import scan detects a filesystem import', () => {
        expect(FORBIDDEN_IMPORTS.some(pattern => pattern.test("import {readFileSync} from 'node:fs';"))).toBeTrue();
    });

    it('imports no filesystem, subprocess, database, proposal, or adjacent-batch owner', () => {
        const offenders: string[] = [];
        for (const file of capsuleFiles()) {
            const text = readFileSync(file, 'utf8');
            if (FORBIDDEN_IMPORTS.some(pattern => pattern.test(text))) offenders.push(relative(SOURCE_ROOT, file));
        }
        expect(offenders).toEqual([]);
    });

    it('exports no symbol that names a proposal, effect, commit, or journal operation', () => {
        const forbidden = /proposal|journal|commit|executor|amendment|^apply|^execute|^mutate|^place|^release/i;
        expect(Object.keys(capsule).filter(name => forbidden.test(name))).toEqual([]);
    });

    it('declares no mutable module-level state', () => {
        for (const file of capsuleFiles()) {
            const text = readFileSync(file, 'utf8');
            const mutableTopLevel = text.split('\n').filter(line => /^(let|var)\s/.test(line));
            expect(mutableTopLevel).withContext(relative(SOURCE_ROOT, file)).toEqual([]);
        }
    });

    it('routes every refusal through the capsule error owner rather than ad hoc throws', () => {
        for (const file of capsuleFiles()) {
            if (file.endsWith('sessionRoutingErrors.ts')) continue;
            const text = readFileSync(file, 'utf8');
            expect(/throw\s+new\s+(?!Error\b)/.test(text)).withContext(relative(SOURCE_ROOT, file)).toBeFalse();
            expect(/throw\s+new\s+Error\(/.test(text)).withContext(relative(SOURCE_ROOT, file)).toBeFalse();
        }
    });

    it('never lowers a cumulative usage counter anywhere in the capsule', () => {
        const decrement = /(sessionCumulativeTokens|laneOperatorSessionUsedTokens)\s*[-:]\s*[^,;)\n]*-\s/;
        for (const file of capsuleFiles()) {
            expect(decrement.test(readFileSync(file, 'utf8'))).withContext(relative(SOURCE_ROOT, file)).toBeFalse();
        }
    });
});
