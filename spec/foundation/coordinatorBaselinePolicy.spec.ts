import {join} from 'node:path';
import {buildContextPolicyDocument} from '../../src/foundation/lane/coordinator/contextPolicyBaseline.js';
import {buildDurableRoots} from '../../src/foundation/lane/coordinator/durableRootsPlanner.js';
import {buildRoutingPolicyDocument} from '../../src/foundation/lane/coordinator/routingPolicyProjection.js';
import type {InstalledKnowledgeTag} from '../../src/foundation/lane/coordinator/coordinatorBaselineContracts.js';
import type {CoordinatorRoutingPolicy, InitPlan} from '../../src/foundation/init/index.js';
import type {WatchtowerError} from '../../src/contracts/index.js';

const LANE_DIR = '/home/operator/.watchtower/lanes/lane-1';

describe('buildRoutingPolicyDocument', function () {
    it('projects policy version, a deterministic digest, adapters, reserves, and knowledge attribution', function () {
        const document = buildRoutingPolicyDocument(routing(), routingProvenance(), knowledge());
        expect(document).toEqual({
            schemaVersion: 1, policyVersion: 'shipping-v1', policyDigest: document.policyDigest,
            adapters: ['codex-cli'], reserves: ['routine-cycles', 'operator-session'],
            installedKnowledge: knowledge()
        });
        expect(document.policyDigest).toMatch(/^sha256:[0-9a-f]{64}$/u);
    });

    it('is deterministic: identical routing content always produces the same digest regardless of key order', function () {
        const first = buildRoutingPolicyDocument(routing(), routingProvenance(), knowledge());
        const reordered = {...routing(), schemaVersion: 1 as const};
        const second = buildRoutingPolicyDocument(reordered, routingProvenance(), knowledge());
        expect(second.policyDigest).toBe(first.policyDigest);
    });

    it('changes digest when the underlying routing policy content changes', function () {
        const first = buildRoutingPolicyDocument(routing(), routingProvenance(), knowledge());
        const changed = buildRoutingPolicyDocument({...routing(), operatorSessionBudgetPolicyRef: 'context-policy.json#operatorSession'.slice()}, routingProvenance(), knowledge());
        expect(changed.policyDigest).toBe(first.policyDigest);
        const trulyChanged = buildRoutingPolicyDocument(
            {...routing(), classes: {...routing().classes, D1: {...routing().classes.D1, fallbacks: ['codex-primary-high']}}},
            routingProvenance(), knowledge()
        );
        expect(trulyChanged.policyDigest).not.toBe(first.policyDigest);
    });

    it('never restates routing endpoints/classes inside the projection', function () {
        const document = buildRoutingPolicyDocument(routing(), routingProvenance(), knowledge());
        expect(Object.keys(document)).toEqual(['schemaVersion', 'policyVersion', 'policyDigest', 'adapters', 'reserves', 'installedKnowledge']);
    });

    it('rejects a non-finite routing value with ERR_INTEGRITY_FAILURE rather than silently coercing it', function () {
        const corrupt = {...routing(), classes: {...routing().classes, D1: {...routing().classes.D1, weight: Number.POSITIVE_INFINITY}}} as unknown as CoordinatorRoutingPolicy;
        try {
            buildRoutingPolicyDocument(corrupt, routingProvenance(), knowledge());
            fail('expected ERR_INTEGRITY_FAILURE');
        } catch (error) {
            expect((error as WatchtowerError).code).toBe('ERR_INTEGRITY_FAILURE');
        }
    });
});

describe('buildContextPolicyDocument', function () {
    it('produces a finite v1 operator-session baseline with every required §13.1 dimension', function () {
        const document = buildContextPolicyDocument(knowledge());
        expect(document.schemaVersion).toBe(1);
        expect(document.policyVersion).toBe('shipping-v1');
        expect(document.installedKnowledge).toEqual(knowledge());
        const session = document.operatorSession;
        expect(session.defaultProfile).toBe('operator-standard');
        expect(session.profiles['operator-standard']).toBeDefined();
        expect(session.laneWide.protectedReserves.length).toBeGreaterThan(0);
        expect(session.maxOpenSessions).toBeGreaterThan(0);
        expect(session.maxConcurrentActiveTurns).toBeGreaterThan(0);
        expect(session.bounds.recentTurns).toBeGreaterThan(0);
        expect(session.retention).toEqual({fullTextWhileOpenOrSuspended: true, closedArchiveDays: 30, laneSessionByteLimit: 268_435_456});
        expect(session.confirmationRequirements).toEqual({mutatingEffectProposal: true, budgetOverrideGrant: true, amendmentRequest: true});
        expect(session.telemetryQuality).toEqual({unknownProviderDimension: 'reported-unavailable'});
    });

    it('matches every `docs/spec/v1-contracts.md` §7 "Operator-standard session defaults" value exactly', function () {
        const session = buildContextPolicyDocument(knowledge()).operatorSession;
        const standard = session.profiles['operator-standard'];
        expect(standard.perTurn).toEqual({inputTokens: 40_000, outputTokens: 4_000});
        expect(standard.perSession.turns).toBe(50);
        expect(standard.perSession.cumulativeTokens).toBe(500_000);
        expect(standard.perSession.storedFullTextBytes).toBe(33_554_432);
        expect(session.maxOpenSessions).toBe(16);
        expect(session.maxConcurrentActiveTurns).toBe(2);
        expect(session.laneWide.operatorSessionTotalTokens).toBe(2_000_000);
        expect(session.laneWide.protectedCapacityPercent).toBe(20);
        expect(session.bounds).toEqual({
            recentTurns: 8, pins: 16, crossSessionCapsules: 4, capsuleByteLimit: 65_536,
            brokerRequestsPerTurn: 8, brokerBytesPerTurn: 262_144, compactionTriggerTurns: 8
        });
        expect(session.retention).toEqual({fullTextWhileOpenOrSuspended: true, closedArchiveDays: 30, laneSessionByteLimit: 268_435_456});
        expect(session.holdExpiry).toEqual({defaultMinutes: 60, maximumHours: 24});
    });

    it('is deterministic and finite: every emitted value round-trips through JSON with no NaN/Infinity/undefined', function () {
        const document = buildContextPolicyDocument(knowledge());
        const roundTripped = JSON.parse(JSON.stringify(document));
        expect(roundTripped).toEqual(document);
    });

    it('is model-free: two independent calls with the same knowledge tag produce byte-identical output', function () {
        const first = JSON.stringify(buildContextPolicyDocument(knowledge()));
        const second = JSON.stringify(buildContextPolicyDocument(knowledge()));
        expect(second).toBe(first);
    });

    it('carries a distinct knowledge tag when the installed knowledge pack differs', function () {
        const other: InstalledKnowledgeTag = {knowledgeVersion: '2.0.0', provenance: {repository: 'other-repo', commit: '1'.repeat(40), importRecordSha256: `sha256:${'1'.repeat(64)}`}};
        const document = buildContextPolicyDocument(other);
        expect(document.installedKnowledge).toEqual(other);
    });
});

describe('buildDurableRoots', function () {
    it('plans exactly the three empty coordinator journal files and the cycles directory, and nothing else', function () {
        const roots = buildDurableRoots(LANE_DIR);
        expect(roots.directories).toEqual([join(LANE_DIR, 'coordinator', 'cycles')]);
        expect(roots.files.map(file => file.path)).toEqual([
            join(LANE_DIR, 'coordinator', 'journal', 'coordinator-events.jsonl'),
            join(LANE_DIR, 'coordinator', 'journal', 'effect-events.jsonl'),
            join(LANE_DIR, 'coordinator', 'journal', 'usage-ledger.jsonl')
        ]);
    });

    it('every journal file is truly empty (zero bytes), never a placeholder record', function () {
        const roots = buildDurableRoots(LANE_DIR);
        for (const file of roots.files) expect(file.content).toBe('');
    });

    it('never plans queue.json, cursor.json, or any projections/*.json owned by the coordinator-automation pack', function () {
        const roots = buildDurableRoots(LANE_DIR);
        const paths = [...roots.directories, ...roots.files.map(file => file.path)];
        expect(paths.some(path => path.includes('queue.json') || path.includes('cursor.json') || path.includes('projections'))).toBe(false);
    });
});

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

function routingProvenance(): InitPlan['routingProvenance'] {
    return Object.freeze({policyVersion: 'shipping-v1', adapters: Object.freeze(['codex-cli']),
        reserves: Object.freeze(['routine-cycles', 'operator-session'])});
}

function knowledge(): InstalledKnowledgeTag {
    return {knowledgeVersion: '0.1.0', provenance: {repository: 'fixture-repository', commit: '0'.repeat(40), importRecordSha256: `sha256:${'0'.repeat(64)}`}};
}
