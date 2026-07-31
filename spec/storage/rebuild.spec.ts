import {readFileSync, readdirSync, openSync, writeSync, closeSync} from 'node:fs';
import {join} from 'node:path';
import {computeSemanticRoot} from '../../src/foundation/storage/index.js';
import type {DerivedStoreWriter} from '../../src/foundation/storage/index.js';
import {GRAPH_SCHEMA, makeWorkDir, removeWorkDir, seedGraph, storageAt} from './support/storeFixtures.js';

/** Staged-rebuild and semantic-root reproduction proof (v1-contracts §8A.3/§8A.5). */
function bumpUserVersion(file: string): void {
    const fd = openSync(file, 'r+');
    writeSync(fd, Buffer.from([0, 0, 0, 0x7f]), 0, 4, 60);
    closeSync(fd);
}

async function exportRoot(root: string): Promise<string> {
    const store = await storageAt(root).open('pack', GRAPH_SCHEMA, {readOnly: true});
    try {
        return computeSemanticRoot(await store.exportLogical());
    } finally {
        await store.close();
    }
}

describe('staged rebuild reproduction', function () {
    let a: string;
    let b: string;
    beforeEach(function () { a = makeWorkDir(); b = makeWorkDir(); });
    afterEach(function () { removeWorkDir(a); removeWorkDir(b); });

    it('reproduces an identical semantic root that ignores non-row bytes', async function () {
        const first = await storageAt(a).rebuild('pack', GRAPH_SCHEMA, seedGraph);
        const second = await storageAt(b).rebuild('pack', GRAPH_SCHEMA, seedGraph);
        expect(second.semanticRoot).toBe(first.semanticRoot);
        expect(second.counts).toEqual({item: 2, edge: 1});

        bumpUserVersion(join(b, 'pack.sqlite'));
        expect(readFileSync(join(b, 'pack.sqlite')).equals(readFileSync(join(a, 'pack.sqlite')))).toBeFalse();
        expect(await exportRoot(b)).toBe(first.semanticRoot);
    }, 20000);
});

describe('rebuild publication hygiene', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('publishes atomically with no staging, lock, or WAL residue', async function () {
        await storageAt(dir).rebuild('pack', GRAPH_SCHEMA, seedGraph);
        expect(readdirSync(dir)).toEqual(['pack.sqlite']);
    }, 20000);

    it('replaces an existing active store with a new semantic root', async function () {
        const populateExtra = async (w: DerivedStoreWriter) => {
            await seedGraph(w);
            await w.insert('item', {id: 3n, label: 'gamma'});
        };
        const storage = storageAt(dir);
        const first = await storage.rebuild('pack', GRAPH_SCHEMA, seedGraph);
        const second = await storage.rebuild('pack', GRAPH_SCHEMA, populateExtra);
        expect(second.semanticRoot).not.toBe(first.semanticRoot);
        expect(second.counts).toEqual({item: 3, edge: 1});
    }, 20000);

    it('leaves the active store intact when populate fails mid-build', async function () {
        const storage = storageAt(dir);
        const first = await storage.rebuild('pack', GRAPH_SCHEMA, seedGraph);
        const before = readFileSync(join(dir, 'pack.sqlite'));
        const failing = async (w: DerivedStoreWriter) => {
            await seedGraph(w);
            throw new Error('canonical source read failed');
        };
        await expectAsync(storage.rebuild('pack', GRAPH_SCHEMA, failing))
            .toBeRejectedWithError(/canonical source read failed/);
        expect(readFileSync(join(dir, 'pack.sqlite')).equals(before)).toBeTrue();
        expect(readdirSync(dir)).toEqual(['pack.sqlite']);
        expect(await exportRoot(dir)).toBe(first.semanticRoot);
    }, 20000);
});
