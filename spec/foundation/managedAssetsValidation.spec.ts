import {mkdirSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ManagedAssets} from '../../src/foundation/ManagedAssets.js';
import {ASSET_KEY, cleanupFixture, installManifestFor, makeManagedAssetsFixture, type ManagedAssetsFixture} from './support/managedAssetsFixtures.js';

describe('ManagedAssets.validateLinks', () => {
    let fixture: ManagedAssetsFixture;
    let managedAssets: ManagedAssets;
    let sourcePath: string;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        managedAssets = new ManagedAssets();
        sourcePath = join(fixture.laneDir, ASSET_KEY);
    });

    afterEach(() => cleanupFixture(fixture.root));

    it('reports a freshly created link as valid', () => {
        managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        const result = managedAssets.validateLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(result).toEqual({ok: true, findings: [{assetPath: ASSET_KEY, status: 'valid'}]});
    });

    it('reports a missing link', () => {
        const result = managedAssets.validateLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(result).toEqual({ok: false, findings: [{assetPath: ASSET_KEY, status: 'missing'}]});
    });

    it('reports a broken (non-symlink) entry at the managed path', () => {
        mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
        writeFileSync(sourcePath, 'not a symlink\n');
        const result = managedAssets.validateLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(result).toEqual({ok: false, findings: [{assetPath: ASSET_KEY, status: 'broken'}]});
    });

    it('reports a wrong-target symlink', () => {
        mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
        const otherTarget = join(fixture.root, 'somewhere-else.sh');
        writeFileSync(otherTarget, 'somewhere else\n');
        symlinkSync(otherTarget, sourcePath);
        const result = managedAssets.validateLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(result).toEqual({ok: false, findings: [{assetPath: ASSET_KEY, status: 'wrong-target'}]});
    });

    it('reports a checksum-mismatched target when the install manifest declares a stale digest for the real staged file', () => {
        managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        const staleManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: fixture.managedAssetTarget, sha256: `sha256:${'0'.repeat(64)}`}}
        });
        const result = managedAssets.validateLinks(fixture.laneDir, staleManifest, fixture.runtimeCatalog);
        expect(result).toEqual({ok: false, findings: [{assetPath: ASSET_KEY, status: 'checksum-mismatch'}]});
    });
});
