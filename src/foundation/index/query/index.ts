/**
 * The bounded, typed pack-index query facade
 * (`docs/spec/coordinator-automation.md §9.4`, `docs/spec/v1-contracts.md
 * §8A`, CA-02 work brief). Every public method resolves against
 * `IndexStore`'s pre-built `PackIndexTables` — a set of `Map`/`Set` indexes
 * built once per session — so a single lookup is O(1)/O(matching), and a
 * filtered/paginated list only ever touches the matching, bounded subset
 * (never every row). Cursor/pagination lives in `indexQuery/queryCursor.ts`;
 * dependency-graph traversal lives in `indexQuery/dependencyTraversal.ts`;
 * both are this batch's own sibling owners. `IndexQuery` itself is the thin
 * composition/dispatch layer — it constructs no SQL and reads no table.
 */
import {IndexQueryError} from '../../../contracts/index.js';
import type {
    ArtifactIndexEntry, BatchesByIdsResult, BatchIndexEntry, BatchQueryPage, BatchQueryParams,
    BatchRepositoryClaim, BoundedContext, ContextAssemblyOptions, DependencyResult,
    ProofIndexEntry, RepositoryIndexEntry, RequirementIndexEntry, RequirementQueryPage, RequirementQueryParams
} from '../../../contracts/index.js';
import type {IndexStore} from '../store/index.js';
import type {PackIndexTables} from '../store/packIndexTables.js';
import {MAX_DEPENDENCY_DEPTH, walkDependencies} from './dependencyTraversal.js';
import {digest, MAX_PAGE_LIMIT, paginateIds, validateLimit} from './queryCursor.js';

// The accepted CA-02 page cursor is the shared cursor for every derived-index
// query capability, including the CA-16 session index; surface it on the query
// capsule's public barrel so sibling capsules reuse it without a deep import.
export {digest, paginateIds} from './queryCursor.js';

const DEFAULT_DEPENDENTS_LIMIT = 50;
const DEFAULT_REQUIREMENTS_LIMIT = 50;
const DEFAULT_PROOFS_LIMIT = 50;

function compareIds(left: string, right: string): number {
    return left < right ? -1 : left > right ? 1 : 0;
}

function intersect(base: ReadonlySet<string> | null, next: ReadonlySet<string> | undefined): Set<string> {
    if (next === undefined) return new Set();
    if (base === null) return new Set(next);
    const result = new Set<string>();
    for (const id of base) if (next.has(id)) result.add(id);
    return result;
}

function batchDigest(params: Readonly<{repository?: string; reasoningClass?: string; workload?: string}>): string {
    return digest(JSON.stringify({repository: params.repository ?? null, reasoningClass: params.reasoningClass ?? null, workload: params.workload ?? null}));
}

function requirementDigest(params: Readonly<{repository?: string}>): string {
    return digest(JSON.stringify({repository: params.repository ?? null}));
}

/** Candidate batch IDs for `getBatches`: the full sorted set, narrowed by each declared filter's pre-built index. */
function filterBatchIds(tables: PackIndexTables, params: BatchQueryParams): readonly string[] {
    if (params.repository === undefined && params.reasoningClass === undefined && params.workload === undefined) {
        return tables.sortedBatchIds;
    }
    let candidates: Set<string> | null = null;
    if (params.repository !== undefined) candidates = intersect(candidates, tables.batchIdsByRepository.get(params.repository));
    if (params.reasoningClass !== undefined) candidates = intersect(candidates, tables.batchIdsByReasoningClass.get(params.reasoningClass));
    if (params.workload !== undefined) candidates = intersect(candidates, tables.batchIdsByWorkload.get(params.workload));
    return [...(candidates ?? new Set<string>())].sort(compareIds);
}

export class IndexQuery {
    constructor(private readonly store: IndexStore) {}

    private revision(): string {
        const value = this.store.currentIndexDigest();
        if (value === null) throw new IndexQueryError('INDEX_UNAVAILABLE', this.store.identity.indexId, 'the index generation has been invalidated');
        return value;
    }

    async getArtifact(artifactId: string): Promise<ArtifactIndexEntry | null> {
        return (await this.store.getArtifact(artifactId)) ?? null;
    }

    async getBatch(batchId: string): Promise<BatchIndexEntry | null> {
        return (await this.store.getBatch(batchId)) ?? null;
    }

    async getRequirement(requirementId: string): Promise<RequirementIndexEntry | null> {
        return (await this.store.getRequirement(requirementId)) ?? null;
    }

    private async requireBatch(batchId: string): Promise<BatchIndexEntry> {
        const batch = await this.store.getBatch(batchId);
        if (batch === undefined) throw new IndexQueryError('INDEX_BATCH_NOT_FOUND', batchId, `no batch with id "${batchId}" is present in the pack index`);
        return batch;
    }

    async getBatches(params: BatchQueryParams = {}): Promise<BatchQueryPage> {
        const revision = this.revision();
        const tables = await this.store.indexTables();
        const ids = filterBatchIds(tables, params);
        const page = paginateIds({ids, limit: params.limit, cursor: params.cursor, queryDigest: batchDigest(params), revision, subject: 'batch.list'});
        return {
            items: page.pageIds.map((id) => tables.batchesById.get(id) as BatchIndexEntry),
            nextCursor: page.nextCursor, truncated: page.truncated, totalCount: page.totalCount
        };
    }

    /** Preserves request order; IDs absent from the index are reported in `missingIds`, never silently dropped. */
    async getBatchesByIds(batchIds: readonly string[]): Promise<BatchesByIdsResult> {
        if (batchIds.length > MAX_PAGE_LIMIT) {
            throw new IndexQueryError('INDEX_LIMIT_EXCEEDED', 'batch.getByIds', `requested ${batchIds.length} batch IDs exceeds the maximum of ${MAX_PAGE_LIMIT}`);
        }
        const tables = await this.store.indexTables();
        const items: BatchIndexEntry[] = [];
        const missingIds: string[] = [];
        for (const id of batchIds) {
            const batch = tables.batchesById.get(id);
            if (batch === undefined) missingIds.push(id); else items.push(batch);
        }
        return {items, missingIds};
    }

    private resolveBatches(ids: readonly string[], tables: PackIndexTables): BatchIndexEntry[] {
        const resolved: BatchIndexEntry[] = [];
        for (const id of ids) {
            const batch = tables.batchesById.get(id);
            if (batch !== undefined) resolved.push(batch);
        }
        return resolved.sort((left, right) => compareIds(left.id, right.id));
    }

    /** Direct plus bounded-transitive (max depth 10) dependency resolution for one batch. */
    async getDependencies(batchId: string): Promise<DependencyResult> {
        await this.requireBatch(batchId);
        const tables = await this.store.indexTables();
        const walk = walkDependencies(batchId, MAX_DEPENDENCY_DEPTH, tables.dependsOnByBatch);
        return {
            batchId, direct: this.resolveBatches(walk.direct, tables), transitive: this.resolveBatches(walk.transitive, tables),
            depthLimit: walk.depthLimit, depthReached: walk.depthReached, truncated: walk.truncated
        };
    }

    /** Direct reverse edges only — batches that declare a dependency on `batchId`. */
    async getDependents(batchId: string): Promise<readonly BatchIndexEntry[]> {
        await this.requireBatch(batchId);
        const tables = await this.store.indexTables();
        const dependentIds = tables.dependentsByBatch.get(batchId) ?? [];
        if (dependentIds.length > MAX_PAGE_LIMIT) {
            throw new IndexQueryError('INDEX_LIMIT_EXCEEDED', batchId, `${dependentIds.length} dependents exceed the maximum of ${MAX_PAGE_LIMIT}`);
        }
        return this.resolveBatches(dependentIds, tables);
    }

    async getRequirements(params: RequirementQueryParams = {}): Promise<RequirementQueryPage> {
        const revision = this.revision();
        const tables = await this.store.indexTables();
        const ids = params.repository === undefined
            ? tables.sortedRequirementIds
            : [...(tables.requirementIdsByRepository.get(params.repository) ?? new Set<string>())].sort(compareIds);
        const page = paginateIds({ids, limit: params.limit, cursor: params.cursor, queryDigest: requirementDigest(params), revision, subject: 'requirement.list'});
        return {
            items: page.pageIds.map((id) => tables.requirementsById.get(id) as RequirementIndexEntry),
            nextCursor: page.nextCursor, truncated: page.truncated, totalCount: page.totalCount
        };
    }

    async getRepositories(): Promise<readonly RepositoryIndexEntry[]> {
        return (await this.store.listRepositories()).slice().sort((left, right) => compareIds(left.id, right.id));
    }

    async getProofs(batchId: string): Promise<readonly ProofIndexEntry[]> {
        await this.requireBatch(batchId);
        const proofs = (await this.store.indexTables()).proofsByBatch.get(batchId) ?? [];
        if (proofs.length > MAX_PAGE_LIMIT) {
            throw new IndexQueryError('INDEX_LIMIT_EXCEEDED', batchId, `${proofs.length} proofs exceed the maximum of ${MAX_PAGE_LIMIT}`);
        }
        return proofs;
    }

    async getArtifactsByBatch(batchId: string, limit: number): Promise<readonly ArtifactIndexEntry[]> {
        await this.requireBatch(batchId);
        const resolvedLimit = validateLimit(limit, batchId);
        const artifacts = (await this.store.indexTables()).artifactsByOwningBatch.get(batchId) ?? [];
        return artifacts.slice(0, resolvedLimit);
    }

    private async batchRequirementsFor(batchId: string, limit: number, tables: PackIndexTables): Promise<{readonly items: readonly RequirementIndexEntry[]; readonly truncated: boolean}> {
        const relations = tables.requirementRelationsByBatch.get(batchId) ?? [];
        const requirementIds = [...new Set(relations.map((relation) => relation.requirementId))].sort();
        const truncated = requirementIds.length > limit;
        const items: RequirementIndexEntry[] = [];
        for (const id of requirementIds.slice(0, limit)) {
            const requirement = tables.requirementsById.get(id);
            if (requirement === undefined) {
                throw new IndexQueryError('INDEX_REQUIREMENT_NOT_FOUND', id, `batch "${batchId}" references requirement "${id}", which is absent from the pack index`);
            }
            items.push(requirement);
        }
        return {items, truncated};
    }

    /**
     * The one method that composes multiple tables into a single bounded
     * decision-envelope shape: batch summary, depth-limited dependency
     * neighborhood, direct dependents, requirement references, proof
     * references, and repository claims. Consumers never assemble this
     * themselves from separate typed calls.
     */
    async assembleBatchContext(batchId: string, options: ContextAssemblyOptions = {}): Promise<BoundedContext> {
        const batch = await this.requireBatch(batchId);
        const requestedDepth = options.dependencyDepth ?? MAX_DEPENDENCY_DEPTH;
        if (!Number.isInteger(requestedDepth) || requestedDepth < 1 || requestedDepth > MAX_DEPENDENCY_DEPTH) {
            throw new IndexQueryError('INDEX_LIMIT_EXCEEDED', batchId, `requested dependency depth ${String(options.dependencyDepth)} exceeds the maximum of ${MAX_DEPENDENCY_DEPTH}`);
        }
        const tables = await this.store.indexTables();
        const walk = walkDependencies(batchId, requestedDepth, tables.dependsOnByBatch);
        const dependencies: DependencyResult = {
            batchId, direct: this.resolveBatches(walk.direct, tables), transitive: this.resolveBatches(walk.transitive, tables),
            depthLimit: walk.depthLimit, depthReached: walk.depthReached, truncated: walk.truncated
        };

        const dependentsLimit = validateLimit(options.dependentsLimit ?? DEFAULT_DEPENDENTS_LIMIT, batchId);
        const allDependentIds = tables.dependentsByBatch.get(batchId) ?? [];
        const dependents = this.resolveBatches(allDependentIds.slice(0, dependentsLimit), tables);
        const dependentsTruncated = allDependentIds.length > dependentsLimit;

        const requirementsLimit = validateLimit(options.requirementsLimit ?? DEFAULT_REQUIREMENTS_LIMIT, batchId);
        const {items: requirements, truncated: requirementsTruncated} = await this.batchRequirementsFor(batchId, requirementsLimit, tables);

        const proofsLimit = validateLimit(options.proofsLimit ?? DEFAULT_PROOFS_LIMIT, batchId);
        const allProofs = tables.proofsByBatch.get(batchId) ?? [];
        const proofs = allProofs.slice(0, proofsLimit);
        const proofsTruncated = allProofs.length > proofsLimit;

        const repositoryClaims = tables.repositoryClaimsByBatch.get(batchId) ?? [];

        return {
            batch, dependencies, dependents, dependentsTruncated, requirements, requirementsTruncated,
            proofs, proofsTruncated, repositoryClaims,
            truncated: dependencies.truncated || dependentsTruncated || requirementsTruncated || proofsTruncated
        };
    }
}
