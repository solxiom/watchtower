import {existsSync, mkdirSync, readdirSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {createLockRecord, readLockRecord} from '../../src/foundation/storage/writeLockRecord.js';
import {RuntimeCatalog} from '../../src/foundation/runtime/catalog/index.js';
import {ImmutableVersionStore} from '../../src/foundation/runtime/catalog/ImmutableVersionStore.js';
import {nodeImmutableVersionFileSystem} from '../../src/foundation/runtime/catalog/ImmutableVersionFileSystem.js';
import {
    childExit,
    childRequest,
    childScript,
    cleanupFixture,
    deadPid,
    expectCatalogError,
    makeRuntimeCatalogFixture,
    runChild,
    runtimeManifest,
    waitFor
} from './support/runtimeCatalogFixtures.js';

const FOREIGN_TOKEN = '00000000-0000-4000-8000-0000000055cc';
const DEAD_TOKEN = '00000000-0000-4000-8000-00000000dead';

describe('RuntimeCatalog recovery and exclusion', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    it('refuses staging while the catalog lock is held', () => {
        const dataRoot = join(fixture.root, 'data');
        mkdirSync(dataRoot, {recursive: true});
        writeFileSync(join(dataRoot, '.runtime-catalog.lock'), 'other writer\n');
        expectCatalogError(() => fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'STAGING_IO_ERROR');
        expect(existsSync(join(dataRoot, 'runtimes', '1.0.0'))).toBeFalse();
    });

    it('does not release a foreign replacement lock', () => {
        const dataRoot = join(fixture.root, 'data');
        const lockPath = join(dataRoot, '.runtime-catalog.lock');
        const store = new ImmutableVersionStore({temporaryReady: () => replaceLock(lockPath)});
        const catalog = new RuntimeCatalog({dataRoot: () => dataRoot, store});
        expectCatalogError(() => catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'STAGING_IO_ERROR');
        expect(readLockRecord(lockPath)?.token).toBe(FOREIGN_TOKEN);
    });

    it('recovers a stale reclaim sentinel and dead ordinary lock', () => {
        const dataRoot = join(fixture.root, 'data');
        mkdirSync(dataRoot, {recursive: true});
        writeRecord(join(dataRoot, '.runtime-catalog.lock'), DEAD_TOKEN);
        writeRecord(join(dataRoot, '.runtime-catalog.lock.reclaim'), DEAD_TOKEN);
        fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source);
        expect(fixture.catalog.isRuntimeInstalled('1.0.0')).toBeTrue();
        expect(existsSync(join(dataRoot, '.runtime-catalog.lock.reclaim'))).toBeFalse();
    });

    it('recovers a stale partial temporary root after child SIGKILL', async () => {
        const request = childRequest(fixture.root, fixture.source, runtimeManifest('1.0.0'), true);
        const child = spawn(process.execPath, [childScript()], {env: {...process.env, WATCHTOWER_RUNTIME_CATALOG_CHILD: JSON.stringify(request)}});
        await waitFor(() => existsSync(request.ready));
        child.kill('SIGKILL');
        await childExit(child);
        expect(readdirSync(join(fixture.root, 'data', 'runtimes')).some((name) => name.startsWith('.1.0.0.staging-'))).toBeTrue();
        fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source);
        expect(fixture.catalog.isRuntimeInstalled('1.0.0')).toBeTrue();
    });

    it('serializes two processes so only one version publishes', async () => {
        const request = childRequest(fixture.root, fixture.source, runtimeManifest('1.0.0'), true);
        const holder = spawn(process.execPath, [childScript()], {env: {...process.env, WATCHTOWER_RUNTIME_CATALOG_CHILD: JSON.stringify(request)}});
        await waitFor(() => existsSync(request.ready));
        expect(await runChild(childRequest(fixture.root, fixture.source, runtimeManifest('1.0.0'), false))).toContain('STAGING_IO_ERROR');
        holder.kill('SIGKILL');
        await childExit(holder);
        fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source);
        expect(fixture.catalog.listInstalledRuntimes()).toEqual(['1.0.0']);
    });
});

function replaceLock(path: string): void {
    unlinkSync(path);
    writeFileSync(path, JSON.stringify({...createLockRecord(), token: FOREIGN_TOKEN}));
    throw new Error('interrupted');
}

function writeRecord(path: string, token: string): void {
    writeFileSync(path, JSON.stringify({...createLockRecord(), pid: deadPid(), token}));
}
