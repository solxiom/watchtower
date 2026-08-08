import {mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {consumePack} from '../../src/foundation/pack/index.js';
import {runIndexBuildTask} from '../../src/foundation/index/assembly/index.js';
import {buildPackFixture, deps, fakeFileSystem, realValidators, PACK_ROOT, type PackFixture} from './fixtures/packFixture.js';
import {makeWorkDir, removeWorkDir} from '../storage/support/storeFixtures.js';

async function acceptedPack(fixture: PackFixture) {
    const result = await consumePack(fixture.context, deps(fixture));
    if (!result.ok) throw new Error(result.reason);
    return result.pack;
}

describe('index build packaged task', () => {
    it('validates a sealed pack and writes zero bytes in dry-run mode', async () => {
        const fixture = buildPackFixture();
        const pack = await acceptedPack(fixture);
        const before = fixture.files.get(`${PACK_ROOT}/implementation-pack.json`);
        const result = await runIndexBuildTask({schemaVersion: 1, runtime: false, dryRun: true,
            packRoot: PACK_ROOT, packPath: 'docs/spec/implementation/watchtower-v1', indexRoot: '/tmp/no-write',
            laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', acceptedPack: pack},
        {pack: {fs: fakeFileSystem(fixture), validators: realValidators()}});

        expect(result.schemaVersion).toBe(1);
        expect(result.runtime).toBeFalse();
        expect(result.dryRun).toBeTrue();
        expect(result.changed).toBeFalse();
        expect(result.indexId).toBeNull();
        expect(result.runtimeIndexes).toBe(0);
        expect(fixture.files.get(`${PACK_ROOT}/implementation-pack.json`)).toEqual(before);
    });

    it('fails before any effect when accepted predecessor evidence is absent', async () => {
        let failure: unknown;
        try {
            await runIndexBuildTask({schemaVersion: 1, runtime: false, dryRun: true}, {});
        } catch (error) { failure = error; }
        expect(String(failure)).toContain('INDEX_BUILD_PREDECESSOR_UNAVAILABLE');
    });

    it('validates every runtime journal during dry-run without creating a database', async () => {
        const root = makeWorkDir();
        try {
            const journal = join(root, 'coordinator-events.jsonl');
            mkdirSync(join(root, 'index'), {recursive: true});
            writeFileSync(journal, '');
            const result = await runIndexBuildTask({schemaVersion: 1, runtime: true, dryRun: true, laneDir: root, laneId: 'lane',
                runtimeIndexes: [{databasePath: join(root, 'index', 'runtime.sqlite'), journalPath: journal}]}, {});
            expect(result.schemaVersion).toBe(1);
            expect(result.runtime).toBeTrue();
            expect(result.dryRun).toBeTrue();
            expect(result.changed).toBeFalse();
            expect(result.runtimeIndexes).toBe(1);
            expect(() => readFileSync(join(root, 'index', 'runtime.sqlite'))).toThrow();
        } finally { removeWorkDir(root); }
    });

    it('rejects traversal and symlink runtime paths before rebuild planning', async () => {
        const root = makeWorkDir();
        try {
            const journal = join(root, 'events.jsonl'); writeFileSync(journal, '');
            let error: unknown;
            try { await runIndexBuildTask({schemaVersion: 1, runtime: true, dryRun: true, laneDir: root, laneId: 'lane', runtimeIndexes: [{databasePath: join(root, '..', 'outside.sqlite'), journalPath: journal}]}, {}); }
            catch (value) { error = value; }
            expect(String(error)).toContain('INDEX_BUILD_INPUT_INVALID');
            const outside = join(root, 'outside-events.jsonl'); writeFileSync(outside, '');
            const link = join(root, 'link-events.jsonl'); symlinkSync(outside, link);
            try { await runIndexBuildTask({schemaVersion: 1, runtime: true, dryRun: true, laneDir: root, laneId: 'lane', runtimeIndexes: [{databasePath: join(root, 'runtime.sqlite'), journalPath: link}]}, {}); }
            catch (value) { error = value; }
            expect(String(error)).toContain('INDEX_BUILD_INPUT_INVALID');
        } finally { removeWorkDir(root); }
    });
});
