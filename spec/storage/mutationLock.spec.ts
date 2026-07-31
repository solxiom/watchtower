import {WatchtowerError} from '../../src/contracts/index.js';
import {translateDatabaseError} from '../../src/foundation/storage/sqliteErrorMapping.js';
import {GRAPH_SCHEMA, makeWorkDir, rejection, rejectionCode, removeWorkDir, seedGraph, storageAt} from './support/storeFixtures.js';

/**
 * Proof that the derived-store mutation lock is enforceable rather than
 * advisory: every writable handle and every rebuild publication contends for the
 * same exclusion, and a bounded collision surfaces only the accepted Watchtower
 * taxonomy. This is the regression suite for the correction-02 committed-write
 * loss (`v1-contracts.md §8A.4-§8A.5` and §11).
 */
describe('ordinary writer versus rebuild publication', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('never lets a writer and a publication both succeed while committed rows vanish', async function () {
        const storage = storageAt(dir);
        await storage.rebuild('pack', GRAPH_SCHEMA, seedGraph);

        const writer = await storage.open('pack', GRAPH_SCHEMA, {});
        const rows = Array.from({length: 2000}, (_, i) => ({id: BigInt(1000 + i), label: 'writer'}));
        const writing = writer.insertMany('item', rows);
        const publication = storage.rebuild('pack', GRAPH_SCHEMA, seedGraph, 200)
            .then(() => 'published', (error: unknown) => (error as WatchtowerError).code);

        await writing;
        expect(await publication).toBe('ERR_LOCK_CONFLICT');
        await writer.close();

        const check = await storage.open('pack', GRAPH_SCHEMA, {readOnly: true});
        expect(await check.count('item')).toBe(2002);
        expect(await check.getByPrimaryKey('item', 2999n)).toEqual({id: 2999n, label: 'writer'});
        await check.close();
    }, 60000);

    it('lets the publication proceed once the writer releases the lock', async function () {
        const storage = storageAt(dir);
        await storage.rebuild('pack', GRAPH_SCHEMA, seedGraph);
        const writer = await storage.open('pack', GRAPH_SCHEMA, {});
        await writer.insert('item', {id: 42n, label: 'writer'});
        expect(await rejectionCode(storage.rebuild('pack', GRAPH_SCHEMA, seedGraph, 100))).toBe('ERR_LOCK_CONFLICT');
        await writer.close();

        const republished = await storage.rebuild('pack', GRAPH_SCHEMA, seedGraph, 5000);
        expect(republished.counts).toEqual({item: 2, edge: 1});
    }, 20000);
});

describe('writable handle exclusion', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('admits only one writable handle at a time', async function () {
        const storage = storageAt(dir);
        const first = await storage.open('runtime', GRAPH_SCHEMA, {create: true});
        expect(await rejectionCode(storage.open('runtime', GRAPH_SCHEMA, {lockTimeoutMs: 100}))).toBe('ERR_LOCK_CONFLICT');
        await first.close();
        const second = await storage.open('runtime', GRAPH_SCHEMA, {lockTimeoutMs: 1000});
        expect(await second.count('item')).toBe(0);
        await second.close();
    }, 20000);

    it('still admits concurrent read-only handles while a writer holds the lock', async function () {
        const storage = storageAt(dir);
        const writer = await storage.open('runtime', GRAPH_SCHEMA, {create: true});
        await seedGraph(writer);
        const reader = await storage.open('runtime', GRAPH_SCHEMA, {readOnly: true});
        expect(await reader.count('item')).toBe(2);
        await reader.close();
        await writer.close();
    }, 20000);
});

describe('contention error taxonomy', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('surfaces a bounded collision as ERR_LOCK_CONFLICT with no facade error escaping', async function () {
        const storage = storageAt(dir);
        const held = await storage.open('sessions', GRAPH_SCHEMA, {create: true});
        const error = await rejection(storage.open('sessions', GRAPH_SCHEMA, {lockTimeoutMs: 100}));
        expect(error).toBeInstanceOf(WatchtowerError);
        expect((error as WatchtowerError).code).toBe('ERR_LOCK_CONFLICT');
        expect((error as Error).constructor.name).toBe('WatchtowerError');
        expect((error as Error).message).not.toContain('DB_BUSY');
        expect((error as Error).message).not.toContain('Nirvana');
        await held.close();
    }, 20000);

    it('maps every busy/timeout facade code onto ERR_LOCK_CONFLICT', function () {
        for (const code of ['DB_BUSY', 'DB_TIMEOUT', 'DB_READ_ONLY', 'DB_TRANSACTION_STATE']) {
            const translated = translateDatabaseError(Object.assign(new Error('facade failure'), {code}), 'write', 'derived-store');
            expect(translated).toBeInstanceOf(WatchtowerError);
            expect(translated.code).toBe('ERR_LOCK_CONFLICT');
            expect(translated.message).not.toContain('facade failure');
        }
    });

    it('preserves an already-registered Watchtower failure unchanged', function () {
        const original = translateDatabaseError(Object.assign(new Error('x'), {code: 'DB_CORRUPT'}), 'read', 'derived-store');
        expect(translateDatabaseError(original, 'read', 'derived-store')).toBe(original);
        expect(original.code).toBe('ERR_INTEGRITY_FAILURE');
    });
});
