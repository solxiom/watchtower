import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {RuntimeCatalogError} from '../../src/contracts/runtimeCatalog.js';
import {RuntimeCatalog} from '../../src/foundation/RuntimeCatalog.js';
import {ImmutableVersionStore} from '../../src/foundation/runtimeCatalog/ImmutableVersionStore.js';
import {nodeImmutableVersionFileSystem} from '../../src/foundation/runtimeCatalog/ImmutableVersionFileSystem.js';
import {ManifestStagingValidator} from '../../src/foundation/runtimeCatalog/ManifestStagingValidator.js';
import {createLockRecord, readLockRecord} from '../../src/foundation/storage/writeLockRecord.js';
import {cleanupFixture, makeRuntimeCatalogFixture, runtimeManifest} from './support/runtimeCatalogFixtures.js';

type PublicationBoundary = 'rename-aftermath' | 'open' | 'fsync' | 'close' | 'verify';
type ReleaseBoundary = 'pre-unlink' | 'post-unlink' | 'post-unlink-sync';
const SELF_TOKEN = '00000000-0000-4000-8000-00000000c003';

describe('RuntimeCatalog persistent publication recovery', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    for (const boundary of ['rename-aftermath', 'open', 'fsync', 'close', 'verify'] as const) {
        it(`retains and recovers pending state across persistent ${boundary} failure`, () => {
            const controlled = persistentPublicationCatalog(fixture, boundary);
            expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
            expect(publicationSnapshot(controlled.catalog, fixture.root)).toEqual({
                destination: true, installed: 'STAGING_IO_ERROR', lock: false, lockToken: null, pending: true
            });
            expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
            expect(existsSync(pendingPath(fixture.root))).toBeTrue();
            controlled.recover();
            expect(stageResult(controlled.catalog, fixture.source)).toBe('success');
            expect(publicationSnapshot(controlled.catalog, fixture.root)).toEqual({
                destination: true, installed: true, lock: false, lockToken: null, pending: false
            });
            expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
        });
    }
});

describe('RuntimeCatalog observable lock release recovery', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    it('recovers a bounded pre-unlink release failure on immediate replay', () => {
        const controlled = releaseFaultCatalog(fixture, 'pre-unlink');
        expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
        expect(publicationSnapshot(controlled.catalog, fixture.root)).toEqual({
            destination: true, installed: true, lock: true, lockToken: SELF_TOKEN, pending: false
        });
        expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
        controlled.recover();
        expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
    });

    it('recovers a bounded post-unlink-sync release failure on immediate replay', () => {
        const controlled = releaseFaultCatalog(fixture, 'post-unlink-sync');
        expect(stageResult(controlled.catalog, fixture.source)).toBe('STAGING_IO_ERROR');
        expect(publicationSnapshot(controlled.catalog, fixture.root)).toEqual({
            destination: true, installed: true, lock: false, lockToken: null, pending: false
        });
        expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
        controlled.recover();
        expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
    });

    it('reconciles an unlink that takes effect before reporting failure', () => {
        const controlled = releaseFaultCatalog(fixture, 'post-unlink');
        expect(stageResult(controlled.catalog, fixture.source)).toBe('success');
        expect(publicationSnapshot(controlled.catalog, fixture.root)).toEqual({
            destination: true, installed: true, lock: false, lockToken: null, pending: false
        });
        expect(stageResult(controlled.catalog, fixture.source)).toBe('VERSION_ALREADY_INSTALLED');
    });
});

function persistentPublicationCatalog(
    fixture: ReturnType<typeof makeRuntimeCatalogFixture>, boundary: PublicationBoundary
): {catalog: RuntimeCatalog; recover: () => void} {
    const dataRoot = join(fixture.root, 'data');
    const parent = join(dataRoot, 'runtimes');
    const destination = join(parent, '1.0.0');
    const descriptors = new Map<number, string>();
    let armed = true;
    const fileSystem = {
        ...nodeImmutableVersionFileSystem,
        rename: (source: string, target: string) => {
            nodeImmutableVersionFileSystem.rename(source, target);
            if (armed && boundary === 'rename-aftermath') throw fault(boundary);
        },
        open: (path: string, flags: string) => {
            if (armed && boundary === 'open' && path === parent && existsSync(destination)) throw fault(boundary);
            const descriptor = nodeImmutableVersionFileSystem.open(path, flags);
            descriptors.set(descriptor, path);
            return descriptor;
        },
        fsync: (descriptor: number) => {
            const persistent = boundary === 'fsync' || boundary === 'rename-aftermath';
            if (armed && persistent && descriptors.get(descriptor) === parent && existsSync(destination)) throw fault(boundary);
            nodeImmutableVersionFileSystem.fsync(descriptor);
        },
        close: (descriptor: number) => {
            const path = descriptors.get(descriptor);
            descriptors.delete(descriptor);
            nodeImmutableVersionFileSystem.close(descriptor);
            if (armed && boundary === 'close' && path === parent && existsSync(destination)) throw fault(boundary);
        }
    };
    const validator = persistentValidator(boundary, () => armed);
    const store = new ImmutableVersionStore({fileSystem});
    return {
        catalog: new RuntimeCatalog({dataRoot: () => dataRoot, store, validator}),
        recover: () => { armed = false; }
    };
}

function persistentValidator(boundary: PublicationBoundary, armed: () => boolean): ManifestStagingValidator {
    const validator = new ManifestStagingValidator();
    return {
        validateRuntime: (manifest) => validator.validateRuntime(manifest),
        validateKnowledge: (manifest) => validator.validateKnowledge(manifest),
        validateStagedKnowledge: (root) => validator.validateStagedKnowledge(root),
        validateStagedRuntime: (root) => {
            if (armed() && boundary === 'verify' && root.endsWith(join('runtimes', '1.0.0'))) throw fault(boundary);
            validator.validateStagedRuntime(root);
        }
    } as ManifestStagingValidator;
}

function releaseFaultCatalog(
    fixture: ReturnType<typeof makeRuntimeCatalogFixture>, boundary: ReleaseBoundary
): {catalog: RuntimeCatalog; recover: () => void} {
    const dataRoot = join(fixture.root, 'data');
    const destination = join(dataRoot, 'runtimes', '1.0.0');
    const descriptors = new Map<number, string>();
    let armed = true;
    let postEffectRemaining = 1;
    const fileSystem = {
        ...nodeImmutableVersionFileSystem,
        unlink: (path: string) => {
            if (path === lockPath(fixture.root)) {
                if (armed && boundary === 'pre-unlink') throw fault(boundary);
                nodeImmutableVersionFileSystem.unlink(path);
                if (boundary === 'post-unlink' && postEffectRemaining > 0) {
                    postEffectRemaining -= 1;
                    throw fault(boundary);
                }
                return;
            }
            nodeImmutableVersionFileSystem.unlink(path);
        },
        open: (path: string, flags: string) => {
            const descriptor = nodeImmutableVersionFileSystem.open(path, flags);
            descriptors.set(descriptor, path);
            return descriptor;
        },
        fsync: (descriptor: number) => {
            if (armed && boundary === 'post-unlink-sync'
                && descriptors.get(descriptor) === dataRoot && existsSync(destination)) {
                throw fault(boundary);
            }
            nodeImmutableVersionFileSystem.fsync(descriptor);
        },
        close: (descriptor: number) => {
            descriptors.delete(descriptor);
            nodeImmutableVersionFileSystem.close(descriptor);
        }
    };
    const lockRecord = () => ({...createLockRecord(), token: SELF_TOKEN});
    return {
        catalog: new RuntimeCatalog({dataRoot: () => dataRoot, store: new ImmutableVersionStore({fileSystem, lockRecord})}),
        recover: () => { armed = false; }
    };
}

function publicationSnapshot(catalog: RuntimeCatalog, root: string): object {
    return {
        destination: existsSync(join(root, 'data', 'runtimes', '1.0.0')),
        installed: installedResult(catalog),
        lock: existsSync(lockPath(root)),
        lockToken: readLockRecord(lockPath(root))?.token ?? null,
        pending: existsSync(pendingPath(root)) || existsSync(finalizingPath(root))
    };
}

function installedResult(catalog: RuntimeCatalog): boolean | string {
    try { return catalog.isRuntimeInstalled('1.0.0'); }
    catch (error) { return error instanceof RuntimeCatalogError ? error.reason : 'unexpected'; }
}

function stageResult(catalog: RuntimeCatalog, source: string): string {
    try {
        catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), source);
        return 'success';
    } catch (error) {
        return error instanceof RuntimeCatalogError ? error.reason : 'unexpected';
    }
}

function lockPath(root: string): string {
    return join(root, 'data', '.runtime-catalog.lock');
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
