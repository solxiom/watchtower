import {join} from 'node:path';
import {parseEnvConfig} from '../../src/foundation/envParser.js';
import {
    buildLaneLayout,
    generateInstallManifest,
    generateLaneConfig,
    generateLaneManifest,
    generateRepositoriesLocal
} from '../../src/foundation/LaneStore.js';
import type {InstallManifestInputs, LaneLayoutInputs, LaneManagedLink, RuntimeAssetRef} from '../../src/foundation/laneStore/laneStoreContracts.js';
import type {ConsumedPack} from '../../src/contracts/pack.js';
import type {InitPlan} from '../../src/foundation/InitContracts.js';
import type {WatchtowerError} from '../../src/contracts/errors.js';

describe('LaneStore.buildLaneLayout', function () {
    it('enumerates every directory required by v1.md §7.2, in parent-before-child order', function () {
        const layout = buildLaneLayout(inputs());
        expect(layout.dirs).toEqual([
            LANE_DIR, join(LANE_DIR, 'bin'), join(LANE_DIR, 'state'), join(LANE_DIR, 'prompts'), join(LANE_DIR, 'reports'),
            join(LANE_DIR, 'budgets'), join(LANE_DIR, 'logs'), join(LANE_DIR, 'briefs'), join(LANE_DIR, 'coordinator'),
            join(LANE_DIR, 'coordinator', 'operator-sessions'), join(LANE_DIR, 'coordinator', 'amendment-requests'),
            join(LANE_DIR, 'coordinator', 'holds'), join(LANE_DIR, 'coordinator', 'journal'), join(LANE_DIR, 'coordinator', 'projections')
        ]);
    });

    it('assembles all four manifest files and attaches verified checksums to managed links', function () {
        const layout = buildLaneLayout(inputs());
        expect(layout.files.map(file => file.path)).toEqual([
            join(LANE_DIR, 'lane.json'), join(LANE_DIR, 'install.json'),
            join(LANE_DIR, 'repositories.local.json'), join(LANE_DIR, 'lane.config.env')
        ]);
        expect(layout.links).toEqual([
            {path: join(LANE_DIR, 'bin', 'runtime-nvb.json'), target: CONFIG_TARGET, sha256: CONFIG_SHA256},
            {path: join(LANE_DIR, 'bin', 'runtime-nvb.js'), target: MODULE_TARGET, sha256: MODULE_SHA256}
        ]);
    });

    it('fails closed when a plan managed-link target is not declared by the runtime catalog', function () {
        expectCode(() => buildLaneLayout({...inputs(), runtimeRefs: []}), 'ERR_INTEGRITY_FAILURE');
    });

    it('rejects a plan whose laneDir disagrees with the canonical control-home/slug path', function () {
        const corrupt = {...basePlan(), laneDir: '/repo/.watchtower/lanes/other'};
        expectCode(() => buildLaneLayout({...inputs(), plan: corrupt}), 'ERR_INTEGRITY_FAILURE');
    });
});

describe('generateLaneManifest', function () {
    it('produces a schema-valid document with every v1.md §7.3 required field', function () {
        const manifest = generateLaneManifest(basePlan(), pack(), () => '2026-08-04T00:00:00Z');
        expect(manifest).toEqual({
            schemaVersion: 1, laneId: LANE_ID, kind: 'implementation', slug: 'lane-1', initiativeId: 'watchtower-v1',
            controlHomeRepository: 'control-home', laneDir: '.watchtower/lanes/lane-1',
            implementationPack: {repository: 'control-home', path: 'pack'},
            repositories: [{id: 'control-home', role: 'primary', access: 'write'}],
            createdAt: '2026-08-04T00:00:00Z'
        });
    });

    it('rejects a plan that does not declare the control-home repository exactly once', function () {
        const noHome = {...basePlan(), repositories: [{...binding(), path: '/elsewhere'}]};
        expectCode(() => generateLaneManifest(noHome, pack()), 'ERR_INTEGRITY_FAILURE');
    });

    it('rejects duplicate repository ids', function () {
        const duplicate = {...basePlan(), repositories: [binding(), binding()]};
        expectCode(() => generateLaneManifest(duplicate, pack()), 'ERR_INTEGRITY_FAILURE');
    });

    it('rejects a malformed pack initiativeId', function () {
        expectCode(() => generateLaneManifest(basePlan(), {...pack(), initiativeId: ''}), 'ERR_INTEGRITY_FAILURE');
    });
});

describe('generateInstallManifest', function () {
    it('produces a schema-valid document with managed assets keyed by lane-relative bin/ path', function () {
        const manifest = generateInstallManifest(basePlan(), links(), installInputs());
        expect(manifest).toEqual({
            schemaVersion: 1, cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked',
            taskRuntime: installInputs().taskRuntime,
            managedAssets: {
                'bin/runtime-nvb.json': {target: CONFIG_TARGET, sha256: CONFIG_SHA256},
                'bin/runtime-nvb.js': {target: MODULE_TARGET, sha256: MODULE_SHA256}
            }
        });
    });

    it('rejects generation when the plan has no resolved runtime version', function () {
        const noRuntime = {...basePlan(), runtime: {version: null, root: null}};
        expectCode(() => generateInstallManifest(noRuntime, links(), installInputs()), 'ERR_MISSING_DEPENDENCY');
    });

    it('rejects an asset without a verified checksum', function () {
        const unverified: LaneManagedLink[] = [{path: join(LANE_DIR, 'bin', 'x'), target: '/data/x'}];
        expectCode(() => generateInstallManifest(basePlan(), unverified, installInputs()), 'ERR_INTEGRITY_FAILURE');
    });

    it('rejects an asset path outside the lane bin/ directory', function () {
        const outside: LaneManagedLink[] = [{path: join(LANE_DIR, 'state', 'x'), target: '/data/x', sha256: CONFIG_SHA256}];
        expectCode(() => generateInstallManifest(basePlan(), outside, installInputs()), 'ERR_INTEGRITY_FAILURE');
    });

    it('rejects a malformed cliVersion or knowledgeVersion', function () {
        expectCode(() => generateInstallManifest(basePlan(), links(), {...installInputs(), cliVersion: 'v1'}), 'ERR_INTEGRITY_FAILURE');
        expectCode(() => generateInstallManifest(basePlan(), links(), {...installInputs(), knowledgeVersion: 'v1'}), 'ERR_INTEGRITY_FAILURE');
    });
});

describe('generateRepositoriesLocal', function () {
    it('produces a schema-valid document with the plan bindings unchanged', function () {
        expect(generateRepositoriesLocal(basePlan())).toEqual({schemaVersion: 1, repositories: [binding()]});
    });

    it('rejects duplicate repository ids and non-absolute paths', function () {
        expectCode(() => generateRepositoriesLocal({...basePlan(), repositories: [binding(), binding()]}), 'ERR_INTEGRITY_FAILURE');
        expectCode(() => generateRepositoriesLocal({...basePlan(), repositories: [{...binding(), path: 'relative'}]}), 'ERR_INTEGRITY_FAILURE');
    });

    it('rejects an empty repository set', function () {
        expectCode(() => generateRepositoriesLocal({...basePlan(), repositories: []}), 'ERR_INTEGRITY_FAILURE');
    });
});

describe('generateLaneConfig', function () {
    it('produces every v1.md §8 key and round-trips through the strict reader with no errors or warnings', function () {
        const text = generateLaneConfig(basePlan(), pack());
        expect(text).toBe(
            `LANE_ID="${LANE_ID}"\nLANE_SLUG="lane-1"\nINITIATIVE_ID="watchtower-v1"\nHOME_REPOSITORY_ID="control-home"\n` +
            `WORKSPACE="/repo"\nTMUX_PREFIX="lane"\nIMPL_PACK_REL="pack"\n`
        );
        const parsed = parseEnvConfig(text);
        expect(parsed.valid).toBeTrue();
        expect(parsed.errors).toEqual([]);
        expect(parsed.warnings).toEqual([]);
        expect(parsed.config.LANE_SLUG).toBe('lane-1');
    });

    it('rejects a plan with no resolved tmux prefix', function () {
        const noPrefix = {...basePlan(), config: {WT_LANE_SLUG: 'lane-1'}};
        expectCode(() => generateLaneConfig(noPrefix, pack()), 'ERR_INTEGRITY_FAILURE');
    });
});

const LANE_ID = '11111111-1111-4111-8111-111111111111';
const LANE_DIR = '/repo/.watchtower/lanes/lane-1';
const CONFIG_TARGET = '/data/runtimes/1.0.0/runtime-nvb/runtime-nvb.json';
const MODULE_TARGET = '/data/runtimes/1.0.0/runtime-nvb/runtime-nvb.js';
const CONFIG_SHA256 = `sha256:${'a'.repeat(64)}` as const;
const MODULE_SHA256 = `sha256:${'b'.repeat(64)}` as const;

function binding() {
    return {id: 'control-home', path: '/repo', branch: 'main', role: 'primary', access: 'write' as const, worktreeMode: 'dedicated' as const};
}

function basePlan(): InitPlan {
    return Object.freeze({
        schemaVersion: 1, applied: false,
        lane: {id: LANE_ID, slug: 'lane-1', kind: 'implementation' as const},
        controlHome: '/repo', laneDir: LANE_DIR,
        repositories: [binding()],
        implementationPack: {repository: 'control-home', path: 'pack', absolutePath: '/repo/pack'},
        routing: {
            schemaVersion: 1, endpoints: [], classes: {
                D1: {minimumCapability: 'C2' as const, primary: 'x', fallbacks: []},
                D2: {minimumCapability: 'C3' as const, primary: 'x', fallbacks: []},
                D3: {minimumCapability: 'C5' as const, primary: 'x', fallbacks: []}
            },
            operatorSessionClasses: {
                D1: {primary: 'x', fallbacks: []}, D2: {primary: 'x', fallbacks: []}, D3: {primary: 'x', fallbacks: []}
            },
            operatorSessionBudgetPolicyRef: 'policy.json'
        },
        routingProvenance: {policyVersion: 'shipping-v1' as const, adapters: [], reserves: []},
        conflictCheck: {complete: true as const, conflicts: [] as const},
        runtime: {version: '1.0.0', root: '/data/runtimes/1.0.0'},
        directories: [],
        links: [
            {path: join(LANE_DIR, 'bin', 'runtime-nvb.json'), target: CONFIG_TARGET},
            {path: join(LANE_DIR, 'bin', 'runtime-nvb.js'), target: MODULE_TARGET}
        ],
        config: {WT_LANE_SLUG: 'lane-1', WT_TMUX_PREFIX: 'lane'},
        indexEntries: [], deferred: [], warnings: []
    }) as InitPlan;
}

function pack(): ConsumedPack {
    return {
        packId: 'watchtower-v1', initiativeId: 'watchtower-v1', packRepository: 'control-home',
        manifestDigest: `sha256:${'c'.repeat(64)}`, acceptanceDigest: `sha256:${'d'.repeat(64)}`,
        sealId: `sha256:${'e'.repeat(64)}`, reviewedCommit: 'f'.repeat(40), repositories: ['control-home'],
        sealedFiles: [], acceptedInputs: [], sourceBaselines: [], claimPaths: []
    };
}

function runtimeRefs(): RuntimeAssetRef[] {
    return [{path: CONFIG_TARGET, sha256: CONFIG_SHA256}, {path: MODULE_TARGET, sha256: MODULE_SHA256}];
}

function installInputs(): InstallManifestInputs {
    return {
        cliVersion: '1.0.0', knowledgeVersion: '1.0.0',
        taskRuntime: {
            catalogId: 'watchtower-runtime-nvb/v1', catalogSha256: `sha256:${'f'.repeat(64)}`,
            profile: 'implementation-v1', configTarget: CONFIG_TARGET, moduleTarget: MODULE_TARGET
        }
    };
}

function links(): LaneManagedLink[] {
    return [
        {path: join(LANE_DIR, 'bin', 'runtime-nvb.json'), target: CONFIG_TARGET, sha256: CONFIG_SHA256},
        {path: join(LANE_DIR, 'bin', 'runtime-nvb.js'), target: MODULE_TARGET, sha256: MODULE_SHA256}
    ];
}

function inputs(): LaneLayoutInputs {
    return {plan: basePlan(), pack: pack(), runtimeRefs: runtimeRefs(), install: installInputs()};
}

function expectCode(action: () => unknown, code: string): void {
    try {
        action();
    } catch (error) {
        expect((error as WatchtowerError).code).toBe(code);
        return;
    }
    fail(`Expected ${code}.`);
}
