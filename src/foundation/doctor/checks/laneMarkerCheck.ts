import {readLaneManifest} from '../../discovery/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, watchtowerErrorMessage, watchtowerErrorReason} from '../DoctorCheckResult.js';

const ID = 'lane-marker' as const;

/** Independently re-reads and re-validates `lane.json` against the shared marker owner. */
export const laneMarkerCheck: DoctorCheckProvider = {
    id: ID,
    run(context: DoctorLaneContext) {
        try {
            const manifest = readLaneManifest(context.markerPath, context.fileSystem);
            return pass(ID, `lane.json validates for lane "${manifest.slug}" (${manifest.laneId}).`);
        } catch (error) {
            return fail(ID, watchtowerErrorMessage(error, 'lane.json failed schema validation.'), watchtowerErrorReason(error));
        }
    }
};
