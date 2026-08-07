/**
 * The identity fence for CA-17 grants. A grant authorizes capacity for exactly
 * one operator session and one budget segment, so every read, record, and draw
 * passes through here first. Refusing a foreign ledger before any grant inside
 * it is examined is what prevents a grant from being replayed into another
 * segment (correction 01, finding C01-01).
 */
import type {SessionBudgetState, SessionGrant, SessionGrantLedger} from '../../../../contracts/index.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';
import {validateSessionBudgetState} from './sessionRoutingValidation.js';

export interface SessionGrantContext {
    readonly ledger: SessionGrantLedger;
    readonly nowMs: number;
}

export function emptySessionGrantLedger(state: SessionBudgetState): SessionGrantLedger {
    validateSessionBudgetState(state);
    return Object.freeze({
        operatorSessionId: state.operatorSessionId, budgetSegmentId: state.budgetSegmentId,
        grants: Object.freeze([]), appliedConsumptionIds: Object.freeze([])
    });
}

/**
 * Refuses a ledger belonging to another operator session or budget segment
 * before any grant inside it is read. This is the fence that makes a fork's new
 * segment inherit nothing: the parent's ledger is not silently ignored, it is
 * rejected, so no caller can spend a foreign segment's grant by accident.
 */
export function assertLedgerBinding(state: SessionBudgetState, ledger: SessionGrantLedger): SessionGrantLedger {
    validateSessionBudgetState(state);
    if (ledger.operatorSessionId !== state.operatorSessionId || ledger.budgetSegmentId !== state.budgetSegmentId) {
        sessionRoutingFailure('SESSION_GRANT_LEDGER_MISMATCH', ledger.budgetSegmentId,
            `grant ledger ${ledger.operatorSessionId}/${ledger.budgetSegmentId} does not belong to ${state.operatorSessionId}/${state.budgetSegmentId}`);
    }
    for (const grant of ledger.grants) assertGrantBinding(state, grant);
    return ledger;
}

export function assertGrantBinding(state: SessionBudgetState, grant: SessionGrant): SessionGrant {
    if (grant.operatorSessionId !== state.operatorSessionId || grant.budgetSegmentId !== state.budgetSegmentId) {
        sessionRoutingFailure('SESSION_GRANT_LEDGER_MISMATCH', grant.grantId,
            `grant ${grant.grantId} is bound to ${grant.operatorSessionId}/${grant.budgetSegmentId} and may not be spent by ${state.operatorSessionId}/${state.budgetSegmentId}`);
    }
    return grant;
}

