/**
 * Commit-set validation (CA-12; `docs/spec/v1-contracts.md` §5, batch brief
 * "Commit-set validation"). Every check here is read-only and reuses RM-08's
 * accepted pinned `@nirvana/base/git` inspector (`packGitHost.ts`) rather than
 * a second Git-reading implementation — the same conforming Nirvana API RM-08
 * already audited for tree/ancestry inspection.
 */
import gitDriver from '@nirvana/base/git';
import type {RepositoryBinding} from '../../contracts/types.js';
import type {
    CommitSet, CommitSetErrorReason, CommitSetValidationError, CommitSetValidationResult, RepositoryCommitProposal,
    ValidatedCommitSet
} from '../../contracts/gitAcceptance.js';
import {nodePackGitInspector, type PackGitInspector} from '../pack/index.js';

/** RM-08's read-only Git port plus the one additional check commit-set validation needs. */
export interface GitAcceptanceInspector extends PackGitInspector {
    commitExists(repoPath: string, sha: string): Promise<boolean>;
}

/** Verifies `sha` resolves to an existing commit object in `repoPath` — exit 1 is a legitimate "no". */
async function nodeCommitExists(repoPath: string, sha: string): Promise<boolean> {
    try {
        await gitDriver.raw({repoPath, args: ['cat-file', '-e', `${sha}^{commit}`]});
        return true;
    } catch {
        return false;
    }
}

export const nodeGitAcceptanceInspector: GitAcceptanceInspector = Object.freeze({
    ...nodePackGitInspector,
    commitExists: nodeCommitExists
});

const COMMIT_SET_SUBJECT = '(commit-set)';

/**
 * Validate the proposed commit set as a whole — completeness and uniqueness —
 * before any per-repository Git read. A commit set that is empty, carries a
 * duplicate repository, or omits one of the lane's required declared
 * repositories can never be a complete per-repository acceptance commit set
 * (correction CA12-R3; `coordinator-automation.md` §13).
 */
function validateCommitSetShape(proposed: CommitSet, repositories: readonly RepositoryBinding[]): readonly CommitSetValidationError[] {
    if (proposed.commits.length === 0) {
        return [fail(COMMIT_SET_SUBJECT, 'GIT_COMMIT_SET_EMPTY', 'The proposed commit set is empty; every declared repository requires exactly one accepted commit.')];
    }
    const errors: CommitSetValidationError[] = [];
    const seen = new Set<string>();
    for (const commit of proposed.commits) {
        if (seen.has(commit.repositoryId)) {
            errors.push(fail(commit.repositoryId, 'GIT_COMMIT_SET_DUPLICATE',
                `Repository "${commit.repositoryId}" appears more than once in the proposed commit set.`));
        }
        seen.add(commit.repositoryId);
    }
    for (const repository of repositories) {
        if (!seen.has(repository.id)) {
            errors.push(fail(repository.id, 'GIT_COMMIT_SET_INCOMPLETE',
                `The proposed commit set omits repository "${repository.id}", one of the lane's declared bound repositories.`));
        }
    }
    return errors;
}

/**
 * Validate every proposed repository commit: existence, expected committed
 * file set, ancestry to the expected base, and lane-declared binding. Returns
 * every failing repository rather than stopping at the first, so a reviewer
 * sees the complete picture in one pass.
 */
export async function validateCommitSet(
    proposed: CommitSet, repositories: readonly RepositoryBinding[], git: GitAcceptanceInspector = nodeGitAcceptanceInspector
): Promise<CommitSetValidationResult> {
    const shapeErrors = validateCommitSetShape(proposed, repositories);
    if (proposed.commits.length === 0) return {ok: false, errors: shapeErrors};
    const errors: CommitSetValidationError[] = [...shapeErrors];
    for (const commit of proposed.commits) {
        const binding = repositories.find((repository) => repository.id === commit.repositoryId);
        if (binding === undefined) {
            errors.push(fail(commit.repositoryId, 'GIT_REPOSITORY_NOT_BOUND',
                `Repository "${commit.repositoryId}" is not one of the lane's declared bound repositories.`));
            continue;
        }
        errors.push(...await validateOne(commit, binding, git));
    }
    return {ok: errors.length === 0, errors};
}

/** Narrows a validated result to `ValidatedCommitSet` without re-running the checks. */
export function asValidatedCommitSet(commitSet: CommitSet, result: CommitSetValidationResult): ValidatedCommitSet {
    if (!result.ok) throw new Error('A commit set with validation errors cannot be treated as validated.');
    return {...commitSet, validated: true};
}

async function validateOne(
    commit: RepositoryCommitProposal, binding: RepositoryBinding, git: GitAcceptanceInspector
): Promise<readonly CommitSetValidationError[]> {
    if (!await git.commitExists(binding.path, commit.sha)) {
        return [fail(commit.repositoryId, 'GIT_COMMIT_NOT_FOUND', `Commit "${commit.sha}" does not exist in repository "${commit.repositoryId}".`)];
    }
    const errors: CommitSetValidationError[] = [];
    const ancestry = await git.isAncestor(binding.path, commit.expectedBase, commit.sha);
    if (!ancestry.ok || !ancestry.value) {
        errors.push(fail(commit.repositoryId, 'GIT_ANCESTRY_INVALID',
            `Commit "${commit.sha}" in repository "${commit.repositoryId}" does not reach the expected base "${commit.expectedBase}".`));
    }
    const tree = await git.treeFiles(binding.path, commit.sha, '');
    if (tree === null) {
        errors.push(fail(commit.repositoryId, 'GIT_UNEXPECTED_FILES', `The committed tree for "${commit.sha}" could not be read.`));
    } else {
        const actual = new Set(tree.map((entry) => entry.path));
        const expected = new Set(commit.expectedFiles);
        const unexpected = [...actual].filter((path) => !expected.has(path));
        if (unexpected.length > 0) {
            errors.push(fail(commit.repositoryId, 'GIT_UNEXPECTED_FILES',
                `Commit "${commit.sha}" in repository "${commit.repositoryId}" contains unexpected paths: ${unexpected.join(', ')}.`));
        }
        const missing = [...expected].filter((path) => !actual.has(path));
        if (missing.length > 0) {
            errors.push(fail(commit.repositoryId, 'GIT_EXPECTED_FILE_MISSING',
                `Commit "${commit.sha}" in repository "${commit.repositoryId}" is missing expected path(s): ${missing.join(', ')}.`));
        }
    }
    return errors;
}

function fail(repositoryId: string, reason: CommitSetErrorReason, message: string): CommitSetValidationError {
    return {repositoryId, reason, message};
}
