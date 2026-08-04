import {cmd} from '@nirvana/base/terminal';
import {relative, sep} from 'node:path';
import type {PackFileDigest} from './statusPackTypes.js';

export class StatusPackGitInspector {
    async current(repository: string, packRoot: string, files: readonly PackFileDigest[]): Promise<GitPackState> {
        const packPath = relative(repository, packRoot).split(sep).join('/');
        try {
            if ((await run(repository, ['status', '--porcelain=v1', '--ignored', '--', packPath])).trim() !== '') return 'drift';
            const expected = [...files.map(file => `${packPath}/${file.path}`),
                `${packPath}/implementation-pack.lock.json`].sort();
            const index = indexEntries(await run(repository, ['ls-files', '--stage', '--', packPath]));
            const head = treeEntries(await run(repository, ['ls-tree', '-r', 'HEAD', '--', packPath]));
            return index !== undefined && head !== undefined && exactPaths(index, expected) && exactPaths(head, expected) &&
                expected.every(path => regular(index.get(path)) && regular(head.get(path)) &&
                    index.get(path)?.object === head.get(path)?.object) ? 'valid' : 'drift';
        } catch { return 'unavailable'; }
    }

    async reviewed(repository: string, packRoot: string, reviewedCommit: string,
        files: readonly PackFileDigest[]): Promise<GitPackState> {
        const packPath = relative(repository, packRoot).split(sep).join('/');
        try {
            await run(repository, ['merge-base', '--is-ancestor', reviewedCommit, 'HEAD']);
            const expected = files.filter(file => file.path !== 'pack-acceptance.json')
                .map(file => `${packPath}/${file.path}`).sort();
            const reviewed = treeEntries(await run(repository, ['ls-tree', '-r', reviewedCommit, '--', packPath]));
            const head = treeEntries(await run(repository, ['ls-tree', '-r', 'HEAD', '--', packPath]));
            if (reviewed === undefined || head === undefined || !exactPaths(reviewed, expected)) return 'drift';
            for (const path of expected) {
                const candidate = reviewed.get(path); const current = head.get(path);
                if (!regular(candidate) || !regular(current) || candidate.object !== current.object) return 'drift';
            }
            return 'valid';
        } catch { return 'unavailable'; }
    }
}

export type GitPackState = 'valid' | 'drift' | 'unavailable';

async function run(cwd: string, args: string[]): Promise<string> {
    return String(await cmd.spawn({command: 'git', args, options: {cwd, shell: false}, rejectOnStderr: false}));
}

interface GitEntry {readonly mode: string; readonly kind: string; readonly object: string;}

function treeEntries(output: string): Map<string, GitEntry> | undefined {
    return parseEntries(output, /^(\d{6}) ([a-z]+) ([0-9a-f]+)\t(.+)$/u);
}

function indexEntries(output: string): Map<string, GitEntry> | undefined {
    return parseEntries(output, /^(\d{6}) ([0-9a-f]+) 0\t(.+)$/u, true);
}

function parseEntries(output: string, pattern: RegExp, index = false): Map<string, GitEntry> | undefined {
    const result = new Map<string, GitEntry>();
    for (const line of output.trim().split('\n').filter(Boolean)) {
        const match = pattern.exec(line);
        if (match === null) return undefined;
        const path = index ? match[3] : match[4];
        const entry = index ? {mode: match[1], kind: 'blob', object: match[2]} :
            {mode: match[1], kind: match[2], object: match[3]};
        if (result.has(path)) return undefined;
        result.set(path, entry);
    }
    return result;
}

function exactPaths(entries: ReadonlyMap<string, GitEntry>, expected: readonly string[]): boolean {
    return JSON.stringify([...entries.keys()].sort()) === JSON.stringify([...expected].sort());
}

function regular(entry: GitEntry | undefined): entry is GitEntry {
    return entry !== undefined && entry.kind === 'blob' && (entry.mode === '100644' || entry.mode === '100755');
}
