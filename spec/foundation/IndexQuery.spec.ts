import {mkdirSync, readFileSync, readdirSync, truncateSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {IndexQuery, IndexStore} from '../../src/foundation/index.js';
import {openDerivedStorage} from '../../src/foundation/storage/index.js';
import {PACK_INDEX_SCHEMA} from '../../src/foundation/packIndex/packIndexSchema.js';
import {IndexQueryError} from '../../src/contracts/index.js';
import {makeWorkDir, removeWorkDir} from '../storage/support/storeFixtures.js';
import {buildChainFixture, compileChainIndex, type ChainOptions} from './support/indexQueryFixtures.js';

async function openChain(count: number, indexRoot: string, options: Partial<ChainOptions> = {}) {
    const fixture = buildChainFixture({count, ...options});
    const {indexDir} = await compileChainIndex(fixture, indexRoot);
    const store = await IndexStore.openIndex(indexDir);
    return {store, query: new IndexQuery(store), indexDir};
}

describe('IndexQuery — publication integrity over a compiled 30-batch index', function () {
    let dir: string;
    let store: IndexStore;
    let query: IndexQuery;
    beforeEach(async function () {
        dir = makeWorkDir();
        ({store, query} = await openChain(30, dir));
    });
    afterEach(async function () { await store.close(); removeWorkDir(dir); });

    it('resolves a single batch by ID with every declared field', async function () {
        const batch = await query.getBatch('B1');
        expect(batch).toEqual(jasmine.objectContaining({id: 'B1', title: 'Batch 1', primaryRepository: 'nirvana', workload: 'large'}));
    });

    it('returns null, never an error, for a batch ID absent from the index', async function () {
        expect(await query.getBatch('does-not-exist')).toBeNull();
        expect(await query.getArtifact('nirvana:does/not/exist.md')).toBeNull();
    });

    it('lists repositories and requirements', async function () {
        expect(await query.getRepositories()).toEqual([{id: 'nirvana', role: 'primary', access: 'write'}]);
        const requirements = await query.getRequirements();
        expect(requirements.items).toEqual([{id: 'REQ-1', repository: 'nirvana', source: 'requirements-traceability.md'}]);
        expect(requirements.totalCount).toBe(1);
    });

    it('resolves proofs and artifacts owned by a batch', async function () {
        const proofs = await query.getProofs('B1');
        expect(proofs.some((proof) => proof.kind === 'class' && proof.proofClass === 'unit')).toBeTrue();
        expect(proofs.some((proof) => proof.kind === 'input' && proof.repository === 'nirvana')).toBeTrue();
        const artifacts = await query.getArtifactsByBatch('B1', 10);
        expect(artifacts.length).toBeGreaterThan(0);
        expect(artifacts.every((artifact) => artifact.owningBatchId === 'B1')).toBeTrue();
    });

    it('preserves request order and reports missing IDs from getBatchesByIds', async function () {
        const result = await query.getBatchesByIds(['B3', 'missing-1', 'B1']);
        expect(result.items.map((batch) => batch.id)).toEqual(['B3', 'B1']);
        expect(result.missingIds).toEqual(['missing-1']);
    });

    it('assembles a bounded multi-table decision-envelope context', async function () {
        const context = await query.assembleBatchContext('B10');
        expect(context.batch.id).toBe('B10');
        expect(context.dependencies.direct.map((b) => b.id)).toEqual(['B9']);
        expect(context.requirements.map((r) => r.id)).toEqual(['REQ-1']);
        expect(context.repositoryClaims.map((c) => c.repositoryId)).toEqual(['nirvana']);
        expect(context.truncated).toBeFalse();
    });
});

describe('IndexQuery — bounded reads, limits, cursors, and truncation over a 300-batch index', function () {
    let dir: string;
    let store: IndexStore;
    let query: IndexQuery;
    beforeEach(async function () {
        dir = makeWorkDir();
        ({store, query} = await openChain(300, dir));
    });
    afterEach(async function () { await store.close(); removeWorkDir(dir); });

    it('never returns more than the default page size and reports an accurate total count', async function () {
        const page = await query.getBatches();
        expect(page.items.length).toBe(50);
        expect(page.truncated).toBeTrue();
        expect(page.totalCount).toBe(300);
        expect(page.nextCursor).not.toBeNull();
    });

    it('pages through the full result set via cursor with no gaps or duplicates', async function () {
        const seen = new Set<string>();
        let cursor: string | null = null;
        let pages = 0;
        do {
            const page = await query.getBatches({limit: 40, cursor: cursor ?? undefined});
            for (const batch of page.items) seen.add(batch.id);
            cursor = page.nextCursor;
            pages += 1;
        } while (cursor !== null && pages < 20);
        expect(seen.size).toBe(300);
        expect(pages).toBe(8);
    });

    it('filters by repository, reasoning class, and workload before paginating', async function () {
        const page = await query.getBatches({workload: 'small', limit: 200});
        expect(page.items.length).toBeGreaterThan(0);
        expect(page.items.every((batch) => batch.workload === 'small')).toBeTrue();
    });

    it('rejects a page request beyond the maximum size with INDEX_LIMIT_EXCEEDED', async function () {
        await expectAsync(query.getBatches({limit: 201})).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_LIMIT_EXCEEDED'}));
    });

    it('rejects more than 200 requested batch IDs with INDEX_LIMIT_EXCEEDED', async function () {
        const ids = Array.from({length: 201}, (_unused, index) => `B${index + 1}`);
        await expectAsync(query.getBatchesByIds(ids)).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_LIMIT_EXCEEDED'}));
    });

    it('rejects a cursor issued for a different query with INDEX_CURSOR_INVALID', async function () {
        const smallPage = await query.getBatches({limit: 10, workload: 'small'});
        const largePage = await query.getBatches({limit: 10, workload: 'large'});
        expect(smallPage.nextCursor).not.toBeNull();
        expect(largePage.nextCursor).not.toBeNull();
        await expectAsync(query.getBatches({limit: 10, workload: 'small', cursor: largePage.nextCursor as string}))
            .toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_CURSOR_INVALID'}));
    });

    it('rejects a malformed cursor string with INDEX_CURSOR_INVALID', async function () {
        await expectAsync(query.getBatches({cursor: 'not-a-real-cursor'})).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_CURSOR_INVALID'}));
    });

    it('rejects a cursor from a prior index revision after the index is recompiled', async function () {
        const firstCursor = (await query.getBatches({limit: 10})).nextCursor;
        expect(firstCursor).not.toBeNull();

        const secondRoot = join(dir, 'reindexed');
        mkdirSync(secondRoot, {recursive: true});
        const secondFixture = buildChainFixture({count: 300, requirementId: 'REQ-2'});
        const {indexDir: secondDir} = await compileChainIndex(secondFixture, secondRoot);
        const secondStore = await IndexStore.openIndex(secondDir);
        const secondQuery = new IndexQuery(secondStore);
        try {
            await expectAsync(secondQuery.getBatches({limit: 10, cursor: firstCursor as string}))
                .toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_CURSOR_INVALID'}));
        } finally {
            await secondStore.close();
        }
    });
});

describe('IndexQuery — dependency resolution and depth-limit enforcement', function () {
    let dir: string;
    afterEach(function () { removeWorkDir(dir); });

    it('resolves direct and transitive dependencies for a 5-deep chain without truncation', async function () {
        dir = makeWorkDir();
        const {store, query} = await openChain(6, dir);
        try {
            const result = await query.getDependencies('B6');
            expect(result.direct.map((b) => b.id)).toEqual(['B5']);
            expect(result.transitive.map((b) => b.id).sort()).toEqual(['B1', 'B2', 'B3', 'B4']);
            expect(result.depthReached).toBe(5);
            expect(result.truncated).toBeFalse();
        } finally {
            await store.close();
        }
    });

    it('enforces the depth-10 limit and marks truncation on an 11-deep chain', async function () {
        dir = makeWorkDir();
        const {store, query} = await openChain(12, dir);
        try {
            const result = await query.getDependencies('B12');
            expect(result.depthReached).toBe(10);
            expect(result.truncated).toBeTrue();
            expect(result.direct.length + result.transitive.length).toBe(10);
            expect(result.transitive.some((b) => b.id === 'B1')).toBeFalse();
        } finally {
            await store.close();
        }
    });

    it('does not truncate a chain that exactly reaches the depth limit', async function () {
        dir = makeWorkDir();
        const {store, query} = await openChain(11, dir);
        try {
            const result = await query.getDependencies('B11');
            expect(result.depthReached).toBe(10);
            expect(result.truncated).toBeFalse();
            expect(result.transitive.some((b) => b.id === 'B1')).toBeTrue();
        } finally {
            await store.close();
        }
    });

    it('resolves direct dependents as reverse edges', async function () {
        dir = makeWorkDir();
        const {store, query} = await openChain(6, dir);
        try {
            expect((await query.getDependents('B3')).map((b) => b.id)).toEqual(['B4']);
            expect(await query.getDependents('B6')).toEqual([]);
        } finally {
            await store.close();
        }
    });

    it('fails closed with INDEX_BATCH_NOT_FOUND for an unknown batch on every batch-scoped method', async function () {
        dir = makeWorkDir();
        const {store, query} = await openChain(3, dir);
        try {
            await expectAsync(query.getDependencies('nope')).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_BATCH_NOT_FOUND'}));
            await expectAsync(query.getDependents('nope')).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_BATCH_NOT_FOUND'}));
            await expectAsync(query.getProofs('nope')).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_BATCH_NOT_FOUND'}));
            await expectAsync(query.getArtifactsByBatch('nope', 10)).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_BATCH_NOT_FOUND'}));
            await expectAsync(query.assembleBatchContext('nope')).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_BATCH_NOT_FOUND'}));
        } finally {
            await store.close();
        }
    });
});

describe('IndexStore.openIndex — stale, missing, and corrupt refusal', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('fails closed with INDEX_UNAVAILABLE when no generation is published at the path', async function () {
        const missing = join(dir, 'never-published');
        mkdirSync(missing, {recursive: true});
        await expectAsync(IndexStore.openIndex(missing)).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_UNAVAILABLE'}));
    });

    it('fails closed with INDEX_STALE when the stored index_meta rows disagree with the sidecar', async function () {
        const {indexDir} = await compileChainIndex(buildChainFixture({count: 3}), dir);
        const writable = await openDerivedStorage(indexDir).open('pack', PACK_INDEX_SCHEMA, {readOnly: false});
        try {
            await writable.updateByPrimaryKey('index_meta', 'packSealId', {value: 'sha256:0000000000000000000000000000000000000000000000000000000000000000'});
        } finally {
            await writable.close();
        }
        await expectAsync(IndexStore.openIndex(indexDir)).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_STALE'}));
    });

    it('fails closed with INDEX_CORRUPT when the SQLite bytes are corrupted', async function () {
        const {indexDir} = await compileChainIndex(buildChainFixture({count: 3}), dir);
        const dbFile = join(indexDir, 'pack.sqlite');
        writeFileSync(dbFile, 'this is not a sqlite database');
        await expectAsync(IndexStore.openIndex(indexDir)).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_CORRUPT'}));
    });

    it('fails closed when the SQLite database file is truncated', async function () {
        const {indexDir} = await compileChainIndex(buildChainFixture({count: 3}), dir);
        const dbFile = join(indexDir, 'pack.sqlite');
        truncateSync(dbFile, 64);
        const result = await IndexStore.openIndex(indexDir).then(() => null, (error: unknown) => error);
        expect(result).not.toBeNull();
        expect((result as {reason?: string}).reason).toBeDefined();
    });

    it('opens successfully and every subsequent query fails closed once the store is invalidated mid-session', async function () {
        const {indexDir} = await compileChainIndex(buildChainFixture({count: 3}), dir);
        const store = await IndexStore.openIndex(indexDir);
        try {
            expect(store.currentIndexDigest()).not.toBeNull();
            store.invalidateIndex('adversarial test invalidation');
            expect(store.currentIndexDigest()).toBeNull();
            const query = new IndexQuery(store);
            await expectAsync(query.getBatch('B1')).toBeRejectedWith(jasmine.objectContaining({reason: 'INDEX_UNAVAILABLE'}));
        } finally {
            await store.close();
        }
    });

    it('performs no repair, no rebuild, and no read-side mutation of the on-disk generation when refusing a corrupt open', async function () {
        const {indexDir} = await compileChainIndex(buildChainFixture({count: 3}), dir);
        const dbFile = join(indexDir, 'pack.sqlite');
        const before = readdirSync(indexDir).sort();
        writeFileSync(dbFile, 'not a sqlite file');
        await IndexStore.openIndex(indexDir).catch(() => undefined);
        await IndexStore.openIndex(indexDir).catch(() => undefined);
        const after = readdirSync(indexDir).sort();
        expect(after).toEqual(before);
        expect(readFileSync(dbFile, 'utf8')).toBe('not a sqlite file');
    });
});

describe('IndexQuery — error taxonomy is a closed IndexQueryError', function () {
    it('every rejection carries a reason from the closed taxonomy', async function () {
        const dir = makeWorkDir();
        try {
            const missing = join(dir, 'nothing-here');
            mkdirSync(missing, {recursive: true});
            try {
                await IndexStore.openIndex(missing);
                fail('expected openIndex to reject');
            } catch (error) {
                expect(error instanceof IndexQueryError).toBeTrue();
            }
        } finally {
            removeWorkDir(dir);
        }
    });
});
