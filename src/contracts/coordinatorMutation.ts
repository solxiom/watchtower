/**
 * Closed command-boundary vocabulary for the three mutating coordinator
 * command groups (CA-25; `docs/spec/coordinator-automation.md` §19,
 * `docs/spec/specification-resolution.md` §9).
 *
 * This module owns type vocabulary only. It declares no policy: which proposal
 * a lane may apply is CA-09's, which effect it maps to is CA-10's, and which
 * durable bytes authorize it is the coordinator's. The command boundary may
 * refuse, never decide.
 */
import type {JsonObject, JsonValue} from './types.js';
import type {LaneRuntimeContext} from './taskRuntime.js';
import type {ProposalType} from './proposals.js';
import type {ValidationContext} from '../foundation/proposal/proposalValidatorContracts.js';

/** The mutating operations `wt coordinator` exposes over accepted services. */
export const COORDINATOR_MUTATION_OPERATIONS = [
    'cycle',
    'escalate',
    'resolution-propose',
    'resolution-resume'
] as const;

export type CoordinatorMutationOperation = typeof COORDINATOR_MUTATION_OPERATIONS[number];

export const COORDINATOR_MUTATION_REASONS = [
    'COORDINATOR_MUTATION_INPUT_INVALID',
    'COORDINATOR_MUTATION_AUTHORIZATION_UNAVAILABLE',
    'COORDINATOR_MUTATION_AUTHORIZATION_INVALID',
    'COORDINATOR_MUTATION_SUBJECT_MISMATCH',
    'COORDINATOR_MUTATION_TYPE_NOT_PERMITTED',
    'COORDINATOR_MUTATION_PROPOSAL_REJECTED',
    'COORDINATOR_MUTATION_EFFECT_UNSUPPORTED',
    'COORDINATOR_MUTATION_EFFECT_REFUSED',
    'COORDINATOR_MUTATION_EFFECT_UNCERTAIN'
] as const;

export type CoordinatorMutationReason = typeof COORDINATOR_MUTATION_REASONS[number];

/**
 * The durable coordinator-owned authorization for one mutation, read from lane
 * bytes. `revalidate` is re-read under CA-10's lane lock, so a proposal or lane
 * fact that changed after preparation refuses at the commit fence.
 */
export interface CoordinatorAuthorization {
    readonly proposal: unknown;
    readonly currentState: ValidationContext;
    readonly revalidate: () => {readonly proposal: unknown; readonly state: ValidationContext};
}

export interface CoordinatorMutationRequest {
    readonly context: LaneRuntimeContext;
    readonly operation: CoordinatorMutationOperation;
    /** The exact identity the operator named on the command line. */
    readonly subject: string;
    /** `escalate --reason`; bound to the durable proposal's own reason text. */
    readonly reason?: string;
    readonly dryRun: boolean;
    /** Absent only when the lane holds no authorization capsule for this operation. */
    readonly authorization?: CoordinatorAuthorization;
}

export interface CoordinatorMutationResultData extends Record<string, JsonValue> {
    readonly schemaVersion: 1;
    readonly operation: CoordinatorMutationOperation;
    readonly subject: string;
    readonly dryRun: boolean;
    readonly applied: boolean;
    readonly proposalId: string;
    readonly proposalType: ProposalType;
    readonly effect: string | null;
    readonly actionId: string | null;
    readonly idempotencyKey: string | null;
    readonly parameters: JsonObject | null;
    /** `previewed` for a dry run, otherwise the settled CA-10 outcome status. */
    readonly status: string;
    readonly detail: string | null;
}

export interface CoordinatorMutationSuccess {
    readonly ok: true;
    readonly data: CoordinatorMutationResultData;
}

export interface CoordinatorMutationFailure {
    readonly ok: false;
    readonly reason: CoordinatorMutationReason;
    readonly target: string;
    readonly detail: string;
}

export type CoordinatorMutationResult = CoordinatorMutationSuccess | CoordinatorMutationFailure;
