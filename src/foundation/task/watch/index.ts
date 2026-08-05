// Public surface of the watch preflight/attachment capsule.
export {WatchPreflight} from './WatchPreflight.js';
export type {WatchPreflightOptions, WatchPreflightQuery, WatchPreflightResult} from './WatchPreflight.js';
export {WatchAttachment} from './WatchAttachment.js';
export type {WatchAttachmentOptions, WatchAttachmentOutcome, WatchSink} from './WatchAttachment.js';
export {createNodeWatchSignalSource, nodeEventLoopKeepAlive, nodeWatchSignalSource} from './watchProcessSignals.js';
export type {WatchEventLoopKeepAlive, WatchSignalSource, WatchTerminationSignal} from './watchProcessSignals.js';
