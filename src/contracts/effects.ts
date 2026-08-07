/**
 * Closed public contracts for the sole lane-local effect boundary (CA-10;
 * `docs/spec/v1.md` §13, `docs/spec/v1-contracts.md` §5/§9/§11,
 * `docs/spec/coordinator-automation.md` §12/§21,
 * `docs/spec/nirvana-integration-architecture.md` §7).
 *
 * "Exactly one effect authority exists for a lane" (§21). These are that
 * authority's vocabulary: the declared runtime actions a validated proposal may
 * map to, the side-effect-free plan derived from it, the single-use invocation
 * envelope that carries the authority to a packaged NVB task, the
 * prepare/attempt/verify journal record, and the closed outcome union. Nothing
 * here executes; every value crossing this boundary from outside Watchtower
 * enters as `unknown` and leaves as one of these shapes.
 */
import type {EffectType} from './proposals.js';
import type {LaneTaskMutationClass, LaneTaskRunResult} from './taskRuntime.js';
import type {JsonObject} from './types.js';

/**
 * Stable reason codes for every refusal, conflict, and uncertain outcome.
 * `COORDINATOR_EFFECT_CONFLICT` and `COORDINATOR_EFFECT_UNCERTAIN` are the
 * canonical `coordinator-automation.md` §20 codes and keep their exact names.
 */
export const EFFECT_REASONS = [
    'EFFECT_PROPOSAL_REJECTED',
    'EFFECT_PROPOSAL_UNVALIDATED',
    'EFFECT_ACTION_UNDECLARED',
    'EFFECT_ACTION_AMBIGUOUS',
    'EFFECT_ACTION_BINDING_INVALID',
    'EFFECT_EXTERNAL_UNSUPPORTED',
    'EFFECT_GIT_SYNC_FORBIDDEN',
    'EFFECT_PLAN_INVALID',
    'EFFECT_PATH_ESCAPE',
    'EFFECT_LOCK_ORDER_INVALID',
    'COORDINATOR_EFFECT_CONFLICT',
    'EFFECT_STATE_CHANGED',
    'EFFECT_PACK_SEAL_DRIFT',
    'EFFECT_REVISION_NOT_ADMITTED',
    'EFFECT_RESUME_IDENTITY_MISMATCH',
    'EFFECT_WORKTREE_STALE',
    'EFFECT_ENVELOPE_WRITE_FAILED',
    'EFFECT_ENVELOPE_ORPHANED',
    'EFFECT_JOURNAL_UNREADABLE',
    'EFFECT_JOURNAL_WRITE_FAILED',
    'EFFECT_POSTCONDITION_FAILED',
    'EFFECT_RUNNER_FAILED',
    'EFFECT_CANCELLED',
    'COORDINATOR_EFFECT_UNCERTAIN',
    'GIT_OWNERSHIP_MISMATCH',
    'GIT_COMMIT_NOT_FOUND',
    'GIT_UNEXPECTED_FILES',
    'GIT_ANCESTRY_INVALID',
    'GIT_REPOSITORY_NOT_BOUND',
    'GIT_PUSH_FAILED',
    'GIT_PUSH_PARTIAL',
    'GIT_REMOTE_UNKNOWN',
    'GIT_MERGE_CONFLICT'
] as const;

export type EffectReason = typeof EFFECT_REASONS[number];

/**
 * Raised only for a refusal that happens before the commit point, so every
 * authoritative byte is unchanged and a caller may retry after correcting the
 * named subject without first inspecting durable state. A post-commit or
 * uncertain outcome is never thrown: it is reported through `EffectOutcome`
 * so the caller resolves it from the durable journal instead of retrying.
 */
export class EffectExecutionError extends Error {
    constructor(readonly reason: EffectReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'EffectExecutionError';
    }
}

/**
 * Where an effect commits. A `lane-local` effect commits atomically under the
 * lane lock; an `external` effect cannot join a filesystem transaction and so
 * uses prepare/attempt/verify journal states (§12.2).
 */
export type EffectScope = 'lane-local' | 'external';

/**
 * One entry of the closed effect→declared-runtime-action registry. "Requested
 * effects map only to declared runtime actions" (§12.1): an effect with no
 * entry here can never be planned, let alone applied.
 */
export interface DeclaredRuntimeAction {
    readonly effect: EffectType;
    readonly actionId: string;
    readonly scope: EffectScope;
    readonly mutationClass: LaneTaskMutationClass;
    /** External adapters are limited to tmux session creation and Git push (§5). */
    readonly externalAdapter: 'tmux-session' | 'git-push' | null;
}

/**
 * The complete side-effect-free plan derived from one validated proposal
 * (§12.2). Constructing it reads nothing and writes nothing; it is also the
 * `cycle --dry-run` preview value.
 */
export interface EffectPlan {
    readonly schemaVersion: 1;
    readonly laneId: string;
    readonly cycleId: string;
    readonly proposalId: string;
    readonly effect: EffectType;
    readonly actionId: string;
    readonly taskId: string;
    readonly scope: EffectScope;
    readonly targetIds: readonly string[];
    readonly parameters: JsonObject;
    /** Digest of the exact current-state facts revalidated immediately before commit. */
    readonly preconditionDigest: `sha256:${string}`;
    /** `ProposalValidator.computeIdempotencyKey` output — never recomputed by a second formula. */
    readonly idempotencyKey: string;
    readonly snapshotDigest: string;
    readonly policyVersion: string;
}

/** Prepare/attempt/verify recovery journal phases (§12.2, §7 steps 3/6/7/8). */
export const EFFECT_PHASES = ['prepared', 'attempted', 'verified', 'failed', 'uncertain'] as const;
export type EffectPhase = typeof EFFECT_PHASES[number];

/** The durable-event type each phase is published as (§18). */
export const EFFECT_PHASE_EVENT_TYPES: Readonly<Record<EffectPhase, string>> = Object.freeze({
    prepared: 'coordinator-effect-prepared',
    attempted: 'coordinator-effect-attempted',
    verified: 'coordinator-effect-verified',
    failed: 'coordinator-effect-verified',
    uncertain: 'coordinator-effect-attempted'
});

/** One `$defs.durableEvent`-shaped record in `coordinator/journal/effect-events.jsonl` (§9). */
export interface EffectJournalRecord {
    readonly schemaVersion: 1;
    readonly eventId: string;
    readonly type: string;
    readonly sequence: number;
    readonly at: string;
    readonly laneId: string;
    readonly producer: string;
    readonly correlationId: string;
    readonly causationId: string | null;
    readonly policyVersion: string;
    readonly payload: EffectJournalPayload;
}

export interface EffectJournalPayload extends JsonObject {
    readonly phase: EffectPhase;
    readonly effect: EffectType;
    readonly actionId: string;
    readonly idempotencyKey: string;
    readonly preconditionDigest: string;
    readonly targetIds: readonly string[];
    readonly outcome: string;
}

/**
 * Exactly the members `nirvana-integration-architecture.md` §7 enumerates and
 * `foundation/task/runtime/laneInvocationEnvelope.ts` (RT-05, accepted)
 * validates. The writer here and that reader are one contract with two ends;
 * neither may add, drop, or rename a member alone.
 */
export interface InvocationEnvelopeDocument extends JsonObject {
    readonly schemaVersion: 1;
    readonly actionId: string;
    readonly laneId: string;
    readonly catalogId: string;
    readonly catalogSha256: `sha256:${string}`;
    readonly taskId: string;
    readonly inputSchema: string;
    readonly parameters: JsonObject;
    readonly preconditionDigest: `sha256:${string}`;
    readonly idempotencyKey: string;
    readonly lockId: string;
    readonly createdAt: string;
    readonly expiresAt: string;
    readonly resultDestination: string;
    readonly journalDestination: string;
    readonly consumer: {readonly handlerId: string; readonly singleUse: true};
    readonly checksum: `sha256:${string}`;
}

/**
 * The outcome of removing an envelope that never reached a task
 * (correction-04). Removal can itself fail, and reporting that as success
 * would leave an unspent envelope silently blocking every later retry of an
 * effect that never ran — so the result is typed and the caller must answer
 * for it.
 */
export type EnvelopeDiscard =
    | {readonly kind: 'removed'}
    | {readonly kind: 'orphaned'; readonly path: string; readonly cause: string};

/** A refusal that left every authoritative byte unchanged. */
export interface EffectRefused {
    readonly status: 'refused';
    readonly reason: EffectReason;
    readonly subject: string;
    readonly message: string;
}

/** The effect committed and its postconditions were independently verified. */
export interface EffectApplied {
    readonly status: 'applied';
    readonly plan: EffectPlan;
    readonly runResult: LaneTaskRunResult;
    readonly journal: readonly EffectJournalRecord[];
}

/** The idempotency key already committed; the recorded outcome is returned without repeating the effect (§9). */
export interface EffectReplayed {
    readonly status: 'replayed';
    readonly plan: EffectPlan;
    readonly recordedOutcome: EffectJournalRecord;
}

/**
 * An external effect started but its postcondition is unknown
 * (`COORDINATOR_EFFECT_UNCERTAIN`). Recovery reads the journal rather than
 * repeating an unknown effect (§12.2); this is never retried automatically.
 */
export interface EffectUncertain {
    readonly status: 'uncertain';
    readonly plan: EffectPlan;
    readonly reason: Extract<EffectReason, 'COORDINATOR_EFFECT_UNCERTAIN'>;
    readonly message: string;
    readonly journal: readonly EffectJournalRecord[];
}

export type EffectOutcome = EffectApplied | EffectReplayed | EffectRefused | EffectUncertain;
