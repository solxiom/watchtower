/**
 * Compiles CA-01 pack-index fixtures and projects them into CA-04
 * `ReadySetParams` slices so ready-set specs can exercise a realistically
 * sized 30-batch index without hand-authoring one row per batch.
 */
import type {BatchIndexEntry, BatchRepositoryClaim, DependencyEdge} from '../../../../src/contracts/indexQuery.js';
import type {
    ActiveResourceClaim, CandidateRepositoryBinding, CapacityReservation, EndpointRouteStatus, OwnedRepositoryBinding, ReadySetParams
} from '../../../../src/contracts/scheduling.js';
import type {IndexStore} from '../../../../src/foundation/index/index.js';
import type {PackIndexTables} from '../../../../src/foundation/index/store/packIndexTables.js';
import {buildChainFixture, compileChainIndex, type ChainOptions} from '../../support/indexQueryFixtures.js';
import {buildPackFixture, type PackFixture} from '../../fixtures/packFixture.js';

const LANE_ID = 'lane-ready-set-fixture';
const OPEN_ENDPOINT: readonly EndpointRouteStatus[] = [
    {reasoningClass: 'R3', active: true}, {reasoningClass: 'R4', active: true}, {reasoningClass: 'R5', active: true}
];
const OPEN_CAPACITY: readonly CapacityReservation[] = [
    {reasoningClass: 'R3', available: true}, {reasoningClass: 'R4', available: true}, {reasoningClass: 'R5', available: true}
];

function dependencyEdges(tables: PackIndexTables): DependencyEdge[] {
    const edges: DependencyEdge[] = [];
    for (const [batchId, dependsOnIds] of tables.dependsOnByBatch) {
        for (const dependsOnBatchId of dependsOnIds) edges.push({batchId, dependsOnBatchId});
    }
    return edges.sort((left, right) => left.batchId.localeCompare(right.batchId) || left.dependsOnBatchId.localeCompare(right.dependsOnBatchId));
}

function repositoryClaims(tables: PackIndexTables): BatchRepositoryClaim[] {
    const claims: BatchRepositoryClaim[] = [];
    for (const batchClaims of tables.repositoryClaimsByBatch.values()) claims.push(...batchClaims);
    return claims;
}

function batchIndex(tables: PackIndexTables): BatchIndexEntry[] {
    return [...tables.batchesById.values()].sort((left, right) => left.id.localeCompare(right.id));
}

export interface CompiledReadySetFixture {
    readonly store: IndexStore;
    readonly tables: PackIndexTables;
    readonly batchIndex: readonly BatchIndexEntry[];
    readonly dependencies: readonly DependencyEdge[];
    readonly repositoryClaims: readonly BatchRepositoryClaim[];
}

export async function compileReadySetFixture(count: number, indexRoot: string, options: Partial<ChainOptions> = {}): Promise<CompiledReadySetFixture> {
    const fixture = buildChainFixture({count, ...options});
    const {store} = await openCompiledFixture(fixture, indexRoot);
    const tables = await store.indexTables();
    return {
        store, tables, batchIndex: batchIndex(tables), dependencies: dependencyEdges(tables), repositoryClaims: repositoryClaims(tables)
    };
}

async function openCompiledFixture(fixture: PackFixture, indexRoot: string): Promise<{readonly store: IndexStore}> {
    const {indexDir} = await compileChainIndex(fixture, indexRoot);
    const {IndexStore} = await import('../../../../src/foundation/index/index.js');
    const store = await IndexStore.openIndex(indexDir);
    return {store};
}

export function readySetParamsFrom(
    compiled: CompiledReadySetFixture,
    overrides: Partial<ReadySetParams> = {}
): ReadySetParams {
    return {
        batchIndex: compiled.batchIndex,
        dependencies: compiled.dependencies,
        repositoryClaims: compiled.repositoryClaims,
        laneId: LANE_ID,
        acceptedBatchIds: new Set<string>(),
        activeClaims: [],
        candidateBindings: [],
        activeBindings: [],
        endpointRoutes: OPEN_ENDPOINT,
        capacityReserved: OPEN_CAPACITY,
        ...overrides
    };
}

function fanOutManifest(count: number): Record<string, unknown> {
    const rootId = 'B0';
    const leaves = Array.from({length: count - 1}, (_unused, index) => {
        const number = index + 1;
        const id = `B${number}`;
        return {
            id, title: `Batch ${number}`, dependsOn: [rootId],
            primaryRepository: 'nirvana', workBrief: 'work-batches/B1.md', reviewBrief: 'review-batches/B1.md',
            requirements: ['REQ-1'],
            repositories: [{id: 'nirvana', access: 'write', paths: [`src/batch-${number}/**`], claimMode: 'exclusive-write'}],
            implementationReasoning: 'R3', reviewReasoning: 'R3',
            workload: 'small', proofClasses: ['unit'], proofInputs: []
        };
    });
    return {
        repositories: [{id: 'nirvana', role: 'primary', access: 'write'}],
        requirements: [{id: 'REQ-1', repository: 'nirvana', source: 'requirements-traceability.md', workBatches: [rootId, ...leaves.map((batch) => batch.id)], reviewBatches: [rootId]}],
        batches: [{
            id: rootId, title: 'Root', dependsOn: [],
            primaryRepository: 'nirvana', workBrief: 'work-batches/B1.md', reviewBrief: 'review-batches/B1.md',
            requirements: ['REQ-1'],
            repositories: [{id: 'nirvana', access: 'write', paths: ['src/root/**'], claimMode: 'exclusive-write'}],
            implementationReasoning: 'R3', reviewReasoning: 'R3',
            workload: 'small', proofClasses: ['unit'], proofInputs: []
        }, ...leaves]
    };
}

/** One root plus `count - 1` parallel leaves — yields many equally ready candidates once the root is accepted. */
export async function compileFanOutFixture(count: number, indexRoot: string): Promise<CompiledReadySetFixture> {
    const fixture = buildPackFixture({manifest: fanOutManifest(count)});
    const {store} = await openCompiledFixture(fixture, indexRoot);
    const tables = await store.indexTables();
    return {
        store, tables, batchIndex: batchIndex(tables), dependencies: dependencyEdges(tables), repositoryClaims: repositoryClaims(tables)
    };
}

export function candidateBindingFor(batchId: string, path: string): CandidateRepositoryBinding {
    return {batchId, id: 'nirvana', role: 'primary', access: 'write', path, branch: 'feature/x', worktreeMode: 'dedicated'};
}

export function activeClaim(ownerBatchId: string, path: string): ActiveResourceClaim {
    return {repositoryId: 'nirvana', paths: [path], mode: 'exclusive-write', ownerBatchId, ownerLaneId: 'lane-other'};
}

export function ownedBinding(ownerBatchId: string, path: string): OwnedRepositoryBinding {
    return {ownerBatchId, ownerLaneId: 'lane-other', id: 'nirvana', role: 'primary', access: 'write', path, branch: 'feature/x', worktreeMode: 'dedicated'};
}
