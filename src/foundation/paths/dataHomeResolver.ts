import {accessSync, constants, existsSync, lstatSync} from 'node:fs';
import {userInfo} from 'node:os';
import {dirname, parse, join, resolve} from 'node:path';
import {assertLexicallySafePath, canonicalizePath, safePathTarget} from './canonicalPaths.js';
import {createWatchtowerError} from '../../contracts/errors.js';

export function resolveWatchtowerDataHome(environment: NodeJS.ProcessEnv = process.env, home: string = userInfo().homedir): string {
    const configured = environment.WATCHTOWER_DATA_HOME;
    if (configured) {
        return resolveDataHome(configured, 'WATCHTOWER_DATA_HOME');
    }
    const xdgDataHome = environment.XDG_DATA_HOME;
    return resolveDataHome(xdgDataHome ? join(xdgDataHome, 'watchtower') : join(home, '.local', 'share', 'watchtower'), 'data home');
}

export function validateWatchtowerDataHome(dataHome: string = resolveWatchtowerDataHome()): string {
    assertLexicallySafePath(dataHome, 'validate Watchtower data home', 'Use a path without control characters or parent-directory segments.');
    try {
        accessSync(dataHome, constants.R_OK | constants.W_OK | constants.X_OK);
    } catch (error) {
        throw createWatchtowerError('ERR_WORKSPACE_NOT_FOUND', {
            operation: 'validate Watchtower data home',
            target: safePathTarget(dataHome),
            remediation: 'Create an accessible Watchtower data home before running this operation.'
        });
    }
    return canonicalizePath(dataHome);
}

export function authorizeWatchtowerDataHomeForCreation(dataHome: string): string {
    assertLexicallySafePath(dataHome, 'authorize Watchtower data home', 'Use a path without control characters or parent-directory segments.');
    const resolved = resolve(dataHome);
    authorizeExistingAncestorChain(resolved);
    return existsSync(resolved) ? canonicalizePath(resolved) : resolved;
}

function resolveDataHome(input: string, source: string): string {
    assertLexicallySafePath(input, `resolve ${source}`, 'Use a path without control characters or parent-directory segments.');
    return authorizeWatchtowerDataHomeForCreation(input);
}

function authorizeExistingAncestorChain(path: string): void {
    const root = parse(path).root;
    let current = path;
    while (current !== root) {
        try {
            if (lstatSync(current).isSymbolicLink()) {
                throw createSymlinkDataHomeError(path);
            }
        } catch (error) {
            if (isSymlinkLoop(error)) throw createSymlinkDataHomeError(path);
            if (!isMissingPath(error)) throw error;
        }
        current = dirname(current);
    }
}

function isMissingPath(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}

function isSymlinkLoop(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ELOOP';
}

function createSymlinkDataHomeError(path: string): Error {
    return createWatchtowerError('ERR_PATH_ESCAPE', {
        operation: 'authorize Watchtower data home',
        target: safePathTarget(path),
        remediation: 'Remove symbolic links from the existing Watchtower data-home ancestor chain before creating catalog state.'
    });
}
