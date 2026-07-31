import {closeSync, openSync, statSync, writeSync} from 'node:fs';
import {join} from 'node:path';
import {WatchtowerError} from '../../src/contracts/index.js';
import {
    FK_SCHEMA, GRAPH_SCHEMA, makeWorkDir, openTemp, rejectionCode, removeWorkDir,
    seedForeignKeys, seedGraph, storageAt
} from './support/storeFixtures.js';

/**
 * Feasibility proof for the selected SQLite substrate — the pinned
 * `@nirvana/commons` SQLite worker facade — through the typed derived-store
 * boundary. Mutation-lock exclusion lives in `mutationLock.spec.ts`, the lock
 * adapter in `writeLock.spec.ts`, WAL/atomic-switch/crash proofs in
 * `concurrency.spec.ts`, and staged rebuild reproduction in `rebuild.spec.ts`.
 */
describe('derived store typed access', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('round-trips typed rows including 64-bit integers as bigint', async function () {
        const store = await openTemp(dir, 'runtime');
        await store.insert('item', {id: 9007199254740993n, label: 'big'});
        const row = await store.getByPrimaryKey('item', 9007199254740993n);
        expect(row).toEqual({id: 9007199254740993n, label: 'big'});
        expect(typeof (row as {id: bigint}).id).toBe('bigint');
        await store.close();
    });

    it('stores a SQL-hostile string as data, not statement text', async function () {
        const store = await openTemp(dir, 'runtime');
        const hostile = "a'); DROP TABLE item;--";
        await store.insert('item', {id: 1n, label: hostile});
        expect(await store.getByPrimaryKey('item', 1n)).toEqual({id: 1n, label: hostile});
        expect(await store.count('item')).toBe(1);
        await store.close();
    });

    it('applies typed update and delete by primary key', async function () {
        const store = await openTemp(dir, 'runtime');
        await seedGraph(store);
        await store.updateByPrimaryKey('item', 1n, {label: 'renamed'});
        expect(await store.getByPrimaryKey('item', 1n)).toEqual({id: 1n, label: 'renamed'});
        await store.deleteByPrimaryKey('edge', [1n, 2n]);
        expect(await store.count('edge')).toBe(0);
        await store.deleteByPrimaryKey('item', 2n);
        expect(await store.count('item')).toBe(1);
        await store.close();
    });

    it('refuses to update a primary-key column', async function () {
        const store = await openTemp(dir, 'runtime');
        await seedGraph(store);
        expect(await rejectionCode(store.updateByPrimaryKey('item', 1n, {id: 5n}))).toBe('ERR_INVALID_ARGUMENT');
        await store.close();
    });
});

describe('derived store foreign-key enforcement', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    async function seededFkStore() {
        const store = await openTemp(dir, 'runtime', {create: true}, FK_SCHEMA);
        await seedForeignKeys(store);
        return store;
    }

    it('rejects an insert that references a missing parent row', async function () {
        const store = await seededFkStore();
        const error = await rejectionCode(store.insert('asset', {id: 11n, ownerId: 999n, label: 'orphan'}));
        expect(error).toBe('ERR_INTEGRITY_FAILURE');
        expect(await store.count('asset')).toBe(1);
        await store.close();
    });

    it('rejects an update that repoints a child at a missing parent row', async function () {
        const store = await seededFkStore();
        const error = await rejectionCode(store.updateByPrimaryKey('asset', 10n, {ownerId: 999n}));
        expect(error).toBe('ERR_INTEGRITY_FAILURE');
        expect(await store.getByPrimaryKey('asset', 10n)).toEqual({id: 10n, ownerId: 1n, label: 'widget'});
        await store.close();
    });

    it('rejects a delete that would orphan an existing child row', async function () {
        const store = await seededFkStore();
        const error = await rejectionCode(store.deleteByPrimaryKey('owner', 1n));
        expect(error).toBe('ERR_INTEGRITY_FAILURE');
        expect(await store.count('owner')).toBe(2);
        await store.close();
    });

    it('permits a delete once no child row references the parent', async function () {
        const store = await seededFkStore();
        await store.deleteByPrimaryKey('asset', 10n);
        await store.deleteByPrimaryKey('owner', 1n);
        expect(await store.count('owner')).toBe(1);
        await store.close();
    });
});

describe('derived store runtime diagnostics and permissions', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('reports WAL, a 5,000 ms busy timeout, and foreign keys enabled', async function () {
        const store = await openTemp(dir, 'runtime');
        expect(await store.diagnostics()).toEqual({journalMode: 'wal', busyTimeoutMs: 5000, foreignKeys: true});
        await store.close();
    });

    it('creates owner-only database, WAL, and shared-memory files', async function () {
        const store = await openTemp(dir, 'runtime');
        await seedGraph(store);
        const base = join(dir, 'runtime.sqlite');
        for (const suffix of ['', '-wal', '-shm']) {
            expect(statSync(base + suffix).mode & 0o777).toBe(0o600);
        }
        await store.close();
    });
});

describe('derived store integrity and corruption refusal', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    /** Populate `item` with enough padded rows to span many pages, plus one edge row. */
    async function populateWide(writer: {insert: (t: string, r: Record<string, bigint | string>) => Promise<void>}): Promise<void> {
        await writer.insert('item', {id: 1n, label: 'anchor'});
        for (let i = 2; i < 900; i += 1) {
            await writer.insert('item', {id: BigInt(i), label: `payload-${i}-${'x'.repeat(64)}`});
        }
        await writer.insert('edge', {fromId: 1n, toId: 2n});
    }

    it('passes integrity_check on a freshly populated store', async function () {
        const store = await openTemp(dir, 'runtime');
        await seedGraph(store);
        expect(await store.integrityCheck()).toEqual({ok: true, details: ['ok']});
        await store.close();
    });

    it('blocks every dependent read when damage lies outside the queried table', async function () {
        await storageAt(dir).rebuild('pack', GRAPH_SCHEMA, populateWide);
        // Damage deep item pages, leaving the small `edge` table's own pages intact.
        const fd = openSync(join(dir, 'pack.sqlite'), 'r+');
        writeSync(fd, Buffer.alloc(16384, 0xa5), 0, 16384, 40960);
        closeSync(fd);

        const store = await storageAt(dir).open('pack', GRAPH_SCHEMA, {readOnly: true});
        expect((await store.integrityCheck()).ok).toBeFalse();
        // The store is admitted as corrupt, so no table serves rows — not the
        // damaged one and not an intact one.
        expect(await rejectionCode(store.list('item'))).toBe('ERR_INTEGRITY_FAILURE');
        expect(await rejectionCode(store.list('edge'))).toBe('ERR_INTEGRITY_FAILURE');
        expect(await rejectionCode(store.count('edge'))).toBe('ERR_INTEGRITY_FAILURE');
        expect(await rejectionCode(store.getByPrimaryKey('edge', [1n, 2n]))).toBe('ERR_INTEGRITY_FAILURE');
        expect(await rejectionCode(store.exportLogical())).toBe('ERR_INTEGRITY_FAILURE');
        await store.close();
    });

    it('surfaces corruption refusal as the registered Watchtower taxonomy', async function () {
        await storageAt(dir).rebuild('pack', GRAPH_SCHEMA, populateWide);
        const fd = openSync(join(dir, 'pack.sqlite'), 'r+');
        writeSync(fd, Buffer.alloc(16384, 0x5a), 0, 16384, 40960);
        closeSync(fd);

        const store = await storageAt(dir).open('pack', GRAPH_SCHEMA, {readOnly: true});
        let thrown: unknown;
        try {
            await store.list('edge');
        } catch (error) {
            thrown = error;
        }
        expect(thrown).toBeInstanceOf(WatchtowerError);
        expect((thrown as WatchtowerError).code).toBe('ERR_INTEGRITY_FAILURE');
        await store.close();
    });
});
