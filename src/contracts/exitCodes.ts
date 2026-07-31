import type {ErrorCode} from './errors.js';

/** Process exit codes reserved by the v1 public command-error schema. */
export type ExitCode = 1 | 2 | 3 | 4 | 5;

export const EXIT_INTERNAL: ExitCode = 1;
export const EXIT_INVALID_INPUT: ExitCode = 2;
export const EXIT_NOT_FOUND: ExitCode = 3;
export const EXIT_UNAVAILABLE: ExitCode = 4;
export const EXIT_CONFLICT: ExitCode = 5;

/**
 * Maps each stable reason code to its normative error family. More than one
 * reason code may share a family exit code; a reason code never has two maps.
 */
export const errorCodeExitCodes: Readonly<Record<ErrorCode, ExitCode>> = Object.freeze({
    ERR_INTERNAL: EXIT_INTERNAL,
    ERR_INVALID_ARGUMENT: EXIT_INVALID_INPUT,
    ERR_INVALID_LANE_CONFIG: EXIT_INVALID_INPUT,
    ERR_PARSE_FAILURE: EXIT_INVALID_INPUT,
    ERR_PATH_ESCAPE: EXIT_INVALID_INPUT,
    ERR_CURSOR_INVALID: EXIT_INVALID_INPUT,
    ERR_UNSUPPORTED_VERSION: EXIT_INVALID_INPUT,
    ERR_AMBIGUOUS_SELECTION: EXIT_NOT_FOUND,
    ERR_LANE_NOT_FOUND: EXIT_NOT_FOUND,
    ERR_SESSION_NOT_FOUND: EXIT_NOT_FOUND,
    ERR_WORKSPACE_NOT_FOUND: EXIT_NOT_FOUND,
    ERR_INDEX_UNAVAILABLE: EXIT_UNAVAILABLE,
    ERR_INTEGRITY_FAILURE: EXIT_UNAVAILABLE,
    ERR_MISSING_DEPENDENCY: EXIT_UNAVAILABLE,
    ERR_POLICY_UNAVAILABLE: EXIT_UNAVAILABLE,
    ERR_PREFLIGHT_FAILED: EXIT_UNAVAILABLE,
    ERR_ROUTE_UNAVAILABLE: EXIT_UNAVAILABLE,
    ERR_CONFIRMATION_REQUIRED: EXIT_CONFLICT,
    ERR_EFFECT_CONFLICT: EXIT_CONFLICT,
    ERR_LOCK_CONFLICT: EXIT_CONFLICT,
    ERR_MANAGED_CONFLICT: EXIT_CONFLICT,
    ERR_STALE_PROPOSAL: EXIT_CONFLICT,
    ERR_UNSAFE_MUTATION: EXIT_CONFLICT
});

export function exitCodeFor(errorCode: ErrorCode): ExitCode {
    return errorCodeExitCodes[errorCode];
}
