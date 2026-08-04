import {chmodSync, existsSync, mkdirSync, symlinkSync, writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {join} from 'node:path';
import {RuntimeCatalog} from '../../src/foundation/runtimeCatalog/index.js';
import {
    cleanupFixture,
    digest,
    expectCatalogError,
    makeRuntimeCatalogFixture,
    runtimeManifest,
    workerText
} from './support/runtimeCatalogFixtures.js';

describe('RuntimeCatalog validation boundaries', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    it('rejects invalid, mismatched, and absent versions with typed reasons', () => {
        expectCatalogError(() => fixture.catalog.stageRuntime('../1.0.0', runtimeManifest('1.0.0'), fixture.source), 'INVALID_VERSION_STRING');
        expectCatalogError(() => fixture.catalog.stageRuntime('1.0.0', runtimeManifest('2.0.0'), fixture.source), 'STAGING_VALIDATION_FAILED');
        expectCatalogError(() => fixture.catalog.getRuntimeRoot('4.0.0'), 'VERSION_NOT_INSTALLED');
    });

    it('does not publish invalid checksum, mode, extra, or duplicate assets', () => {
        expectCatalogError(() => stageWith({assets: [{path: 'bin/worker', sha256: digest('wrong'), mode: '0755'}]}), 'STAGING_VALIDATION_FAILED');
        expectCatalogError(() => stageWith({assets: [{path: 'bin/worker', sha256: digest(workerText()), mode: '0644'}]}), 'STAGING_VALIDATION_FAILED');
        writeFileSync(join(fixture.source, 'extra'), 'extra');
        expectCatalogError(() => stageWith({}), 'STAGING_VALIDATION_FAILED');
        expectCatalogError(() => stageWith({assets: duplicatedAssets()}), 'STAGING_VALIDATION_FAILED');
    });

    it('rejects malformed and incompatible manifest values', () => {
        expectCatalogError(() => stageUnknown({schemaVersion: 2}), 'STAGING_VALIDATION_FAILED');
        expectCatalogError(() => stageUnknown({...runtimeManifest('1.0.0'), manifestId: 'other'}), 'STAGING_VALIDATION_FAILED');
        expectCatalogError(() => stageUnknown({...runtimeManifest('1.0.0'), compatibleLaneSchemaVersions: [2]}), 'STAGING_VALIDATION_FAILED');
    });

    it('rejects source symlinks, nested symlinks, and nonregular entries', () => {
        symlinkSync(fixture.source, join(fixture.root, 'source-link'));
        expectCatalogError(() => fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), join(fixture.root, 'source-link')), 'STAGING_VALIDATION_FAILED');
        symlinkSync(join(fixture.source, 'bin', 'worker'), join(fixture.source, 'bin', 'worker-link'));
        expectCatalogError(() => fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'STAGING_VALIDATION_FAILED');
        execFileSync('mkfifo', [join(fixture.source, 'pipe')]);
        expectCatalogError(() => fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'STAGING_VALIDATION_FAILED');
    });

    it('does not report corrupt or inaccessible roots as absent or healthy', () => {
        const dataRoot = join(fixture.root, 'data');
        mkdirSync(join(dataRoot, 'runtimes'), {recursive: true});
        mkdirSync(join(fixture.root, 'corrupt'));
        symlinkSync(join(fixture.root, 'corrupt'), join(dataRoot, 'runtimes', '1.0.0'));
        expectCatalogError(() => fixture.catalog.isRuntimeInstalled('1.0.0'), 'STAGING_VALIDATION_FAILED');
        expectCatalogError(() => fixture.catalog.listInstalledRuntimes(), 'STAGING_VALIDATION_FAILED');
        chmodSync(join(dataRoot, 'runtimes'), 0o000);
        expectCatalogError(() => fixture.catalog.listInstalledRuntimes(), 'STAGING_IO_ERROR');
    });

    function stageWith(overrides: Partial<ReturnType<typeof runtimeManifest>>): void {
        fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0', overrides), fixture.source);
    }

    function stageUnknown(manifest: unknown): void {
        fixture.catalog.stageRuntime('1.0.0', manifest as never, fixture.source);
    }
});

function duplicatedAssets(): ReturnType<typeof runtimeManifest>['assets'] {
    const asset = {path: 'bin/worker', sha256: digest(workerText()), mode: '0755'} as const;
    return [asset, asset];
}
