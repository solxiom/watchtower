// Public surface of the watch preflight/attachment capsule.
export {WatchPreflight} from './WatchPreflight.js';
export type {WatchPreflightOptions, WatchPreflightQuery, WatchPreflightResult} from './WatchPreflight.js';
export {WatchAttachment} from './WatchAttachment.js';
export type {WatchAttachmentOptions, WatchAttachmentOutcome, WatchSink} from './WatchAttachment.js';
export {WatchHeartbeat} from './WatchHeartbeat.js';
export {
    renderWatchHeartbeatFileContent,
    renderWatchHeartbeatStdoutLine,
    WATCH_HEARTBEAT_INTERVAL_SEC,
    WATCH_HEARTBEAT_RELATIVE_PATH
} from './watchHeartbeatContracts.js';
export type {
    WatchHeartbeatClock,
    WatchHeartbeatStartOptions,
    WatchHeartbeatTimer,
    WatchHeartbeatWriter
} from './watchHeartbeatContracts.js';
export {
    createNodeWatchHeartbeatWriter,
    defaultNodeWatchHeartbeatWriterDeps,
    nodeWatchHeartbeatWriter
} from './nodeWatchHeartbeatWriter.js';
export type {NodeWatchHeartbeatWriterDeps} from './nodeWatchHeartbeatWriter.js';
export {createNodeWatchSignalSource, nodeEventLoopKeepAlive, nodeWatchSignalSource} from './watchProcessSignals.js';
export type {WatchEventLoopKeepAlive, WatchSignalSource, WatchTerminationSignal} from './watchProcessSignals.js';
