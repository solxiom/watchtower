import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {RuntimeCatalogError} from '../../src/contracts/runtimeCatalog.js';
import {RuntimeCatalog} from '../../src/foundation/RuntimeCatalog.js';
import {ImmutableVersionStore} from '../../src/foundation/runtimeCatalog/ImmutableVersionStore.js';
import {nodeImmutableVersionFileSystem} from '../../src/foundation/runtimeCatalog/ImmutableVersionFileSystem.js';
import {
    cleanupFixture,
    makeRuntimeCatalogFixture,
    runtimeManifest
} from './support/runtimeCatalogFixtures.js';

type CleanupFault = 'unlink-before' | 'unlink-after' | 'parent-open' | 'parent-fsync' | 'parent-close';

describe('RuntimeCatalog durable finalizer cleanup', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    for (const boundary of [
        'unlink-before', 'unlink-after', 'parent-open', 'parent-fsync', 'parent-close'
    ] as const) {
        it(`reports the exact finalizer cleanup outcome across ${boundary}`, () => {
            const controlled = cleanupFaultCatalog(fixture, boundary);
            const first = stageResult(controlled.catalog, fixture.source);
            expect(controlled.semanticFinalizationSynced()).toBeTrue();
            if (boundary === 'unlink-before') {
                expect(first).toBe('STAGING_IO_ERROR');
                expect(cleanupSnapshot(controlled.catalog, fixture.root)).toEqual({
                    destination: true, finalizing: true, installed: 'STAGING_IO_ERROR', lock: false, pending: false
                });
                expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
                controlled.recover();
                expect(stageResult(controlled.catalog, fixture.source)).toBe('success');
                expect(cleanupSnapshot(controlled.catalog, fixture.root)).toEqual({
                    destination: true, finalizing: false, installed: true, lock: false, pending: false
                });
                expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
                return;
            }
            expect(first).toBe('STAGING_IO_ERROR');
            expect(cleanupSnapshot(controlled.catalog, fixture.root)).toEqual({
                destination: true, finalizing: true, installed: 'STAGING_IO_ERROR', lock: false, pending: false
            });
            expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
            controlled.recover();
            expect(stageResult(controlled.catalog, fixture.source)).toBe('success');
            expect(cleanupSnapshot(controlled.catalog, fixture.root)).toEqual({
                destination: true, finalizing: false, installed: true, lock: false, pending: false
            });
            expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
        });
    }
});

function cleanupFaultCatalog(
    fixture: ReturnType<typeof makeRuntimeCatalogFixture>, boundary: CleanupFault
): {catalog: RuntimeCatalog; recover: () => void; semanticFinalizationSynced: () => boolean} {
    const paths = cleanupPaths(fixture.root);
    const descriptors = new Map<number, string>();
    let armed = true;
    let cleaning = false;
    let pendingRemoved = false;
    let semanticFinalizationSynced = false;
    const fileSystem = {
        ...nodeImmutableVersionFileSystem,
        unlink: (path: string) => {
            if (path === paths.pending) pendingRemoved = true;
            if (armed && path === paths.finalizing) {
                cleaning = true;
                if (boundary === 'unlink-before') throw fault(boundary);
                nodeImmutableVersionFileSystem.unlink(path);
                if (boundary === 'unlink-after') throw fault(boundary);
                return;
            }
            nodeImmutableVersionFileSystem.unlink(path);
        },
        open: (path: string, flags: string) => {
            if (armed && cleaning && path === paths.parent && boundary === 'parent-open') throw fault(boundary);
            const descriptor = nodeImmutableVersionFileSystem.open(path, flags);
            descriptors.set(descriptor, path);
            return descriptor;
        },
        fsync: (descriptor: number) => {
            const path = descriptors.get(descriptor);
            if (armed && cleaning && path === paths.parent && boundary === 'parent-fsync') throw fault(boundary);
            nodeImmutableVersionFileSystem.fsync(descriptor);
            if (!cleaning && pendingRemoved && path === paths.parent) semanticFinalizationSynced = true;
        },
        close: (descriptor: number) => {
            const path = descriptors.get(descriptor);
            descriptors.delete(descriptor);
            nodeImmutableVersionFileSystem.close(descriptor);
            if (armed && cleaning && path === paths.parent && boundary === 'parent-close') throw fault(boundary);
        }
    };
    const store = new ImmutableVersionStore({fileSystem});
    return {
        catalog: new RuntimeCatalog({dataRoot: () => join(fixture.root, 'data'), store}),
        recover: () => { armed = false; },
        semanticFinalizationSynced: () => semanticFinalizationSynced
    };
}

function cleanupPaths(root: string): {finalizing: string; parent: string; pending: string} {
    const parent = join(root, 'data', 'runtimes');
    return {
        finalizing: join(parent, '.1.0.0.publication-finalizing'),
        parent,
        pending: join(parent, '.1.0.0.publication-pending')
    };
}

function cleanupSnapshot(catalog: RuntimeCatalog, root: string): {
    destination: boolean; finalizing: boolean; installed: boolean | string; lock: boolean; pending: boolean;
} {
    return {
        destination: existsSync(join(root, 'data', 'runtimes', '1.0.0')),
        finalizing: existsSync(join(root, 'data', 'runtimes', '.1.0.0.publication-finalizing')),
        installed: installedResult(catalog),
        lock: existsSync(join(root, 'data', '.runtime-catalog.lock')),
        pending: existsSync(join(root, 'data', 'runtimes', '.1.0.0.publication-pending'))
    };
}

function installedResult(catalog: RuntimeCatalog): boolean | string {
    try { return catalog.isRuntimeInstalled('1.0.0'); }
    catch (error) { return error instanceof RuntimeCatalogError ? error.reason : 'unexpected'; }
}

function stageResult(catalog: RuntimeCatalog, source: string): string {
    try { catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), source); return 'success'; }
    catch (error) { return error instanceof RuntimeCatalogError ? error.reason : 'unexpected'; }
}

function fault(boundary: string): Error {
    return new Error(`${boundary} fault`);
}
