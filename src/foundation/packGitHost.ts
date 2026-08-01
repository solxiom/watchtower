import gitDriver from '@nirvana/base/git';
import {gitUnavailable, gitValue, type GitOutcome, type PackGitInspector, type PackTreeEntry} from './packConsumerPorts.js';

/**
 * Git adapter over the pinned `@nirvana/base/git` `BasicGitDriver`. Every method
 * is read-only and asynchronous, matching real Git subprocess work. Boolean
 * predicates distinguish a legitimate negative (`git` exit 1) from an unavailable
 * command/repository (any other failure), so an infrastructure or repository
 * failure never masquerades as a negative predicate result.
 */
export const nodePackGitInspector: PackGitInspector = Object.freeze({
    async isTracked(repositoryRoot: string, relativePath: string): Promise<GitOutcome<boolean>> {
        return gitPredicate(repositoryRoot, ['ls-files', '--error-unmatch', '--', relativePath]);
    },
    async isIgnored(repositoryRoot: string, relativePath: string): Promise<GitOutcome<boolean>> {
        return gitPredicate(repositoryRoot, ['check-ignore', '-q', '--', relativePath]);
    },
    async committedMatches(repositoryRoot: string, relativePath: string): Promise<GitOutcome<boolean>> {
        return gitPredicate(repositoryRoot, ['diff', '--quiet', 'HEAD', '--', relativePath]);
    },
    async isAncestor(repositoryRoot: string, ancestor: string, descendant: string): Promise<GitOutcome<boolean>> {
        if (ancestor === '' || descendant === '') return gitValue(false);
        return gitPredicate(repositoryRoot, ['merge-base', '--is-ancestor', ancestor, descendant]);
    },
    async changedPathsSince(repositoryRoot: string, revision: string): Promise<readonly string[] | null> {
        const output = await gitOutput(repositoryRoot, ['diff', '--name-only', revision, '--']);
        return output === null ? null : nonEmptyLines(output);
    },
    async treeFiles(repositoryRoot: string, commit: string, pathPrefix: string): Promise<readonly PackTreeEntry[] | null> {
        const args = ['ls-tree', '-r', commit, '--', ...(pathPrefix === '' ? [] : [pathPrefix])];
        const output = await gitOutput(repositoryRoot, args);
        return output === null ? null : nonEmptyLines(output).flatMap(parseTreeLine);
    },
    async blobId(repositoryRoot: string, ref: string, relativePath: string): Promise<string | null> {
        const output = await gitOutput(repositoryRoot, ['rev-parse', '--verify', '--quiet', `${ref}:${relativePath}`]);
        return output === null ? null : output.trim() || null;
    }
});

/**
 * Runs a Git predicate command: exit 0 is `true`, the ordinary `git` exit code 1
 * (not tracked/ignored/committed/ancestor) is `false`, and every other failure —
 * including an unreadable/invalid repository — is an unavailable outcome.
 */
async function gitPredicate(repoPath: string, args: readonly string[]): Promise<GitOutcome<boolean>> {
    try {
        await gitDriver.raw({repoPath, args: [...args]});
        return gitValue(true);
    } catch (error: unknown) {
        return errorExitCode(error) === 1 ? gitValue(false) : gitUnavailable();
    }
}

/** Reads a spawn rejection's exit `code` without an assertion cast; non-numeric ⇒ undefined. */
function errorExitCode(error: unknown): number | undefined {
    if (typeof error !== 'object' || error === null) return undefined;
    const code: unknown = Reflect.get(error, 'code');
    return typeof code === 'number' ? code : undefined;
}

function parseTreeLine(line: string): PackTreeEntry[] {
    const match = /^(\d{6}) (blob|tree|commit) [0-9a-f]+\t(.+)$/u.exec(line);
    return match === null || match[2] !== 'blob' ? [] : [{path: match[3], symlink: match[1] === '120000'}];
}

async function gitOutput(repoPath: string, args: readonly string[]): Promise<string | null> {
    try {
        return String(await gitDriver.raw({repoPath, args: [...args]}));
    } catch {
        return null;
    }
}

function nonEmptyLines(output: string): string[] {
    return output.split('\n').map((line) => line.replace(/\r$/u, '')).filter((line) => line.length > 0);
}
