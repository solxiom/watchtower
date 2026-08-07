import {classifyReadySet, computeBlockingReasons, computeReadySet} from '../../../src/foundation/scheduling/index.js';
import type {BatchIndexEntry, BatchRepositoryClaim, DependencyEdge} from '../../../src/contracts/indexQuery.js';
import type {
    ActiveResourceClaim, CandidateRepositoryBinding, CapacityReservation, EndpointRouteStatus, OwnedRepositoryBinding, ReadySetParams
} from '../../../src/contracts/scheduling.js';

function batch(id: string, overrides: Partial<BatchIndexEntry> = {}): BatchIndexEntry {
    return {
        id, title: id, primaryRepository: 'main', workBrief: 'wb', reviewBrief: 'rb',
        implementationReasoning: 'R3', reviewReasoning: 'R3', workload: 'small', ...overrides
    };
}

function edge(batchId: string, dependsOnBatchId: string): DependencyEdge {
    return {batchId, dependsOnBatchId};
}

function candidateBinding(batchId: string, overrides: Partial<CandidateRepositoryBinding> = {}): CandidateRepositoryBinding {
    return {batchId, id: 'main', role: 'primary', access: 'write', path: '/work/main', branch: 'feature/x', worktreeMode: 'dedicated', ...overrides};
}

function activeBinding(ownerBatchId: string, overrides: Partial<OwnedRepositoryBinding> = {}): OwnedRepositoryBinding {
    return {ownerBatchId, ownerLaneId: 'lane-b', id: 'main', role: 'primary', access: 'write', path: '/work/main', branch: 'feature/x', worktreeMode: 'dedicated', ...overrides};
}

const OPEN_ENDPOINT: readonly EndpointRouteStatus[] = [{reasoningClass: 'R3', active: true}, {reasoningClass: 'R4', active: true}, {reasoningClass: 'R5', active: true}];
const OPEN_CAPACITY: readonly CapacityReservation[] = [{reasoningClass: 'R3', available: true}, {reasoningClass: 'R4', available: true}, {reasoningClass: 'R5', available: true}];

function baseParams(overrides: Partial<ReadySetParams> = {}): ReadySetParams {
    return {
        batchIndex: [], dependencies: [], repositoryClaims: [], laneId: 'lane-a',
        acceptedBatchIds: new Set<string>(), activeClaims: [], candidateBindings: [], activeBindings: [],
        endpointRoutes: OPEN_ENDPOINT, capacityReserved: OPEN_CAPACITY,
        ...overrides
    };
}

describe('computeReadySet — empty set', function () {
    it('returns READY_SET_EMPTY and classification none when every batch is accepted', function () {
        const result = computeReadySet(baseParams({batchIndex: [batch('CA-01')], acceptedBatchIds: new Set(['CA-01'])}));
        expect(result).toEqual({
            pendingBatchIds: [], candidateBatchIds: [], classification: 'none', populationReason: 'READY_SET_EMPTY', blocked: []
        });
    });
});

describe('computeReadySet — unique candidate', function () {
    it('classifies exactly one dependency-satisfied, conflict-free candidate as unique', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-01'), batch('CA-02')], dependencies: [edge('CA-02', 'CA-01')],
            acceptedBatchIds: new Set(['CA-01'])
        }));
        expect(result.candidateBatchIds).toEqual(['CA-02']);
        expect(result.classification).toBe('unique');
        expect(result.populationReason).toBeNull();
    });
});

describe('computeReadySet — priority resolution', function () {
    it('resolves multiple ready candidates to priority-resolved when a total-priority order ranks every candidate', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-05'), batch('CA-06')], totalPriorityBatchIds: ['CA-06', 'CA-05']
        }));
        expect([...result.candidateBatchIds].sort()).toEqual(['CA-05', 'CA-06']);
        expect(result.classification).toBe('priority-resolved');
        expect(result.populationReason).toBeNull();
    });

    it('never resolves on a duplicate candidate entry that masks an unranked candidate (CA04-R3)', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-05'), batch('CA-06')], totalPriorityBatchIds: ['CA-05', 'CA-05']
        }));
        expect(result.classification).toBe('ambiguous');
        expect(result.populationReason).toBe('READY_SET_AMBIGUOUS');
    });

    it('never resolves on any duplicate candidate entry, even one that otherwise still covers every candidate', function () {
        const result = classifyReadySet(
            [batch('CA-05'), batch('CA-06')], [], ['CA-06', 'CA-05', 'CA-06']
        );
        expect(result).toBe('ambiguous');
    });
});

describe('computeReadySet — ambiguous (no arbitrary winner)', function () {
    it('reports every equally valid candidate individually rather than selecting one', function () {
        const result = computeReadySet(baseParams({batchIndex: [batch('CA-05'), batch('CA-06')]}));
        expect([...result.candidateBatchIds].sort()).toEqual(['CA-05', 'CA-06']);
        expect(result.classification).toBe('ambiguous');
        expect(result.populationReason).toBe('READY_SET_AMBIGUOUS');
        expect(result.blocked).toEqual([]);
    });

    it('never resolves with a partial or missing total-priority order', function () {
        const result = computeReadySet(baseParams({batchIndex: [batch('CA-05'), batch('CA-06')], totalPriorityBatchIds: ['CA-06']}));
        expect(result.classification).toBe('ambiguous');
    });
});

describe('computeReadySet — ambiguous critical', function () {
    it('escalates when one of several candidates requires R4/R5 reasoning', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-05'), batch('CA-04', {implementationReasoning: 'R5'})]
        }));
        expect(result.classification).toBe('ambiguous-critical');
    });

    it('escalates when a candidate itself claims more than one repository (CA04-R2), even when the other candidate shares its primary repository', function () {
        const repositoryClaims: readonly BatchRepositoryClaim[] = [
            {batchId: 'CA-05', repositoryId: 'main', access: 'write', claimMode: 'exclusive-write', paths: ['src/**']},
            {batchId: 'CA-05', repositoryId: 'other', access: 'read', claimMode: 'read', paths: ['docs/**']}
        ];
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-05', {primaryRepository: 'main'}), batch('CA-06', {primaryRepository: 'main'})],
            repositoryClaims
        }));
        expect(result.classification).toBe('ambiguous-critical');
    });

    it('does not escalate merely because two single-repository candidates differ in primary repository', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-05', {primaryRepository: 'main'}), batch('RM-09', {primaryRepository: 'other'})]
        }));
        expect(result.classification).toBe('ambiguous');
    });
});

describe('computeReadySet — worktree conflict (CA04-R1)', function () {
    it('blocks a candidate whose dedicated writable worktree is already claimed by another active batch, rather than returning it as unique', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-04')],
            candidateBindings: [candidateBinding('CA-04')],
            activeBindings: [activeBinding('CA-99')]
        }));
        expect(result.candidateBatchIds).toEqual([]);
        expect(result.classification).toBe('none');
        expect(result.populationReason).toBe('READY_SET_BLOCKED_UNIVERSAL');
        expect(result.blocked).toEqual([{
            batchId: 'CA-04', reasons: [jasmine.objectContaining({code: 'CLAIM_CONFLICT', detail: jasmine.stringMatching(/\[worktree]/)})]
        }]);
    });

    it('blocks a candidate whose declared branch differs from an active batch on the same writable worktree', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-04')],
            candidateBindings: [candidateBinding('CA-04', {branch: 'main'})],
            activeBindings: [activeBinding('CA-99', {branch: 'release'})]
        }));
        expect(result.blocked).toEqual([{
            batchId: 'CA-04', reasons: [jasmine.objectContaining({code: 'CLAIM_CONFLICT', detail: jasmine.stringMatching(/\[branch]/)})]
        }]);
    });

    it('does not block on a shared worktree mode with no branch mismatch', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-04')],
            candidateBindings: [candidateBinding('CA-04', {worktreeMode: 'shared'})],
            activeBindings: [activeBinding('CA-99', {worktreeMode: 'shared'})]
        }));
        expect(result.candidateBatchIds).toEqual(['CA-04']);
    });
});

describe('computeReadySet — dependency unsatisfied', function () {
    it('excludes a batch depending on an unaccepted batch with DEPENDENCY_UNSATISFIED', function () {
        const result = computeReadySet(baseParams({
            batchIndex: [batch('CA-02')], dependencies: [edge('CA-02', 'CA-01')]
        }));
        expect(result.candidateBatchIds).toEqual([]);
        expect(result.blocked).toEqual([{
            batchId: 'CA-02', reasons: [jasmine.objectContaining({code: 'DEPENDENCY_UNSATISFIED'})]
        }]);
        expect(result.populationReason).toBe('READY_SET_BLOCKED_UNIVERSAL');
    });
});

describe('computeReadySet — claim conflict', function () {
    it('blocks a candidate whose declared exclusive-write path overlaps an active claim with CLAIM_CONFLICT', function () {
        const claims: readonly ActiveResourceClaim[] = [{repositoryId: 'main', paths: ['src/**'], mode: 'exclusive-write', ownerBatchId: 'CA-03', ownerLaneId: 'lane-a'}];
        const repositoryClaims: readonly BatchRepositoryClaim[] = [{batchId: 'CA-04', repositoryId: 'main', access: 'write', claimMode: 'exclusive-write', paths: ['src/**']}];
        const result = computeReadySet(baseParams({batchIndex: [batch('CA-04')], activeClaims: claims, repositoryClaims}));
        expect(result.candidateBatchIds).toEqual([]);
        expect(result.blocked).toEqual([{batchId: 'CA-04', reasons: [jasmine.objectContaining({code: 'CLAIM_CONFLICT'})]}]);
    });
});

describe('computeReadySet — endpoint unavailable', function () {
    it('blocks a candidate whose reasoning class has no active endpoint route', function () {
        const result = computeReadySet(baseParams({batchIndex: [batch('CA-04', {implementationReasoning: 'R5'})], endpointRoutes: [{reasoningClass: 'R3', active: true}]}));
        expect(result.blocked).toEqual([{batchId: 'CA-04', reasons: [jasmine.objectContaining({code: 'ENDPOINT_UNAVAILABLE'})]}]);
    });
});

describe('computeReadySet — capacity exhausted', function () {
    it('blocks a candidate whose reasoning class has no reserved capacity', function () {
        const result = computeReadySet(baseParams({batchIndex: [batch('CA-04', {implementationReasoning: 'R5'})], capacityReserved: [{reasoningClass: 'R3', available: true}]}));
        expect(result.blocked).toEqual([{batchId: 'CA-04', reasons: [jasmine.objectContaining({code: 'CAPACITY_EXHAUSTED'})]}]);
    });
});

describe('computeReadySet — baseline drift', function () {
    it('blocks a candidate the drift inspector flagged with BASELINE_DRIFT', function () {
        const result = computeReadySet(baseParams({batchIndex: [batch('CA-04')], driftedBatchIds: new Set(['CA-04'])}));
        expect(result.blocked).toEqual([{batchId: 'CA-04', reasons: [jasmine.objectContaining({code: 'BASELINE_DRIFT'})]}]);
    });
});

describe('computeReadySet — DAG correctness over a deep dependency chain', function () {
    it('surfaces only the leaf batch whose full ancestor chain is accepted', function () {
        const ids = Array.from({length: 10}, (_unused, index) => `CA-${String(index + 1).padStart(2, '0')}`);
        const batches = ids.map((id) => batch(id));
        const dependencies = ids.slice(1).map((id, index) => edge(id, ids[index]));
        const accepted = new Set(ids.slice(0, 9));
        const result = computeReadySet(baseParams({batchIndex: batches, dependencies, acceptedBatchIds: accepted}));
        expect(result.candidateBatchIds).toEqual(['CA-10']);
        expect(result.classification).toBe('unique');
    });

    it('blocks every descendant of an unaccepted ancestor, not only the immediate dependency', function () {
        const ids = Array.from({length: 10}, (_unused, index) => `CA-${String(index + 1).padStart(2, '0')}`);
        const batches = ids.map((id) => batch(id));
        const dependencies = ids.slice(1).map((id, index) => edge(id, ids[index]));
        const accepted = new Set(ids.slice(0, 3));
        const result = computeReadySet(baseParams({batchIndex: batches, dependencies, acceptedBatchIds: accepted}));
        expect(result.candidateBatchIds).toEqual(['CA-04']);
        expect(result.pendingBatchIds).toEqual(ids.slice(3));
    });
});

describe('computeReadySet — determinism', function () {
    it('produces an identical ReadySetResult for identical inputs', function () {
        const params = baseParams({batchIndex: [batch('CA-05'), batch('CA-06')], dependencies: [], totalPriorityBatchIds: ['CA-05', 'CA-06']});
        expect(computeReadySet(params)).toEqual(computeReadySet(params));
    });
});

describe('classifyReadySet', function () {
    it('returns none for an empty candidate set', function () {
        expect(classifyReadySet([], [])).toBe('none');
    });
});

describe('computeBlockingReasons', function () {
    it('is independently callable for one candidate and matches the reasons embedded in computeReadySet', function () {
        const params = baseParams({batchIndex: [batch('CA-01'), batch('CA-02')], dependencies: [edge('CA-02', 'CA-01')]});
        const reasons = computeBlockingReasons('CA-02', params);
        expect(reasons).toEqual([jasmine.objectContaining({code: 'DEPENDENCY_UNSATISFIED'})]);
    });
});
