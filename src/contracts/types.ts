/** Versioned, serializable domain contracts for Watchtower v1. */

export type AccessMode = 'read' | 'write';
export type ClaimMode = 'read' | 'shared-write' | 'exclusive-write';
export type HealthStatus = 'ok' | 'attention' | 'complete' | 'invalid';
export type LaneKind = 'implementation';
/** Persisted lane-state vocabulary. Read-model uncertainty is separate. */
export type LaneLifecycle = 'bootstrap' | 'active' | 'paused' | 'complete';
export type ReadModelLaneLifecycle = LaneLifecycle | 'unknown';
export type WorktreeMode = 'dedicated' | 'shared';
export type WorkerEventRole = 'implementer' | 'reviewer';
export type WorkerEventType = 'handoff' | 'blocked' | 'accept' | 'reject';
export type WorkspaceResolution = 'explicit' | 'git' | 'ancestor' | 'current-directory';
/** Closed, parser-local diagnostic vocabulary; these are not command error codes. */
export type ParserDiagnosticCode =
    | 'contradictory-lane-state'
    | 'duplicate-key'
    | 'invalid-lane-status'
    | 'invalid-scalar'
    | 'invalid-state-scalar'
    | 'unknown-key'
    | 'unsafe-shell-syntax';

/** A safe, source-oriented diagnostic emitted while reading lane text files. */
export interface ParseDiagnostic {
    line: number;
    code: ParserDiagnosticCode;
    message: string;
    key?: string;
}

/** Result of parsing the strict, non-executing lane configuration subset. */
export interface EnvConfigResult {
    config: Record<string, string>;
    errors: ParseDiagnostic[];
    warnings: ParseDiagnostic[];
    unknownKeys: Record<string, string>;
    valid: boolean;
}

/** Read projection produced from the shell-compatible lane-state file. */
export interface LaneStateResult {
    state: Record<string, string>;
    lifecycle: ReadModelLaneLifecycle;
    contradictions: string[];
    errors: ParseDiagnostic[];
    warnings: ParseDiagnostic[];
    unknownKeys: Record<string, string>;
    valid: boolean;
}

export interface LaneRef {
    laneId: string;
    slug: string;
    initiativeId: string;
    kind: LaneKind;
    controlHome: string;
}

export interface RepositoryRef {
    id: string;
    role: string;
    access: AccessMode;
}

export interface RepositoryBinding extends RepositoryRef {
    path: string;
    branch: string;
    worktreeMode: WorktreeMode;
}

export interface WorkspaceContext {
    cwd: string;
    workspace: string;
    resolution: WorkspaceResolution;
}

export interface ImplementationPackRef {
    repository: string;
    path: string;
}

export interface LaneRelationSet {
    producedFrom?: string;
    [relation: string]: string | undefined;
}

export interface ResourceClaim {
    repository: string;
    paths: string[];
    mode: ClaimMode;
}

export interface LaneManifestV1 {
    schemaVersion: 1;
    laneId: string;
    kind: LaneKind;
    slug: string;
    initiativeId: string;
    controlHomeRepository: string;
    laneDir: string;
    implementationPack?: ImplementationPackRef;
    repositories: RepositoryRef[];
    relations?: LaneRelationSet;
    claims?: ResourceClaim[];
    createdAt?: string;
    [field: string]: unknown;
}

export interface ResolvedLane extends LaneRef {
    laneDir: string;
    manifest: LaneManifestV1;
    repositories: RepositoryBinding[];
}

export interface LifecycleStatus {
    status: ReadModelLaneLifecycle;
    activeBatch: string | null;
    [field: string]: unknown;
}

/** The lane identity shape used by the public `laneStatus` schema. */
export interface LaneStatusLane {
    id: string;
    slug: string;
    initiativeId: string;
    kind: LaneKind;
    controlHome: string;
    [field: string]: unknown;
}

export interface HealthSummary {
    status: HealthStatus;
    warnings: unknown[];
    [field: string]: unknown;
}

export interface LaneStatusV1 {
    lane: LaneStatusLane;
    repositories: RepositoryBinding[];
    lifecycle: LifecycleStatus;
    health: HealthSummary;
    workerSessions: Record<string, unknown>;
    watcher: Record<string, unknown>;
    coordinator: Record<string, unknown>;
    runtime: Record<string, unknown>;
    [field: string]: unknown;
}

/** Worker-specific values belong in the durable event payload, not its envelope. */
export interface WorkerEventPayloadV1 {
    role: WorkerEventRole;
    batch: string;
    session: string;
    commits?: Record<string, string>;
}

/** Authoritative JSONL worker event, conforming to `$defs.durableEvent`. */
export interface WorkerEventV1 {
    schemaVersion: 1;
    eventId: string;
    type: WorkerEventType;
    sequence: number;
    at: string;
    laneId: string;
    producer: string;
    correlationId: string;
    causationId: string | null;
    policyVersion: string;
    payload: WorkerEventPayloadV1;
    [field: string]: unknown;
}
