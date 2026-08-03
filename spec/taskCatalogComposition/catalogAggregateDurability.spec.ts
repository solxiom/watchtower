import {cp, mkdir, mkdtemp, readFile, rm, stat, writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {nodeCatalogAggregateFileSystem} from
    '../../src/foundation/taskCatalogComposition/catalogAggregateFileSystem.js';
import {runTaskCatalogCompositionTask} from
    '../../src/foundation/taskCatalogComposition/taskCatalogCompositionFileAdapter.js';
import type {TaskCatalogTaskResult} from
    '../../src/foundation/taskCatalogComposition/taskCatalogTaskContracts.js';
import {
    createCatalogFileSystemGate,
    FaultInjectingCatalogFileSystem
} from './FaultInjectingCatalogFileSystem.js';
import type {CatalogFileSystemFault} from './FaultInjectingCatalogFileSystem.js';

const RUNTIME = join('runtime-nvb', 'runtime-nvb.json');
const CATALOG = join('runtime-nvb', 'task-catalog.json');
const STALE = new TextEncoder().encode('{}\n');

interface DurabilityFixture {
    readonly root: string;
    readonly beforeRuntime: Uint8Array;
    readonly beforeCatalog: Uint8Array;
}

async function withFixture(action: (fixture: DurabilityFixture) => Promise<void>): Promise<void> {
    const root = await mkdtemp(join(tmpdir(), 'watchtower-rt09-durability-'));
    try {
        await mkdir(join(root, 'runtime-nvb'), {recursive: true});
        await cp(join('runtime-nvb', 'catalog'), join(root, 'runtime-nvb', 'catalog'), {recursive: true});
        await cp(join('runtime-nvb', 'leaves'), join(root, 'runtime-nvb', 'leaves'), {recursive: true});
        await cp(join('runtime-nvb', 'profiles'), join(root, 'runtime-nvb', 'profiles'), {recursive: true});
        await cp(join('runtime-nvb', 'schemas'), join(root, 'runtime-nvb', 'schemas'), {recursive: true});
        await writeFile(join(root, RUNTIME), STALE);
        await cp(CATALOG, join(root, CATALOG));
        await action({root, beforeRuntime: STALE, beforeCatalog: await readFile(join(root, CATALOG))});
    } finally {
        await rm(root, {recursive: true, force: true});
    }
}

async function runWithFault(root: string, faults: readonly CatalogFileSystemFault[]):
    Promise<TaskCatalogTaskResult> {
    const aggregateFileSystem = new FaultInjectingCatalogFileSystem(
        nodeCatalogAggregateFileSystem, faults
    );
    return runTaskCatalogCompositionTask(root, {mode: 'write'}, {
        tempToken: () => 'fixed-token', aggregateFileSystem
    });
}

function resultCode(result: TaskCatalogTaskResult): string | null {
    return result.ok ? null : result.failure.code;
}

async function expectOriginalPair(fixture: DurabilityFixture): Promise<void> {
    expect([...(await readFile(join(fixture.root, RUNTIME)))]).toEqual([...fixture.beforeRuntime]);
    expect([...(await readFile(join(fixture.root, CATALOG)))]).toEqual([...fixture.beforeCatalog]);
}

async function exists(path: string): Promise<boolean> {
    try {
        await stat(path);
        return true;
    } catch {
        return false;
    }
}

describe('catalog aggregate pre-commit interruption recovery', function () {
    it('removes staged bytes when the first temp write fails', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'write:.runtime-nvb.fixed-token.tmp', occurrence: 1}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_FILE_IO_FAILED');
            await expectOriginalPair(fixture);
        });
    });

    it('restores both originals when the second backup move fails', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [{operationPrefix: 'rename:', occurrence: 2}]);
            expect(resultCode(result)).toBe('TASK_CATALOG_FILE_IO_FAILED');
            await expectOriginalPair(fixture);
        });
    });

    it('restores both originals when the second install fails', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [{operationPrefix: 'rename:', occurrence: 4}]);
            expect(resultCode(result)).toBe('TASK_CATALOG_FILE_IO_FAILED');
            await expectOriginalPair(fixture);
        });
    });

    it('restores both originals when the commit directory flush fails', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'sync:runtime-nvb', occurrence: 1}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_FILE_IO_FAILED');
            await expectOriginalPair(fixture);
        });
    });
});

describe('catalog aggregate rollback failure', function () {
    it('surfaces rollback directory-flush failure and retains the lock evidence', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'rename:', occurrence: 4},
                {operationPrefix: 'sync:runtime-nvb', occurrence: 1}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_ROLLBACK_FAILED');
            await expectOriginalPair(fixture);
            expect(await exists(join(fixture.root, 'runtime-nvb', '.task-catalog.aggregate.lock'))).toBeTrue();
        });
    });
});

describe('catalog aggregate post-commit uncertainty', function () {
    it('surfaces backup-cleanup failure and retains backup plus lock evidence', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'unlink:.runtime-nvb.fixed-token.bak', occurrence: 1}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_DURABILITY_UNCERTAIN');
            expect(await exists(join(fixture.root, 'runtime-nvb', '.runtime-nvb.fixed-token.bak'))).toBeTrue();
            expect(await exists(join(fixture.root, 'runtime-nvb', '.task-catalog.aggregate.lock'))).toBeTrue();
        });
    });

    it('surfaces final directory-flush failure and retains lock evidence', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'sync:runtime-nvb', occurrence: 2}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_DURABILITY_UNCERTAIN');
            expect(await exists(join(fixture.root, 'runtime-nvb', '.task-catalog.aggregate.lock'))).toBeTrue();
            expect([...(await readFile(join(fixture.root, RUNTIME)))]).not.toEqual([...STALE]);
        });
    });
});

describe('catalog aggregate lock cleanup uncertainty', function () {
    it('surfaces lock-handle cleanup failure and retains closed lock evidence', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'close:.task-catalog.aggregate.lock', occurrence: 1}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_DURABILITY_UNCERTAIN');
            expect(await exists(join(fixture.root, 'runtime-nvb', '.task-catalog.aggregate.lock'))).toBeTrue();
        });
    });

    it('surfaces lock cleanup failure after the new pair is durable', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'unlink:.task-catalog.aggregate.lock', occurrence: 1}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_DURABILITY_UNCERTAIN');
            expect(await exists(join(fixture.root, 'runtime-nvb', '.task-catalog.aggregate.lock'))).toBeTrue();
            expect([...(await readFile(join(fixture.root, RUNTIME)))]).not.toEqual([...STALE]);
        });
    });

    it('surfaces lock-removal directory-flush failure after the pair is durable', async function () {
        await withFixture(async (fixture) => {
            const result = await runWithFault(fixture.root, [
                {operationPrefix: 'sync:runtime-nvb', occurrence: 3}
            ]);
            expect(resultCode(result)).toBe('TASK_CATALOG_DURABILITY_UNCERTAIN');
            expect(await exists(join(fixture.root, 'runtime-nvb', '.task-catalog.aggregate.lock'))).toBeFalse();
            expect([...(await readFile(join(fixture.root, RUNTIME)))]).not.toEqual([...STALE]);
        });
    });
});

describe('catalog aggregate writer concurrency', function () {
    it('rejects a second writer while the first owns the aggregate lock', async function () {
        await withFixture(async (fixture) => {
            const gate = createCatalogFileSystemGate('sync:.task-catalog.aggregate.lock');
            const firstFileSystem = new FaultInjectingCatalogFileSystem(
                nodeCatalogAggregateFileSystem, [], gate
            );
            const first = runTaskCatalogCompositionTask(fixture.root, {mode: 'write'}, {
                tempToken: () => 'first-token', aggregateFileSystem: firstFileSystem
            });
            await gate.reached;
            const second = await runTaskCatalogCompositionTask(fixture.root, {mode: 'write'}, {
                tempToken: () => 'second-token'
            });
            gate.release();
            expect(resultCode(second)).toBe('TASK_CATALOG_CONCURRENT_WRITE');
            expect((await first).ok).toBeTrue();
        });
    });
});
