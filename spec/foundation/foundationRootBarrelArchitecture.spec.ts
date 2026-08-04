/**
 * FR-02 baseline root-barrel architecture gate.
 * Baseline mode documents pre-REF-02 debt; tighten at FR-26/FR-27 (REF-02).
 */
import {existsSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION_ROOT = join(SOURCE_ROOT, 'foundation');
const ROOT_BARREL = join(FOUNDATION_ROOT, 'index.ts');

/** Facade file at foundation root that must move into its capsule (FR-03 … FR-10). */
const SHADOW_PAIRS: ReadonlyArray<readonly [facade: string, capsule: string]> = [
    ['ManagedAssets.ts', 'managedAssets'],
    ['LaneTaskProfileInstaller.ts', 'managedAssets'],
    ['RuntimeCatalog.ts', 'runtimeCatalog'],
    ['PackIndexCompiler.ts', 'packIndex'],
    ['IndexStore.ts', 'indexStore'],
    ['IndexQuery.ts', 'indexQuery'],
    ['CoordinatorBaseline.ts', 'coordinatorBaseline']
];

/** Exported today; remove from the root barrel in FR-27. */
const REF02_ROOT_EXPORT_DENYLIST = [
    'PACK_INDEX_SCHEMA',
    'PACK_INDEX_META_TABLE',
    'nodeManagedLinkFileSystem',
    // ManagedLinkFileSystem is type-only; verified separately from runtime export keys.
    'parseInstallManifest',
    'COMPATIBILITY_NAMES',
    'resolveCompatibilityName',
    'resolveCompatibilityNameFrom',
    'requireCompatibilityAction',
    'gitUnavailable',
    'gitValue',
    'nodePackGitInspector',
    'createNodePackFileSystem',
    'nodePackFileSystem',
    'loadPackSchemaValidators',
    'consumePack',
    'observePackDrift',
    'classifyDrift',
    'computeDocumentDigest',
    'computeSealId',
    'fileDigest',
    'sortSealedFiles',
    'IndexStore',
    'IndexQuery'
] as const;

const BASELINE_ROOT_BARREL_MAX_LINES = 130;
const BASELINE_WILDCARD_EXPORT_COUNT = 5;
const BASELINE_SHADOW_STRUCTURE_COUNT = 7;
const REF02_TARGET_ROOT_BARREL_MAX_LINES = 50;
const REF02_TARGET_WILDCARD_EXPORT_COUNT = 0;
const REF02_TARGET_SHADOW_STRUCTURE_COUNT = 0;

function countShadowStructures(): number {
    return SHADOW_PAIRS.filter(([facade, capsule]) =>
        existsSync(join(FOUNDATION_ROOT, facade)) && existsSync(join(FOUNDATION_ROOT, capsule))
    ).length;
}

describe('foundation root barrel baseline (FR-02)', () => {
    it('positive control: detects wildcard re-exports', () => {
        expect('export * from'.length).toBeGreaterThan(0);
        expect(readFileSync(ROOT_BARREL, 'utf8')).toContain('export *');
    });

    it('tracks baseline root barrel size before REF-02 shrink', () => {
        const lines = readFileSync(ROOT_BARREL, 'utf8').split('\n').length;
        expect(lines).toBeLessThanOrEqual(BASELINE_ROOT_BARREL_MAX_LINES);
        expect(lines).toBeGreaterThan(REF02_TARGET_ROOT_BARREL_MAX_LINES);
    });

    it('tracks baseline wildcard export count before REF-02', () => {
        const wildcards = (readFileSync(ROOT_BARREL, 'utf8').match(/^export \* from/gm) ?? []).length;
        expect(wildcards).toBe(BASELINE_WILDCARD_EXPORT_COUNT);
        expect(wildcards).toBeGreaterThan(REF02_TARGET_WILDCARD_EXPORT_COUNT);
    });

    it('records seven shadow structures before FM-1 completes', () => {
        expect(countShadowStructures()).toBe(BASELINE_SHADOW_STRUCTURE_COUNT);
        expect(BASELINE_SHADOW_STRUCTURE_COUNT).toBeGreaterThan(REF02_TARGET_SHADOW_STRUCTURE_COUNT);
    });

    it('documents REF-02 denylisted exports as current baseline debt', async () => {
        const exported = Object.keys(await import('../../src/foundation/index.js') as Record<string, unknown>);
        const stillDenied = REF02_ROOT_EXPORT_DENYLIST.filter((name) => exported.includes(name));
        expect(stillDenied.sort()).toEqual([...REF02_ROOT_EXPORT_DENYLIST].sort());
    });

    it('keeps runtime-internal escape hatches off the public barrels', async () => {
        const forbidden = [
            'NirvanaProcessInvoker', 'resolvePackagedNvbRunner', 'planLaneTaskInvocation',
            'LeafRuntimeInvoker', 'encodeTaskRequest'
        ];
        for (const barrel of ['../../src/foundation/index.js', '../../src/index.js']) {
            const exported = Object.keys(await import(barrel) as Record<string, unknown>);
            for (const name of forbidden) {
                expect({barrel, name, exported: exported.includes(name)}).toEqual({barrel, name, exported: false});
            }
        }
    });
});
