/**
 * CA-17 finite grant proof: confirmation, finiteness, expiry, replay
 * idempotency, and every §13.2 prohibition — no profile rewrite, no raised
 * lane ceiling, no replenished capacity, no protected-reserve draw, and no
 * cross-session accounting transfer.
 */
import {
    activeGrants, admitModelBackedTurn, debitSessionBudget, effectiveSessionCeilings,
    emptySessionGrantLedger, evaluateSessionGrant, recordSessionGrant, SessionRoutingError
} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import type {SessionGrantLedger, SessionRoutingReason} from '../../../src/contracts/index.js';
import type {SessionGrantContext} from '../../../src/foundation/lane/coordinator/sessionRouting/index.js';
import {budgetLimits, budgetState, grantRequest, OPERATOR_STANDARD_LIMITS} from './support/sessionRoutingFixtures.js';

const NOW = 10_000;

function reasonOf(run: () => unknown): SessionRoutingReason {
    try {
        run();
    } catch (error) {
        if (error instanceof SessionRoutingError) return error.reason;
        throw error;
    }
    throw new Error('expected a SessionRoutingError');
}

function context(ledger: SessionGrantLedger, nowMs = NOW): SessionGrantContext {
    return {ledger, nowMs};
}

const EMPTY = emptySessionGrantLedger(budgetState());

function record(grant: ReturnType<typeof evaluateSessionGrant>, state = budgetState(), ledger = EMPTY): SessionGrantLedger {
    return recordSessionGrant(state, context(ledger), grant);
}

describe('CA-17 finite budget grants', () => {
    it('grants an explicit number of turns within unprotected lane capacity', () => {
        const grant = evaluateSessionGrant(grantRequest(), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY));
        expect(grant.allowance).toEqual({kind: 'turns', turns: 2});
        expect(grant.consumed).toBe(0);
        expect(grant.reserveSplit.grantableTokens).toBe(1_600_000);
    });

    it('grants a bounded usage dimension', () => {
        const grant = evaluateSessionGrant(
            grantRequest({allowance: {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 50_000}}),
            budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY));
        expect(grant.allowance).toEqual({kind: 'usage', dimension: 'sessionCumulativeTokens', value: 50_000});
    });

    it('raises only the per-session ceilings, never the lane-wide hard limit', () => {
        const state = budgetState();
        const ledger = record(evaluateSessionGrant(
            grantRequest({allowance: {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 50_000}}),
            state, OPERATOR_STANDARD_LIMITS, context(EMPTY)));
        const ceilings = effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, state, context(ledger));
        expect(ceilings.sessionCumulativeTokens).toBe(550_000);
        expect(Object.keys(ceilings)).not.toContain('laneOperatorSessionTotalTokens');
        const atLaneCeiling = budgetState({laneOperatorSessionUsedTokens: 2_000_000});
        expect(admitModelBackedTurn(atLaneCeiling, OPERATOR_STANDARD_LIMITS, context(ledger)).modelBackedTurnAdmitted).toBeFalse();
    });

    it('extends the session turn ceiling and admits a turn that was previously refused', () => {
        const state = budgetState({sessionModelBackedTurns: 50});
        expect(admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS).modelBackedTurnAdmitted).toBeFalse();
        const ledger = record(evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)));
        const admitted = admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS, context(ledger));
        expect(admitted.modelBackedTurnAdmitted).toBeTrue();
        expect(admitted.appliedGrantIds).toEqual(['grant-1']);
    });

    it('never draws on the protected escalation and recovery reserve', () => {
        const nearlySpent = budgetState({laneOperatorSessionUsedTokens: 1_950_000});
        expect(reasonOf(() => evaluateSessionGrant(
            grantRequest({allowance: {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 45_000}}),
            nearlySpent, OPERATOR_STANDARD_LIMITS, context(EMPTY)))).toBe('SESSION_GRANT_RESERVE_PROTECTED');
    });

    it('refuses a grant beyond the remaining lane ceiling with a distinct reason', () => {
        expect(reasonOf(() => evaluateSessionGrant(
            grantRequest({allowance: {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 3_000_000}}),
            budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY)))).toBe('SESSION_GRANT_EXCEEDS_LANE_CEILING');
    });

    it('charges a turns grant against lane capacity at its worst case', () => {
        const limits = budgetLimits({laneOperatorSessionTotalTokens: 500_000, sessionCumulativeTokens: 500_000});
        expect(reasonOf(() => evaluateSessionGrant(
            grantRequest({allowance: {kind: 'turns', turns: 10}}), budgetState(), limits, context(EMPTY))))
            .toBe('SESSION_GRANT_RESERVE_PROTECTED');
    });
});

describe('CA-17 grant refusals', () => {
    it('requires explicit operator confirmation', () => {
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({operatorConfirmed: false}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
            .toBe('SESSION_GRANT_REQUEST_INVALID');
    });

    it('requires a non-empty reason', () => {
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({reason: '   '}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
            .toBe('SESSION_GRANT_REQUEST_INVALID');
    });

    it('refuses an unbounded or non-positive allowance', () => {
        for (const allowance of [{kind: 'turns', turns: 0}, {kind: 'turns', turns: 1.5},
            {kind: 'usage', dimension: 'sessionCumulativeTokens', value: 0}] as const) {
            expect(reasonOf(() => evaluateSessionGrant(grantRequest({allowance}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
                .withContext(JSON.stringify(allowance)).toBe('SESSION_GRANT_REQUEST_INVALID');
        }
    });

    it('refuses an unsupported usage dimension', () => {
        const allowance = {kind: 'usage', dimension: 'money', value: 5} as unknown as ReturnType<typeof grantRequest>['allowance'];
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({allowance}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
            .toBe('SESSION_GRANT_REQUEST_INVALID');
    });

    it('never grants unknown provider capacity as a guessed token amount', () => {
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({telemetryQuality: 'unknown'}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
            .toBe('SESSION_GRANT_UNKNOWN_CAPACITY');
    });

    it('never transfers accounting from another operator session or lane', () => {
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({operatorSessionId: 'os-other'}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
            .toBe('SESSION_GRANT_REQUEST_INVALID');
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({laneId: 'lane-other'}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
            .toBe('SESSION_GRANT_REQUEST_INVALID');
    });

    it('refuses an expiry that is not after the request time', () => {
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({expiresAtMs: 1_000}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY))))
            .toBe('SESSION_GRANT_REQUEST_INVALID');
    });

    it('refuses a grant that has already expired at evaluation time', () => {
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({expiresAtMs: 5_000}), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY, 9_000))))
            .toBe('SESSION_GRANT_EXPIRED');
    });
});

describe('CA-17 grant replay, expiry, and segment scoping', () => {
    it('is idempotent: replaying the identical request returns the recorded grant', () => {
        const state = budgetState();
        const first = evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(EMPTY));
        const ledger = record(first);
        expect(evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(ledger))).toBe(first);
        expect(recordSessionGrant(state, context(ledger), first).grants.length).toBe(1);
    });

    it('refuses a different grant reusing a recorded grant id', () => {
        const ledger = record(evaluateSessionGrant(grantRequest(), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY)));
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({allowance: {kind: 'turns', turns: 9}}), budgetState(), OPERATOR_STANDARD_LIMITS, context(ledger))))
            .toBe('SESSION_GRANT_DUPLICATE_REPLAY');
    });

    it('stops applying a grant once it expires', () => {
        const state = budgetState({sessionModelBackedTurns: 50});
        const ledger = record(evaluateSessionGrant(
            grantRequest({expiresAtMs: 20_000}), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)));
        expect(admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS, context(ledger, 15_000)).modelBackedTurnAdmitted).toBeTrue();
        expect(admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS, context(ledger, 25_000)).modelBackedTurnAdmitted).toBeFalse();
    });

    it('stops applying a turns grant once every granted turn is spent through the atomic debit', () => {
        let state = budgetState({sessionModelBackedTurns: 50});
        let ledger = record(evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)), state);
        for (const debitId of ['debit-1', 'debit-2']) {
            const result = debitSessionBudget(state, OPERATOR_STANDARD_LIMITS,
                {debitId, inputTokens: 1, modelBackedTurn: true}, context(ledger));
            state = result.state;
            ledger = result.ledger ?? ledger;
        }
        expect(state.sessionModelBackedTurns).toBe(52);
        expect(activeGrants(state, context(ledger)).length).toBe(0);
        expect(admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS, context(ledger)).modelBackedTurnAdmitted).toBeFalse();
    });

    it('never rewrites the caller supplied session profile limits', () => {
        const before = JSON.stringify(OPERATOR_STANDARD_LIMITS);
        const state = budgetState();
        const ledger = record(evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)));
        effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, state, context(ledger));
        expect(JSON.stringify(OPERATOR_STANDARD_LIMITS)).toBe(before);
    });

    it('never replenishes recorded usage', () => {
        const state = budgetState({sessionCumulativeTokens: 400_000, laneOperatorSessionUsedTokens: 400_000});
        const ledger = record(evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(EMPTY)));
        const after = admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS, context(ledger));
        expect(after.modelBackedTurnAdmitted).toBeTrue();
        expect(state.sessionCumulativeTokens).toBe(400_000);
        expect(state.laneOperatorSessionUsedTokens).toBe(400_000);
    });
});
