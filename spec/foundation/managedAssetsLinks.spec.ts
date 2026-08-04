import {lstatSync, mkdirSync, readlinkSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ManagedAssets} from '../../src/foundation/managedAssets/index.js';
import {
    ASSET_KEY,
    cleanupFixture,
    installManifestFor,
    makeManagedAssetsFixture,
    type ManagedAssetsFixture
} from './support/managedAssetsFixtures.js';

describe('ManagedAssets.createLinks', () => {
    let fixture: ManagedAssetsFixture;
    let managedAssets: ManagedAssets;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        managedAssets = new ManagedAssets();
    });

    afterEach(() => cleanupFixture(fixture.root));

    it('creates a real symlink at bin/<scriptName> pointing to the correct runtime store path', () => {
        const results = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'created', reason: null, target: fixture.managedAssetTarget}]);
        const sourcePath = join(fixture.laneDir, ASSET_KEY);
        expect(lstatSync(sourcePath).isSymbolicLink()).toBeTrue();
        expect(readlinkSync(sourcePath)).toBe(fixture.managedAssetTarget);
    });

    it('creates the containing bin/ directory when absent', () => {
        const laneDir = join(fixture.root, 'fresh-lane');
        mkdirSync(laneDir, {recursive: true});
        const results = managedAssets.createLinks(laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results[0].outcome).toBe('created');
        expect(lstatSync(join(laneDir, ASSET_KEY)).isSymbolicLink()).toBeTrue();
    });

    it('is idempotent: a second call reports already-linked, not re-created', () => {
        managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        const second = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(second).toEqual([{assetPath: ASSET_KEY, outcome: 'already-linked', reason: null, target: fixture.managedAssetTarget}]);
    });

    it('refuses when the target checksum no longer matches the runtime manifest', () => {
        const installManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: fixture.managedAssetTarget, sha256: `sha256:${'0'.repeat(64)}`}}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_TARGET_CHECKSUM_MISMATCH', target: null}]);
        expect(lstatSync(fixture.laneDir).isDirectory()).toBeTrue();
    });

    it('refuses when the declared target path escapes the immutable runtime root', () => {
        const escapedTarget = join(fixture.runtimeRoot, '..', 'outside.sh');
        const installManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: escapedTarget, sha256: `sha256:${'0'.repeat(64)}`}}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_TARGET_ESCAPE', target: null}]);
    });

    it('refuses when the link source path already exists as a non-managed file (collision)', () => {
        writeFileSync(join(fixture.laneDir, ASSET_KEY), 'a pre-existing unrelated script\n');
        const results = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_SOURCE_COLLISION', target: null}]);
    });

    it('refuses when the link source path already exists as a directory (collision)', () => {
        mkdirSync(join(fixture.laneDir, ASSET_KEY), {recursive: true});
        const results = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_SOURCE_COLLISION', target: null}]);
    });

    it('refuses when the link source path already exists as a differently targeted symlink (collision)', () => {
        writeFileSync(join(fixture.laneDir, 'other.sh'), 'other\n');
        mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
        symlinkSync(join(fixture.laneDir, 'other.sh'), join(fixture.laneDir, ASSET_KEY));
        const results = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_SOURCE_COLLISION', target: null}]);
    });

    it('refuses when the asset path would escape the lane directory', () => {
        const installManifest = installManifestFor(fixture, {managedAssets: {'../escape.sh': fixture.managedAssetDeclaration}});
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: '../escape.sh', outcome: 'error', reason: 'LINK_SOURCE_ESCAPE', target: null}]);
    });
});
