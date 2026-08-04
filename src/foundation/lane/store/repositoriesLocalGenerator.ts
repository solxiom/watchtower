/**
 * Builds the closed `repositories.local.json` document (`docs/spec/v1.md`
 * §7.4) from an accepted `InitPlan` (LC-01). Bindings are already canonical,
 * absolute, and local-only by the time they reach `InitPlan.repositories`;
 * this module only re-asserts that invariant before freezing the document.
 */
import {isAbsolute} from 'node:path';
import type {RepositoriesLocalV1} from '../../../contracts/types.js';
import {createWatchtowerError} from '../../../contracts/errors.js';
import {safePathTarget} from '../../paths/index.js';
import type {InitPlan} from '../../init/index.js';

export function generateRepositoriesLocal(plan: InitPlan): RepositoriesLocalV1 {
    if (plan.repositories.length === 0) throw integrityFailure('repositories', 'Declare at least one repository binding.');
    const ids = new Set<string>();
    const repositories = plan.repositories.map(binding => {
        if (ids.has(binding.id)) throw integrityFailure(binding.id, 'Remove the duplicate repository id.');
        ids.add(binding.id);
        if (!isAbsolute(binding.path)) throw integrityFailure(binding.path, 'Use an absolute, canonicalized repository path.');
        return Object.freeze({...binding});
    });
    return Object.freeze({schemaVersion: 1, repositories: Object.freeze(repositories)}) as RepositoriesLocalV1;
}

function integrityFailure(target: string, remediation: string) {
    return createWatchtowerError('ERR_INTEGRITY_FAILURE', {operation: 'generate repository bindings', target: safePathTarget(target), remediation});
}
