/**
 * Protected-reserve arithmetic (`docs/spec/v1-contracts.md` §7: "20% of
 * remaining lane coordinator capacity protected for escalation and recovery
 * and unavailable to grants", `docs/spec/operator-session.md` §13.2).
 *
 * The reserve is a share of *remaining* lane capacity, recomputed on every
 * evaluation, so it shrinks in absolute terms as the lane is consumed and can
 * never be borrowed against: `grantableTokens` is what a grant may draw on and
 * `protectedReserveTokens` is what it may not. Rounding is deliberately in the
 * reserve's favour (`ceil`), so an off-by-one always protects escalation and
 * recovery rather than leaking it to a grant.
 */
import type {SessionBudgetLimits, SessionBudgetState, SessionReserveSplit} from '../../../../contracts/index.js';
import {validateSessionBudgetLimits, validateSessionBudgetState} from './sessionRoutingValidation.js';

export function computeReserveSplit(state: SessionBudgetState, limits: SessionBudgetLimits): SessionReserveSplit {
    validateSessionBudgetState(state);
    validateSessionBudgetLimits(limits);
    const laneRemainingTokens = Math.max(0, limits.laneOperatorSessionTotalTokens - state.laneOperatorSessionUsedTokens);
    const protectedReserveTokens = Math.min(
        laneRemainingTokens, Math.ceil((laneRemainingTokens * limits.protectedCapacityPercent) / 100)
    );
    return Object.freeze({
        laneRemainingTokens, protectedReserveTokens,
        grantableTokens: laneRemainingTokens - protectedReserveTokens,
        protectedCapacityPercent: limits.protectedCapacityPercent
    });
}
