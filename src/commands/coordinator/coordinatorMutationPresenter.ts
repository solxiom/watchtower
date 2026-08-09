import {output as prettyOutput} from '@nirvana/base/utils/pretty';
import {buildCommandResult, renderResult} from '../../foundation/presentation/index.js';
import {createWatchtowerError} from '../../contracts/index.js';
import type {
    CoordinatorMutationFailure, CoordinatorMutationReason, CoordinatorMutationResult
} from '../../contracts/coordinatorMutation.js';

/**
 * The one place a mutating coordinator command's typed result becomes operator
 * output (CA-25). Each closed reason maps to exactly one v1 error code, so a
 * refusal's exit code is derived from the reason the owner reported rather than
 * re-judged by the command.
 */
const CODES: Readonly<Record<CoordinatorMutationReason, Parameters<typeof createWatchtowerError>[0]>> = Object.freeze({
    COORDINATOR_MUTATION_INPUT_INVALID: 'ERR_INVALID_ARGUMENT',
    COORDINATOR_MUTATION_AUTHORIZATION_UNAVAILABLE: 'ERR_MISSING_DEPENDENCY',
    COORDINATOR_MUTATION_AUTHORIZATION_INVALID: 'ERR_PARSE_FAILURE',
    COORDINATOR_MUTATION_SUBJECT_MISMATCH: 'ERR_INVALID_ARGUMENT',
    COORDINATOR_MUTATION_TYPE_NOT_PERMITTED: 'ERR_UNSAFE_MUTATION',
    COORDINATOR_MUTATION_PROPOSAL_REJECTED: 'ERR_STALE_PROPOSAL',
    COORDINATOR_MUTATION_EFFECT_UNSUPPORTED: 'ERR_MISSING_DEPENDENCY',
    COORDINATOR_MUTATION_EFFECT_REFUSED: 'ERR_EFFECT_CONFLICT',
    COORDINATOR_MUTATION_EFFECT_UNCERTAIN: 'ERR_EFFECT_CONFLICT'
});

export function presentMutationResult(
    command: string, result: CoordinatorMutationResult, options: {readonly json: boolean; readonly noColor: boolean}
): void {
    if (!result.ok) throw mutationError(command, result);
    prettyOutput.write(renderResult(buildCommandResult(command, result.data), options), 'info', 0, true);
}

export function mutationError(command: string, failure: CoordinatorMutationFailure): Error {
    return createWatchtowerError(CODES[failure.reason], {
        operation: command, target: failure.target, remediation: `${failure.reason}: ${failure.detail}`
    });
}
