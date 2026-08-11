/**
 * Lane resolution for the `session`/`ask` command boundary (CA-24).
 *
 * It owns no discovery algorithm. `CoordinatorReadService.resolve` is CA-14's
 * accepted lane selector and stays the only one; this module's single job is
 * to turn its throw into this boundary's closed refusal so a session command
 * reports `SESSION_COMMAND_LANE_UNAVAILABLE` instead of leaking an untyped
 * error through a command front door.
 */
import {CoordinatorReadService, type CoordinatorReadQuery} from '../CoordinatorReadService.js';
import type {DiscoveredLane} from '../../../discovery/index.js';
import {SessionStore} from '../session/index.js';
import {sessionCommandFailure, type SessionCommandFailure} from '../../../../contracts/sessionCommand.js';

export type {CoordinatorReadQuery as SessionCommandQuery};

export interface SessionCommandTarget {
    readonly laneId: string;
    readonly laneDir: string;
    /** The selected lane itself, for the forms that also need install and runtime identity. */
    readonly lane: DiscoveredLane;
    readonly store: SessionStore;
}

export type SessionTargetResult =
    | {readonly ok: true; readonly target: SessionCommandTarget}
    | SessionCommandFailure;

/** The narrowest collaborator set this boundary injects: a lane selector and a store factory. */
export interface SessionCommandTargetOptions {
    readonly reads?: CoordinatorReadService;
    readonly storeFactory?: (laneDir: string) => SessionStore;
}

export class SessionCommandTargetResolver {
    private readonly reads: CoordinatorReadService;
    private readonly storeFactory: (laneDir: string) => SessionStore;

    constructor(options: SessionCommandTargetOptions = {}) {
        this.reads = options.reads ?? new CoordinatorReadService();
        this.storeFactory = options.storeFactory ?? ((laneDir) => new SessionStore(laneDir));
    }

    resolve(query: CoordinatorReadQuery): SessionTargetResult {
        let lane: DiscoveredLane;
        try {
            lane = this.reads.resolve(query).lane;
        } catch (error) {
            return sessionCommandFailure(
                'SESSION_COMMAND_LANE_UNAVAILABLE',
                query.lane ?? query.workspace ?? query.cwd,
                detailOf(error)
            );
        }
        return {ok: true, target: {laneId: lane.laneId, laneDir: lane.laneDir, lane, store: this.storeFactory(lane.laneDir)}};
    }
}

function detailOf(error: unknown): string {
    return error instanceof Error ? error.message : 'the lane could not be selected';
}
