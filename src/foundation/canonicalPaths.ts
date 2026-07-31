import {lstatSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {createWatchtowerError} from '../contracts/errors.js';

const CONTROL_CHARACTER = /[\u0000-\u001f\u007f]/u;
const LANE_SLUG = /^[a-z0-9][a-z0-9-]{0,62}$/u;

export function canonicalizePath(input: string): string {
    assertLexicallySafePath(input);
    try {
        return stripTrailingSeparator(realpathSync(resolve(input)));
    } catch {
        throw createPathEscapeError('canonicalize path', input, 'Use an existing, accessible path without escape segments.');
    }
}

export function isPathSafe(input: string, authorizedRoot: string): boolean {
    try {
        authorizePath(authorizedRoot, input);
        return true;
    } catch {
        return false;
    }
}

export function authorizePath(authorizedRoot: string, input: string): string {
    const root = canonicalizePath(authorizedRoot);
    assertLexicallySafePath(input);
    const candidate = resolve(root, input);
    assertContainedPath(root, candidate, 'authorize path');
    return candidate;
}

export function assertLexicallySafePath(
    input: string,
    operation: string = 'validate path',
    remediation: string = 'Remove control characters and parent-directory segments.'
): void {
    if (!isLexicallySafePath(input)) {
        throw createPathEscapeError(operation, input, remediation);
    }
}

export function buildLanePath(controlHome: string, slug: string): string {
    if (!LANE_SLUG.test(slug)) {
        throw createPathEscapeError('build lane path', slug, 'Use a lowercase lane slug without path separators.');
    }
    const root = canonicalizePath(controlHome);
    const lanePath = resolve(root, '.watchtower', 'lanes', slug);
    assertContainedPath(root, lanePath, 'build lane path');
    return lanePath;
}

export function buildLaneFilePath(laneDir: string, file: string): string {
    if (isAbsolute(file)) {
        throw createPathEscapeError('build lane file path', file, 'Use a lane-relative file path.');
    }
    return authorizePath(laneDir, file);
}

function isLexicallySafePath(input: string): boolean {
    return typeof input === 'string' && input.length > 0 && !CONTROL_CHARACTER.test(input)
        && input.split(/[\\/]/u).every((segment) => segment !== '..');
}

function assertContainedPath(root: string, candidate: string, operation: string): void {
    if (!isContained(root, candidate)) {
        throw createPathEscapeError(operation, candidate, 'Use a path beneath the authorized directory.');
    }
    const existingParent = findExistingParent(candidate);
    if (!isContained(root, canonicalizePath(existingParent))) {
        throw createPathEscapeError(operation, candidate, 'Remove symlinks that resolve outside the authorized directory.');
    }
}

function findExistingParent(path: string): string {
    let current = path;
    while (true) {
        try {
            lstatSync(current);
            return current;
        } catch (error) {
            if (!isMissingPath(error)) {
                throw createPathEscapeError('inspect path parent', path, 'Use an accessible path without unresolved links.');
            }
        }
        const parent = dirname(current);
        if (parent === current) {
            throw createPathEscapeError('inspect path parent', path, 'Use a path beneath an accessible filesystem root.');
        }
        current = parent;
    }
}

function isMissingPath(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function isContained(root: string, candidate: string): boolean {
    const difference = relative(root, candidate);
    return difference === '' || (!difference.startsWith(`..${sep}`) && difference !== '..' && !isAbsolute(difference));
}

function stripTrailingSeparator(path: string): string {
    return path.length > 1 && path.endsWith(sep) ? path.slice(0, -1) : path;
}

export function createPathEscapeError(operation: string, target: string, remediation: string) {
    const safeTarget = safePathTarget(target);
    return createWatchtowerError('ERR_PATH_ESCAPE', {operation, target: safeTarget, remediation});
}

export function safePathTarget(input: string): string {
    return CONTROL_CHARACTER.test(input) ? '<unsafe-path>' : input.slice(0, 200) || '<empty-path>';
}
