import {existsSync, statSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, sep} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import {createWatchtowerError} from '../contracts/errors.js';
import {assertLexicallySafePath, canonicalizePath, safePathTarget} from './canonicalPaths.js';

export function resolveWorkspace(explicit?: string, cwd: string = process.cwd()): string {
    if (explicit !== undefined) {
        return resolveExplicitWorkspace(explicit);
    }
    const canonicalCwd = canonicalizePath(cwd);
    return resolveRepositoryRoot(canonicalCwd) ?? findWatchtowerAncestor(canonicalCwd) ?? canonicalCwd;
}

export function resolveRepositoryRoot(cwd: string = process.cwd()): string | undefined {
    const canonicalCwd = canonicalizePath(cwd);
    try {
        const output = cmd.execSync({
            command: 'git',
            args: ['rev-parse', '--show-toplevel'],
            options: {cwd: canonicalCwd, stdio: ['ignore', 'pipe', 'ignore']}
        });
        return canonicalizePath(String(output).trim());
    } catch {
        return undefined;
    }
}

function resolveExplicitWorkspace(explicit: string): string {
    if (!existsSync(explicit)) {
        throw workspaceNotFound(explicit);
    }
    try {
        assertLexicallySafePath(explicit);
        const workspace = canonicalizePath(explicit);
        if (!statSync(workspace).isDirectory()) {
            throw workspaceNotFound(explicit);
        }
        return workspace;
    } catch (error) {
        if (isWorkspaceNotFound(error)) {
            throw error;
        }
        throw workspaceNotFound(explicit);
    }
}

function findWatchtowerAncestor(cwd: string): string | undefined {
    let current = cwd;
    while (true) {
        if (hasWatchtowerLaneDirectory(current)) {
            return current;
        }
        const parent = dirname(current);
        if (parent === current) {
            return undefined;
        }
        current = parent;
    }
}

function hasWatchtowerLaneDirectory(workspace: string): boolean {
    const laneDirectory = join(workspace, '.watchtower', 'lanes');
    if (!existsSync(laneDirectory)) {
        return false;
    }
    try {
        const canonical = canonicalizePath(laneDirectory);
        const difference = relative(workspace, canonical);
        return statSync(canonical).isDirectory()
            && difference !== '..' && !difference.startsWith(`..${sep}`) && !isAbsolute(difference);
    } catch {
        return false;
    }
}

function workspaceNotFound(target: string) {
    return createWatchtowerError('ERR_WORKSPACE_NOT_FOUND', {
        operation: 'resolve explicit workspace',
        target: safePathTarget(target),
        remediation: 'Pass an existing workspace path.'
    });
}

function isWorkspaceNotFound(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ERR_WORKSPACE_NOT_FOUND';
}
