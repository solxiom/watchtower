/**
 * CA-04 resource-claim evaluation: derives a batch's active claims from its
 * declared pack-index repository/path entries and detects overlap against
 * other batches' active claims and writable worktree bindings. Synchronous
 * and model-free; owns no scheduling or dependency-graph logic (`ReadySet.ts`
 * owns that and delegates claim checking here).
 */
import type {BatchRepositoryClaim} from '../../contracts/indexQuery.js';
import type {
    ClaimBlocker, ClaimConflictReport, OwnedRepositoryBinding, ActiveResourceClaim, WritableConflictReport
} from '../../contracts/scheduling.js';
import type {ClaimMode, RepositoryBinding} from '../../contracts/types.js';
import {resourcePathsOverlap} from '../bindings/index.js';

const CLAIM_MODES: ReadonlySet<string> = new Set(['read', 'shared-write', 'exclusive-write']);

function asClaimMode(value: string): ClaimMode {
    if (!CLAIM_MODES.has(value)) throw new TypeError(`unsupported resource-claim mode "${value}"`);
    return value as ClaimMode;
}

/** Derives the resource claims one batch makes from its compiled `batch_repository` rows. */
export function registerBatchClaims(
    batchId: string, laneId: string, repositoryClaims: readonly BatchRepositoryClaim[]
): readonly ActiveResourceClaim[] {
    return repositoryClaims
        .filter((entry) => entry.batchId === batchId)
        .map((entry) => Object.freeze({
            repositoryId: entry.repositoryId, paths: entry.paths, mode: asClaimMode(entry.claimMode),
            ownerBatchId: batchId, ownerLaneId: laneId
        }));
}

function pathBlocker(candidate: ActiveResourceClaim, active: ActiveResourceClaim): ClaimBlocker | null {
    if (candidate.repositoryId !== active.repositoryId) return null;
    if (candidate.mode === 'read' || active.mode === 'read') return null;
    if (candidate.mode === 'shared-write' && active.mode === 'shared-write') return null;
    const overlap = candidate.paths.find((left) => active.paths.some((right) => resourcePathsOverlap(left, right)));
    if (overlap === undefined) return null;
    const bothExclusive = candidate.mode === 'exclusive-write' && active.mode === 'exclusive-write';
    const reason = bothExclusive ? 'CLAIM_CONFLICT_EXCLUSIVE' : 'CLAIM_CONFLICT_SHARED_WRITE';
    return {
        kind: 'path', sourceBatch: active.ownerBatchId, sourceLane: active.ownerLaneId, reason,
        detail: `${reason}: path "${overlap}" overlaps an active ${active.mode} claim from batch ${active.ownerBatchId} on ${candidate.repositoryId}`
    };
}

/** For one candidate batch's claims against the currently active claim set, determines proceed/blockers. */
export function evaluateClaimConflict(
    candidateClaims: readonly ActiveResourceClaim[], activeClaims: readonly ActiveResourceClaim[]
): ClaimConflictReport {
    const blockers: ClaimBlocker[] = [];
    for (const candidate of candidateClaims) {
        for (const active of activeClaims) {
            if (active.ownerBatchId === candidate.ownerBatchId) continue;
            const blocker = pathBlocker(candidate, active);
            if (blocker !== null) blockers.push(blocker);
        }
    }
    return {proceed: blockers.length === 0, blockers};
}

/** Detects a writable worktree/branch overlap between one candidate binding and active bindings. */
export function checkWorktreeConflict(
    candidateRepo: RepositoryBinding, activeBindings: readonly OwnedRepositoryBinding[]
): ClaimBlocker | null {
    if (candidateRepo.access !== 'write') return null;
    for (const active of activeBindings) {
        if (active.id !== candidateRepo.id || active.access !== 'write' || active.path !== candidateRepo.path) continue;
        if (active.branch !== candidateRepo.branch) {
            return {
                kind: 'branch', sourceBatch: active.ownerBatchId, sourceLane: active.ownerLaneId,
                detail: `declared branch "${active.branch}" differs from "${candidateRepo.branch}" on the same writable worktree ${candidateRepo.path}`
            };
        }
        if (candidateRepo.worktreeMode === 'dedicated' || active.worktreeMode === 'dedicated') {
            return {
                kind: 'worktree', sourceBatch: active.ownerBatchId, sourceLane: active.ownerLaneId,
                detail: `dedicated writable worktree ${candidateRepo.path} is already claimed by an active batch`
            };
        }
    }
    return null;
}

/** Comprehensive writable-worktree overlap detection across every candidate binding. */
export function checkWritableOverlap(
    candidateBindings: readonly RepositoryBinding[], activeBindings: readonly OwnedRepositoryBinding[]
): WritableConflictReport {
    const conflicts = candidateBindings
        .map((candidate) => checkWorktreeConflict(candidate, activeBindings))
        .filter((conflict): conflict is ClaimBlocker => conflict !== null);
    return {proceed: conflicts.length === 0, conflicts};
}

/** Evaluates claim/worktree conflicts for candidate batches against one immutable active-claim snapshot. */
export class ResourceClaimStore {
    constructor(
        private readonly activeClaims: readonly ActiveResourceClaim[],
        private readonly activeBindings: readonly OwnedRepositoryBinding[] = []
    ) {}

    evaluateClaims(candidateClaims: readonly ActiveResourceClaim[]): ClaimConflictReport {
        return evaluateClaimConflict(candidateClaims, this.activeClaims);
    }

    evaluateWorktrees(candidateBindings: readonly RepositoryBinding[]): WritableConflictReport {
        return checkWritableOverlap(candidateBindings, this.activeBindings);
    }
}
