import {
    chmod,
    cp,
    mkdir,
    mkdtemp,
    readFile,
    rm,
    stat,
    symlink,
    unlink,
    writeFile
} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';

import {runTaskCatalogCompositionTask} from
    '../../src/foundation/taskCatalogComposition/taskCatalogCompositionFileAdapter.js';

const CATALOG = join('runtime-nvb', 'catalog');
const CAPABILITIES = join(CATALOG, 'capabilities');
const PROFILES = join('runtime-nvb', 'profiles');
const SCHEMAS = join('runtime-nvb', 'schemas');
const RUNTIME_CONFIG = join('runtime-nvb', 'runtime-nvb.json');
const TASK_CATALOG = join('runtime-nvb', 'task-catalog.json');

async function withFixture(
    action: (root: string) => Promise<void>,
    includeAggregates = true
): Promise<void> {
    const root = await mkdtemp(join(tmpdir(), 'watchtower-rt09-'));
    try {
        await mkdir(join(root, 'runtime-nvb'), {recursive: true});
        await cp(join(process.cwd(), CATALOG), join(root, CATALOG), {recursive: true});
        await cp(join(process.cwd(), PROFILES), join(root, PROFILES), {recursive: true});
        await cp(join(process.cwd(), SCHEMAS), join(root, SCHEMAS), {recursive: true});
        if (includeAggregates) {
            await cp(join(process.cwd(), RUNTIME_CONFIG), join(root, RUNTIME_CONFIG));
            await cp(join(process.cwd(), TASK_CATALOG), join(root, TASK_CATALOG));
        }
        await action(root);
    } finally {
        await rm(root, {recursive: true, force: true});
    }
}

function fixedToken(): string {
    return 'fixed-token';
}

describe('task catalog aggregate check and deterministic replay', function () {
    it('checks both authoritative aggregates without changing either byte', async function () {
        const beforeRuntime = await readFile(RUNTIME_CONFIG);
        const beforeCatalog = await readFile(TASK_CATALOG);
        const result = await runTaskCatalogCompositionTask(
            process.cwd(), {mode: 'check'}, {tempToken: fixedToken}
        );
        expect(result.ok).toBeTrue();
        expect([...(await readFile(RUNTIME_CONFIG))]).toEqual([...beforeRuntime]);
        expect([...(await readFile(TASK_CATALOG))]).toEqual([...beforeCatalog]);
        if (result.ok) {
            expect(result.wrote).toBeFalse();
            expect(result.fragmentCount).toBe(3);
            expect(result.profileCount).toBe(1);
            expect(result.taskCount).toBe(5);
        }
    });

    it('rejects stale bytes without repair, then writes and replays byte-identically', async function () {
        await withFixture(async (root) => {
            const runtimePath = join(root, RUNTIME_CONFIG);
            const catalogPath = join(root, TASK_CATALOG);
            const stale = new TextEncoder().encode('{}\n');
            await writeFile(runtimePath, stale);
            const checked = await runTaskCatalogCompositionTask(root, {mode: 'check'}, {tempToken: fixedToken});
            expect(checked.ok).toBeFalse();
            expect([...(await readFile(runtimePath))]).toEqual([...stale]);
            const first = await runTaskCatalogCompositionTask(root, {mode: 'write'}, {tempToken: fixedToken});
            const firstRuntime = await readFile(runtimePath);
            const firstCatalog = await readFile(catalogPath);
            const second = await runTaskCatalogCompositionTask(root, {mode: 'write'}, {tempToken: fixedToken});
            expect(first.ok).toBeTrue();
            expect(second.ok).toBeTrue();
            expect([...(await readFile(runtimePath))]).toEqual([...firstRuntime]);
            expect([...(await readFile(catalogPath))]).toEqual([...firstCatalog]);
            if (first.ok && second.ok) expect(second.catalogSha256).toBe(first.catalogSha256);
        });
    });
});

describe('task catalog relocation and partial aggregate recovery', function () {
    it('creates both missing aggregates from a relocated project root', async function () {
        await withFixture(async (root) => {
            const written = await runTaskCatalogCompositionTask(root, {mode: 'write'}, {tempToken: fixedToken});
            const checked = await runTaskCatalogCompositionTask(root, {mode: 'check'}, {tempToken: fixedToken});
            expect(written.ok).toBeTrue();
            expect(checked.ok).toBeTrue();
            expect((await readFile(join(root, TASK_CATALOG))).byteLength).toBeGreaterThan(0);
        }, false);
    });

    it('treats one missing aggregate as stale and does not alter the remaining aggregate', async function () {
        await withFixture(async (root) => {
            const runtimePath = join(root, RUNTIME_CONFIG);
            const before = await readFile(runtimePath);
            await unlink(join(root, TASK_CATALOG));
            const result = await runTaskCatalogCompositionTask(root, {mode: 'check'}, {tempToken: fixedToken});
            expect(result.ok).toBeFalse();
            if (!result.ok) expect(result.failure.code).toBe('TASK_CATALOG_AGGREGATE_STALE');
            expect([...(await readFile(runtimePath))]).toEqual([...before]);
        });
    });
});

describe('task catalog path, symlink, and permission boundaries', function () {
    it('rejects source and aggregate symlinks without changing their targets', async function () {
        await withFixture(async (root) => {
            const sourceLink = join(root, CAPABILITIES, 'zzz.catalog.json');
            await symlink('scaffold.catalog.json', sourceLink);
            const sourceResult = await runTaskCatalogCompositionTask(
                root, {mode: 'check'}, {tempToken: fixedToken}
            );
            expect(sourceResult.ok).toBeFalse();
            if (!sourceResult.ok) expect(sourceResult.failure.code).toBe('TASK_CATALOG_SOURCE_FILE_INVALID');
            await unlink(sourceLink);
            const target = join(root, 'outside.json');
            const targetBytes = new TextEncoder().encode('outside\n');
            await writeFile(target, targetBytes);
            await unlink(join(root, TASK_CATALOG));
            await symlink(target, join(root, TASK_CATALOG));
            const aggregateResult = await runTaskCatalogCompositionTask(
                root, {mode: 'write'}, {tempToken: fixedToken}
            );
            expect(aggregateResult.ok).toBeFalse();
            if (!aggregateResult.ok) {
                expect(aggregateResult.failure.code).toBe('TASK_CATALOG_AGGREGATE_PATH_INVALID');
            }
            expect([...(await readFile(target))]).toEqual([...targetBytes]);
        });
    });
});

describe('task catalog source permission boundary', function () {
    it('maps unreadable source bytes to a closed failure without aggregate mutation', async function () {
        await withFixture(async (root) => {
            const fragmentPath = join(root, CAPABILITIES, 'scaffold.catalog.json');
            const before = await readFile(join(root, TASK_CATALOG));
            await chmod(fragmentPath, 0o000);
            try {
                const result = await runTaskCatalogCompositionTask(
                    root, {mode: 'write'}, {tempToken: fixedToken}
                );
                expect(result.ok).toBeFalse();
                if (!result.ok) expect(result.failure.code).toBe('TASK_CATALOG_FILE_IO_FAILED');
                expect([...(await readFile(join(root, TASK_CATALOG)))]).toEqual([...before]);
            } finally {
                await chmod(fragmentPath, 0o644);
            }
        });
    });
});

describe('task catalog interrupted-artifact and mode behavior', function () {
    it('rejects temp and backup collisions before replacing either aggregate', async function () {
        await withFixture(async (root) => {
            const runtimePath = join(root, RUNTIME_CONFIG);
            const catalogPath = join(root, TASK_CATALOG);
            const beforeRuntime = await readFile(runtimePath);
            const beforeCatalog = await readFile(catalogPath);
            await writeFile(runtimePath, '{}\n');
            await writeFile(join(root, 'runtime-nvb', '.runtime-nvb.fixed-token.tmp'), 'partial\n');
            const result = await runTaskCatalogCompositionTask(root, {mode: 'write'}, {tempToken: fixedToken});
            expect(result.ok).toBeFalse();
            if (!result.ok) expect(result.failure.code).toBe('TASK_CATALOG_PARTIAL_ARTIFACT');
            expect([...(await readFile(runtimePath))]).toEqual([...new TextEncoder().encode('{}\n')]);
            expect([...(await readFile(catalogPath))]).toEqual([...beforeCatalog]);
            expect(beforeRuntime.byteLength).toBeGreaterThan(0);
        });
    });

    it('preserves the independent modes of both generated aggregates', async function () {
        await withFixture(async (root) => {
            const runtimePath = join(root, RUNTIME_CONFIG);
            const catalogPath = join(root, TASK_CATALOG);
            await writeFile(runtimePath, '{}\n');
            await chmod(runtimePath, 0o640);
            await chmod(catalogPath, 0o600);
            const result = await runTaskCatalogCompositionTask(root, {mode: 'write'}, {tempToken: fixedToken});
            expect(result.ok).toBeTrue();
            expect((await stat(runtimePath)).mode & 0o777).toBe(0o640);
            expect((await stat(catalogPath)).mode & 0o777).toBe(0o600);
        });
    });
});

describe('task catalog task input and source directory failures', function () {
    it('rejects malformed task input and empty source directories', async function () {
        expect((await runTaskCatalogCompositionTask(
            process.cwd(), {mode: 'check', extra: true}, {tempToken: fixedToken}
        )).ok).toBeFalse();
        await withFixture(async (root) => {
            await rm(join(root, PROFILES), {recursive: true});
            await mkdir(join(root, PROFILES));
            const before = await readFile(join(root, TASK_CATALOG));
            const result = await runTaskCatalogCompositionTask(root, {mode: 'write'}, {tempToken: fixedToken});
            expect(result.ok).toBeFalse();
            if (!result.ok) expect(result.failure.code).toBe('TASK_PROFILE_DIRECTORY_INVALID');
            expect([...(await readFile(join(root, TASK_CATALOG)))]).toEqual([...before]);
        });
    });
});
