import {resolveWatchtowerDataHome} from './dataHomeResolver.js';

export type UserHomeProvider = () => {homedir: string};

/** Compatibility facade; dataHomeResolver owns all data-root policy. */
export function resolveDataRoot(
    environment: NodeJS.ProcessEnv = process.env,
    currentUser?: UserHomeProvider
): string {
    return resolveWatchtowerDataHome(environment, currentUser?.().homedir);
}
