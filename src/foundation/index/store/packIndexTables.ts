/**
 * Builds every bounded, indexed in-memory lookup `IndexQuery` needs from one
 * `LogicalExport` read of the compiled pack index — the exact same read
 * `IndexStore.verifyIndexIntegrity` already performs once per session to
 * recompute the semantic root (`docs/spec/v1-contracts.md §8A.3`; mandatory
 * and already accepted). No additional SQLite access happens after this: a
 * single scan of each table, taken once at session admission, becomes a set
 * of `Map`/`Set` indexes so every later typed query is an O(1) or
 * O(matching-rows) lookup, never a fresh table read. This satisfies "single
 * lookup uses declared indexed keys and visits only bounded matching rows"
 * (`coordinator-automation.md §9.5`) at the query boundary, not merely at the
 * SQL boundary — CA-01's schema (immutable; this batch may not alter it)
 * declares no secondary index on `workload`/`reasoningClass`/`repository`,
 * so an equivalent SQL `WHERE` on those columns could not be index-assisted
 * either; building the equality index once in memory is the compliant,
 * available alternative.
 */
import type {LogicalExport} from '../../storage/index.js';
import type {
    ArtifactIndexEntry, BatchIndexEntry, BatchRepositoryClaim, BatchRequirementRelation,
    ProofIndexEntry, RepositoryIndexEntry, RequirementIndexEntry
} from '../../../contracts/index.js';
import {
    toArtifact, toBatch, toBatchRepository, toBatchRequirement, toDependency, toProof, toRepository, toRequirement
} from './packIndexRowMappers.js';

export interface PackIndexTables {
    readonly batchesById: ReadonlyMap<string, BatchIndexEntry>;
    readonly sortedBatchIds: readonly string[];
    readonly batchIdsByRepository: ReadonlyMap<string, ReadonlySet<string>>;
    readonly batchIdsByReasoningClass: ReadonlyMap<string, ReadonlySet<string>>;
    readonly batchIdsByWorkload: ReadonlyMap<string, ReadonlySet<string>>;
    readonly requirementsById: ReadonlyMap<string, RequirementIndexEntry>;
    readonly sortedRequirementIds: readonly string[];
    readonly requirementIdsByRepository: ReadonlyMap<string, ReadonlySet<string>>;
    readonly repositoriesById: ReadonlyMap<string, RepositoryIndexEntry>;
    readonly artifactsByRef: ReadonlyMap<string, ArtifactIndexEntry>;
    readonly artifactsByOwningBatch: ReadonlyMap<string, readonly ArtifactIndexEntry[]>;
    readonly dependsOnByBatch: ReadonlyMap<string, readonly string[]>;
    readonly dependentsByBatch: ReadonlyMap<string, readonly string[]>;
    readonly requirementRelationsByBatch: ReadonlyMap<string, readonly BatchRequirementRelation[]>;
    readonly proofsByBatch: ReadonlyMap<string, readonly ProofIndexEntry[]>;
    readonly repositoryClaimsByBatch: ReadonlyMap<string, readonly BatchRepositoryClaim[]>;
}

function rowsOf(logical: LogicalExport, table: string) {
    return logical.tables.find((entry) => entry.name === table)?.rows ?? [];
}

function addToSetIndex(index: Map<string, Set<string>>, key: string, value: string): void {
    const set = index.get(key) ?? new Set<string>();
    set.add(value);
    index.set(key, set);
}

function addToListIndex<T>(index: Map<string, T[]>, key: string, value: T): void {
    const list = index.get(key) ?? [];
    list.push(value);
    index.set(key, list);
}

/** One bounded pass over every table's already-read rows; never re-reads SQLite. */
export function buildPackIndexTables(logical: LogicalExport): PackIndexTables {
    const batchesById = new Map<string, BatchIndexEntry>();
    const batchIdsByRepository = new Map<string, Set<string>>();
    const batchIdsByReasoningClass = new Map<string, Set<string>>();
    const batchIdsByWorkload = new Map<string, Set<string>>();
    for (const row of rowsOf(logical, 'batch')) {
        const batch = toBatch(row);
        batchesById.set(batch.id, batch);
        addToSetIndex(batchIdsByRepository, batch.primaryRepository, batch.id);
        addToSetIndex(batchIdsByReasoningClass, batch.implementationReasoning, batch.id);
        addToSetIndex(batchIdsByReasoningClass, batch.reviewReasoning, batch.id);
        addToSetIndex(batchIdsByWorkload, batch.workload, batch.id);
    }

    const requirementsById = new Map<string, RequirementIndexEntry>();
    const requirementIdsByRepository = new Map<string, Set<string>>();
    for (const row of rowsOf(logical, 'requirement')) {
        const requirement = toRequirement(row);
        requirementsById.set(requirement.id, requirement);
        addToSetIndex(requirementIdsByRepository, requirement.repository, requirement.id);
    }

    const repositoriesById = new Map<string, RepositoryIndexEntry>();
    for (const row of rowsOf(logical, 'repository')) {
        const repository = toRepository(row);
        repositoriesById.set(repository.id, repository);
    }

    const artifactsByRef = new Map<string, ArtifactIndexEntry>();
    const artifactsByOwningBatch = new Map<string, ArtifactIndexEntry[]>();
    for (const row of rowsOf(logical, 'artifact')) {
        const artifact = toArtifact(row);
        artifactsByRef.set(artifact.ref, artifact);
        if (artifact.owningBatchId !== null) addToListIndex(artifactsByOwningBatch, artifact.owningBatchId, artifact);
    }

    const dependsOnByBatch = new Map<string, string[]>();
    const dependentsByBatch = new Map<string, string[]>();
    for (const row of rowsOf(logical, 'dependency')) {
        const edge = toDependency(row);
        addToListIndex(dependsOnByBatch, edge.batchId, edge.dependsOnBatchId);
        addToListIndex(dependentsByBatch, edge.dependsOnBatchId, edge.batchId);
    }

    const requirementRelationsByBatch = new Map<string, BatchRequirementRelation[]>();
    for (const row of rowsOf(logical, 'batch_requirement')) {
        const relation = toBatchRequirement(row);
        addToListIndex(requirementRelationsByBatch, relation.batchId, relation);
    }

    const proofsByBatch = new Map<string, ProofIndexEntry[]>();
    for (const row of rowsOf(logical, 'proof')) {
        const proof = toProof(row);
        addToListIndex(proofsByBatch, proof.batchId, proof);
    }

    const repositoryClaimsByBatch = new Map<string, BatchRepositoryClaim[]>();
    for (const row of rowsOf(logical, 'batch_repository')) {
        const claim = toBatchRepository(row);
        addToListIndex(repositoryClaimsByBatch, claim.batchId, claim);
    }

    return {
        batchesById, sortedBatchIds: [...batchesById.keys()].sort(),
        batchIdsByRepository, batchIdsByReasoningClass, batchIdsByWorkload,
        requirementsById, sortedRequirementIds: [...requirementsById.keys()].sort(), requirementIdsByRepository,
        repositoriesById, artifactsByRef, artifactsByOwningBatch,
        dependsOnByBatch, dependentsByBatch, requirementRelationsByBatch, proofsByBatch, repositoryClaimsByBatch
    };
}
