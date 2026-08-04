import {accessSync, chmodSync, constants, existsSync, mkdirSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {RuntimeCatalog} from '../../src/foundation/runtimeCatalog/index.js';
import {ImmutableVersionStore} from '../../src/foundation/runtimeCatalog/ImmutableVersionStore.js';
import {
    cleanupFixture,
    expectCatalogError,
    installedWorkerMode,
    knowledgeManifest,
    makeRuntimeCatalogFixture,
    readText,
    runtimeManifest
} from './support/runtimeCatalogFixtures.js';

describe('RuntimeCatalog publication contract', () => {
    let fixture: ReturnType<typeof makeRuntimeCatalogFixture>;

    beforeEach(() => { fixture = makeRuntimeCatalogFixture(); });
    afterEach(() => { cleanupFixture(fixture.root); });

    it('stages independent immutable runtime versions', () => {
        fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source);
        fixture.catalog.stageRuntime('2.0.0', runtimeManifest('2.0.0'), fixture.source);
        const first = fixture.catalog.getRuntimeRoot('1.0.0');
        const second = fixture.catalog.getRuntimeRoot('2.0.0');
        expect(fixture.catalog.listInstalledRuntimes()).toEqual(['1.0.0', '2.0.0']);
        expect(first).not.toBe(second);
        expect(readText(join(first, 'bin', 'worker'))).toContain('worker');
        expect(installedWorkerMode(first)).toBe(0o555);
        expect(() => writeFileSync(join(first, 'new-file'), 'blocked')).toThrow();
        expect(() => accessSync(first, constants.W_OK)).toThrow();
    });

    it('keeps runtime and knowledge catalogs separate', () => {
        const knowledge = join(fixture.root, 'knowledge');
        mkdirSync(knowledge);
        writeFileSync(join(knowledge, 'playbook.md'), '# playbook\n');
        const manifest = knowledgeManifest('1.0.0');
        fixture.catalog.stageKnowledge('1.0.0', manifest, knowledge);
        expect(fixture.catalog.isKnowledgeInstalled('1.0.0')).toBeTrue();
        expect(fixture.catalog.listInstalledKnowledge()).toEqual(['1.0.0']);
        expect(JSON.parse(readFileSync(join(fixture.catalog.getKnowledgeRoot('1.0.0'), 'manifest.json'), 'utf8'))).toEqual(manifest);
        expect(fixture.catalog.listInstalledRuntimes()).toEqual([]);
    });

    it('cleans an interrupted first stage without leaving a data root', () => {
        const dataRoot = join(fixture.root, 'data');
        const catalog = new RuntimeCatalog({
            dataRoot: () => dataRoot,
            store: new ImmutableVersionStore({
                temporaryId: () => 'interrupted',
                temporaryReady: () => { throw new Error('interrupted'); }
            })
        });
        expectCatalogError(() => catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'STAGING_IO_ERROR');
        expect(existsSync(dataRoot)).toBeFalse();
    });

    it('maps read-only first-stage publication to STAGING_IO_ERROR', () => {
        const dataRoot = join(fixture.root, 'data');
        mkdirSync(dataRoot);
        chmodSync(dataRoot, 0o555);
        expectCatalogError(() => fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'STAGING_IO_ERROR');
    });

    it('preserves VERSION_ALREADY_INSTALLED for a separate replay', () => {
        fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source);
        expectCatalogError(() => fixture.catalog.stageRuntime('1.0.0', runtimeManifest('1.0.0'), fixture.source), 'VERSION_ALREADY_INSTALLED');
    });
});
