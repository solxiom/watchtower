import {existsSync, mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, statSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildCoordinatorBaseline, composeLaneLayoutWithCoordinatorBaseline} from '../../src/foundation/CoordinatorBaseline.js';
import type {KnowledgeProvenancePort} from '../../src/foundation/coordinatorBaseline/coordinatorBaselineContracts.js';
import {resolveInstalledKnowledgeTag} from '../../src/foundation/coordinatorBaseline/knowledgeProvenanceHost.js';
import {commitLane, TransactionalWriteError} from '../../src/foundation/transactionalWriter/index.js';
import type {LaneLayout} from '../../src/foundation/laneStore/laneStoreContracts.js';
import type {CoordinatorRoutingPolicy, InitPlan} from '../../src/foundation/InitContracts.js';
import type {WatchtowerError} from '../../src/contracts/errors.js';
import {createKnowledgePackFixture, FIXTURE_KNOWLEDGE_VERSION} from '../basic/skillInstallFixtures.js';

describe('resolveInstalledKnowledgeTag (RT-02/UK-04 installed-knowledge provenance)', function () {
    it('projects only the version and provenance block, never raw asset bytes or Markdown', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const tag = resolveInstalledKnowledgeTag(fixture.dataHome);
            expect(tag).toEqual({
                knowledgeVersion: FIXTURE_KNOWLEDGE_VERSION,
                provenance: {repository: 'fixture-repository', commit: '0'.repeat(40), importRecordSha256: `sha256:${'0'.repeat(64)}`}
            });
        } finally { fixture.remove(); }
    });

    it('fails closed with the pre-existing RT-02/UK-04 error when no knowledge pack is installed', function () {
        const fixture = createKnowledgePackFixture({omitManifest: true});
        try {
            expectCode(() => resolveInstalledKnowledgeTag(fixture.dataHome), 'ERR_MISSING_DEPENDENCY');
        } finally { fixture.remove(); }
    });
});

describe('buildCoordinatorBaseline', function () {
    it('materializes coordinator-routing.json, routing-policy.json, and context-policy.json plus the empty durable roots', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const layout = buildCoordinatorBaseline({plan: plan(fixture.dataHome), dataHome: fixture.dataHome});
            expect(layout.files.map(file => file.path)).toEqual([
                join(LANE_DIR, 'coordinator', 'coordinator-routing.json'),
                join(LANE_DIR, 'coordinator', 'routing-policy.json'),
                join(LANE_DIR, 'coordinator', 'context-policy.json'),
                join(LANE_DIR, 'coordinator', 'journal', 'coordinator-events.jsonl'),
                join(LANE_DIR, 'coordinator', 'journal', 'effect-events.jsonl'),
                join(LANE_DIR, 'coordinator', 'journal', 'usage-ledger.jsonl')
            ]);
            expect(layout.directories).toEqual([join(LANE_DIR, 'coordinator', 'cycles')]);
            const routingFile = layout.files.find(file => file.path.endsWith('coordinator-routing.json'));
            expect(JSON.parse(String(routingFile?.content))).toEqual(routing());
        } finally { fixture.remove(); }
    });

    it('uses an injected knowledge port instead of reaching into the real filesystem when one is supplied', function () {
        const captured: {dataHome: string | null} = {dataHome: null};
        const port: KnowledgeProvenancePort = {
            resolve: (dataHome) => { captured.dataHome = dataHome; return {knowledgeVersion: '9.9.9', provenance: {repository: 'r', commit: '1'.repeat(40), importRecordSha256: `sha256:${'1'.repeat(64)}`}}; }
        };
        const layout = buildCoordinatorBaseline({plan: plan('/unused-data-home'), dataHome: '/unused-data-home', knowledgePort: port});
        expect(captured.dataHome).toBe('/unused-data-home');
        const contextFile = layout.files.find(file => file.path.endsWith('context-policy.json'));
        expect(JSON.parse(String(contextFile?.content)).installedKnowledge.knowledgeVersion).toBe('9.9.9');
    });

    it('propagates a missing installed-knowledge dependency as a fail-closed error rather than a silent default', function () {
        const fixture = createKnowledgePackFixture({omitManifest: true});
        try {
            expectCode(() => buildCoordinatorBaseline({plan: plan(fixture.dataHome), dataHome: fixture.dataHome}), 'ERR_MISSING_DEPENDENCY');
        } finally { fixture.remove(); }
    });

    it('is a pure planning step: it performs no filesystem writes of its own', function () {
        const fixture = createKnowledgePackFixture();
        try {
            buildCoordinatorBaseline({plan: plan(fixture.dataHome), dataHome: fixture.dataHome});
            expect(existsSync(LANE_DIR)).toBe(false);
        } finally { fixture.remove(); }
    });
});

describe('composeLaneLayoutWithCoordinatorBaseline (join onto LC-03\'s accepted LaneLayout composition owner)', function () {
    it('merges owned dirs/files onto a base LaneLayout and preserves the base links untouched', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const baseline = buildCoordinatorBaseline({plan: plan(fixture.dataHome), dataHome: fixture.dataHome});
            const base = baseLaneLayout(LANE_DIR);
            const merged = composeLaneLayoutWithCoordinatorBaseline(base, baseline);
            expect(merged.laneDir).toBe(LANE_DIR);
            expect(merged.dirs).toEqual([...base.dirs, ...baseline.directories]);
            expect(merged.files).toEqual([...base.files, ...baseline.files]);
            expect(merged.links).toBe(base.links);
        } finally { fixture.remove(); }
    });

    it('fails closed with ERR_INTEGRITY_FAILURE rather than silently shadowing a directory the base layout already declares', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const baseline = buildCoordinatorBaseline({plan: plan(fixture.dataHome), dataHome: fixture.dataHome});
            const base: LaneLayout = Object.freeze({...baseLaneLayout(LANE_DIR), dirs: Object.freeze([...baseLaneLayout(LANE_DIR).dirs, ...baseline.directories])});
            expectCode(() => composeLaneLayoutWithCoordinatorBaseline(base, baseline), 'ERR_INTEGRITY_FAILURE');
        } finally { fixture.remove(); }
    });

    it('fails closed with ERR_INTEGRITY_FAILURE rather than silently shadowing a file the base layout already declares', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const baseline = buildCoordinatorBaseline({plan: plan(fixture.dataHome), dataHome: fixture.dataHome});
            const base: LaneLayout = Object.freeze({...baseLaneLayout(LANE_DIR), files: Object.freeze([...baseLaneLayout(LANE_DIR).files, ...baseline.files])});
            expectCode(() => composeLaneLayoutWithCoordinatorBaseline(base, baseline), 'ERR_INTEGRITY_FAILURE');
        } finally { fixture.remove(); }
    });
});

describe('buildCoordinatorBaseline + TransactionalWriter.commitLane (real filesystem materialization)', function () {
    let root: string;
    let lanesDir: string;
    let laneDir: string;

    beforeEach(function () {
        root = mkdtempSync(join(tmpdir(), 'wt-lc05-'));
        lanesDir = join(root, '.watchtower', 'lanes');
        laneDir = join(lanesDir, 'lane-1');
    });
    afterEach(function () { rmSync(root, {recursive: true, force: true}); });

    it('atomically commits the durable coordinator baseline: directories, empty logs, and readable policy JSON', async function () {
        const fixture = createKnowledgePackFixture();
        try {
            const baseline = buildCoordinatorBaseline({plan: plan(fixture.dataHome, laneDir), dataHome: fixture.dataHome});
            await commitLane(composeLaneLayoutWithCoordinatorBaseline(baseLaneLayout(laneDir), baseline));
            expect(existsSync(join(laneDir, 'coordinator', 'cycles'))).toBe(true);
            expect(statSync(join(laneDir, 'coordinator', 'cycles')).isDirectory()).toBe(true);
            expect(readFileSync(join(laneDir, 'coordinator', 'journal', 'coordinator-events.jsonl'), 'utf8')).toBe('');
            const routingPolicy = JSON.parse(readFileSync(join(laneDir, 'coordinator', 'routing-policy.json'), 'utf8'));
            expect(routingPolicy.installedKnowledge.knowledgeVersion).toBe(FIXTURE_KNOWLEDGE_VERSION);
            const contextPolicy = JSON.parse(readFileSync(join(laneDir, 'coordinator', 'context-policy.json'), 'utf8'));
            expect(contextPolicy.operatorSession.retention.closedArchiveDays).toBe(30);
        } finally { fixture.remove(); }
    });

    it('rolls back every staged coordinator-baseline byte when the lane directory already exists (concurrent-writer/replay case)', async function () {
        const fixture = createKnowledgePackFixture();
        try {
            const baseline = buildCoordinatorBaseline({plan: plan(fixture.dataHome, laneDir), dataHome: fixture.dataHome});
            mkdirSync(laneDir, {recursive: true});
            let threw: TransactionalWriteError | undefined;
            try { await commitLane(composeLaneLayoutWithCoordinatorBaseline(baseLaneLayout(laneDir), baseline)); } catch (error) {
                if (error instanceof TransactionalWriteError) threw = error; else throw error;
            }
            expect(threw?.stage).toBe('rename');
            const entries = readdirSync(lanesDir);
            expect(entries.filter((name) => name.startsWith('.staging-')).length).toBe(0);
            expect(existsSync(join(laneDir, 'coordinator', 'routing-policy.json'))).toBe(false);
        } finally { fixture.remove(); }
    });
});

/**
 * A minimal stand-in for `laneLayoutPlanner.buildLaneLayout`'s (LC-03,
 * accepted) real output shape: it already declares `coordinator/journal`
 * (host of this batch's empty log files) and does not declare
 * `coordinator/cycles`, matching the real `LANE_DIRECTORIES` list this
 * fixture is not re-deriving, only shaped identically to. Every
 * materialization test below composes this batch's owned baseline onto it
 * through the actual `composeLaneLayoutWithCoordinatorBaseline` production
 * function rather than hand-assembling a merged `LaneLayout`.
 */
function baseLaneLayout(laneDir: string): LaneLayout {
    return Object.freeze({
        laneDir,
        dirs: Object.freeze([laneDir, join(laneDir, 'coordinator'), join(laneDir, 'coordinator', 'journal')]),
        files: Object.freeze([{path: join(laneDir, 'lane.json'), content: '{}\n'}]),
        links: Object.freeze([])
    });
}

const LANE_DIR = '/home/operator/.watchtower/lanes/lane-1';

function routing(): CoordinatorRoutingPolicy {
    return Object.freeze({
        schemaVersion: 1,
        endpoints: Object.freeze([Object.freeze({
            endpointId: 'codex-primary-high', hostId: 'local', osUser: 'operator', adapterId: 'codex-cli',
            provider: 'openai', accountId: 'primary', model: 'configured-model', effort: 'high', capabilityClass: 'C5' as const
        })]),
        classes: Object.freeze({
            D1: Object.freeze({minimumCapability: 'C2' as const, primary: 'codex-primary-high', fallbacks: Object.freeze([])}),
            D2: Object.freeze({minimumCapability: 'C3' as const, primary: 'codex-primary-high', fallbacks: Object.freeze([])}),
            D3: Object.freeze({minimumCapability: 'C5' as const, primary: 'codex-primary-high', fallbacks: Object.freeze([])})
        }),
        operatorSessionClasses: Object.freeze({
            D1: Object.freeze({primary: 'codex-primary-high', fallbacks: Object.freeze([])}),
            D2: Object.freeze({primary: 'codex-primary-high', fallbacks: Object.freeze([])}),
            D3: Object.freeze({primary: 'codex-primary-high', fallbacks: Object.freeze([])})
        }),
        operatorSessionBudgetPolicyRef: 'context-policy.json#operatorSession'
    });
}

function plan(dataHome: string, laneDir: string = LANE_DIR): Pick<InitPlan, 'laneDir' | 'routing' | 'routingProvenance'> {
    void dataHome;
    return {laneDir, routing: routing(), routingProvenance: {policyVersion: 'shipping-v1', adapters: ['codex-cli'], reserves: ['routine-cycles', 'operator-session']}};
}

function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`expected ${code}`); } catch (error) { expect((error as WatchtowerError).code).toBe(code); }
}
