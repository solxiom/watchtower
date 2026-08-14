import type {DiscoveredLane} from '../../discovery/index.js';
import {nodeWatchHeartbeatWriter} from './nodeWatchHeartbeatWriter.js';
import type {WatchSink} from './WatchAttachment.js';
import {
    renderWatchHeartbeatStdoutLine,
    WATCH_HEARTBEAT_INTERVAL_SEC,
    type WatchHeartbeatClock,
    type WatchHeartbeatStartOptions,
    type WatchHeartbeatTimer,
    type WatchHeartbeatWriter
} from './watchHeartbeatContracts.js';

const nodeWatchHeartbeatTimer: WatchHeartbeatTimer = {
    schedule(intervalMs: number, callback: () => void): () => void {
        const handle = setInterval(callback, intervalMs);
        return () => clearInterval(handle);
    }
};

const nodeWatchHeartbeatClock: WatchHeartbeatClock = {
    now(): Date {
        return new Date();
    }
};

/** Owns foreground watcher liveness: one immediate tick, periodic stdout/file heartbeats, clean stop. */
export class WatchHeartbeat {
    /** Starts heartbeat emission and returns a stop function that clears the timer only. */
    start(lane: DiscoveredLane, sink: WatchSink, options: WatchHeartbeatStartOptions = {}): () => void {
        const intervalSec = options.intervalSec ?? WATCH_HEARTBEAT_INTERVAL_SEC;
        const writer: WatchHeartbeatWriter = options.writer ?? nodeWatchHeartbeatWriter;
        const clock: WatchHeartbeatClock = options.clock ?? nodeWatchHeartbeatClock;
        const timer: WatchHeartbeatTimer = options.timer ?? nodeWatchHeartbeatTimer;
        let stopped = false;

        const emit = (): void => {
            if (stopped) return;
            const at = clock.now().toISOString();
            writer.write(lane.laneDir, at);
            sink.write(renderWatchHeartbeatStdoutLine(at, intervalSec));
        };

        emit();
        const cancel = timer.schedule(intervalSec * 1000, emit);
        return () => {
            stopped = true;
            cancel();
        };
    }
}
