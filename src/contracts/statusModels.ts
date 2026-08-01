import type {JsonObject} from './types.js';

export type StatusWarningCode =
    | 'INVALID_LANE_STATE'
    | 'INVALID_LANE_CONFIG'
    | 'INVALID_INSTALL'
    | 'INVALID_REPOSITORY_BINDINGS'
    | 'IMPLEMENTATION_PACK_MISSING'
    | 'IMPLEMENTATION_PACK_UNAVAILABLE'
    | 'IMPLEMENTATION_PACK_INVALID'
    | 'IMPLEMENTATION_PACK_UNACCEPTED'
    | 'IMPLEMENTATION_PACK_DRIFT'
    | 'SOURCE_BASELINE_CRITICAL'
    | 'SOURCE_BASELINE_UNAVAILABLE'
    | 'SOURCE_BASELINE_UNRELATED'
    | 'SOURCE_BASELINE_OPTIONAL_UNAVAILABLE'
    | 'MEMBERSHIP_INDEX_STALE'
    | 'REPOSITORY_UNAVAILABLE'
    | 'CONFLICT_OBSERVATION_INCOMPLETE'
    | 'WRITABLE_CONFLICT'
    | 'PROOF_RESOURCE_CONFLICTS_UNAVAILABLE'
    | 'LANE_BUSY'
    | 'TMUX_UNAVAILABLE'
    | 'WATCHER_MISSING'
    | 'WATCHER_HEARTBEAT_ABSENT'
    | 'WATCHER_HEARTBEAT_INVALID'
    | 'WATCHER_STALE'
    | 'WORKER_SESSION_MISSING'
    | 'DURABLE_EVENT_CORRUPT'
    | 'DURABLE_EVENT_REJECTED'
    | 'PENDING_WORKER_EVENT'
    | 'RUNTIME_INTEGRITY_UNAVAILABLE';

export interface StatusWarning extends JsonObject {
    readonly code: StatusWarningCode;
    readonly severity: 'attention' | 'invalid';
    readonly message: string;
}

export interface StatusRepositoryView extends JsonObject {
    readonly id: string;
    readonly role: string;
    readonly access: 'read' | 'write';
    readonly path: string | null;
    readonly branch: string | null;
    readonly worktreeMode: 'dedicated' | 'shared' | null;
}

export interface StatusWorkerSession extends JsonObject {
    readonly name: string | null;
    readonly present: boolean;
}

export interface StatusWorkerSessions extends JsonObject {
    readonly implementer: StatusWorkerSession;
    readonly reviewer: StatusWorkerSession;
}

export interface StatusWatcher extends JsonObject {
    readonly running: boolean;
    readonly heartbeatStatus: 'fresh' | 'stale' | 'absent' | 'invalid';
    readonly lastHeartbeatAt: string | null;
}

export interface StatusEventView extends JsonObject {
    readonly eventId: string;
    readonly type: 'handoff' | 'accept' | 'reject' | 'blocked';
    readonly sequence: number;
    readonly at: string;
    readonly role: 'implementer' | 'reviewer';
    readonly batch: string;
    readonly session: string;
}

interface StatusConflictBase extends JsonObject {
    readonly lanes: readonly [string, string];
}

export interface StatusRepositoryConflict extends StatusConflictBase {
    readonly kind: 'shared-write' | 'path-conflict' | 'branch-conflict';
    readonly repository: string;
    readonly paths: readonly string[];
}

export interface StatusTmuxPrefixConflict extends StatusConflictBase {
    readonly kind: 'tmux-prefix';
    readonly prefix: string;
}

export interface StatusProofResourceConflict extends StatusConflictBase {
    readonly kind: 'proof-resource';
    readonly resource: string;
}

export type StatusConflictView =
    | StatusRepositoryConflict
    | StatusTmuxPrefixConflict
    | StatusProofResourceConflict;

export interface StatusLaneView extends JsonObject {
    readonly id: string;
    readonly slug: string;
    readonly initiativeId: string;
    readonly kind: 'implementation';
    readonly controlHome: string;
}

export interface StatusLifecycleView extends JsonObject {
    readonly status: 'bootstrap' | 'active' | 'paused' | 'complete' | 'unknown';
    readonly activeBatch: string | null;
}

export type StatusIndexState = 'valid' | 'missing' | 'stale' | 'corrupt' | 'incompatible' | 'unavailable';
export type StatusPackIntegrityState = 'valid' | 'missing' | 'unavailable' | 'invalid' | 'unaccepted' | 'drift';

export interface StatusPackIntegrityView extends JsonObject {
    readonly status: StatusPackIntegrityState;
    readonly sealId: string | null;
}

export interface StatusPackIndexView extends JsonObject {
    readonly status: StatusIndexState;
    readonly packSealId: string | null;
}

export interface StatusRuntimeIndexView extends JsonObject {
    readonly status: StatusIndexState;
    readonly projectionRevision: string | null;
}

export interface StatusRecentOperatorSession extends JsonObject {
    readonly operatorSessionId: string;
    readonly origin: 'operator' | 'system-escalation';
    readonly policyProfileId: string;
    readonly state: 'open' | 'active-turn' | 'suspended' | 'closed' | 'archived' | 'pruned';
    readonly topic: string | null;
    readonly turnCount: number;
    readonly lastTurnAt: string | null;
    readonly activeTurn: boolean;
    readonly actionableHolds: number;
    readonly actionableProposals: number;
}

export interface StatusHoldScope extends JsonObject {
    readonly kind: 'lane' | 'batch' | 'repository' | 'effect';
    readonly id: string;
}

export interface StatusHoldView extends JsonObject {
    readonly schemaVersion: 1;
    readonly holdId: string;
    readonly laneId: string;
    readonly scope: StatusHoldScope;
    readonly blocks: readonly string[];
    readonly reason: string;
    readonly operatorSessionId: string | null;
    readonly createdAt: string;
    readonly expiresAt: string;
}

export interface StatusOperatorSessionsView extends JsonObject {
    readonly open: number;
    readonly suspended: number;
    readonly activeTurns: number;
    readonly budgetWarning: boolean;
    readonly staleProposals: number;
    readonly recent: readonly StatusRecentOperatorSession[];
    readonly recentTruncated: boolean;
}

export interface StatusCoordinatorAvailable extends JsonObject {
    readonly status: 'available';
    readonly queueDepth: number;
    readonly activeCycle: string | null;
    readonly decisionClass: string | null;
    readonly routeAvailable: boolean;
    readonly lastOutcome: string | null;
    readonly packIndex: StatusPackIndexView;
    readonly runtimeIndex: StatusRuntimeIndexView;
    readonly budgetWarning: boolean;
    readonly operatorSessions: StatusOperatorSessionsView;
    readonly holds: readonly StatusHoldView[];
}

export interface StatusCoordinatorUnavailable extends JsonObject {
    readonly status: 'unavailable';
}

export type StatusCoordinatorView = StatusCoordinatorAvailable | StatusCoordinatorUnavailable;

export interface StatusRuntimeView extends JsonObject {
    readonly qualification: 'valid' | 'unavailable';
    readonly configured: string | null;
    readonly installed: string | null;
    readonly available: boolean;
    readonly availableVersions: readonly string[];
}

export interface StatusBatchProgress extends JsonObject {
    readonly accepted: number | null;
    readonly total: number | null;
}

export interface StatusRelatedLane extends JsonObject {
    readonly relation: string;
    readonly laneId: string;
}

export interface StatusDiagnostics extends JsonObject {
    readonly workspaceResolution: 'explicit' | 'git' | 'ancestor' | 'current-directory';
    readonly relevantLaneCount: number;
    readonly membershipWarningCount: number;
    readonly eventWarningCount: number;
    readonly rejectedEventCount: number;
    readonly conflictCount: number;
}

export interface LaneStatusV1 extends JsonObject {
    readonly schemaVersion: 1;
    readonly lane: StatusLaneView;
    readonly repositories: readonly StatusRepositoryView[];
    readonly lifecycle: StatusLifecycleView;
    readonly health: {readonly status: 'ok' | 'attention' | 'complete' | 'invalid'; readonly warnings: readonly StatusWarning[]};
    readonly packIntegrity: StatusPackIntegrityView;
    readonly workerSessions: StatusWorkerSessions;
    readonly watcher: StatusWatcher;
    readonly coordinator: StatusCoordinatorView;
    readonly latestEvent: StatusEventView | null;
    readonly batchProgress: StatusBatchProgress;
    readonly relatedLanes: readonly StatusRelatedLane[];
    readonly conflicts: readonly StatusConflictView[];
    readonly runtime: StatusRuntimeView;
    readonly diagnostics: StatusDiagnostics | null;
}
