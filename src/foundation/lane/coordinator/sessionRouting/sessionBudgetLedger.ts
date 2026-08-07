/**
 * CA-17 session budget accounting (`docs/spec/operator-session.md` §13,
 * `docs/spec/v1-contracts.md` §7). Pure state-transition functions, mirroring
 * CA-08's cycle ledger: a debit takes the prior state plus caller-supplied,
 * policy-resolved limits and returns the next state; nothing here writes a
 * file, takes a lock, or keeps a mutable module-level ledger, so an
 * operator-session turn never holds the lane mutation lock through this path.
 *
 * Two invariants this module exists to make structural:
 *
 * - No exported function ever lowers `sessionCumulativeTokens` or
 *   `laneOperatorSessionUsedTokens`. Compaction and forking therefore cannot
 *   reduce cumulative usage, replenish a reserve, or evade a hard budget
 *   (§12), because there is no arithmetic here that could.
 * - A hard level refuses a model-backed turn only. M0 status, history, and
 *   budget queries stay available because they never ask for admission.
 */
import type {
    SessionBudgetAdmission, SessionBudgetCheck, SessionBudgetDebit, SessionBudgetLimits,
    SessionBudgetRecommendation, SessionBudgetResult, SessionBudgetState, TelemetryQuality
} from '../../../../contracts/index.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';
import {activeGrants, effectiveSessionCeilings} from './sessionGrantAllowance.js';
import type {SessionCeilings} from './sessionGrantAllowance.js';
import type {SessionGrantContext} from './sessionGrantBinding.js';
import {applyGrantDraws, drawnGrantIds, planGrantDrawsForDebit} from './sessionBudgetOverflow.js';
import {validateSessionBudgetLimits, validateSessionBudgetState} from './sessionRoutingValidation.js';

export function initialSessionBudgetState(params: Readonly<{
    operatorSessionId: string; laneId: string; budgetSegmentId: string; priorLaneUsedTokens?: number;
}>): SessionBudgetState {
    return validateSessionBudgetState(Object.freeze({
        operatorSessionId: params.operatorSessionId, laneId: params.laneId, budgetSegmentId: params.budgetSegmentId,
        turnInputTokens: 0, turnOutputTokens: 0, sessionCumulativeTokens: 0, sessionModelBackedTurns: 0,
        sessionContextRequests: 0, sessionStoredFullTextBytes: 0,
        laneOperatorSessionUsedTokens: params.priorLaneUsedTokens ?? 0, telemetryQuality: 'reported'
    }));
}

/**
 * Starts a new turn's per-turn counters. A fork or a brand-new session calls
 * `initialSessionBudgetState` with the current lane usage instead, which is
 * why a new budget segment never resets lane-wide usage (§12).
 */
export function beginSessionTurn(state: SessionBudgetState): SessionBudgetState {
    validateSessionBudgetState(state);
    return Object.freeze({...state, turnInputTokens: 0, turnOutputTokens: 0});
}

/**
 * Applies one debit and reports the resulting level. A debit that breaches a
 * hard ceiling is refused and the caller's prior state is untouched.
 *
 * When the debit needs headroom the base limits do not provide, the shortfall is
 * drawn from grant allowance **in the same transition**: the returned `ledger`
 * already records the draw. There is no ordering in which granted capacity is
 * spent without the grant recording it, nor one in which a grant is consumed
 * twice for one debit. A draw requires `debit.debitId` as its idempotency key.
 */
export function debitSessionBudget(
    state: SessionBudgetState, limits: SessionBudgetLimits, debit: SessionBudgetDebit, grants?: SessionGrantContext
): SessionBudgetResult {
    const advanced = nextState(state, limits, debit);
    const draws = planGrantDrawsForDebit(state, advanced, limits, debit);
    const drawn = applyGrantDraws(state, debit, draws, grants);
    const effective = drawn === null ? grants : {ledger: drawn, nowMs: grants?.nowMs ?? 0};
    const check = evaluateSessionBudget(advanced, limits, effective);
    if (check.level === 'hard') {
        sessionRoutingFailure('SESSION_BUDGET_HARD_LIMIT', state.operatorSessionId,
            `debit would exceed the hard limit on: ${check.exceededDimensions.join(', ')}`);
    }
    return {
        state: advanced, check, ledger: drawn,
        drawnGrantIds: drawnGrantIds(grants?.ledger.grants ?? [], drawn)
    };
}

/** Pure evaluation of a state against limits plus any active grants; used for both admission and post-debit reporting. */
export function evaluateSessionBudget(
    state: SessionBudgetState, limits: SessionBudgetLimits, grants?: SessionGrantContext
): SessionBudgetCheck {
    validateSessionBudgetState(state);
    validateSessionBudgetLimits(limits);
    const ceilings = effectiveSessionCeilings(limits, state, grants);
    const exceeded = [
        ...over('turnInputTokens', state.turnInputTokens, limits.perTurnInputTokens),
        ...over('turnOutputTokens', state.turnOutputTokens, limits.perTurnOutputTokens),
        ...over('sessionCumulativeTokens', state.sessionCumulativeTokens, ceilings.sessionCumulativeTokens),
        ...over('sessionContextRequests', state.sessionContextRequests, ceilings.sessionContextRequests),
        ...over('sessionStoredFullTextBytes', state.sessionStoredFullTextBytes, limits.sessionStoredFullTextBytes),
        ...over('sessionModelBackedTurns', state.sessionModelBackedTurns, ceilings.sessionTurns),
        ...over('laneOperatorSessionUsedTokens', state.laneOperatorSessionUsedTokens, limits.laneOperatorSessionTotalTokens)
    ];
    if (exceeded.length > 0) return frozen('hard', exceeded, []);
    const warned = warnedDimensions(state, limits, ceilings);
    return warned.length > 0 ? frozen('soft', [], warned) : frozen('ok', [], []);
}

/**
 * The pre-flight gate for one model-backed turn (§13.1). It refuses when the
 * current state is already hard, when no turn slot remains, when the lane
 * ceiling leaves no headroom, or when provider telemetry is `unknown` and
 * policy does not explicitly permit it for this adapter.
 */
export function admitModelBackedTurn(
    state: SessionBudgetState, limits: SessionBudgetLimits, grants?: SessionGrantContext
): SessionBudgetAdmission {
    const check = evaluateSessionBudget(state, limits, grants);
    const ceilings = effectiveSessionCeilings(limits, state, grants);
    const blocking = [
        ...check.exceededDimensions,
        ...(state.sessionModelBackedTurns >= ceilings.sessionTurns ? ['sessionModelBackedTurns'] : []),
        ...(state.sessionCumulativeTokens >= ceilings.sessionCumulativeTokens ? ['sessionCumulativeTokens'] : []),
        ...(state.laneOperatorSessionUsedTokens >= limits.laneOperatorSessionTotalTokens ? ['laneOperatorSessionUsedTokens'] : []),
        ...(blockedByTelemetry(state.telemetryQuality, limits) ? ['telemetryQuality'] : [])
    ];
    const admitted = blocking.length === 0;
    const effective: SessionBudgetCheck = admitted
        ? check
        : frozen('hard', [...new Set(blocking)].sort(), check.warnedDimensions);
    return Object.freeze({
        check: effective, modelBackedTurnAdmitted: admitted,
        appliedGrantIds: Object.freeze(activeGrants(state, grants).map(grant => grant.grantId)),
        recommendation: recommend(effective)
    });
}

function nextState(state: SessionBudgetState, limits: SessionBudgetLimits, debit: SessionBudgetDebit): SessionBudgetState {
    validateSessionBudgetState(state);
    validateSessionBudgetLimits(limits);
    const input = amount('inputTokens', debit.inputTokens);
    const output = amount('outputTokens', debit.outputTokens);
    const telemetry = debit.telemetryQuality ?? state.telemetryQuality;
    return Object.freeze({
        ...state,
        turnInputTokens: sum('turnInputTokens', state.turnInputTokens, input),
        turnOutputTokens: sum('turnOutputTokens', state.turnOutputTokens, output),
        sessionCumulativeTokens: sum('sessionCumulativeTokens', state.sessionCumulativeTokens, input, output),
        sessionModelBackedTurns: state.sessionModelBackedTurns + (debit.modelBackedTurn === true ? 1 : 0),
        sessionContextRequests: sum('sessionContextRequests', state.sessionContextRequests, amount('contextRequests', debit.contextRequests)),
        sessionStoredFullTextBytes: sum('sessionStoredFullTextBytes', state.sessionStoredFullTextBytes, amount('storedFullTextBytes', debit.storedFullTextBytes)),
        laneOperatorSessionUsedTokens: sum('laneOperatorSessionUsedTokens', state.laneOperatorSessionUsedTokens, input, output),
        telemetryQuality: worst(state.telemetryQuality, telemetry)
    });
}

function warnedDimensions(state: SessionBudgetState, limits: SessionBudgetLimits, ceilings: SessionCeilings): readonly string[] {
    return Object.freeze([
        ...near('turnInputTokens', state.turnInputTokens, limits.perTurnInputTokens, limits.softWarnPercent),
        ...near('sessionCumulativeTokens', state.sessionCumulativeTokens, ceilings.sessionCumulativeTokens, limits.softWarnPercent),
        ...near('sessionModelBackedTurns', state.sessionModelBackedTurns, ceilings.sessionTurns, limits.softWarnPercent),
        ...near('laneOperatorSessionUsedTokens', state.laneOperatorSessionUsedTokens, limits.laneOperatorSessionTotalTokens, limits.softWarnPercent)
    ]);
}

/** Never recommends opening a new session; that would be a budget bypass (§13.1). */
function recommend(check: SessionBudgetCheck): SessionBudgetRecommendation | null {
    if (check.level === 'ok') return null;
    const dimensions = [...check.exceededDimensions, ...check.warnedDimensions];
    if (dimensions.includes('telemetryQuality')) return 'close';
    if (dimensions.includes('laneOperatorSessionUsedTokens')) return 'suspend';
    if (dimensions.includes('turnInputTokens')) return 'compact';
    return 'request-grant';
}

function blockedByTelemetry(quality: TelemetryQuality, limits: SessionBudgetLimits): boolean {
    return quality === 'unknown' && !limits.allowUnknownTelemetry;
}

const TELEMETRY_ORDER: readonly TelemetryQuality[] = Object.freeze(['reported', 'estimated', 'unknown']);
function worst(left: TelemetryQuality, right: TelemetryQuality): TelemetryQuality {
    return TELEMETRY_ORDER.indexOf(left) >= TELEMETRY_ORDER.indexOf(right) ? left : right;
}

function over(name: string, value: number, ceiling: number): readonly string[] { return value > ceiling ? [name] : []; }

function near(name: string, value: number, ceiling: number, warnPercent: number): readonly string[] {
    return ceiling > 0 && value >= Math.ceil((ceiling * warnPercent) / 100) ? [name] : [];
}

function frozen(level: SessionBudgetCheck['level'], exceeded: readonly string[], warned: readonly string[]): SessionBudgetCheck {
    return Object.freeze({level, exceededDimensions: Object.freeze([...exceeded]), warnedDimensions: Object.freeze([...warned])});
}

function amount(subject: string, value: number | undefined): number {
    if (value === undefined) return 0;
    if (!Number.isSafeInteger(value) || value < 0) {
        sessionRoutingFailure('SESSION_BUDGET_STATE_INVALID', subject, `debit value ${String(value)} must be a non-negative safe integer`);
    }
    return value;
}

function sum(subject: string, ...values: readonly number[]): number {
    const total = values.reduce((carry, value) => carry + value, 0);
    if (!Number.isSafeInteger(total)) {
        sessionRoutingFailure('SESSION_BUDGET_HARD_LIMIT', subject, 'accumulated usage is no longer representable as a safe integer');
    }
    return total;
}
