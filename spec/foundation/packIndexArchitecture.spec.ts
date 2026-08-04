/**
 * FR-35 pack/index nested compile pipeline architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join, relative} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const PACK_INDEX_DIR = join(SOURCE_ROOT, 'foundation', 'pack', 'index');

describe('pack/index inventory (FR-35)', () => {
    it('nests the pack-index compile pipeline under pack/index/', () => {
        expect(existsSync(PACK_INDEX_DIR)).toBeTrue();
        expect(existsSync(join(PACK_INDEX_DIR, 'index.ts'))).toBeTrue();
        expect(existsSync(join(SOURCE_ROOT, 'foundation', 'packIndex'))).toBeFalse();
    });

    it('imports the L4 pack barrel instead of retired flat packIndex paths', () => {
        const offenders = readdirSync(PACK_INDEX_DIR)
            .filter((name) => name.endsWith('.ts'))
            .map((name) => join(PACK_INDEX_DIR, name))
            .map((file) => ({file: relative(SOURCE_ROOT, file), text: readFileSync(file, 'utf8')}))
            .filter(({text}) => /from\s+['"]\.\.\/pack\/index\.js['"]/.test(text) || /from\s+['"]\.\.\/\.\.\/packIndex\//.test(text))
            .map(({file}) => file);
        expect(offenders).toEqual([]);
    });
});
