/**
 * Grant-request validation for CA-17. Split out of `sessionBudgetGrants.ts` so
 * that module owns only grant arithmetic and ledger state while this one owns
 * the closed request contract: mandatory operator confirmation, a non-empty
 * reason, a finite positive allowance in a supported dimension, a coherent
 * expiry window, known provider telemetry, and same-session/same-lane
 * accounting. Every refusal is a stable typed reason and no request is
 * partially accepted.
 */
import type {SessionBudgetState, SessionGrantRequest} from '../../../../contracts/index.js';
import {SESSION_GRANT_DIMENSIONS} from '../../../../contracts/index.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';
import {validateSessionBudgetState} from './sessionRoutingValidation.js';

export function validateGrantRequest(request: SessionGrantRequest, state: SessionBudgetState): void {
    validateSessionBudgetState(state);
    if (!request.operatorConfirmed) {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', request.grantId, 'policy requires explicit operator confirmation for a budget override grant');
    }
    if (typeof request.reason !== 'string' || request.reason.trim() === '') {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', request.grantId, '--reason is required and must be non-empty');
    }
    if (request.operatorSessionId !== state.operatorSessionId || request.laneId !== state.laneId) {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', request.grantId,
            'a grant may not transfer accounting between operator sessions or lanes');
    }
    if (request.budgetSegmentId !== state.budgetSegmentId) {
        sessionRoutingFailure('SESSION_GRANT_LEDGER_MISMATCH', request.grantId,
            `the request declares budget segment ${request.budgetSegmentId} but the session is on ${state.budgetSegmentId}`);
    }
    if (request.telemetryQuality === 'unknown') {
        sessionRoutingFailure('SESSION_GRANT_UNKNOWN_CAPACITY', request.grantId,
            'unknown provider capacity cannot be granted as a guessed token amount');
    }
    requireTimestamp('requestedAtMs', request.requestedAtMs);
    if (request.expiresAtMs !== null) {
        requireTimestamp('expiresAtMs', request.expiresAtMs);
        if (request.expiresAtMs <= request.requestedAtMs) {
            sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', request.grantId, '--expires-at must be after the request time');
        }
    }
    validateAllowance(request);
}

function validateAllowance(request: SessionGrantRequest): void {
    const allowance = request.allowance;
    if (allowance.kind === 'turns') {
        if (!Number.isSafeInteger(allowance.turns) || allowance.turns < 1) {
            sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', request.grantId, '--turns must be a positive safe integer');
        }
        return;
    }
    if (allowance.kind !== 'usage' || !SESSION_GRANT_DIMENSIONS.includes(allowance.dimension)) {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', request.grantId, '--usage must name a supported bounded dimension');
    }
    if (!Number.isSafeInteger(allowance.value) || allowance.value < 1) {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', request.grantId, '--usage value must be a positive safe integer');
    }
}

export function requireTimestamp(subject: string, value: number): void {
    if (!Number.isSafeInteger(value) || value < 0) {
        sessionRoutingFailure('SESSION_GRANT_REQUEST_INVALID', subject, `${subject} must be a non-negative safe integer millisecond timestamp`);
    }
}
