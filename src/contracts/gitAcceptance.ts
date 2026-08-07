/**
 * Closed public contracts for the Git acceptance/publication boundary (CA-12;
 * `docs/spec/v1-contracts.md` §4/§5/§10, `docs/spec/coordinator-automation.md`
 * §13). `GitAcceptanceAdapter` (`src/foundation/GitAcceptance.ts`) is the sole
 * owner of every value here; nothing else validates reviewer ownership or a
 * commit set, or executes `git push`, for a coordinator acceptance effect.
 *
 * Reviewer acceptance is a durable-event fact, never a `DecisionProposal`
 * (`docs/spec/v1-contracts.md` §5's proposal table has no acceptance row, and
 * `RoutingRule.permittedProposalTypes` is a loose `readonly string[]` for
 * exactly this reason). These types are therefore independent of
 * `contracts/proposals.ts`'s closed proposal vocabulary; only the two
 * `EffectType` members `record-acceptance`/`publish-commits` are shared.
 */
import type {RepositoryBinding} from './types.js';

export const GIT_ACCEPTANCE_REASONS = [
    'GIT_OWNERSHIP_MISMATCH',
    'GIT_COMMIT_NOT_FOUND',
    'GIT_UNEXPECTED_FILES',
    'GIT_ANCESTRY_INVALID',
    'GIT_REPOSITORY_NOT_BOUND',
    'GIT_PUSH_FAILED',
    'GIT_PUSH_PARTIAL',
    'GIT_REMOTE_UNKNOWN',
    'GIT_MERGE_CONFLICT',
    /** Correction CA12-R3: completeness/uniqueness of the proposed commit set. */
    'GIT_COMMIT_SET_EMPTY',
    'GIT_COMMIT_SET_DUPLICATE',
    'GIT_COMMIT_SET_INCOMPLETE',
    'GIT_EXPECTED_FILE_MISSING'
] as const;
export type GitAcceptanceReason = typeof GIT_ACCEPTANCE_REASONS[number];

/** The durable `reviewer-accept` worker event this proposal claims authority from. */
export interface AcceptanceProposal {
    readonly laneId: string;
    readonly batchId: string;
    readonly cycleId: string;
    /** The session the acceptance proposal claims authored the accept — never Git author text. */
    readonly reviewerSessionId: string;
}

/** One repository's proposed accepted commit. */
export interface RepositoryCommitProposal {
    readonly repositoryId: string;
    readonly sha: string;
    /** The commit ancestry must reach exactly this base (the batch's recorded review baseline). */
    readonly expectedBase: string;
    /** The accepted pack's expected committed file set for this repository (relative paths). */
    readonly expectedFiles: readonly string[];
}

export interface CommitSet {
    readonly commits: readonly RepositoryCommitProposal[];
}

/** A `CommitSet` every rule of `validateCommitSet` has already passed for. */
export interface ValidatedCommitSet extends CommitSet {
    readonly validated: true;
}

export interface OwnershipResult {
    readonly ok: boolean;
    readonly reason?: Extract<GitAcceptanceReason, 'GIT_OWNERSHIP_MISMATCH'>;
    readonly message?: string;
}

export type CommitSetErrorReason = Extract<GitAcceptanceReason,
    | 'GIT_COMMIT_NOT_FOUND' | 'GIT_UNEXPECTED_FILES' | 'GIT_ANCESTRY_INVALID' | 'GIT_REPOSITORY_NOT_BOUND'
    | 'GIT_COMMIT_SET_EMPTY' | 'GIT_COMMIT_SET_DUPLICATE' | 'GIT_COMMIT_SET_INCOMPLETE' | 'GIT_EXPECTED_FILE_MISSING'>;

export interface CommitSetValidationError {
    readonly repositoryId: string;
    readonly reason: CommitSetErrorReason;
    readonly message: string;
}

export interface CommitSetValidationResult {
    readonly ok: boolean;
    readonly errors: readonly CommitSetValidationError[];
}

/** A `RepositoryBinding` plus the remote every publication target needs; RM-08 declares no remote. */
export interface RepositoryPublicationBinding extends RepositoryBinding {
    readonly remote: string;
}

export interface RepositoryPublicationResult {
    readonly repositoryId: string;
    readonly ref: string;
    readonly remote: string;
    readonly success: boolean;
    readonly pushedSha?: string;
    readonly error?: GitAcceptanceReason;
    /** The push started but its postcondition could not be verified (`COORDINATOR_EFFECT_UNCERTAIN`); never re-pushed automatically. */
    readonly uncertain?: boolean;
    readonly retryCount?: number;
}

export interface PublicationResult {
    readonly ok: boolean;
    readonly repositoryResults: readonly RepositoryPublicationResult[];
    readonly partialRecovery: boolean;
    readonly escalated?: boolean;
}

/** Raised only for a refusal that leaves every authoritative byte unchanged. */
export class GitAcceptanceError extends Error {
    constructor(readonly reason: GitAcceptanceReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'GitAcceptanceError';
    }
}
