/**
 * FR-34 lane capability tree architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const LANE_DIR = join(FOUNDATION, 'lane');

const FORBIDDEN_FLAT_LANE_DIRS = ['laneStore', 'transactionalWriter', 'coordinatorBaseline'];
const SUB_CAPSULES = ['store', 'writer', 'coordinator'] as const;

describe('lane capability tree inventory (FR-34)', () => {
    it('nests store, writer, and coordinator under lane/', () => {
        for (const sub of SUB_CAPSULES) {
            expect(existsSync(join(LANE_DIR, sub))).withContext(sub).toBeTrue();
            expect(existsSync(join(LANE_DIR, sub, 'index.ts'))).withContext(sub).toBeTrue();
        }
        expect(existsSync(join(LANE_DIR, 'index.ts'))).toBeTrue();
    });

    it('removes interim flat lane prefix clusters from foundation root', () => {
        const foundationDirs = readdirSync(FOUNDATION, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
        expect(foundationDirs.filter((name) => FORBIDDEN_FLAT_LANE_DIRS.includes(name))).toEqual([]);
    });
});

describe('lane capability import boundary (FR-34)', () => {
    it('does not reference retired flat laneStore paths from owned modules', () => {
        const offenders: string[] = [];
        for (const sub of SUB_CAPSULES) {
            const dir = join(LANE_DIR, sub);
            for (const name of readdirSync(dir).filter((file) => file.endsWith('.ts'))) {
                const file = join(dir, name);
                const text = readFileSync(file, 'utf8');
                if (/from\s+['"]\.\.\/(laneStore|transactionalWriter|coordinatorBaseline)\//.test(text)) {
                    offenders.push(relative(SOURCE_ROOT, file));
                }
            }
        }
        expect(offenders).toEqual([]);
    });
});
