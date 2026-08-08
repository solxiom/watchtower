import {safePathTarget} from '../../paths/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip} from '../DoctorCheckResult.js';

const ID = 'repository-permissions' as const;

/**
 * Independently probes control-home and participating-repository read/write
 * access using the kernel-shared, closed `readRepositoryBindingIdentity`
 * projection (`context.bindings.identity`) — never a second, ad hoc parse of
 * `repositories.local.json`. That projection already enforces schema
 * version, allowed keys, duplicate-member rejection, the byte bound, slug
 * grammar, canonical-path identity, the exact `read`/`write` vocabulary, and
 * an exact match against the lane manifest's expected repository set, so
 * this check never probes a structurally invalid or unidentified path.
 */
export const repositoryPermissionsCheck: DoctorCheckProvider = {
    id: ID,
    run(context: DoctorLaneContext) {
        const controlHome = context.lane.controlHome;
        if (!context.bindingInspector.hasAccess(controlHome, 'read') ||
            !context.bindingInspector.hasAccess(controlHome, 'write')) {
            return fail(ID, `Control home ${safePathTarget(controlHome)} is missing required read/write access.`);
        }
        const identity = context.bindings.identity;
        if (identity === null) {
            return skip(ID, 'Participating-repository access could not be verified because repositories.local.json ' +
                'does not declare a complete, closed-schema identity for every manifest repository.');
        }
        for (const binding of identity) {
            const hasRead = context.bindingInspector.hasAccess(binding.path, 'read');
            const hasWrite = binding.access !== 'write' || context.bindingInspector.hasAccess(binding.path, 'write');
            if (!hasRead || !hasWrite) {
                return fail(ID, `Repository "${binding.id}" at ${safePathTarget(binding.path)} is missing its declared access.`);
            }
        }
        return pass(ID, 'Control home and every participating repository have their declared access.');
    }
};
