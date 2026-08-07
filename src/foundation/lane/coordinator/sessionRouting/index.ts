/**
 * Public surface of the CA-17 session routing and budget capsule. Consumers
 * classify one operator turn, select the endpoint for its allocation slot, and
 * account for grants, reserves, and usage. Re-exports only.
 *
 * Explicitly outside this surface: session persistence and lifecycle (CA-15),
 * the derived session index and capsules (CA-16R), endpoint eligibility and
 * reservations (CA-06), brokered context and cycle budgets (CA-08), proposal
 * confirmation and apply (CA-26), and holds and amendments (CA-27). Nothing
 * exported here produces a proposal, journals an event, or mutates lane state.
 */
export {classifySessionTurn, reclassifyAfterEndpointEscalation} from './sessionTurnClassifier.js';
export {selectSessionRoute} from './sessionRouteSelector.js';
export {
    admitModelBackedTurn, beginSessionTurn, debitSessionBudget, evaluateSessionBudget, initialSessionBudgetState
} from './sessionBudgetLedger.js';
export {evaluateSessionGrant, recordSessionGrant} from './sessionBudgetGrants.js';
export {assertGrantBinding, assertLedgerBinding, emptySessionGrantLedger} from './sessionGrantBinding.js';
export type {SessionGrantContext} from './sessionGrantBinding.js';
export {activeGrants, effectiveSessionCeilings, grantedAllowance, remainingAllowance} from './sessionGrantAllowance.js';
export type {SessionCeilings} from './sessionGrantAllowance.js';
export {consumeGrantTurn, consumeGrantUsage} from './sessionGrantConsumption.js';
export {planGrantDrawsForDebit} from './sessionBudgetOverflow.js';
export {computeReserveSplit} from './sessionReserves.js';
export {
    parseSessionRoutingPlan, validateSessionBudgetLimits, validateSessionBudgetState, validateSessionRoutingPlan
} from './sessionRoutingValidation.js';
export {SESSION_ROUTING_REASONS, SessionRoutingError, sessionRoutingFailure} from './sessionRoutingErrors.js';
export type {SessionRoutingReason} from './sessionRoutingErrors.js';
