/**
 * FR-36 index capability tree architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const INDEX_DIR = join(FOUNDATION, 'index');

const FORBIDDEN_FLAT_INDEX_DIRS = ['indexStore', 'indexQuery'];
const SUB_CAPSULES = ['store', 'query', 'runtime', 'sessions'] as const;

describe('index capability tree inventory (FR-36)', () => {
    it('nests store and query under index/', () => {
        for (const sub of SUB_CAPSULES) {
            expect(existsSync(join(INDEX_DIR, sub))).withContext(sub).toBeTrue();
            expect(existsSync(join(INDEX_DIR, sub, 'index.ts'))).withContext(sub).toBeTrue();
        }
        expect(existsSync(join(INDEX_DIR, 'index.ts'))).toBeTrue();
    });

    it('removes interim flat index prefix clusters from foundation root', () => {
        const foundationDirs = readdirSync(FOUNDATION, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        expect(foundationDirs.filter((name) => FORBIDDEN_FLAT_INDEX_DIRS.includes(name))).toEqual([]);
    });
});

describe('index capability import boundary (FR-36)', () => {
    it('does not reference retired flat indexStore paths from owned modules', () => {
        const offenders: string[] = [];
        for (const sub of SUB_CAPSULES) {
            const dir = join(INDEX_DIR, sub);
            for (const name of readdirSync(dir).filter((file) => file.endsWith('.ts'))) {
                const file = join(dir, name);
                const text = readFileSync(file, 'utf8');
                if (/from\s+['"]\.\.\/(indexStore|indexQuery)\//.test(text)) {
                    offenders.push(relative(SOURCE_ROOT, file));
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
