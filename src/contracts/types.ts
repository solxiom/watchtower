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

export type JsonValue = string | number | boolean | null | JsonObject | JsonArray;
export interface JsonObject {readonly [field: string]: JsonValue;}
export type JsonArray = readonly JsonValue[];

/** Closed public envelope for a successful finite command. */
export interface CommandResult {
    schemaVersion: 1;
    command: string;
    ok: true;
    data: JsonValue;
}

/** Closed nested error object carried by a failed command envelope. */
export interface CommandErrorDetails {
    code: string;
    message: string;
    exitCode: import('./exitCodes.js').ExitCode;
    details?: JsonValue;
}

/** Closed public envelope for a failed finite command. */
export interface CommandError {
    schemaVersion: 1;
    command: string;
    ok: false;
    error: CommandErrorDetails;
}

export type CommandEnvelope = CommandResult | CommandError;

export type EnvelopeValidationResult =
    | {valid: true; envelope: CommandEnvelope}
    | {valid: false; error: CommandError};

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

/** A validated advisory index reference for one local participating worktree. */
export interface RepositoryMembership {
    readonly worktreePath: string;
    readonly laneId: string;
    readonly laneHome: string;
    readonly lane: LaneRef;
}

export type MembershipWarningReason = 'PATH_MISSING' | 'LANE_JSON_MISSING' | 'BINDING_MISMATCH';

/** A non-authoritative index entry rejected during advisory validation. */
export interface MembershipWarning {
    readonly worktreePath: string;
    readonly laneId: string;
    readonly laneHome: string;
    readonly reason: MembershipWarningReason;
}

export interface MembershipIndexResult {
    readonly memberships: readonly RepositoryMembership[];
    readonly warnings: readonly MembershipWarning[];
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

/** Closed `repositories.local.json` shape (`docs/spec/v1.md` §7.4). */
export interface RepositoriesLocalV1 {
    schemaVersion: 1;
    repositories: RepositoryBinding[];
}

export interface ResolvedLane extends LaneRef {
    laneDir: string;
    manifest: LaneManifestV1;
    repositories: RepositoryBinding[];
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
