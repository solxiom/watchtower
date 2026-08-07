/**
 * CA-12 proof — commit-set validation: existence, expected file set, ancestry,
 * and lane-declared repository binding.
 */
import {gitValue, gitUnavailable} from '../../../src/foundation/pack/index.js';
import {asValidatedCommitSet, validateCommitSet, type GitAcceptanceInspector} from '../../../src/foundation/gitAcceptance/gitAcceptanceCommitSet.js';
import type {CommitSet, RepositoryCommitProposal} from '../../../src/contracts/gitAcceptance.js';
import {repositoryBinding} from './support/gitAcceptanceFixtures.js';

const BASE = 'base-sha';
const SHA = 'good-sha';

function commit(overrides: Partial<RepositoryCommitProposal> = {}): RepositoryCommitProposal {
    return {repositoryId: 'repo-a', sha: SHA, expectedBase: BASE, expectedFiles: ['a.ts', 'b.ts'], ...overrides};
}

function set(...commits: readonly RepositoryCommitProposal[]): CommitSet {
    return {commits};
}

function fakeGit(overrides: Partial<GitAcceptanceInspector> = {}): GitAcceptanceInspector {
    return {
        commitExists: async () => true,
        isTracked: async () => gitValue(true),
        isIgnored: async () => gitValue(false),
        committedMatches: async () => gitValue(true),
        isAncestor: async () => gitValue(true),
        changedPathsSince: async () => [],
        treeFiles: async () => [{path: 'a.ts', symlink: false}, {path: 'b.ts', symlink: false}],
        blobId: async () => 'blob-1',
        ...overrides
    };
}

describe('CA-12 — commit-set validation', function () {
    const repositories = [repositoryBinding('repo-a')];

    it('passes for commits that exist locally with correct ancestry and expected files', async function () {
        const result = await validateCommitSet(set(commit()), repositories, fakeGit());
        expect(result).toEqual({ok: true, errors: []});
        expect(() => asValidatedCommitSet(set(commit()), result)).not.toThrow();
    });

    it('fails with GIT_COMMIT_NOT_FOUND for a SHA that does not exist', async function () {
        const result = await validateCommitSet(set(commit()), repositories, fakeGit({commitExists: async () => false}));
        expect(result.ok).toBeFalse();
        expect(result.errors).toEqual([jasmine.objectContaining({repositoryId: 'repo-a', reason: 'GIT_COMMIT_NOT_FOUND'})]);
    });

    it('fails with GIT_UNEXPECTED_FILES for a commit whose tree includes paths outside the accepted set', async function () {
        const git = fakeGit({treeFiles: async () => [{path: 'a.ts', symlink: false}, {path: 'b.ts', symlink: false}, {path: 'secrets.env', symlink: false}]});
        const result = await validateCommitSet(set(commit()), repositories, git);
        expect(result.errors).toEqual([jasmine.objectContaining({repositoryId: 'repo-a', reason: 'GIT_UNEXPECTED_FILES'})]);
        expect(result.errors[0].message).toContain('secrets.env');
    });

    it('fails with GIT_ANCESTRY_INVALID for a commit whose parent chain does not reach the expected base', async function () {
        const git = fakeGit({isAncestor: async () => gitValue(false)});
        const result = await validateCommitSet(set(commit()), repositories, git);
        expect(result.errors).toEqual([jasmine.objectContaining({repositoryId: 'repo-a', reason: 'GIT_ANCESTRY_INVALID'})]);
    });

    it('fails with GIT_ANCESTRY_INVALID when ancestry is unavailable rather than treating it as a pass', async function () {
        const git = fakeGit({isAncestor: async () => gitUnavailable()});
        const result = await validateCommitSet(set(commit()), repositories, git);
        expect(result.errors).toEqual([jasmine.objectContaining({reason: 'GIT_ANCESTRY_INVALID'})]);
    });

    it('fails with GIT_REPOSITORY_NOT_BOUND for a repository not declared in lane bindings', async function () {
        // Also proposes the required repo-a commit, isolating the not-bound failure from CA12-R3's completeness check.
        const result = await validateCommitSet(set(commit(), commit({repositoryId: 'repo-unbound'})), repositories, fakeGit());
        expect(result.errors).toEqual([jasmine.objectContaining({repositoryId: 'repo-unbound', reason: 'GIT_REPOSITORY_NOT_BOUND'})]);
    });

    it('reports every failing repository in one pass rather than stopping at the first', async function () {
        const result = await validateCommitSet(
            set(commit({repositoryId: 'repo-unbound'}), commit({repositoryId: 'repo-a', sha: 'missing'})),
            repositories, fakeGit({commitExists: async (_repo, sha) => sha !== 'missing'})
        );
        expect(result.errors.map((error) => error.reason).sort())
            .toEqual(['GIT_COMMIT_NOT_FOUND', 'GIT_REPOSITORY_NOT_BOUND']);
    });

    it('refuses to treat a result carrying errors as a validated commit set', function () {
        expect(() => asValidatedCommitSet(set(commit()), {ok: false, errors: [{repositoryId: 'repo-a', reason: 'GIT_COMMIT_NOT_FOUND', message: 'x'}]}))
            .toThrowError();
    });
});

describe('CA-12 — commit-set completeness and uniqueness (correction CA12-R3)', function () {
    const repositories = [repositoryBinding('repo-a'), repositoryBinding('repo-b')];

    it('fails with GIT_COMMIT_SET_EMPTY for an empty proposed commit set', async function () {
        const result = await validateCommitSet(set(), repositories, fakeGit());
        expect(result.ok).toBeFalse();
        expect(result.errors).toEqual([jasmine.objectContaining({reason: 'GIT_COMMIT_SET_EMPTY'})]);
    });

    it('fails with GIT_COMMIT_SET_DUPLICATE when one repository is proposed more than once', async function () {
        const result = await validateCommitSet(
            set(commit({repositoryId: 'repo-a'}), commit({repositoryId: 'repo-a', sha: 'other-sha'}), commit({repositoryId: 'repo-b'})),
            repositories, fakeGit()
        );
        expect(result.ok).toBeFalse();
        expect(result.errors).toEqual(jasmine.arrayContaining([jasmine.objectContaining({repositoryId: 'repo-a', reason: 'GIT_COMMIT_SET_DUPLICATE'})]));
    });

    it('fails with GIT_COMMIT_SET_INCOMPLETE when a required declared repository is omitted', async function () {
        const result = await validateCommitSet(set(commit({repositoryId: 'repo-a'})), repositories, fakeGit());
        expect(result.ok).toBeFalse();
        expect(result.errors).toEqual(jasmine.arrayContaining([jasmine.objectContaining({repositoryId: 'repo-b', reason: 'GIT_COMMIT_SET_INCOMPLETE'})]));
    });

    it('fails with GIT_EXPECTED_FILE_MISSING when the committed tree omits an expected path', async function () {
        const git = fakeGit({treeFiles: async () => [{path: 'a.ts', symlink: false}]});
        const result = await validateCommitSet(set(commit({repositoryId: 'repo-a', expectedFiles: ['a.ts', 'b.ts']}), commit({repositoryId: 'repo-b'})), repositories, git);
        expect(result.errors).toEqual(jasmine.arrayContaining([
            jasmine.objectContaining({repositoryId: 'repo-a', reason: 'GIT_EXPECTED_FILE_MISSING'})
        ]));
        expect(result.errors.find((error) => error.reason === 'GIT_EXPECTED_FILE_MISSING')?.message).toContain('b.ts');
    });

    it('passes a complete, duplicate-free, exactly-covering commit set with every expected file present', async function () {
        const result = await validateCommitSet(set(commit({repositoryId: 'repo-a'}), commit({repositoryId: 'repo-b'})), repositories, fakeGit());
        expect(result).toEqual({ok: true, errors: []});
    });
});
