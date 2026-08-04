import {createHash} from 'node:crypto';
import {chmodSync, existsSync, mkdirSync, readFileSync, rmSync, symlinkSync, unlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {ManagedAssets} from '../../src/foundation/managedAssets/index.js';
import {ManagedAssetsError} from '../../src/contracts/manifests.js';
import {createLockRecord, tryCreateLockRecord} from '../../src/foundation/storage/writeLockRecord.js';
import {
    ASSET_KEY,
    cleanupFixture,
    installManifestFor,
    makeManagedAssetsFixture,
    type ManagedAssetsFixture
} from './support/managedAssetsFixtures.js';

describe('Correction 01 — symlinked source-parent escape (finding 1)', () => {
    let fixture: ManagedAssetsFixture;
    let managedAssets: ManagedAssets;
    let outsideDir: string;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        managedAssets = new ManagedAssets();
        outsideDir = join(fixture.root, 'outside');
        mkdirSync(outsideDir, {recursive: true});
    });

    afterEach(() => cleanupFixture(fixture.root));

    it('refuses createLinks when bin/ is a symlink resolving outside the lane, and never touches the outside path', () => {
        rmSync(join(fixture.laneDir, 'bin'), {recursive: true, force: true});
        symlinkSync(outsideDir, join(fixture.laneDir, 'bin'));
        const results = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_SOURCE_ESCAPE', target: null}]);
        expect(existsSync(join(outsideDir, 'coordinator-watch.sh'))).toBeFalse();
    });

    it('refuses removeLinks when bin/ is a symlink resolving outside the lane, and never touches the outside path', () => {
        writeFileSync(join(outsideDir, 'coordinator-watch.sh'), 'operator file outside the lane\n');
        rmSync(join(fixture.laneDir, 'bin'), {recursive: true, force: true});
        symlinkSync(outsideDir, join(fixture.laneDir, 'bin'));
        const results = managedAssets.removeLinks(fixture.laneDir, installManifestFor(fixture));
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_SOURCE_ESCAPE', target: null}]);
        expect(existsSync(join(outsideDir, 'coordinator-watch.sh'))).toBeTrue();
    });

    it('refuses validateLinks when bin/ is a symlink resolving outside the lane', () => {
        rmSync(join(fixture.laneDir, 'bin'), {recursive: true, force: true});
        symlinkSync(outsideDir, join(fixture.laneDir, 'bin'));
        const result = managedAssets.validateLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(result).toEqual({ok: false, findings: [{assetPath: ASSET_KEY, status: 'broken'}]});
    });

    it('refuses a nested parent symlink escape (bin/ real, bin/sub symlinked outside)', () => {
        mkdirSync(join(fixture.laneDir, 'bin'), {recursive: true});
        symlinkSync(outsideDir, join(fixture.laneDir, 'bin', 'sub'));
        const installManifest = installManifestFor(fixture, {managedAssets: {'bin/sub/x.sh': fixture.managedAssetDeclaration}});
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: 'bin/sub/x.sh', outcome: 'error', reason: 'LINK_SOURCE_ESCAPE', target: null}]);
        expect(existsSync(join(outsideDir, 'x.sh'))).toBeFalse();
    });

    it('reports a stable typed failure (not a crash, not a false escape) for a dangling bin/ symlink', () => {
        rmSync(join(fixture.laneDir, 'bin'), {recursive: true, force: true});
        symlinkSync(join(fixture.root, 'nowhere'), join(fixture.laneDir, 'bin'));
        const results = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_IO_UNAVAILABLE', target: null}]);
    });

    it('reports a stable typed failure for a permission-denied ancestor', () => {
        mkdirSync(join(fixture.laneDir, 'bin', 'sub'), {recursive: true});
        chmodSync(join(fixture.laneDir, 'bin'), 0o644);
        try {
            const installManifest = installManifestFor(fixture, {managedAssets: {'bin/sub/x.sh': fixture.managedAssetDeclaration}});
            const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
            expect(results).toEqual([{assetPath: 'bin/sub/x.sh', outcome: 'error', reason: 'LINK_IO_UNAVAILABLE', target: null}]);
        } finally {
            chmodSync(join(fixture.laneDir, 'bin'), 0o755);
        }
    });
});

describe('Correction 01 — managed source restricted to bin/ (finding 2)', () => {
    let fixture: ManagedAssetsFixture;
    let managedAssets: ManagedAssets;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        managedAssets = new ManagedAssets();
    });

    afterEach(() => cleanupFixture(fixture.root));

    const rejected: readonly string[] = [
        'lane.json', 'install.json', 'coordinator/coordinatorWatch.sh', '/etc/passwd',
        '../escape.sh', 'bin', 'bin/../escape.sh', 'bin\\x.sh', 'bin/./x.sh'
    ];

    for (const assetPath of rejected) {
        it(`refuses ${JSON.stringify(assetPath)} as a managed source before any mutation`, () => {
            const installManifest = installManifestFor(fixture, {managedAssets: {[assetPath]: fixture.managedAssetDeclaration}});
            const before = existsSync(join(fixture.laneDir, 'lane.json'));
            const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
            expect(results).toEqual([{assetPath, outcome: 'error', reason: 'LINK_SOURCE_ESCAPE', target: null}]);
            expect(existsSync(join(fixture.laneDir, 'lane.json'))).toBe(before);
        });
    }
});

describe('Correction 01 — targets bound to RuntimeManifestV1.assets (finding 3)', () => {
    let fixture: ManagedAssetsFixture;
    let managedAssets: ManagedAssets;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        managedAssets = new ManagedAssets();
    });

    afterEach(() => cleanupFixture(fixture.root));

    it('refuses the staged manifest.json probe even with a caller-supplied live digest', () => {
        const manifestPath = join(fixture.runtimeRoot, 'manifest.json');
        const digest = createHash('sha256').update(readFileSync(manifestPath)).digest('hex');
        const installManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: manifestPath, sha256: `sha256:${digest}` as `sha256:${string}`}}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_TARGET_MISSING', target: null}]);
        expect(existsSync(join(fixture.laneDir, ASSET_KEY))).toBeFalse();
    });

    it('refuses a non-executable runtime config/module target even when it is a real declared asset with a matching digest', () => {
        const configDigest = createHash('sha256').update(readFileSync(fixture.configTarget)).digest('hex');
        const installManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: fixture.configTarget, sha256: `sha256:${configDigest}` as `sha256:${string}`}}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_TARGET_MISSING', target: null}]);
    });

    it('refuses a target path that does not exist', () => {
        const installManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: join(fixture.runtimeRoot, 'coordinator', 'missing.sh'), sha256: fixture.managedAssetDeclaration.sha256}}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_TARGET_MISSING', target: null}]);
    });

    it('refuses digest disagreement between the install declaration and the real asset', () => {
        const installManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: fixture.managedAssetTarget, sha256: `sha256:${'0'.repeat(64)}`}}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'error', reason: 'LINK_TARGET_CHECKSUM_MISMATCH', target: null}]);
    });

    it('accepts a lexical path alias that canonically resolves to the same legitimate declared asset', () => {
        const aliasedTarget = join(fixture.runtimeRoot, 'coordinator', '..', 'coordinator', 'coordinatorWatch.sh');
        const installManifest = installManifestFor(fixture, {
            managedAssets: {[ASSET_KEY]: {target: aliasedTarget, sha256: fixture.managedAssetDeclaration.sha256}}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'created', reason: null, target: fixture.managedAssetTarget}]);
    });
});

describe('Correction 01 — plan-then-mutate the whole set (finding 4)', () => {
    let fixture: ManagedAssetsFixture;
    let managedAssets: ManagedAssets;

    beforeEach(() => {
        fixture = makeManagedAssetsFixture();
        managedAssets = new ManagedAssets();
    });

    afterEach(() => cleanupFixture(fixture.root));

    it('mutates nothing when a later asset in the set collides', () => {
        writeFileSync(join(fixture.laneDir, 'bin', 'z.sh'), 'pre-existing unrelated file\n');
        const installManifest = installManifestFor(fixture, {
            managedAssets: {'bin/a.sh': fixture.managedAssetDeclaration, 'bin/z.sh': fixture.managedAssetDeclaration}
        });
        const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
        expect(results).toEqual([
            {assetPath: 'bin/a.sh', outcome: 'blocked', reason: null, target: null},
            {assetPath: 'bin/z.sh', outcome: 'error', reason: 'LINK_SOURCE_COLLISION', target: null}
        ]);
        expect(existsSync(join(fixture.laneDir, 'bin', 'a.sh'))).toBeFalse();
    });

    it('halts further mutation and reports the remainder blocked when a later mutation fails unexpectedly, then recovers idempotently on replay', () => {
        // Names are chosen so sorted processing order visits the already-writable
        // asset first (it succeeds) and the not-yet-creatable asset second (it
        // fails), proving the halt keeps the first mutation and blocks nothing
        // it already completed.
        mkdirSync(join(fixture.laneDir, 'bin', 'aaa-writable'), {recursive: true});
        chmodSync(join(fixture.laneDir, 'bin'), 0o555);
        const managedAssetsForSet = {
            'bin/aaa-writable/a.sh': fixture.managedAssetDeclaration,
            'bin/zzz-new/z.sh': fixture.managedAssetDeclaration
        };
        try {
            const installManifest = installManifestFor(fixture, {managedAssets: managedAssetsForSet});
            const results = managedAssets.createLinks(fixture.laneDir, installManifest, fixture.runtimeCatalog);
            expect(results[0]).toEqual({assetPath: 'bin/aaa-writable/a.sh', outcome: 'created', reason: null, target: fixture.managedAssetTarget});
            expect(results[1]).toEqual({assetPath: 'bin/zzz-new/z.sh', outcome: 'error', reason: 'LINK_IO_UNAVAILABLE', target: null});
        } finally {
            chmodSync(join(fixture.laneDir, 'bin'), 0o755);
        }
        const replay = managedAssets.createLinks(
            fixture.laneDir, installManifestFor(fixture, {managedAssets: managedAssetsForSet}), fixture.runtimeCatalog
        );
        expect(replay).toEqual([
            {assetPath: 'bin/aaa-writable/a.sh', outcome: 'already-linked', reason: null, target: fixture.managedAssetTarget},
            {assetPath: 'bin/zzz-new/z.sh', outcome: 'created', reason: null, target: fixture.managedAssetTarget}
        ]);
    });

    it('refuses concurrent access with a stable lock-contention error, and succeeds once the lock is released', () => {
        const lockPath = join(fixture.laneDir, '.watchtower-managed-assets.lock');
        expect(tryCreateLockRecord(lockPath, createLockRecord())).toBeTrue();
        try {
            expect(() => managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog))
                .toThrowMatching((error: unknown) => error instanceof ManagedAssetsError && error.reason === 'LINK_IO_UNAVAILABLE');
            expect(existsSync(join(fixture.laneDir, ASSET_KEY))).toBeFalse();
        } finally {
            unlinkSync(lockPath);
        }
        const results = managedAssets.createLinks(fixture.laneDir, installManifestFor(fixture), fixture.runtimeCatalog);
        expect(results).toEqual([{assetPath: ASSET_KEY, outcome: 'created', reason: null, target: fixture.managedAssetTarget}]);
    });
});
