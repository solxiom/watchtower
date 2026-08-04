import type {ReadModelLaneLifecycle} from '../contracts/index.js';
import {parseLaneState} from './parsing/index.js';
import type {LaneReadFileStore} from './LaneReadFileStore.js';
import {ContainedLaneReadFileStore} from './LaneReadFileStore.js';

const MAX_STATE_BYTES = 256 * 1024;

export interface LaneStateProjection {
    readonly lifecycle: ReadModelLaneLifecycle;
    readonly activeBatch: string | null;
}

export class LaneStateProjectionReader {
    constructor(private readonly files: LaneReadFileStore = new ContainedLaneReadFileStore()) {}

    read(laneDir: string): LaneStateProjection {
        const text = this.files.readOptional(laneDir, 'state/coordinator-lane-state.txt', MAX_STATE_BYTES);
        if (text === undefined) return {lifecycle: 'unknown', activeBatch: null};
        const result = parseLaneState(text);
        return result.valid
            ? {lifecycle: result.lifecycle, activeBatch: result.state.active_batch ?? null}
            : {lifecycle: 'unknown', activeBatch: null};
    }
}
