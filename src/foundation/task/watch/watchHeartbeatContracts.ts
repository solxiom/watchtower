/** Relative lane path written by foreground `wt watch` and read by status/doctor. */
export const WATCH_HEARTBEAT_RELATIVE_PATH = 'state/watcher-heartbeat.txt';

/** Local stdout heartbeat cadence matching the coordinator watcher contract (~150s). */
export const WATCH_HEARTBEAT_INTERVAL_SEC = 150;

export interface WatchHeartbeatWriter {
    write(laneDir: string, timestamp: string): void;
}

export interface WatchHeartbeatClock {
    now(): Date;
}

export interface WatchHeartbeatTimer {
    schedule(intervalMs: number, callback: () => void): () => void;
}

export interface WatchHeartbeatStartOptions {
    readonly writer?: WatchHeartbeatWriter;
    readonly clock?: WatchHeartbeatClock;
    readonly timer?: WatchHeartbeatTimer;
    readonly intervalSec?: number;
}

/** The stdout line Cursor must not match — local liveness only, never a model wake. */
export function renderWatchHeartbeatStdoutLine(at: string, intervalSec: number): string {
    return `AGENT_LOOP_HEARTBEAT_lane ${JSON.stringify({at, interval: intervalSec})}`;
}

/** The on-disk timestamp contract consumed by `observeHeartbeat`. */
export function renderWatchHeartbeatFileContent(at: string): string {
    return `${at}\n`;
}
