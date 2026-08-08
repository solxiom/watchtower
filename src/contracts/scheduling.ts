/**
 * Closed contracts for the CA-04 scheduling projection: the ready-set
 * algorithm's inputs/outputs and the resource-claim conflict vocabulary
 * (`docs/spec/coordinator-automation.md §5.3`, `docs/spec/v1-contracts.md
 * §4`). `ActiveResourceClaim` here is the *active*, owner-attributed claim compared
 * across batches at dispatch time; it is distinct from the declared, static
 * per-lane claim in `./types.js` (`LaneManifestV1.claims`), which has no
 * owner attribution and is never compared cross-batch.
 */
import type {BatchIndexEntry, BatchRepositoryClaim, DependencyEdge} from './indexQuery.js';
import type {ClaimMode, RepositoryBinding} from './types.js';

export type ClaimBlockerKind = 'worktree' | 'branch' | 'path' | 'capacity';
export type ClaimConflictReason = 'CLAIM_CONFLICT_EXCLUSIVE' | 'CLAIM_CONFLICT_SHARED_WRITE';

/** An active, owner-attributed resource claim compared across batches. */
export interface ActiveResourceClaim {
    readonly repositoryId: string;
    readonly paths: readonly string[];
    readonly mode: ClaimMode;
    readonly ownerBatchId: string;
    readonly ownerLaneId: string;
}

export interface ClaimBlocker {
    readonly kind: ClaimBlockerKind;
    readonly sourceBatch: string;
    readonly sourceLane: string;
    readonly detail: string;
    readonly reason?: ClaimConflictReason;
}

export interface ClaimConflictReport {
    readonly proceed: boolean;
    readonly blockers: readonly ClaimBlocker[];
}

/** A `RepositoryBinding` plus the batch/lane owner RM-08's read-only binding type does not carry, needed only for cross-batch worktree-conflict attribution. */
export interface OwnedRepositoryBinding extends RepositoryBinding {
    readonly ownerBatchId: string;
    readonly ownerLaneId: string;
}

/** The repository binding one pending batch would use if dispatched, keyed by owning batch. */
export interface CandidateRepositoryBinding extends RepositoryBinding {
    readonly batchId: string;
}

export interface WritableConflictReport {
    readonly proceed: boolean;
    readonly conflicts: readonly ClaimBlocker[];
}

export interface EndpointRouteStatus {
    readonly reasoningClass: string;
    readonly active: boolean;
}

export interface CapacityReservation {
    readonly reasoningClass: string;
    readonly available: boolean;
}

export type ReadySetClassification = 'none' | 'unique' | 'priority-resolved' | 'ambiguous' | 'ambiguous-critical';

export type ReadySetPopulationReason = 'READY_SET_EMPTY' | 'READY_SET_BLOCKED_UNIVERSAL' | 'READY_SET_AMBIGUOUS';

export type BlockingReasonCode =
    | 'DEPENDENCY_UNSATISFIED' | 'BASELINE_DRIFT' | 'CLAIM_CONFLICT' | 'ENDPOINT_UNAVAILABLE' | 'CAPACITY_EXHAUSTED';

export interface BlockingReason {
    readonly code: BlockingReasonCode;
    readonly detail: string;
}

export interface BlockedBatch {
    readonly batchId: string;
    readonly reasons: readonly BlockingReason[];
}

/**
 * `dependencies` and `repositoryClaims` are the CA-01 `dependency` and
 * `batch_repository` table projections (`DependencyEdge`/`BatchRepositoryClaim`
 * from `./indexQuery.js`); `BatchIndexEntry` alone carries neither, so both are
 * required alongside the pack index rows themselves. `candidateBindings` is
 * the physical repository binding each pending batch would use if dispatched
 * (worktree path/branch/mode); `activeBindings` is every other active lane's
 * current binding. Both are required so `computeReadySet` can prove the
 * normative "repository/worktree claims non-conflicting" step, not merely the
 * path-claim dimension. `driftedBatchIds` and `totalPriorityBatchIds` are
 * optional because baseline-drift detection and total-priority policy are
 * owned elsewhere (the pack drift inspector and the versioned routing-policy
 * pack respectively); this projection only consumes their already-computed
 * results.
 */
export interface ReadySetParams {
    readonly batchIndex: readonly BatchIndexEntry[];
    readonly dependencies: readonly DependencyEdge[];
    readonly repositoryClaims: readonly BatchRepositoryClaim[];
    readonly laneId: string;
    readonly acceptedBatchIds: ReadonlySet<string>;
    readonly activeClaims: readonly ActiveResourceClaim[];
    readonly candidateBindings: readonly CandidateRepositoryBinding[];
    readonly activeBindings: readonly OwnedRepositoryBinding[];
    readonly endpointRoutes: readonly EndpointRouteStatus[];
    readonly capacityReserved: readonly CapacityReservation[];
    readonly driftedBatchIds?: ReadonlySet<string>;
    readonly totalPriorityBatchIds?: readonly string[];
}

export interface ReadySetResult {
    readonly pendingBatchIds: readonly string[];
    readonly candidateBatchIds: readonly string[];
    readonly classification: ReadySetClassification;
    readonly populationReason: ReadySetPopulationReason | null;
    readonly blocked: readonly BlockedBatch[];
}

export type ReadySetProjectionParseResult =
    | {readonly ok: true; readonly value: ReadySetResult}
    | {readonly ok: false; readonly reason: 'READY_SET_INVALID'};
