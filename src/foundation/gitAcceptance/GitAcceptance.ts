/**
 * `GitAcceptanceAdapter` — the sole Git publication authority for coordinator
 * effects (CA-12; `docs/spec/v1-contracts.md` §5/§10,
 * `docs/spec/coordinator-automation.md` §13).
 *
 * Front door only. It sequences three independently owned collaborators —
 * reviewer-session ownership (`gitAcceptanceOwnership.ts`), commit-set
 * validation (`gitAcceptanceCommitSet.ts`), and acceptance/publication
 * mechanics reusing CA-10's own prepare/attempt/verify primitives
 * (`gitAcceptancePublication.ts`) — and owns none of their algorithms.
 *
 * Acceptance (`acceptProposal`) and publication (`publishCommits`) are
 * distinct call paths on this class, matching the batch's central invariant:
 * reviewer acceptance is durable and semantic; Git publication is a prepared
 * effect that can fail without invalidating it (§13).
 */
import type {RepositoryBinding} from '../../contracts/types.js';
import type {
    AcceptanceProposal, CommitSet, CommitSetValidationResult, OwnershipResult, PublicationResult, RepositoryPublicationBinding
} from '../../contracts/gitAcceptance.js';
import type {EffectOutcome} from '../../contracts/effects.js';
import {readWorkerEventJournal, validateReviewerOwnership as checkReviewerOwnership} from './gitAcceptanceOwnership.js';
import {asValidatedCommitSet, validateCommitSet as checkCommitSet, type GitAcceptanceInspector} from './gitAcceptanceCommitSet.js';
import {publishCommits as publishCommitsEffect, recordAcceptance as recordAcceptanceEffect,
    type GitAcceptanceCycleContext, type GitAcceptanceDeps} from './gitAcceptancePublication.js';

export class GitAcceptanceAdapter {
    constructor(private readonly deps: GitAcceptanceDeps, private readonly git?: GitAcceptanceInspector) {}

    /**
     * Verify the acceptance proposal's claimed reviewer session matches the
     * durable `accept` worker event for its batch — never Git author strings,
     * never in-process session state.
     */
    validateReviewerOwnership(context: GitAcceptanceCycleContext, proposal: AcceptanceProposal): OwnershipResult {
        const records = readWorkerEventJournal(context.laneDir, this.deps.files);
        return checkReviewerOwnership(proposal, records);
    }

    async validateCommitSet(proposed: CommitSet, repositories: readonly RepositoryBinding[]): Promise<CommitSetValidationResult> {
        return this.git === undefined ? checkCommitSet(proposed, repositories) : checkCommitSet(proposed, repositories, this.git);
    }

    /**
     * Recognition of reviewer authority: proves `proposal.reviewerSessionId`
     * against the durable `accept` worker event before writing anything
     * (correction CA12-R2 — an application path that skipped this check could
     * record acceptance with no reviewer event at all). Never invokes Git and
     * never fails because publication would fail — this call and
     * `publishCommits` are distinct effect plans with distinct idempotency
     * keys.
     */
    async acceptProposal(context: GitAcceptanceCycleContext, proposal: AcceptanceProposal): Promise<EffectOutcome> {
        const ownership = this.validateReviewerOwnership(context, proposal);
        if (!ownership.ok) {
            return {
                status: 'refused', reason: ownership.reason ?? 'GIT_OWNERSHIP_MISMATCH', subject: proposal.batchId,
                message: ownership.message ?? 'Reviewer-session ownership could not be proved from the durable accept event.'
            };
        }
        return recordAcceptanceEffect(context, proposal.batchId, this.deps);
    }

    /**
     * Push every validated commit. Only ever called with a `ValidatedCommitSet`
     * (proved by `validateCommitSet`'s `ok: true` result via
     * {@link asValidatedCommitSet}), so publication never re-derives commit
     * validity from Git state a second time.
     */
    async publishCommits(
        context: GitAcceptanceCycleContext, commitSet: CommitSet, validation: CommitSetValidationResult,
        repositories: readonly RepositoryPublicationBinding[]
    ): Promise<PublicationResult> {
        return publishCommitsEffect(context, asValidatedCommitSet(commitSet, validation), repositories, this.deps);
    }
}

export type {GitAcceptanceCycleContext, GitAcceptanceDeps} from './gitAcceptancePublication.js';
