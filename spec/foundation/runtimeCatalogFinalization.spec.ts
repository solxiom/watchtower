import {existsSync} from 'node:fs';
import {join} from 'node:path';
import {spawn} from 'node:child_process';
import {RuntimeCatalogError} from '../../src/contracts/runtimeCatalog.js';
import {RuntimeCatalog} from '../../src/foundation/runtime/catalog/index.js';
import {ImmutableVersionStore} from '../../src/foundation/runtime/catalog/ImmutableVersionStore.js';
import {nodeImmutableVersionFileSystem} from '../../src/foundation/runtime/catalog/ImmutableVersionFileSystem.js';
import {
    childExit,
    childRequest,
    childScript,
    cleanupFixture,
    makeRuntimeCatalogFixture,
    runtimeManifest,
    waitFor
} from './support/runtimeCatalogFixtures.js';

type FinalizationFault =
    | 'unlink-before' | 'unlink-after' | 'parent-open' | 'parent-fsync' | 'parent-close'
    | 'restore-write-before' | 'restore-write-after' | 'restore-open' | 'restore-fsync' | 'restore-close';

describe('RuntimeCatalog exclusive publication finalization', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    it('keeps a re-entrant observer conservative until the owner settles', () => {
        const controlled = reentrantFinalizationCatalog(fixture);
        expect(stageResult(controlled.subject, fixture.source)).toBe('STAGING_IO_ERROR');
        expect(controlled.observerResult()).toBe('STAGING_IO_ERROR');
        expect(controlled.observerInstalledResult()).toBe('STAGING_IO_ERROR');
        expect(finalizationSnapshot(controlled.subject, fixture.root)).toEqual({
            destination: true, finalizing: true, installed: 'STAGING_IO_ERROR', lock: false, pending: true
        });
        controlled.recover();
        expect(stageResult(controlled.subject, fixture.source)).toBe('success');
        expect(finalizationSnapshot(controlled.subject, fixture.root)).toEqual({
            destination: true, finalizing: false, installed: true, lock: false, pending: false
        });
        expect(stageResult(controlled.observer, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
    });

    it('recovers a child interrupted after pending-marker unlink', async () => {
        const request = childRequest(fixture.root, fixture.source, runtimeManifest('1.0.0'), true, 'finalization');
        const child = spawn(process.execPath, [childScript()], {
            env: {...process.env, WATCHTOWER_RUNTIME_CATALOG_CHILD: JSON.stringify(request)}
        });
        await waitFor(() => existsSync(request.ready));
        expect(existsSync(finalizingPath(fixture.root))).toBeTrue();
        expect(existsSync(pendingPath(fixture.root))).toBeFalse();
        child.kill('SIGKILL');
        await childExit(child);
        expect(stageResult(fixture.catalog, fixture.source)).toBe('success');
        expect(finalizationSnapshot(fixture.catalog, fixture.root)).toEqual({
            destination: true, finalizing: false, installed: true, lock: false, pending: false
        });
        expect(stageResult(fixture.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
    });
});

describe('RuntimeCatalog durable marker restoration', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    for (const boundary of [
        'unlink-before', 'unlink-after', 'parent-open', 'parent-fsync', 'parent-close',
        'restore-write-before', 'restore-write-after', 'restore-open', 'restore-fsync', 'restore-close'
    ] as const) {
        it(`retains durable conservative state across ${boundary}`, () => {
            const controlled = finalizationFaultCatalog(fixture, boundary);
            const firstResult = stageResult(controlled.catalog, fixture.source);
            expect(controlled.finalizerFileSynced()).toBeTrue();
            expect(controlled.finalizerParentSynced()).toBeTrue();
            if (boundary === 'restore-write-before') {
                expect(firstResult).toBe('success');
                expect(finalizationSnapshot(controlled.catalog, fixture.root)).toEqual({
                    destination: true, finalizing: false, installed: true, lock: false, pending: false
                });
                expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
                return;
            }
            expect(firstResult).toBe('STAGING_IO_ERROR');
            const first = finalizationSnapshot(controlled.catalog, fixture.root);
            expect(first.destination).toBeTrue();
            expect(first.finalizing).toBeTrue();
            expect(first.installed).toBe('STAGING_IO_ERROR');
            expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
            expect(finalizationSnapshot(controlled.catalog, fixture.root).finalizing).toBeTrue();
            controlled.recover();
            expect(stageResult(controlled.catalog, fixture.source)).toBe('success');
            expect(finalizationSnapshot(controlled.catalog, fixture.root)).toEqual({
                destination: true, finalizing: false, installed: true, lock: false, pending: false
            });
            expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
        });
    }
});

function reentrantFinalizationCatalog(fixture: ReturnType<typeof makeRuntimeCatalogFixture>): {
    observer: RuntimeCatalog;
    observerInstalledResult: () => boolean | string;
    observerResult: () => string;
    recover: () => void;
    subject: RuntimeCatalog;
} {
    const dataRoot = join(fixture.root, 'data');
    const parent = join(dataRoot, 'runtimes');
    const observer = new RuntimeCatalog({dataRoot: () => dataRoot});
    let observerInstalled: boolean | string = 'not-called';
    let observerOutcome = 'not-called';
    let failParent = false;
    let invoked = false;
    const fileSystem = {
        ...nodeImmutableVersionFileSystem,
        open: (path: string, flags: string) => {
            if (failParent && path === parent) throw fault('parent-open');
            return nodeImmutableVersionFileSystem.open(path, flags);
        }
    };
    const store = new ImmutableVersionStore({
        fileSystem,
        publicationMarkerRemoved: () => {
            if (invoked) return;
            invoked = true;
            observerInstalled = installedResult(observer);
            observerOutcome = stageResult(observer, fixture.source);
            failParent = true;
        }
    });
    return {
        observer,
        observerInstalledResult: () => observerInstalled,
        observerResult: () => observerOutcome,
        recover: () => { failParent = false; },
        subject: new RuntimeCatalog({dataRoot: () => dataRoot, store})
    };
}

function finalizationFaultCatalog(
    fixture: ReturnType<typeof makeRuntimeCatalogFixture>, boundary: FinalizationFault
): {
    catalog: RuntimeCatalog;
    finalizerFileSynced: () => boolean;
    finalizerParentSynced: () => boolean;
    recover: () => void;
} {
    const paths = finalizationPaths(fixture.root);
    const descriptors = new Map<number, string>();
    let armed = true;
    let finalizerFileSynced = false;
    let finalizerParentSynced = false;
    let restoring = false;
    const fileSystem = {
        ...nodeImmutableVersionFileSystem,
        writeFile: (path: string | number, data: string, options?: {flag?: string; mode?: number}) => {
            if (armed && path === paths.pending && restoring && boundary === 'restore-write-before') throw fault(boundary);
            nodeImmutableVersionFileSystem.writeFile(path, data, options);
            if (armed && path === paths.pending && restoring && boundary === 'restore-write-after') throw fault(boundary);
        },
        unlink: (path: string) => {
            if (armed && path === paths.pending) {
                if (boundary === 'unlink-before') throw fault(boundary);
                nodeImmutableVersionFileSystem.unlink(path);
                restoring = true;
                if (boundary === 'unlink-after' || boundary.startsWith('restore-')) throw fault(boundary);
                return;
            }
            nodeImmutableVersionFileSystem.unlink(path);
        },
        open: (path: string, flags: string) => {
            if (armed && restoring && path === paths.parent && boundary === 'parent-open') throw fault(boundary);
            if (armed && restoring && path === paths.pending && boundary === 'restore-open') throw fault(boundary);
            const descriptor = nodeImmutableVersionFileSystem.open(path, flags);
            descriptors.set(descriptor, path);
            return descriptor;
        },
        fsync: (descriptor: number) => {
            const path = descriptors.get(descriptor);
            if (armed && restoring && path === paths.parent && boundary === 'parent-fsync') throw fault(boundary);
            if (armed && restoring && path === paths.pending && boundary === 'restore-fsync') throw fault(boundary);
            nodeImmutableVersionFileSystem.fsync(descriptor);
            if (path === paths.finalizing) finalizerFileSynced = true;
            if (path === paths.parent && finalizerFileSynced && !restoring) finalizerParentSynced = true;
        },
        close: (descriptor: number) => {
            const path = descriptors.get(descriptor);
            descriptors.delete(descriptor);
            nodeImmutableVersionFileSystem.close(descriptor);
            if (armed && restoring && path === paths.parent && boundary === 'parent-close') throw fault(boundary);
            if (armed && restoring && path === paths.pending && boundary === 'restore-close') throw fault(boundary);
        }
    };
    const store = new ImmutableVersionStore({fileSystem});
    return {
        catalog: new RuntimeCatalog({dataRoot: () => join(fixture.root, 'data'), store}),
        finalizerFileSynced: () => finalizerFileSynced,
        finalizerParentSynced: () => finalizerParentSynced,
        recover: () => { armed = false; }
    };
}

function finalizationPaths(root: string): {finalizing: string; parent: string; pending: string} {
    const parent = join(root, 'data', 'runtimes');
    return {finalizing: join(parent, '.1.0.0.publication-finalizing'), parent, pending: join(parent, '.1.0.0.publication-pending')};
}

function finalizationSnapshot(catalog: RuntimeCatalog, root: string): {
    destination: boolean; finalizing: boolean; installed: boolean | string; lock: boolean; pending: boolean;
} {
    return {
        destination: existsSync(join(root, 'data', 'runtimes', '1.0.0')),
        finalizing: existsSync(finalizingPath(root)),
        installed: installedResult(catalog),
        lock: existsSync(join(root, 'data', '.runtime-catalog.lock')),
        pending: existsSync(pendingPath(root))
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

function pendingPath(root: string): string {
    return join(root, 'data', 'runtimes', '.1.0.0.publication-pending');
}

function finalizingPath(root: string): string {
    return join(root, 'data', 'runtimes', '.1.0.0.publication-finalizing');
}

function fault(boundary: string): Error {
    return new Error(`${boundary} fault`);
}
