/**
 * Closed command-boundary vocabulary for `wt coordinator session` and
 * `wt coordinator ask` (CA-24; `docs/spec/v1.md` §9,
 * `docs/spec/cli-session.md` §4/§9, `docs/spec/specification-resolution.md` §9).
 *
 * Type vocabulary only. This module declares no policy: which lifecycle
 * transition is legal is CA-15's, which retained bytes exist is CA-16R's,
 * which proposal may apply is CA-09/CA-26's, and which amendment may activate
 * is CA-27/CA-10's. The command boundary may refuse and report; it never
 * decides.
 */
import type {JsonObject} from './types.js';

/** The read-only `session` forms; every one of these is model-free (M0). */
export const SESSION_READ_ACTIONS = [
    'list',
    'show',
    'history',
    'export',
    'budget',
    'proposals'
] as const;

/** The `session` forms that change durable operator-session state. */
export const SESSION_WRITE_ACTIONS = [
    'suspend',
    'resume',
    'close',
    'fork',
    'pin',
    'unpin',
    'prune',
    'compact',
    'apply',
    'amendment'
] as const;

/** The `session` forms that open an ephemeral local attachment. */
export const SESSION_ENTRY_ACTIONS = ['create', 'attach'] as const;

export type SessionReadAction = typeof SESSION_READ_ACTIONS[number];
export type SessionWriteAction = typeof SESSION_WRITE_ACTIONS[number];
export type SessionEntryAction = typeof SESSION_ENTRY_ACTIONS[number];
/** `wt coordinator ask` is the non-interactive one-result sibling of the entry forms. */
export type SessionCommandAction = SessionReadAction | SessionWriteAction | SessionEntryAction | 'ask';

/**
 * Every refusal this boundary can report. Each is a stable reason an operator
 * or a script may branch on; none of them is a repair instruction.
 */
export const SESSION_COMMAND_REASONS = [
    'SESSION_COMMAND_ARGUMENT_INVALID',
    'SESSION_COMMAND_LANE_UNAVAILABLE',
    'SESSION_COMMAND_NOT_FOUND',
    'SESSION_COMMAND_STATE_INVALID',
    'SESSION_COMMAND_TURN_ACTIVE',
    'SESSION_COMMAND_JOURNAL_UNAVAILABLE',
    'SESSION_COMMAND_REFERENCE_INVALID',
    'SESSION_COMMAND_TERMINAL_REQUIRED',
    'SESSION_COMMAND_ROUTE_UNAVAILABLE',
    'SESSION_COMMAND_OBSERVER_READ_ONLY',
    'SESSION_COMMAND_CONFIRMATION_REQUIRED',
    'SESSION_COMMAND_EFFECT_REFUSED',
    'SESSION_COMMAND_AMENDMENT_REFUSED',
    'SESSION_COMMAND_COMPACTION_REFUSED'
] as const;

export type SessionCommandReason = typeof SESSION_COMMAND_REASONS[number];

export interface SessionCommandSuccess {
    readonly ok: true;
    readonly data: SessionCommandResultData;
}

export interface SessionCommandFailure {
    readonly ok: false;
    readonly reason: SessionCommandReason;
    readonly target: string;
    readonly detail: string;
}

export type SessionCommandResult = SessionCommandSuccess | SessionCommandFailure;

/** The versioned payload every `session`/`ask` form renders, human or JSON. */
export interface SessionCommandResultData extends JsonObject {
    readonly schemaVersion: 1;
    readonly action: SessionCommandAction;
    readonly laneId: string;
    /** The operator session the form addressed, or `null` for lane-wide reads. */
    readonly operatorSessionId: string | null;
    /** True when the form previewed rather than committed. */
    readonly dryRun: boolean;
    /** True when durable bytes changed; always false for a read or a preview. */
    readonly applied: boolean;
    readonly detail: string | null;
    readonly result: JsonObject;
}

export function sessionCommandFailure(
    reason: SessionCommandReason, target: string, detail: string
): SessionCommandFailure {
    return {ok: false, reason, target, detail};
}
