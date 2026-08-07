/**
 * CA-16R ownership and architecture gate (SA-CA16R-03, C8/C10). Asserts that the
 * session-index capability directory contains exactly the modules recorded in
 * docs/spec/schemas/session-index-v2/ownership.json, each within its recorded
 * budget and within its engineering-standard category preferred ceiling, with
 * correct naming, a re-export-only barrel, no raw SQL or subprocess surface, and
 * no reappearance of the withdrawn CORRECTION-02 inventions.
 */
import {readFileSync, readdirSync} from 'node:fs';
import {join} from 'node:path';

const DIR = join(process.cwd(), 'src', 'foundation', 'index', 'sessions');
const OWNERSHIP = JSON.parse(readFileSync(join(process.cwd(), 'docs', 'spec', 'schemas', 'session-index-v2', 'ownership.json'), 'utf8')) as {
    categoryCeilings: Record<string, {preferred: number}>;
    modules: {file: string; category: string; budget: number; sizeException?: Record<string, unknown>}[];
};

/**
 * The budgets the accepted CORRECTION-03 design handoff section 9 records,
 * transcribed here so this gate cannot be satisfied by editing the artifact it
 * reads. A module may only differ from this map by carrying a complete recorded
 * size exception, which the next spec checks field by field.
 */
const ACCEPTED_DESIGN_BUDGETS: Readonly<Record<string, number>> = {
    'index.ts': 20, 'sessionIndexSchema.ts': 180, 'sessionIndexSource.ts': 120, 'sessionIndexRows.ts': 120,
    'SessionIndexBuilder.ts': 200, 'sessionIndexReads.ts': 200, 'sessionCapsule.ts': 160, 'SessionCompaction.ts': 200
};
const EXCEPTION_FIELDS = ['amendmentId', 'acceptedBudget', 'categoryPreferredMaximum', 'authority', 'expiry'];
/** engineering-and-review-standard.md section 4: an exception records the exact file, temporary maximum, reason, reviewer, and expiry/removal batch. */
const STANDARD_FIELDS = ['exactFile', 'temporaryMaximum', 'reason', 'reviewer', 'expiryRemovalBatch'];

/** Real wc -l: the number of newline characters, the same measure conformance gate C9 records. */
function lineCount(file: string): number {
    return (readFileSync(join(DIR, file), 'utf8').match(/\n/g) ?? []).length;
}

describe('session index ownership (SA-CA16R-03, C10)', () => {
    it('contains exactly the owned modules recorded in ownership.json', () => {
        expect(readdirSync(DIR).filter((name) => name.endsWith('.ts')).sort()).toEqual(OWNERSHIP.modules.map((module) => module.file).sort());
    });

    it('keeps every module within its ownership.json budget and its category preferred ceiling', () => {
        for (const module of OWNERSHIP.modules) {
            const preferred = OWNERSHIP.categoryCeilings[module.category].preferred;
            expect(module.budget).withContext(`${module.file} budget within category`).toBeLessThanOrEqual(preferred);
            expect(lineCount(module.file)).withContext(`${module.file} lines within budget`).toBeLessThanOrEqual(module.budget);
        }
    });

    it('holds the accepted CORRECTION-03 budget for every module without a recorded size exception', () => {
        for (const module of OWNERSHIP.modules) {
            if (module.sizeException !== undefined) continue;
            expect(module.budget).withContext(`${module.file} budget equals the accepted design map`).toBe(ACCEPTED_DESIGN_BUDGETS[module.file]);
        }
    });

    it('records every budget that departs from the accepted design map as a complete, non-retroactive exception', () => {
        for (const module of OWNERSHIP.modules) {
            const exception = module.sizeException;
            if (exception === undefined) continue;
            for (const field of [...EXCEPTION_FIELDS, ...STANDARD_FIELDS]) {
                expect(typeof exception[field] === 'string' && (exception[field] as string).length > 0 ? true : exception[field] !== undefined)
                    .withContext(`${module.file} exception ${field}`).toBeTrue();
            }
            expect(exception.standardFields).withContext(`${module.file} names the standard's fields`).toEqual(STANDARD_FIELDS);
            expect(exception.exactFile).withContext(module.file).toBe(`src/foundation/index/sessions/${module.file}`);
            expect(exception.approvedBeforeImplementation).withContext(`${module.file} is not a retroactive waiver`).toBeTrue();
            expect(String(exception.expiryRemovalBatch)).withContext(`${module.file} names a removal batch`).toMatch(/^[A-Z]{2,4}-[0-9]{2}[A-Z]?$/);
            expect(exception.acceptedBudget).withContext(module.file).toBe(ACCEPTED_DESIGN_BUDGETS[module.file]);
            expect(exception.temporaryMaximum).withContext(module.file).toBe(module.budget);
            expect(module.budget).withContext(`${module.file} exception stays out of the warning band`).toBeLessThanOrEqual(OWNERSHIP.categoryCeilings[module.category].preferred);
        }
    });

    it('names class-owning modules PascalCase and value modules lowerCamelCase, with no dashes or underscores', () => {
        for (const module of OWNERSHIP.modules) {
            const file = module.file;
            expect(/^[A-Za-z][A-Za-z0-9]*\.ts$/.test(file)).withContext(file).toBeTrue();
            const ownsClass = /^export class /m.test(readFileSync(join(DIR, file), 'utf8'));
            if (file !== 'index.ts') expect(/^[A-Z]/.test(file)).withContext(file).toBe(ownsClass);
        }
    });

    it('exposes a re-export-only barrel that leaks no SQL, path, or handle', () => {
        const barrel = readFileSync(join(DIR, 'index.ts'), 'utf8');
        expect(/^export \{/m.test(barrel)).toBeTrue();
        expect(/\bclass |\bfunction |DerivedStore\b|\.sqlite/.test(barrel)).toBeFalse();
    });

    it('issues no raw SQL and spawns no subprocess from any owned module', () => {
        for (const module of OWNERSHIP.modules) {
            const text = readFileSync(join(DIR, module.file), 'utf8');
            expect(/child_process|SELECT |INSERT INTO|DELETE FROM|CREATE TABLE/i.test(text)).withContext(module.file).toBeFalse();
        }
    });

    it('does not reintroduce the withdrawn CORRECTION-02 inventions', () => {
        for (const module of OWNERSHIP.modules) {
            const text = readFileSync(join(DIR, module.file), 'utf8');
            expect(/salvage|generationChain|COMMIT marker|previousGeneration|WT-TABLE|WT-ROOT/i.test(text)).withContext(module.file).toBeFalse();
        }
    });

    it('binds the accepted storage and query siblings rather than reimplementing them', () => {
        expect(readFileSync(join(DIR, 'SessionIndexBuilder.ts'), 'utf8')).toContain("from '../../storage/index.js'");
        expect(readFileSync(join(DIR, 'sessionIndexReads.ts'), 'utf8')).toContain("from '../query/index.js'");
    });
});
