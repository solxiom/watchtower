import {ContainedLaneReadFileStore, LaneConfigProjectionReader} from '../../read/index.js';
import {parseLaneState} from '../../parsing/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, watchtowerErrorMessage, watchtowerErrorReason} from '../DoctorCheckResult.js';

const ID = 'lane-config' as const;
const MAX_STATE_BYTES = 256 * 1024;

/** Validates `lane.config.env` identity and `state/coordinator-lane-state.txt` schema. */
export const laneConfigCheck: DoctorCheckProvider = {
    id: ID,
    run(context: DoctorLaneContext) {
        const files = new ContainedLaneReadFileStore(context.fileSystem);
        try {
            new LaneConfigProjectionReader(files).read(context.lane.laneDir, context.lane.controlHome, context.lane.manifest);
        } catch (error) {
            return fail(ID, watchtowerErrorMessage(error, 'lane.config.env failed strict validation.'), watchtowerErrorReason(error));
        }
        let stateText: string | undefined;
        try {
            stateText = files.readOptional(context.lane.laneDir, 'state/coordinator-lane-state.txt', MAX_STATE_BYTES);
        } catch (error) {
            return fail(ID, watchtowerErrorMessage(error, 'state/coordinator-lane-state.txt is unreadable.'), watchtowerErrorReason(error));
        }
        if (stateText === undefined) return fail(ID, 'state/coordinator-lane-state.txt is missing.');
        const state = parseLaneState(stateText);
        if (!state.valid || state.lifecycle === 'unknown') {
            return fail(ID, 'state/coordinator-lane-state.txt failed strict schema or lifecycle validation.');
        }
        return pass(ID, 'lane.config.env and lane state both validate against their strict schemas.');
    }
};
