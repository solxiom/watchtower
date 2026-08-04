/**
 * Architecture proof for CA-02's exclusive owners: the 300-line hard module
 * ceiling, no raw SQL surface, no full-table scan per query, no pack-manifest/
 * JSONL/full-file fallback path, and no model/AI import. Walks the actual
 * source text rather than trusting a hand-written inventory.
 */
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION = join(SOURCE_ROOT, 'foundation');
const INDEX_STORE = join(FOUNDATION, 'indexStore', 'index.ts');
const INDEX_QUERY = join(FOUNDATION, 'indexQuery', 'index.ts');
const OWNED_FILES = [
    INDEX_STORE, INDEX_QUERY,
    join(FOUNDATION, 'indexStore', 'indexStoreIdentity.ts'),
    join(FOUNDATION, 'indexStore', 'packIndexRowMappers.ts'),
    join(FOUNDATION, 'indexStore', 'packIndexTables.ts'),
    join(FOUNDATION, 'indexQuery', 'queryCursor.ts'),
    join(FOUNDATION, 'indexQuery', 'dependencyTraversal.ts')
];

/** SQL keyword literals — the actual tell of a raw SQL string, unlike the driver method names, which also name ordinary `Map`/`Array` methods this module legitimately uses (`Map.get`, `Array.every`). */
const SQL_TEXT = /\b(SELECT|INSERT\s+INTO|UPDATE\s+\w+\s+SET|DELETE\s+FROM|PRAGMA|CREATE\s+TABLE)\b/i;
const SQL_DRIVER_IMPORT = /@nirvana\/commons\/foundation\/db|better-sqlite3|node:sqlite/;
const FALLBACK_READ = /implementation-pack\.json|readdirSync|readFileSync|\.jsonl\b|JSONL/;
const MODEL_IMPORT = /from\s+['"](?:@anthropic-ai\/[^'"]*|anthropic|openai|langchain[^'"]*|ai)['"]|require\(\s*['"](?:@anthropic-ai\/[^'"]*|anthropic|openai)['"]\s*\)/i;

describe('IndexStore/IndexQuery — 300-line hard module ceiling', function () {
    it('keeps every owned module at or under the mandatory 300-line limit', function () {
        const oversized = OWNED_FILES
            .map((file) => ({file, lines: readFileSync(file, 'utf8').split('\n').length}))
            .filter((entry) => entry.lines > 300);
        expect(oversized).toEqual([]);
    });
});

describe('IndexStore/IndexQuery — no raw SQL surface outside the store', function () {
    it('never embeds a raw SQL string in any owned module', function () {
        // Positive control: the detector must see the pattern it is guarding against.
        expect(SQL_TEXT.test('SELECT * FROM batch WHERE id = ?')).toBeTrue();
        for (const file of OWNED_FILES) expect(SQL_TEXT.test(readFileSync(file, 'utf8'))).toBeFalse();
    });

    it('imports no SQLite driver package', function () {
        // Positive control.
        expect(SQL_DRIVER_IMPORT.test("import {sqlite} from '@nirvana/commons/foundation/db';")).toBeTrue();
        for (const file of OWNED_FILES) expect(SQL_DRIVER_IMPORT.test(readFileSync(file, 'utf8'))).toBeFalse();
    });
});

describe('IndexStore/IndexQuery — no full-table scan per query', function () {
    it('IndexQuery.ts never calls a DerivedStore read primitive directly', function () {
        const text = readFileSync(INDEX_QUERY, 'utf8');
        expect(text).not.toContain('.store.list(');
        expect(text).not.toContain('.store.getByPrimaryKey(');
        expect(text).not.toContain('.store.exportLogical(');
        expect(text).not.toContain('DerivedStore');
    });

    it('IndexStore.ts reads the whole table set from SQLite at most once per session (exportLogical), never per query', function () {
        const text = readFileSync(INDEX_STORE, 'utf8');
        const exportLogicalCalls = (text.match(/\.exportLogical\(/g) ?? []).length;
        expect(exportLogicalCalls).toBe(1);
        // The one remaining `.list(` call is the small, fixed-size `index_meta` sidecar-consistency
        // check at admission (12 rows; not proportional to pack scale F/B/E/R/C) — not a per-query read.
        const listCalls = (text.match(/\bstore\.list\(/g) ?? []).length;
        expect(listCalls).toBe(1);
        expect(text).toContain('store.list(PACK_INDEX_META_TABLE)');
    });

    it('every typed query method resolves through the pre-built Map/Set index tables, not a fresh SQLite read', function () {
        const text = readFileSync(INDEX_QUERY, 'utf8');
        expect(text).toContain('this.store.indexTables()');
        expect(text).not.toMatch(/await\s+this\.store\.(list|getByPrimaryKey|exportLogical)\(/);
    });
});

describe('IndexStore/IndexQuery — no full-pack/JSON-shard fallback', function () {
    it('never reads a pack manifest, JSONL journal, or arbitrary file from any owned module', function () {
        // Positive control.
        expect(FALLBACK_READ.test('readFileSync(join(root, "implementation-pack.json"))')).toBeTrue();
        for (const file of OWNED_FILES) {
            if (file === INDEX_STORE) continue; // legitimately reaches the CA-01 sidecar only through the imported `readIndexManifest`.
            expect(FALLBACK_READ.test(readFileSync(file, 'utf8'))).toBeFalse();
        }
        expect(FALLBACK_READ.test(readFileSync(INDEX_STORE, 'utf8'))).toBeFalse();
    });
});

describe('IndexStore/IndexQuery — model-free', function () {
    it('imports no model, LLM, or AI provider package', function () {
        // Positive control.
        expect(MODEL_IMPORT.test("import {Anthropic} from '@anthropic-ai/sdk';")).toBeTrue();
        for (const file of OWNED_FILES) expect(MODEL_IMPORT.test(readFileSync(file, 'utf8'))).toBeFalse();
    });
});
