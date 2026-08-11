import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import {buildCommandResult, renderResult} from '../../../foundation/presentation/index.js';
import {MAX_CONTEXT_VALUE_LENGTH, createWatchtowerError} from '../../../contracts/index.js';
import type {
    SessionCommandFailure, SessionCommandReason, SessionCommandResult
} from '../../../contracts/sessionCommand.js';

/**
 * The one place a session command's typed result becomes operator output
 * (CA-24). Each closed reason maps to exactly one v1 error code, so a
 * refusal's exit code is derived from the reason the accepted owner reported
 * rather than re-judged by the command.
 */
const CODES: Readonly<Record<SessionCommandReason, Parameters<typeof createWatchtowerError>[0]>> = Object.freeze({
    SESSION_COMMAND_ARGUMENT_INVALID: 'ERR_INVALID_ARGUMENT',
    SESSION_COMMAND_LANE_UNAVAILABLE: 'ERR_LANE_NOT_FOUND',
    SESSION_COMMAND_NOT_FOUND: 'ERR_SESSION_NOT_FOUND',
    SESSION_COMMAND_STATE_INVALID: 'ERR_UNSAFE_MUTATION',
    SESSION_COMMAND_TURN_ACTIVE: 'ERR_EFFECT_CONFLICT',
    SESSION_COMMAND_JOURNAL_UNAVAILABLE: 'ERR_INTEGRITY_FAILURE',
    SESSION_COMMAND_REFERENCE_INVALID: 'ERR_INVALID_ARGUMENT',
    SESSION_COMMAND_TERMINAL_REQUIRED: 'ERR_PREFLIGHT_FAILED',
    SESSION_COMMAND_ROUTE_UNAVAILABLE: 'ERR_ROUTE_UNAVAILABLE',
    SESSION_COMMAND_OBSERVER_READ_ONLY: 'ERR_UNSAFE_MUTATION',
    SESSION_COMMAND_CONFIRMATION_REQUIRED: 'ERR_CONFIRMATION_REQUIRED',
    SESSION_COMMAND_EFFECT_REFUSED: 'ERR_EFFECT_CONFLICT',
    SESSION_COMMAND_AMENDMENT_REFUSED: 'ERR_UNSAFE_MUTATION',
    SESSION_COMMAND_COMPACTION_REFUSED: 'ERR_INDEX_UNAVAILABLE'
});

export function presentSessionResult(
    command: string, result: SessionCommandResult, options: {readonly json: boolean; readonly noColor: boolean}
): void {
    if (!result.ok) throw sessionError(command, result);
    prettyOutput.write(renderResult(buildCommandResult(command, result.data), options), 'info', 0, true);
}

export function sessionError(command: string, failure: SessionCommandFailure): Error {
    return createWatchtowerError(CODES[failure.reason], {
        operation: safeContext(command, 'session command'),
        target: safeContext(failure.target, failure.reason),
        remediation: safeContext(`${failure.reason}: ${failure.detail}`, failure.reason)
    });
}

/**
 * Correction 01: an owner's `detail` is free text — it may carry a long path,
 * a nested remediation sentence, or a newline from a wrapped `Error.message`.
 * The error contract rejects an empty, over-long, or control-character context
 * value by throwing a raw `TypeError`, which would replace this boundary's
 * typed refusal with an unhandled crash — exactly the failure a packaged
 * `session list` against a malformed lane marker produced. Bounding the value
 * here keeps the refusal typed and its exit code derived from the reason.
 */
function safeContext(value: string, fallback: string): string {
    const collapsed = value.replace(/[\u0000-\u001f\u007f]+/gu, ' ').replace(/\s+/gu, ' ').trim();
    const text = collapsed.length > 0 ? collapsed : fallback;
    return text.length <= MAX_CONTEXT_VALUE_LENGTH ? text : `${text.slice(0, MAX_CONTEXT_VALUE_LENGTH - 1)}\u2026`;
}

