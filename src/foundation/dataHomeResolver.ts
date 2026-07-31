import {accessSync, constants, existsSync} from 'node:fs';
import {homedir} from 'node:os';
import {join, resolve} from 'node:path';
import {assertLexicallySafePath, canonicalizePath, safePathTarget} from './canonicalPaths.js';
import {createWatchtowerError} from '../contracts/errors.js';

export function resolveWatchtowerDataHome(environment: NodeJS.ProcessEnv = process.env, home: string = homedir()): string {
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

function resolveDataHome(input: string, source: string): string {
    assertLexicallySafePath(input, `resolve ${source}`, 'Use a path without control characters or parent-directory segments.');
    const resolved = resolve(input);
    return existsSync(resolved) ? canonicalizePath(resolved) : resolved;
}
