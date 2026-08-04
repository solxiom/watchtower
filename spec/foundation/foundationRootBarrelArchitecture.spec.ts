/**
 * FR-02 / FR-26 / FR-27 root-barrel architecture gate.
 */
import {existsSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';

const SOURCE_ROOT = join(process.cwd(), 'src');
const FOUNDATION_ROOT = join(SOURCE_ROOT, 'foundation');
const ROOT_BARREL = join(FOUNDATION_ROOT, 'index.ts');

/** Facade file at foundation root that must move into its capsule (FR-03 … FR-10). */
const SHADOW_PAIRS: ReadonlyArray<readonly [facade: string, capsule: string]> = [];

const REF02_ROOT_EXPORT_DENYLIST = [
    'PACK_INDEX_SCHEMA',
    'PACK_INDEX_META_TABLE',
    'nodeManagedLinkFileSystem',
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

const REF02_ROOT_BARREL_MAX_LINES = 50;
const REF02_WILDCARD_EXPORT_COUNT = 0;

function countShadowStructures(): number {
    return SHADOW_PAIRS.filter(([facade, capsule]) =>
        existsSync(join(FOUNDATION_ROOT, facade)) && existsSync(join(FOUNDATION_ROOT, capsule))
    ).length;
}

describe('foundation root layout (FR-24)', () => {
    it('keeps only index.ts at the foundation root after FM-3 extraction', () => {
        const rootModules = readdirSync(FOUNDATION_ROOT)
            .filter((name) => name.endsWith('.ts'))
            .sort();
        expect(rootModules).toEqual(['index.ts']);
    });
});

describe('foundation root barrel (FR-26, FR-27)', () => {
    it('positive control: detects wildcard re-export statements', () => {
        expect(/^export \* from/m.test('export * from "./foo/index.js";')).toBeTrue();
    });

    it('keeps the root barrel within the REF-02 line budget', () => {
        const lines = readFileSync(ROOT_BARREL, 'utf8').split('\n').length;
        expect(lines).toBeLessThanOrEqual(REF02_ROOT_BARREL_MAX_LINES);
    });

    it('forbids wildcard re-exports at the root barrel', () => {
        const wildcards = (readFileSync(ROOT_BARREL, 'utf8').match(/^export \* from/gm) ?? []).length;
        expect(wildcards).toBe(REF02_WILDCARD_EXPORT_COUNT);
    });

    it('records zero shadow structures after FM-1 capsule moves complete', () => {
        expect(countShadowStructures()).toBe(0);
    });

    it('keeps denylisted capsule-internal symbols off the root barrel', async () => {
        const exported = Object.keys(await import('../../src/foundation/index.js') as Record<string, unknown>);
        const stillDenied = REF02_ROOT_EXPORT_DENYLIST.filter((name) => exported.includes(name));
        expect(stillDenied).toEqual([]);
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
