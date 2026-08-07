/**
 * Closed contracts for CA-17 session budgets: finite limits, usage accounting,
 * admission of one model-backed turn, protected escalation/recovery reserves,
 * and finite audited grants (`docs/spec/operator-session.md` §12/§13.1/§13.2,
 * `docs/spec/v1-contracts.md` §5 `grant-session-budget` / §7). Turn
 * classification and route selection are the sibling `sessionRouting.ts`.
 *
 * Nothing here is a proposal or an effect: `SessionGrant` is an evaluated,
 * side-effect-free authorization record. Confirming and applying it belongs to
 * CA-26, and the sole mutation authority remains CA-10's effect executor.
 */
import type {TelemetryQuality} from './contextBroker.js';

/** Finite per-turn and per-session limits resolved from lane policy; never invented here. */
export interface SessionBudgetLimits {
    readonly perTurnInputTokens: number;
    readonly perTurnOutputTokens: number;
    readonly sessionCumulativeTokens: number;
    readonly sessionTurns: number;
    readonly sessionContextRequests: number;
    readonly sessionStoredFullTextBytes: number;
    readonly laneOperatorSessionTotalTokens: number;
    readonly protectedCapacityPercent: number;
    readonly maxConcurrentActiveTurns: number;
    readonly softWarnPercent: number;
    /**
     * `docs/spec/v1-contracts.md` §7: unknown provider capacity never satisfies
     * a hard ceiling, and may run at all only when policy explicitly permits
     * `unknown` telemetry for that adapter.
     */
    readonly allowUnknownTelemetry: boolean;
    readonly unit: 'estimated-tokens';
}

export interface SessionBudgetState {
    readonly operatorSessionId: string;
    readonly laneId: string;
    /** A fork or new session starts a new segment; lane usage below is never reset by that. */
    readonly budgetSegmentId: string;
    readonly turnInputTokens: number;
    readonly turnOutputTokens: number;
    readonly sessionCumulativeTokens: number;
    readonly sessionModelBackedTurns: number;
    readonly sessionContextRequests: number;
    readonly sessionStoredFullTextBytes: number;
    readonly laneOperatorSessionUsedTokens: number;
    /** CA-08's provider-telemetry vocabulary; `unknown` can never satisfy a hard ceiling. */
    readonly telemetryQuality: TelemetryQuality;
}

export interface SessionBudgetDebit {
    /**
     * Idempotency key for this debit. Required whenever the debit needs grant
     * headroom: the draw against the grant is recorded under this key, so a
     * replayed debit never draws an allowance twice.
     */
    readonly debitId?: string;
    readonly inputTokens?: number;
    readonly outputTokens?: number;
    readonly contextRequests?: number;
    readonly storedFullTextBytes?: number;
    readonly modelBackedTurn?: boolean;
    readonly telemetryQuality?: TelemetryQuality;
}

export type SessionBudgetLevel = 'ok' | 'soft' | 'hard';

export interface SessionBudgetCheck {
    readonly level: SessionBudgetLevel;
    readonly exceededDimensions: readonly string[];
    readonly warnedDimensions: readonly string[];
}

/**
 * One atomic accounting transition. When the debit relied on grant headroom the
 * updated `ledger` carries the draw, so spending granted capacity and consuming
 * the grant are a single indivisible step — there is no ordering in which a
 * caller can spend without consuming or consume without spending.
 */
export interface SessionBudgetResult {
    readonly state: SessionBudgetState;
    readonly check: SessionBudgetCheck;
    readonly ledger: SessionGrantLedger | null;
    readonly drawnGrantIds: readonly string[];
}

/**
 * The gate a route request must carry. A hard level admits M0 only: it never
 * blocks status/history/budget queries and never suggests a new session as a
 * bypass (§13.1).
 */
export interface SessionBudgetAdmission {
    readonly check: SessionBudgetCheck;
    readonly modelBackedTurnAdmitted: boolean;
    readonly appliedGrantIds: readonly string[];
    readonly recommendation: SessionBudgetRecommendation | null;
}

export const SESSION_BUDGET_RECOMMENDATIONS = ['close', 'suspend', 'compact', 'request-grant'] as const;
export type SessionBudgetRecommendation = typeof SESSION_BUDGET_RECOMMENDATIONS[number];

/** Exactly one finite grant shape; there is no unbounded or profile-rewriting form. */
export type SessionGrantAllowance =
    | {readonly kind: 'turns'; readonly turns: number}
    | {readonly kind: 'usage'; readonly dimension: SessionGrantDimension; readonly value: number};

export const SESSION_GRANT_DIMENSIONS = ['sessionCumulativeTokens', 'sessionContextRequests'] as const;
export type SessionGrantDimension = typeof SESSION_GRANT_DIMENSIONS[number];

export interface SessionGrantRequest {
    readonly grantId: string;
    readonly operatorSessionId: string;
    readonly laneId: string;
    /** The segment this grant is for. Declared explicitly and refused when it disagrees with the current state. */
    readonly budgetSegmentId: string;
    readonly allowance: SessionGrantAllowance;
    readonly reason: string;
    readonly requestedAtMs: number;
    readonly expiresAtMs: number | null;
    readonly operatorConfirmed: boolean;
    readonly telemetryQuality: TelemetryQuality;
}

/** Remaining lane capacity split into the protected reserve and the grantable remainder. */
export interface SessionReserveSplit {
    readonly laneRemainingTokens: number;
    readonly protectedReserveTokens: number;
    readonly grantableTokens: number;
    readonly protectedCapacityPercent: number;
}

export interface SessionGrant {
    readonly grantId: string;
    readonly operatorSessionId: string;
    readonly budgetSegmentId: string;
    readonly allowance: SessionGrantAllowance;
    readonly reason: string;
    readonly grantedAtMs: number;
    readonly expiresAtMs: number | null;
    readonly reserveSplit: SessionReserveSplit;
    /**
     * Units of this grant's allowance already drawn — turns for a `turns`
     * grant, granted units for a `usage` grant. A grant is finite because the
     * effective ceiling uses `allowance - consumed`, so an exhausted grant
     * contributes nothing and can never be drawn a second time.
     */
    readonly consumed: number;
}

/**
 * One session's grants. The ledger carries its own identity so a ledger
 * belonging to a different session or budget segment is refused rather than
 * silently searched: a grant may never transfer across either boundary.
 * `appliedConsumptionIds` makes every debit replay-safe — re-applying a
 * recorded consumption is a no-op instead of a second draw.
 */
export interface SessionGrantLedger {
    readonly operatorSessionId: string;
    readonly budgetSegmentId: string;
    readonly grants: readonly SessionGrant[];
    readonly appliedConsumptionIds: readonly string[];
}

/** One idempotent draw against a finite allowance. */
export interface SessionGrantUsageConsumption {
    readonly consumptionId: string;
    readonly dimension: SessionGrantDimension;
    readonly amount: number;
}
