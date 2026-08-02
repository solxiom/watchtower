import {basename} from 'node:path';
import {createWatchtowerError} from '../../contracts/errors.js';
import {createPathEscapeError} from '../canonicalPaths.js';
import {classifyEntry} from './directoryInstallRecovery.js';

/** Classifies `.cursorrules` destination identity without following symlinks. */
export function classifyCursorRuleDestination(destination: string): boolean {
    const kind = classifyEntry(destination);
    if (kind === 'absent') return false;
    if (kind === 'file') return true;
    if (kind === 'symlink') {
        throw createPathEscapeError(
            'install knowledge pack', basename(destination),
            'Remove the symlink before installing, or point --replace at a plain file.'
        );
    }
    throw createWatchtowerError('ERR_MANAGED_CONFLICT', {
        operation: 'install knowledge pack', target: basename(destination),
        remediation: 'Remove or rename the conflicting existing entry, then retry.'
    });
}
