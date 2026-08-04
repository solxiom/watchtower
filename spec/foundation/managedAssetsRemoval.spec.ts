import {existsSync, lstatSync, mkdirSync, readFileSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ManagedAssets} from '../../src/foundation/managedAssets/index.js';
import {ASSET_KEY, cleanupFixture, installManifestFor, makeManagedAssetsFixture, type ManagedAssetsFixture} from './support/managedAssetsFixtures.js';

describe('ManagedAssets.removeLinks', () => {
    let fixture: ManagedAssetsFixture;
    let managedAssets: ManagedAssets;
    let sourcePath: string;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        managedAssets = new ManagedAssets();
        sourcePath = join(fixture.laneDir, ASSET_KEY);
    });

    afterEach(() => cleanupFixture(fixture.root));

    it('removes only a symlink whose current target matches the manifest declaration', () => {
        managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        const results = managedAssets.removeLinks(fixture.laneDir, installManifestFor(fixture));
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'removed', reason: null, target: fixture.managedAssetTarget}]);
        expect(existsSync(sourcePath)).toBeFalse();
    });

    it('reports absent, without error, when nothing was ever linked', () => {
        const results = managedAssets.removeLinks(fixture.laneDir, installManifestFor(fixture));
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'absent', reason: null, target: null}]);
    });

    it('does not remove a symlink an operator replaced with a different target', () => {
        mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
        const otherTarget = join(fixture.root, 'operator-owned.sh');
        writeFileSync(otherTarget, 'operator owned\n');
        symlinkSync(otherTarget, sourcePath);
        const results = managedAssets.removeLinks(fixture.laneDir, installManifestFor(fixture));
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_NOT_MANAGED', target: null}]);
        expect(lstatSync(sourcePath).isSymbolicLink()).toBeTrue();
    });

    it('does not remove a regular file an operator placed at the managed path', () => {
        mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
        writeFileSync(sourcePath, 'operator replaced the link with a real file\n');
        const results = managedAssets.removeLinks(fixture.laneDir, installManifestFor(fixture));
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_NOT_MANAGED', target: null}]);
        expect(readFileSync(sourcePath, 'utf8')).toBe('operator replaced the link with a real file\n');
    });
});
