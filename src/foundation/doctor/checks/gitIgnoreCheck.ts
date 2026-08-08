import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass} from '../DoctorCheckResult.js';

const ID = 'git-ignore-coverage' as const;

/** Confirms `/.watchtower/` is Git-ignored at the control home (`docs/spec/v1.md` §7.2). */
export const gitIgnoreCheck: DoctorCheckProvider = {
    id: ID,
    run(context: DoctorLaneContext) {
        return context.gitIgnored(context.lane.controlHome)
            ? pass(ID, '/.watchtower/ is covered by .gitignore.')
            : fail(ID, '/.watchtower/ is not covered by .gitignore.');
    }
};
