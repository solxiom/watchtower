/**
 * Closed contracts for the CA-02 typed pack-index query facade
 * (`docs/spec/coordinator-automation.md §9.4`, `docs/spec/v1-contracts.md
 * §8A`): the bounded, typed domain entries the compiled `PACK_INDEX_SCHEMA`
 * rows project into, the closed pagination/limit/cursor page shape, and the
 * closed reason vocabulary a query refuses with. Every reason fails closed —
 * no query returns partial data alongside a reason.
 */

export const INDEX_QUERY_REASONS = [
    'INDEX_UNAVAILABLE',
    'INDEX_STALE',
    'INDEX_CORRUPT',
    'INDEX_CURSOR_INVALID',
    'INDEX_BATCH_NOT_FOUND',
    'INDEX_ARTIFACT_NOT_FOUND',
    'INDEX_REQUIREMENT_NOT_FOUND',
    'INDEX_LIMIT_EXCEEDED',
    'INDEX_SCHEMA_MISMATCH'
] as const;

export type IndexQueryReason = typeof INDEX_QUERY_REASONS[number];

/** Every refusal this facade raises; consumers branch on `reason`, never on message text. */
export class IndexQueryError extends Error {
    constructor(readonly reason: IndexQueryReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'IndexQueryError';
    }
}

export interface RepositoryIndexEntry {
    readonly id: string;
    readonly role: string;
    readonly access: string;
}

export interface BatchIndexEntry {
    readonly id: string;
    readonly title: string;
    readonly primaryRepository: string;
    readonly workBrief: string;
    readonly reviewBrief: string;
    readonly implementationReasoning: string;
    readonly reviewReasoning: string;
    readonly workload: string;
}

export interface RequirementIndexEntry {
    readonly id: string;
    readonly repository: string;
    readonly source: string;
}

export interface BatchRequirementRelation {
    readonly batchId: string;
    readonly requirementId: string;
    readonly relation: string;
}

export interface BatchRepositoryClaim {
    readonly batchId: string;
    readonly repositoryId: string;
    readonly access: string;
    readonly claimMode: string;
    readonly paths: readonly string[];
}

export interface ProofIndexEntry {
    readonly id: string;
    readonly batchId: string;
    readonly kind: string;
    readonly proofClass: string | null;
    readonly repository: string | null;
    readonly path: string | null;
    readonly optional: boolean | null;
}

export interface ArtifactIndexEntry {
    readonly ref: string;
    readonly repository: string;
    readonly path: string;
    readonly sha256: string;
    readonly bytes: number;
    readonly role: string;
    readonly owningBatchId: string | null;
}

export interface DependencyEdge {
    readonly batchId: string;
    readonly dependsOnBatchId: string;
}

/** One bounded, depth-limited dependency-neighborhood result for a single batch. */
export interface DependencyResult {
    readonly batchId: string;
    readonly direct: readonly BatchIndexEntry[];
    readonly transitive: readonly BatchIndexEntry[];
    readonly depthLimit: number;
    readonly depthReached: number;
    readonly truncated: boolean;
}

/** The closed page envelope every bounded list query returns. */
export interface QueryPage<T> {
    readonly items: readonly T[];
    readonly nextCursor: string | null;
    readonly truncated: boolean;
    readonly totalCount: number;
}

export type BatchQueryPage = QueryPage<BatchIndexEntry>;
export type RequirementQueryPage = QueryPage<RequirementIndexEntry>;

export interface BatchQueryParams {
    readonly limit?: number;
    readonly cursor?: string;
    readonly repository?: string;
    readonly reasoningClass?: string;
    readonly workload?: string;
}

export interface RequirementQueryParams {
    readonly limit?: number;
    readonly cursor?: string;
    readonly repository?: string;
}

/** `getBatchesByIds` preserves request order and reports IDs absent from the index, so it cannot collapse to a bare array. */
export interface BatchesByIdsResult {
    readonly items: readonly BatchIndexEntry[];
    readonly missingIds: readonly string[];
}

export interface ContextAssemblyOptions {
    readonly dependencyDepth?: number;
    readonly dependentsLimit?: number;
    readonly requirementsLimit?: number;
    readonly proofsLimit?: number;
}

/** The sole multi-table assembly result; every field is already bounded. */
export interface BoundedContext {
    readonly batch: BatchIndexEntry;
    readonly dependencies: DependencyResult;
    readonly dependents: readonly BatchIndexEntry[];
    readonly dependentsTruncated: boolean;
    readonly requirements: readonly RequirementIndexEntry[];
    readonly requirementsTruncated: boolean;
    readonly proofs: readonly ProofIndexEntry[];
    readonly proofsTruncated: boolean;
    readonly repositoryClaims: readonly BatchRepositoryClaim[];
    readonly truncated: boolean;
}
