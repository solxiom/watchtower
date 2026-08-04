import {existsSync, statSync} from 'node:fs';
import {dirname, isAbsolute, join, relative, sep} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import type {WorkspaceContext} from '../../contracts/index.js';
import {createWatchtowerError} from '../../contracts/errors.js';
import {assertLexicallySafePath, canonicalizePath, safePathTarget} from './canonicalPaths.js';

export function resolveWorkspace(explicit?: string, cwd: string = process.cwd()): string {
    return resolveWorkspaceContext(explicit, cwd).workspace;
}

export function resolveWorkspaceContext(explicit?: string, cwd: string = process.cwd()): WorkspaceContext {
    if (explicit !== undefined) {
        const workspace = resolveExplicitWorkspace(explicit);
        return {cwd: canonicalCwdOr(cwd, workspace), workspace, resolution: 'explicit'};
    }
    const canonical = canonicalCwd(cwd);
    const repository = resolveRepositoryRoot(canonical);
    if (repository !== undefined) return {cwd: canonical, workspace: repository, resolution: 'git'};
    const ancestor = findWatchtowerAncestor(canonical);
    if (ancestor !== undefined) return {cwd: canonical, workspace: ancestor, resolution: 'ancestor'};
    return {cwd: canonical, workspace: canonical, resolution: 'current-directory'};
}

function canonicalCwd(cwd: string): string { return canonicalizePath(cwd); }

function canonicalCwdOr(cwd: string, fallback: string): string {
    try { return canonicalCwd(cwd); } catch { return fallback; }
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
