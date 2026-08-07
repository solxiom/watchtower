/**
 * CA-28 endpoint capability tree architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const ENDPOINT_DIR = join(FOUNDATION, 'endpoint');

const FORBIDDEN_PEER_L4_IMPORT = /from\s+['"]\.\.\/(init|lifecycle|pack|upgrade|broker)\//;
const FORBIDDEN_SUB_CAPSULE_IMPORT = /from\s+['"]\.\.\/(index|lane|task|runtime)\/(store|query|runtime|coordinator|catalog|distribution|knowledge|leaf)\//;
const OWNED_MODULE_LIMIT = 200;

describe('endpoint capability tree inventory (CA-28)', () => {
    it('is a flat L4 domain directory with an index.ts barrel', () => {
        expect(existsSync(ENDPOINT_DIR)).toBeTrue();
        expect(existsSync(join(ENDPOINT_DIR, 'index.ts'))).toBeTrue();
    });

    it('owns only the OpenCode adapter modules plus the barrel', () => {
        const modules = readdirSync(ENDPOINT_DIR).filter((name) => name.endsWith('.ts')).sort();
        expect(modules).toEqual([
            'OpenCodeEndpointAdapter.ts', 'index.ts', 'openCodeEndpointValidation.ts', 'openCodeEventStream.ts',
            'openCodeReservationReason.ts', 'openCodeReservationValidation.ts'
        ]);
    });

    it('keeps every owned module inside its preferred size band', () => {
        const oversized = readdirSync(ENDPOINT_DIR)
            .filter((name) => name.endsWith('.ts') && name !== 'index.ts')
            .map((name) => ({file: name, lines: readFileSync(join(ENDPOINT_DIR, name), 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > OWNED_MODULE_LIMIT);
        expect(oversized).toEqual([]);
    });

    it('names every module after the capability, not a generic helper bag', () => {
        const forbidden = ['helpers', 'utils', 'common', 'misc', 'shared'];
        const dirs = readdirSync(ENDPOINT_DIR, {withFileTypes: true}).filter((entry) => entry.isDirectory()).map((entry) => entry.name);
        expect(dirs.filter((name) => forbidden.includes(name))).toEqual([]);
    });
});

describe('endpoint capability import boundary (CA-28)', () => {
    it('imports peer L4 domains only through their capability barrels, never internals', () => {
        const offenders: string[] = [];
        for (const name of readdirSync(ENDPOINT_DIR).filter((file) => file.endsWith('.ts'))) {
            const text = readFileSync(join(ENDPOINT_DIR, name), 'utf8');
            if (FORBIDDEN_PEER_L4_IMPORT.test(text)) offenders.push(name);
        }
        expect(offenders).toEqual([]);
    });

    it('imports L5 capability trees only through their top-level barrel, never sub-capsule internals', () => {
        const offenders: string[] = [];
        for (const name of readdirSync(ENDPOINT_DIR).filter((file) => file.endsWith('.ts'))) {
            const text = readFileSync(join(ENDPOINT_DIR, name), 'utf8');
            if (FORBIDDEN_SUB_CAPSULE_IMPORT.test(text)) offenders.push(name);
        }
        expect(offenders).toEqual([]);
    });
});
