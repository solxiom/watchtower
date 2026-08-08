import {observeHeartbeat, type HeartbeatFileReader} from '../../observation/index.js';
import {buildLaneFilePath} from '../../paths/index.js';
import {ContainedLaneReadFileStore, type LaneReadFileStore} from '../../read/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip} from '../DoctorCheckResult.js';

const ID = 'watcher-heartbeat' as const;
const HEARTBEAT_RELATIVE_PATH = 'state/watcher-heartbeat.txt';
const MAX_HEARTBEAT_BYTES = 8 * 1024;
const STALE_AFTER_MS = 60_000;

export interface WatcherHeartbeatCheckOptions {
    readonly files?: LaneReadFileStore;
    readonly now?: () => Date;
}

/**
 * Reports whether `wt watch`'s foreground heartbeat (`state/watcher-heartbeat.txt`)
 * is fresh, stale, absent, or invalid — reusing the same accepted, read-only
 * `observeHeartbeat` classifier the `status` capability uses (never a second
 * heartbeat parser/threshold). An absent heartbeat is `skip` (no watcher is
 * required to be running for doctor to succeed); a stale or invalid heartbeat
 * is `fail` because it indicates a watcher that died or corrupted its own
 * liveness marker without being observed doing so.
 */
export function createWatcherHeartbeatCheck(options: WatcherHeartbeatCheckOptions = {}): DoctorCheckProvider {
    const files = options.files ?? new ContainedLaneReadFileStore();
    const now = options.now ?? (() => new Date());
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const laneDir = context.lane.laneDir;
            const path = buildLaneFilePath(laneDir, HEARTBEAT_RELATIVE_PATH);
            const reader: HeartbeatFileReader = {
                readUtf8: () => files.readOptional(laneDir, HEARTBEAT_RELATIVE_PATH, MAX_HEARTBEAT_BYTES)
            };
            const observation = observeHeartbeat(path, {staleAfterMs: STALE_AFTER_MS, now: now(), reader});
            switch (observation.status) {
                case 'absent':
                    return skip(ID, 'No watcher heartbeat is present; no `wt watch` session is currently attached.');
                case 'invalid':
                    return fail(ID, 'The watcher heartbeat file is present but its timestamp is not a valid ISO date-time.');
                case 'stale':
                    return fail(ID, observation.reason ?? 'The watcher heartbeat is stale.');
                case 'fresh':
                    return pass(ID, `The watcher heartbeat is fresh (last heartbeat at ${observation.lastHeartbeatAt}).`);
            }
        }
    };
}

export const watcherHeartbeatCheck: DoctorCheckProvider = createWatcherHeartbeatCheck();
