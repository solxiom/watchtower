/**
 * CA-04 ready-set projection (`docs/spec/coordinator-automation.md §5.3`,
 * `docs/spec/v1-contracts.md §4`): computes, from the compiled pack index plus
 * accepted/claim/endpoint/capacity state, which pending batches are dispatch
 * candidates, and classifies the result without ever picking an arbitrary
 * winner among multiple valid candidates. Entirely synchronous and
 * model-free; delegates claim/worktree conflict evaluation to
 * `ResourceClaims.ts` and never recomputes it.
 */
import type {BatchIndexEntry, BatchRepositoryClaim, DependencyEdge} from '../../contracts/indexQuery.js';
import type {
    BlockedBatch, BlockingReason, ReadySetClassification, ReadySetParams, ReadySetPopulationReason, ReadySetResult
} from '../../contracts/scheduling.js';
import {checkWritableOverlap, evaluateClaimConflict, registerBatchClaims} from './ResourceClaims.js';

const CRITICAL_REASONING_CLASSES: ReadonlySet<string> = new Set(['R4', 'R5']);

function buildDependencyIndex(dependencies: readonly DependencyEdge[]): ReadonlyMap<string, readonly string[]> {
    const map = new Map<string, string[]>();
    for (const edge of dependencies) {
        const list = map.get(edge.batchId) ?? [];
        list.push(edge.dependsOnBatchId);
        map.set(edge.batchId, list);
    }
    return map;
}

function findBatch(batchIndex: readonly BatchIndexEntry[], batchId: string): BatchIndexEntry {
    const batch = batchIndex.find((entry) => entry.id === batchId);
    if (batch === undefined) throw new RangeError(`ready-set candidate "${batchId}" is not present in the supplied batch index`);
    return batch;
}

function blockingReasonsFor(
    candidateId: string, params: ReadySetParams, dependsOnByBatch: ReadonlyMap<string, readonly string[]>
): BlockingReason[] {
    const reasons: BlockingReason[] = [];
    const dependsOn = dependsOnByBatch.get(candidateId) ?? [];
    const unmet = dependsOn.filter((dependency) => !params.acceptedBatchIds.has(dependency));
    if (unmet.length > 0) {
        reasons.push({code: 'DEPENDENCY_UNSATISFIED', detail: `unaccepted dependency: ${[...unmet].sort().join(', ')}`});
    }

    if (params.driftedBatchIds?.has(candidateId) === true) {
        reasons.push({code: 'BASELINE_DRIFT', detail: 'pack baseline drift flagged by the drift inspector'});
    }

    const batch = findBatch(params.batchIndex, candidateId);

    const candidateClaims = registerBatchClaims(candidateId, params.laneId, params.repositoryClaims);
    const pathConflict = evaluateClaimConflict(candidateClaims, params.activeClaims);
    const ownBindings = params.candidateBindings.filter((binding) => binding.batchId === candidateId);
    const worktreeConflict = checkWritableOverlap(ownBindings, params.activeBindings);
    const blockers = [...pathConflict.blockers, ...worktreeConflict.conflicts];
    if (blockers.length > 0) {
        const detail = blockers.map((blocker) => `[${blocker.kind}] ${blocker.detail}`).join('; ');
        reasons.push({code: 'CLAIM_CONFLICT', detail});
    }

    const endpointActive = params.endpointRoutes.some(
        (route) => route.reasoningClass === batch.implementationReasoning && route.active
    );
    if (!endpointActive) {
        reasons.push({code: 'ENDPOINT_UNAVAILABLE', detail: `no active endpoint route for reasoning class ${batch.implementationReasoning}`});
    }

    const capacityAvailable = params.capacityReserved.some(
        (reservation) => reservation.reasoningClass === batch.implementationReasoning && reservation.available
    );
    if (!capacityAvailable) {
        reasons.push({code: 'CAPACITY_EXHAUSTED', detail: `no reserved capacity for reasoning class ${batch.implementationReasoning}`});
    }

    return reasons;
}

/** Computes every applicable blocking reason for one candidate batch (dependency/drift/claim/endpoint/capacity). */
export function computeBlockingReasons(candidateId: string, params: ReadySetParams): readonly BlockingReason[] {
    return blockingReasonsFor(candidateId, params, buildDependencyIndex(params.dependencies));
}

function isCrossRepositoryCandidate(batchId: string, repositoryClaims: readonly BatchRepositoryClaim[]): boolean {
    const repositories = new Set(repositoryClaims.filter((claim) => claim.batchId === batchId).map((claim) => claim.repositoryId));
    return repositories.size > 1;
}

/**
 * Classifies a ready set: `none` for zero candidates, `unique` for exactly
 * one, `priority-resolved` only when a committed total-priority order ranks
 * every candidate exactly once (a duplicate candidate entry, an omitted
 * candidate, or an order with no current candidate all leave the result
 * ambiguous rather than falsely resolving it), `ambiguous-critical` when any
 * candidate itself requires R4/R5 reasoning or itself claims more than one
 * repository (per its own `batch_repository` rows — never by comparing
 * candidates' primary repositories against each other), else `ambiguous`.
 * Never selects a winner itself.
 */
export function classifyReadySet(
    readySet: readonly BatchIndexEntry[], repositoryClaims: readonly BatchRepositoryClaim[], totalPriorityBatchIds?: readonly string[]
): ReadySetClassification {
    if (readySet.length === 0) return 'none';
    if (readySet.length === 1) return 'unique';

    if (totalPriorityBatchIds !== undefined && totalPriorityBatchIds.length > 0) {
        const candidateIds = new Set(readySet.map((batch) => batch.id));
        const rankedCandidateIds = totalPriorityBatchIds.filter((id) => candidateIds.has(id));
        const distinctRanked = new Set(rankedCandidateIds);
        if (distinctRanked.size === rankedCandidateIds.length && distinctRanked.size === candidateIds.size) {
            return 'priority-resolved';
        }
    }

    const anyCritical = readySet.some(
        (batch) => CRITICAL_REASONING_CLASSES.has(batch.implementationReasoning) ||
            CRITICAL_REASONING_CLASSES.has(batch.reviewReasoning) || isCrossRepositoryCandidate(batch.id, repositoryClaims)
    );
    return anyCritical ? 'ambiguous-critical' : 'ambiguous';
}

function populationReasonFor(
    pendingBatchIds: readonly string[], candidates: readonly BatchIndexEntry[], classification: ReadySetClassification
): ReadySetPopulationReason | null {
    if (pendingBatchIds.length === 0) return 'READY_SET_EMPTY';
    if (candidates.length === 0) return 'READY_SET_BLOCKED_UNIVERSAL';
    if (classification === 'ambiguous' || classification === 'ambiguous-critical') return 'READY_SET_AMBIGUOUS';
    return null;
}

/**
 * Computes the ready set: pending batch + every dependency accepted + pack
 * baseline admissible + claims non-conflicting + endpoint route active +
 * capacity reserved = ready candidate. Deterministic — identical inputs
 * always produce an identical `ReadySetResult`.
 */
export function computeReadySet(params: ReadySetParams): ReadySetResult {
    const dependsOnByBatch = buildDependencyIndex(params.dependencies);
    const pending = params.batchIndex.filter((batch) => !params.acceptedBatchIds.has(batch.id));
    const pendingBatchIds = pending.map((batch) => batch.id).sort();

    const blocked: BlockedBatch[] = [];
    const candidates: BatchIndexEntry[] = [];
    for (const batch of pending) {
        const reasons = blockingReasonsFor(batch.id, params, dependsOnByBatch);
        if (reasons.length === 0) candidates.push(batch);
        else blocked.push({batchId: batch.id, reasons});
    }
    candidates.sort((left, right) => left.id.localeCompare(right.id));
    blocked.sort((left, right) => left.batchId.localeCompare(right.batchId));

    const classification = classifyReadySet(candidates, params.repositoryClaims, params.totalPriorityBatchIds);
    const populationReason = populationReasonFor(pendingBatchIds, candidates, classification);

    return {
        pendingBatchIds, candidateBatchIds: candidates.map((batch) => batch.id), classification, populationReason, blocked
    };
}
