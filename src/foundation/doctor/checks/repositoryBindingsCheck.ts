import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, watchtowerErrorMessage, watchtowerErrorReason} from '../DoctorCheckResult.js';

const ID = 'repository-bindings' as const;

/** Reports the shared `repositories.local.json` schema/identity/worktree/branch result. */
export const repositoryBindingsCheck: DoctorCheckProvider = {
    id: ID,
    run(context: DoctorLaneContext) {
        const observed = context.bindings.observed;
        if (!observed.ok) {
            return fail(ID, watchtowerErrorMessage(observed.error, 'repositories.local.json failed validation.'),
                watchtowerErrorReason(observed.error));
        }
        return pass(ID, `${observed.bindings.length} repository binding(s) match the lane manifest with ` +
            'consistent worktree and branch state.');
    }
};
