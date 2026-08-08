/**
 * Public capsule surface for the coordinator queue, cursor, and replay
 * foundation (CA-13). Exactly one owner exists for queue ordering
 * (`CoordinatorQueue`), cursor advance (`CursorManager`), interrupted/
 * duplicate/uncertain replay (`CoordinatorReplay`), and watcher ingestion
 * (`WatcherPoller`); nothing else in the product may enqueue a coordinator
 * trigger, advance the cursor, or recover an interrupted cycle.
 */
export {CoordinatorQueue, DEFAULT_MAX_QUEUE_LENGTH} from './CoordinatorQueue.js';
export type {CoordinatorQueueOptions, SettledIdentities} from './CoordinatorQueue.js';
export {CursorManager} from './CursorManager.js';
export type {CursorManagerOptions, CursorTarget} from './CursorManager.js';
export {CoordinatorReplay} from './CoordinatorReplay.js';
export type {CoordinatorReplayOptions} from './CoordinatorReplay.js';
export {DEFAULT_POLL_LIMIT, WatcherPoller} from './WatcherPoller.js';
export type {WatcherPollerOptions} from './WatcherPoller.js';
export {escalateUncertain, isCyclePhaseEvent, phaseRank, planCycleRecovery} from './cycleRecovery.js';
export {compareQueueEntries, orderedEntries, positionOf, priorityOf} from './queuePriority.js';
export {assertOwnedTrigger, refuseAdmission} from './queueAdmission.js';
export {dequeueRefusal, isHeldBy} from './queueSelection.js';
export {
    holdsCycle, reservationFor, reservationForCorrelation, reservationForEvent,
    reservationForUncertainty, withReservation, withoutCycle
} from './cycleReservations.js';
export {pollReport, settledPrefix} from './watcherPollReport.js';
export {checkpointTargets, scanFenceOf} from './pollCursorFence.js';
export type {Disposition, PollReportInput} from './watcherPollReport.js';
export {
    cursorPath, emptyCursorDocument, emptyQueueDocument, queuePath,
    readCursorDocument, readQueueDocument, writeCursorDocument, writeQueueDocument
} from './queuePersistence.js';
export {parseCursorDocument, parseQueueDocument, parseTrigger} from './queueValidation.js';
export {effectEvidenceFromJournal, outcomeEventId} from './effectEvidenceSource.js';
export {cycleHistoryFromIndex, triggerIngestFromIndex} from './coordinatorJournalSources.js';
export {POLL_TRIGGERS_ACTION, triggerIngestFromTask} from './laneTaskTriggerIngest.js';
export type {CoordinatorTaskRunner} from './laneTaskTriggerIngest.js';
export type {RuntimeEventReader} from './coordinatorJournalSources.js';
export {nodeQueueFileSystem, queueFileSystemOver} from './nodeQueueFileSystem.js';
export type {
    CycleHistoryEntry, CycleHistorySource, EffectEvidence, EffectEvidenceSource, QueueClock,
    QueueFileSystem, QueueIdFactory, TriggerClassification, TriggerClassifier, TriggerIngestSource
} from './queuePorts.js';
export {laneMutationLockOver, nodeLaneMutationLock} from './laneMutationLock.js';
export type {LaneMutationLock} from './laneMutationLock.js';
export {commitProjection} from './projectionTransaction.js';
export type {ProjectionDecision, RevisionedProjection} from './projectionTransaction.js';
export {admitUncertainEscalation, escalationEventIdFor} from './uncertainEscalation.js';
export type {EscalationAdmissionOptions} from './uncertainEscalation.js';
export type {ScanCheckpoint, TriggerScanPage, TriggerScanWindow} from './queuePorts.js';
