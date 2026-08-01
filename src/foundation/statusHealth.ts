import type {HealthStatus, ReadModelLaneLifecycle, StatusWarning, StatusWarningCode} from '../contracts/index.js';

export interface StatusHealthInput {
    readonly lifecycle: ReadModelLaneLifecycle;
    readonly warningCodes: readonly StatusWarningCode[];
}

const ORDER: readonly StatusWarningCode[] = [
    'INVALID_LANE_STATE', 'INVALID_LANE_CONFIG', 'INVALID_INSTALL', 'INVALID_REPOSITORY_BINDINGS',
    'IMPLEMENTATION_PACK_MISSING', 'IMPLEMENTATION_PACK_UNAVAILABLE', 'IMPLEMENTATION_PACK_INVALID',
    'IMPLEMENTATION_PACK_UNACCEPTED', 'IMPLEMENTATION_PACK_DRIFT',
    'SOURCE_BASELINE_CRITICAL', 'SOURCE_BASELINE_UNAVAILABLE',
    'SOURCE_BASELINE_UNRELATED', 'SOURCE_BASELINE_OPTIONAL_UNAVAILABLE',
    'MEMBERSHIP_INDEX_STALE', 'REPOSITORY_UNAVAILABLE',
    'CONFLICT_OBSERVATION_INCOMPLETE', 'WRITABLE_CONFLICT', 'PROOF_RESOURCE_CONFLICTS_UNAVAILABLE',
    'LANE_BUSY', 'TMUX_UNAVAILABLE', 'WATCHER_MISSING',
    'WATCHER_HEARTBEAT_ABSENT', 'WATCHER_HEARTBEAT_INVALID', 'WATCHER_STALE',
    'WORKER_SESSION_MISSING', 'DURABLE_EVENT_CORRUPT', 'DURABLE_EVENT_REJECTED',
    'PENDING_WORKER_EVENT', 'RUNTIME_INTEGRITY_UNAVAILABLE'
];

const INVALID = new Set<StatusWarningCode>([
    'INVALID_LANE_STATE', 'INVALID_LANE_CONFIG', 'INVALID_INSTALL',
    'INVALID_REPOSITORY_BINDINGS', 'IMPLEMENTATION_PACK_MISSING', 'IMPLEMENTATION_PACK_UNAVAILABLE',
    'IMPLEMENTATION_PACK_INVALID', 'IMPLEMENTATION_PACK_UNACCEPTED', 'IMPLEMENTATION_PACK_DRIFT',
    'SOURCE_BASELINE_CRITICAL', 'SOURCE_BASELINE_UNAVAILABLE'
]);

const MESSAGES: Readonly<Record<StatusWarningCode, string>> = Object.freeze({
    INVALID_LANE_STATE: 'The lane-state projection is missing or inconsistent.',
    INVALID_LANE_CONFIG: 'The lane configuration is missing or inconsistent with the lane marker.',
    INVALID_INSTALL: 'The installed runtime identity is missing, malformed, or incompatible.',
    INVALID_REPOSITORY_BINDINGS: 'The local repository bindings are malformed or inconsistent.',
    IMPLEMENTATION_PACK_MISSING: 'The declared implementation pack or a required pack artifact is missing.',
    IMPLEMENTATION_PACK_UNAVAILABLE: 'The declared implementation pack cannot be read safely.',
    IMPLEMENTATION_PACK_INVALID: 'The implementation-pack contracts or seal are invalid.',
    IMPLEMENTATION_PACK_UNACCEPTED: 'The implementation pack lacks a valid independent acceptance.',
    IMPLEMENTATION_PACK_DRIFT: 'The accepted implementation-pack file set or committed bytes have drifted.',
    SOURCE_BASELINE_CRITICAL: 'Tracked source drift intersects a writable claim, accepted input, or proof input.',
    SOURCE_BASELINE_UNAVAILABLE: 'A required repository source baseline cannot be observed.',
    SOURCE_BASELINE_UNRELATED: 'Tracked source changed outside every writable claim, accepted input, and proof input.',
    SOURCE_BASELINE_OPTIONAL_UNAVAILABLE: 'An optional proof-only read repository baseline cannot be observed.',
    MEMBERSHIP_INDEX_STALE: 'One or more advisory membership-index entries are stale.',
    REPOSITORY_UNAVAILABLE: 'One or more declared repository worktrees are unavailable.',
    CONFLICT_OBSERVATION_INCOMPLETE: 'One or more relevant lanes could not be inspected, so conflict observation is incomplete.',
    WRITABLE_CONFLICT: 'The lane has an active writable repository, branch, or path conflict.',
    PROOF_RESOURCE_CONFLICTS_UNAVAILABLE: 'Proof-resource conflict observation is unavailable until its authority owner is installed.',
    LANE_BUSY: 'A lane mutation lock is present; status remained read-only.',
    TMUX_UNAVAILABLE: 'Tmux session observation is unavailable.',
    WATCHER_MISSING: 'The active lane has no expected watcher session.',
    WATCHER_HEARTBEAT_ABSENT: 'The watcher heartbeat is absent.',
    WATCHER_HEARTBEAT_INVALID: 'The watcher heartbeat is malformed.',
    WATCHER_STALE: 'The watcher heartbeat is stale.',
    WORKER_SESSION_MISSING: 'The active batch has no expected worker session.',
    DURABLE_EVENT_CORRUPT: 'The worker-event journal contains ignored invalid data.',
    DURABLE_EVENT_REJECTED: 'A durable event was ignored because its lane, role, type, or session is not authoritative.',
    PENDING_WORKER_EVENT: 'The latest event for the active batch awaits a lane-state transition.',
    RUNTIME_INTEGRITY_UNAVAILABLE: 'Runtime installation cannot be qualified until the accepted runtime manifest owner is available.'
});

export function deriveStatusHealth(input: StatusHealthInput): {
    readonly status: HealthStatus;
    readonly warnings: readonly StatusWarning[];
} {
    const selected = new Set(input.warningCodes);
    const warnings = ORDER.filter(code => selected.has(code)).map(warning);
    return {status: healthStatus(input.lifecycle, warnings), warnings};
}

function warning(code: StatusWarningCode): StatusWarning {
    return {code, severity: INVALID.has(code) ? 'invalid' : 'attention', message: MESSAGES[code]};
}

function healthStatus(lifecycle: ReadModelLaneLifecycle, warnings: readonly StatusWarning[]): HealthStatus {
    if (warnings.some(item => item.severity === 'invalid')) return 'invalid';
    if (lifecycle === 'complete') return 'complete';
    if (warnings.length > 0) return 'attention';
    return 'ok';
}
