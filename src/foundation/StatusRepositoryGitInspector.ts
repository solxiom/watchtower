import {cmd} from '@nirvana/base/terminal';

export class StatusRepositoryGitInspector {
    async currentRegularFile(repository: string, path: string): Promise<RepositoryFileState> {
        try {
            const tracked = lines(await run(repository, ['ls-files', '--error-unmatch', '--', path]));
            if (tracked.length !== 1 || tracked[0] !== path) return 'changed';
            if ((await run(repository, ['status', '--porcelain=v1', '--', path])).trim() !== '') return 'changed';
            const head = regularTreeEntry(await run(repository, ['ls-tree', 'HEAD', '--', path]), path);
            const stage = regularIndexEntry(await run(repository, ['ls-files', '--stage', '--', path]), path);
            const worktree = (await run(repository, ['hash-object', '--', path])).trim();
            return head !== undefined && stage !== undefined && head === stage && stage === worktree ? 'current' : 'changed';
        } catch { return 'unavailable'; }
    }

    async changedPaths(repository: string, revision: string): Promise<RepositoryChanges> {
        try {
            await run(repository, ['merge-base', '--is-ancestor', revision, 'HEAD']);
            return {state: 'available', paths: lines(await run(repository,
                ['diff', '--name-only', '--no-renames', revision, '--']))};
        } catch { return {state: 'unavailable', paths: []}; }
    }

    async regularFileAtRevision(repository: string, path: string, revision: string): Promise<RepositoryFileState> {
        try {
            return regularTreeEntry(await run(repository, ['ls-tree', revision, '--', path]), path) === undefined ?
                'changed' : 'current';
        } catch { return 'unavailable'; }
    }
}

export type RepositoryFileState = 'current' | 'changed' | 'unavailable';
export type RepositoryChanges = {readonly state: 'available' | 'unavailable'; readonly paths: readonly string[]};

function lines(value: string): string[] { return value.trim().split('\n').filter(Boolean); }

async function run(cwd: string, args: string[]): Promise<string> {
    return String(await cmd.spawn({command: 'git', args, options: {cwd, shell: false}, rejectOnStderr: false}));
}

function regularTreeEntry(output: string, path: string): string | undefined {
    const entries = lines(output); if (entries.length !== 1) return undefined;
    const match = /^(100644|100755) blob ([0-9a-f]+)\t(.+)$/u.exec(entries[0]);
    return match !== null && match[3] === path ? match[2] : undefined;
}

function regularIndexEntry(output: string, path: string): string | undefined {
    const entries = lines(output); if (entries.length !== 1) return undefined;
    const match = /^(100644|100755) ([0-9a-f]+) 0\t(.+)$/u.exec(entries[0]);
    return match !== null && match[3] === path ? match[2] : undefined;
}
