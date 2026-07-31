import {spawn} from 'node:child_process';
import {once} from 'node:events';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {DerivedStoreSchema} from '../../src/foundation/storage/index.js';
import {GRAPH_SCHEMA, delay, makeWorkDir, openTemp, removeWorkDir, seedGraph, storageAt} from './support/storeFixtures.js';

/**
 * WAL reader isolation, atomic publication visibility, and true external-crash
 * recovery. Lock exclusion is proved in `mutationLock.spec.ts` and
 * `writeLock.spec.ts`.
 */
const CRASH_SCHEMA: DerivedStoreSchema = [{name: 't', columns: [{name: 'id', type: 'integer', notNull: true}], primaryKey: ['id']}];

function crashChildSource(): string {
    const barrel = JSON.stringify(join(process.cwd(), 'build/src/foundation/storage/index.js'));
    return `import {openDerivedStorage} from ${barrel};\n`
        + 'import {writeFileSync} from \'node:fs\';\n'
        + 'const [root, marker] = process.argv.slice(2);\n'
        + 'const schema = [{name:\'t\',columns:[{name:\'id\',type:\'integer\',notNull:true}],primaryKey:[\'id\']}];\n'
        + 'const store = await openDerivedStorage(root).open(\'sessions\', schema, {create: true});\n'
        + 'await store.insert(\'t\', {id: 1n});\n'
        + 'writeFileSync(marker, \'ready\');\n'
        + 'const rows = []; for (let i = 100; i < 100000; i += 1) rows.push({id: BigInt(i)});\n'
        + 'await store.insertMany(\'t\', rows);\n';
}

async function waitForMarker(marker: string): Promise<void> {
    for (let attempt = 0; attempt < 250 && !existsSync(marker); attempt += 1) {
        await delay(20);
    }
}

describe('WAL reader isolation from a concurrent writer', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('never exposes a partial writer transaction to a concurrent reader', async function () {
        const writer = await openTemp(dir, 'runtime');
        await writer.insert('item', {id: 1n, label: 'seed'});
        const reader = await openTemp(dir, 'runtime', {readOnly: true});
        const rows = Array.from({length: 250}, (_, i) => ({id: BigInt(100 + i), label: 'x'}));
        let done = false;
        const writing = writer.insertMany('item', rows).then(() => { done = true; });
        const samples: number[] = [];
        while (!done) {
            samples.push(await reader.count('item'));
        }
        await writing;
        samples.push(await reader.count('item'));
        for (const sample of samples) {
            expect(sample === 1 || sample === 251).toBeTrue();
        }
        expect(await reader.count('item')).toBe(251);
        await writer.close();
        await reader.close();
    }, 20000);
});

describe('atomic switch reader visibility', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('keeps an old reader on the old store and a new reader on the new store', async function () {
        const storage = storageAt(dir);
        await storage.rebuild('pack', GRAPH_SCHEMA, seedGraph);
        const oldReader = await storage.open('pack', GRAPH_SCHEMA, {readOnly: true});
        expect(await oldReader.count('item')).toBe(2);

        await storage.rebuild('pack', GRAPH_SCHEMA, async (w) => {
            await seedGraph(w);
            await w.insert('item', {id: 3n, label: 'gamma'});
        });

        expect(await oldReader.count('item')).toBe(2);
        const newReader = await storage.open('pack', GRAPH_SCHEMA, {readOnly: true});
        expect(await newReader.count('item')).toBe(3);
        await oldReader.close();
        await newReader.close();
    }, 20000);
});

describe('external crash recovery', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('recovers with no partial rows after an external SIGKILL mid-transaction', async function () {
        const script = join(dir, 'child.mjs');
        writeFileSync(script, crashChildSource());
        const marker = join(dir, 'ready');
        const child = spawn(process.execPath, [script, dir, marker], {stdio: 'ignore'});
        await waitForMarker(marker);
        await delay(300);
        child.kill('SIGKILL');
        await once(child, 'exit');

        // The killed child also left its mutation lock behind. The abandoned
        // record must carry the full §11 owner identity, and reopening must
        // reclaim that provably dead holder before admitting the store.
        const lockPath = join(dir, 'sessions.sqlite.lock');
        expect(existsSync(lockPath)).toBeTrue();
        const abandoned = JSON.parse(readFileSync(lockPath, 'utf8'));
        expect(Object.keys(abandoned).sort()).toEqual(['acquiredAt', 'command', 'pid', 'processStartIdentity', 'token']);
        expect(abandoned.pid).toBe(child.pid as number);
        expect(abandoned.processStartIdentity).not.toBe(abandoned.acquiredAt);

        const store = await storageAt(dir).open('sessions', CRASH_SCHEMA, {lockTimeoutMs: 5000});
        expect((await store.integrityCheck()).ok).toBeTrue();
        expect(await store.getByPrimaryKey('t', 1n)).toEqual({id: 1n});
        expect(await store.count('t')).toBe(1);
        await store.close();
    }, 30000);
});
