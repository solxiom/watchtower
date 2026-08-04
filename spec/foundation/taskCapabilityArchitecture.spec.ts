/**
 * FR-33 task capability tree architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const TASK_DIR = join(FOUNDATION, 'task');

const FORBIDDEN_FLAT_TASK_DIRS = ['taskRuntime', 'taskCatalogComposition'];
const SUB_CAPSULES = ['runtime', 'catalog'] as const;

describe('task capability tree inventory (FR-33)', () => {
    it('nests runtime and catalog under task/', () => {
        for (const sub of SUB_CAPSULES) {
            expect(existsSync(join(TASK_DIR, sub))).withContext(sub).toBeTrue();
            expect(existsSync(join(TASK_DIR, sub, 'index.ts'))).withContext(sub).toBeTrue();
        }
        expect(existsSync(join(TASK_DIR, 'index.ts'))).toBeTrue();
    });

    it('removes interim flat task prefix clusters from foundation root', () => {
        const foundationDirs = readdirSync(FOUNDATION, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        expect(foundationDirs.filter((name) => FORBIDDEN_FLAT_TASK_DIRS.includes(name))).toEqual([]);
    });
});

describe('task capability import boundary (FR-33)', () => {
    it('does not reference retired flat taskRuntime paths from owned modules', () => {
        const offenders: string[] = [];
        for (const sub of SUB_CAPSULES) {
            const dir = join(TASK_DIR, sub);
            for (const name of readdirSync(dir).filter((file) => file.endsWith('.ts'))) {
                const file = join(dir, name);
                const text = readFileSync(file, 'utf8');
                if (/from\s+['"]\.\.\/(taskRuntime|taskCatalogComposition)\//.test(text)) {
                    offenders.push(relative(SOURCE_ROOT, file));
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
