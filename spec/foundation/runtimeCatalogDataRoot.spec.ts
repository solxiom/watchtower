import {existsSync, mkdirSync, symlinkSync} from 'node:fs';
import {join} from 'node:path';
import {RuntimeCatalog} from '../../src/foundation/runtime/catalog/index.js';
import {cleanupFixture, expectCatalogError, makeRuntimeCatalogFixture, runtimeManifest} from './support/runtimeCatalogFixtures.js';

describe('RuntimeCatalog data-root containment', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    it('allows a contained missing descendant under real directories', () => {
        const dataRoot = join(fixture.root, 'contained', 'missing');
        new RuntimeCatalog({dataRoot: () => dataRoot}).stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source);
        expect(existsSync(join(dataRoot, 'runtimes', '1.0.0'))).toBeTrue();
    });

    it('rejects terminal, intermediate, broken, looping, and missing-descendant symlink escapes', () => {
        const outside = join(fixture.root, 'outside');
        mkdirSync(outside);
        mkdirSync(join(fixture.root, 'real'));
        symlinkSync(outside, join(fixture.root, 'terminal'));
        symlinkSync(outside, join(fixture.root, 'real', 'link'));
        symlinkSync(join(fixture.root, 'missing-target'), join(fixture.root, 'broken'));
        symlinkSync(join(fixture.root, 'loop'), join(fixture.root, 'loop'));
        for (const dataRoot of rejectedDataRoots()) {
            const catalog = new RuntimeCatalog({dataRoot: () => dataRoot});
            expectCatalogError(() => catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'STAGING_VALIDATION_FAILED');
        }
        expect(existsSync(join(outside, 'missing', 'runtimes', '1.0.0'))).toBeFalse();
    });

    function rejectedDataRoots(): string[] {
        return [
            join(fixture.root, 'terminal'),
            join(fixture.root, 'real', 'link', 'missing'),
            join(fixture.root, 'broken', 'missing'),
            join(fixture.root, 'loop', 'missing'),
            join(fixture.root, 'terminal', 'missing')
        ];
    }
});
