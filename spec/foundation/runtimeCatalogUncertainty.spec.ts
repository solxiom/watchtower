import {existsSync} from 'node:fs';
import {dirname, join} from 'node:path';
import {RuntimeCatalog} from '../../src/foundation/runtimeCatalog/index.js';
import {RuntimeCatalogError} from '../../src/contracts/runtimeCatalog.js';
import {ManifestStagingValidator} from '../../src/foundation/runtimeCatalog/ManifestStagingValidator.js';
import {ImmutableVersionStore} from '../../src/foundation/runtimeCatalog/ImmutableVersionStore.js';
import {nodeImmutableVersionFileSystem} from '../../src/foundation/runtimeCatalog/ImmutableVersionFileSystem.js';
import {cleanupFixture, expectCatalogError, makeRuntimeCatalogFixture, runtimeManifest} from './support/runtimeCatalogFixtures.js';

describe('RuntimeCatalog post-rename uncertainty', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    for (const boundary of ['rename', 'open', 'fsync', 'close', 'verify', 'release'] as const) {
        it(`returns success when ${boundary} fails once after publication verifies`, () => {
            const store = storeWithOneShotFault(boundary, fixture.root);
            const validator = boundary === 'verify' ? validatorWithOneShotPublicationFault() : undefined;
            const catalog = new RuntimeCatalog({dataRoot: () => join(fixture.root, 'data'), store, validator});
            catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source);
            expect(catalog.isRuntimeInstalled('1.0.0')).toBeTrue();
            expectCatalogError(() => catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'VERSION_ALREADY_INSTALLED');
        });
    }
});

function storeWithOneShotFault(boundary: string, root: string): ImmutableVersionStore {
    let armed = true;
    const dataRoot = join(root, 'data');
    const parent = join(dataRoot, 'runtimes');
    const destination = join(parent, '1.0.0');
    return new ImmutableVersionStore({
        fileSystem: {
            ...nodeImmutableVersionFileSystem,
            rename: (source, target) => {
                nodeImmutableVersionFileSystem.rename(source, target);
                if (boundary === 'rename' && armed) throwFault();
            },
            open: (path, flags) => {
                if (boundary === 'open' && armed && path === parent && existsSync(destination)) throwFault();
                return nodeImmutableVersionFileSystem.open(path, flags);
            },
            fsync: (descriptor) => {
                if (boundary === 'fsync' && armed && existsSync(destination)) throwFault();
                nodeImmutableVersionFileSystem.fsync(descriptor);
            },
            close: (descriptor) => {
                if (boundary === 'close' && armed && existsSync(destination)) throwFault();
                nodeImmutableVersionFileSystem.close(descriptor);
            },
            unlink: (path) => {
                nodeImmutableVersionFileSystem.unlink(path);
                if (boundary === 'release' && armed && dirname(path) === dataRoot) throwFault();
            }
        }
    });

    function throwFault(): never {
        armed = false;
        throw new Error(`${boundary} fault`);
    }
}

function validatorWithOneShotPublicationFault(): ManifestStagingValidator {
    const validator = new ManifestStagingValidator();
    let armed = true;
    return {
        validateRuntime: (manifest) => validator.validateRuntime(manifest),
        validateKnowledge: (manifest) => validator.validateKnowledge(manifest),
        validateStagedKnowledge: (root) => validator.validateStagedKnowledge(root),
        validateStagedRuntime: (stageRoot) => {
            if (armed && stageRoot.endsWith(join('runtimes', '1.0.0'))) {
                armed = false;
                throw new RuntimeCatalogError('STAGING_IO_ERROR', stageRoot, 'verification fault');
            }
            validator.validateStagedRuntime(stageRoot);
        }
    } as ManifestStagingValidator;
}
