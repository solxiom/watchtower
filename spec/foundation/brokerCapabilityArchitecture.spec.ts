/**
 * CA-08 broker capability tree architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const BROKER_DIR = join(FOUNDATION, 'broker');

const FORBIDDEN_PEER_L4_IMPORT = /from\s+['"]\.\.\/(init|lifecycle|pack|upgrade)\//;
const FORBIDDEN_SUB_CAPSULE_IMPORT = /from\s+['"]\.\.\/(index|lane|task|runtime)\/(store|query|runtime|coordinator|catalog|distribution|knowledge)\//;

describe('broker capability tree inventory (CA-08)', () => {
    it('is a flat L4 domain directory with an index.ts barrel', () => {
        expect(existsSync(BROKER_DIR)).toBeTrue();
        expect(existsSync(join(BROKER_DIR, 'index.ts'))).toBeTrue();
    });

    it('names every module after the capability, not a generic helper bag', () => {
        const forbidden = ['helpers', 'utils', 'common', 'misc', 'shared'];
        const dirs = readdirSync(BROKER_DIR, {withFileTypes: true}).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
        expect(dirs.filter((name) => forbidden.includes(name))).toEqual([]);
    });
});

describe('broker capability import boundary (CA-08)', () => {
    it('imports peer L4 domains only through their capability barrels, never internals', () => {
        const offenders: string[] = [];
        for (const name of readdirSync(BROKER_DIR).filter((file) => file.endsWith('.ts'))) {
            const text = readFileSync(join(BROKER_DIR, name), 'utf8');
            if (FORBIDDEN_PEER_L4_IMPORT.test(text)) offenders.push(name);
        }
        expect(offenders).toEqual([]);
    });

    it('imports L5 capability trees only through their top-level barrel, never sub-capsule internals', () => {
        const offenders: string[] = [];
        for (const name of readdirSync(BROKER_DIR).filter((file) => file.endsWith('.ts'))) {
            const text = readFileSync(join(BROKER_DIR, name), 'utf8');
            if (FORBIDDEN_SUB_CAPSULE_IMPORT.test(text)) offenders.push(name);
        }
        expect(offenders).toEqual([]);
    });
});
