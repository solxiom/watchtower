/**
 * CA-17 correction-01 finding **C01-01** — a grant must never transfer across an
 * operator session or budget segment, including through a replay lookup that
 * runs before the ledger's own identity is validated, and including a request
 * that declares a segment other than the one the session is on.
 */
import {
    activeGrants, admitModelBackedTurn, consumeGrantTurn, effectiveSessionCeilings,
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

describe('CA-17 C01-01 — a grant never crosses a session or budget segment', () => {
    /** A ledger and grant that genuinely belong to a different budget segment of the same session. */
    function foreignSegmentLedger(): SessionGrantLedger {
        const foreignState = budgetState({budgetSegmentId: 'seg-foreign'});
        const foreignLedger = emptySessionGrantLedger(foreignState);
        const grant = evaluateSessionGrant(grantRequest({budgetSegmentId: 'seg-foreign'}), foreignState,
            OPERATOR_STANDARD_LIMITS, context(foreignLedger));
        expect(grant.budgetSegmentId).toBe('seg-foreign');
        return recordSessionGrant(foreignState, context(foreignLedger), grant);
    }

    it('refuses to replay a recorded grant from a foreign budget segment', () => {
        const state = budgetState({budgetSegmentId: 'seg-1'});
        expect(reasonOf(() => evaluateSessionGrant(grantRequest(), state, OPERATOR_STANDARD_LIMITS, context(foreignSegmentLedger()))))
            .toBe('SESSION_GRANT_LEDGER_MISMATCH');
    });

    it('refuses to read a foreign-segment ledger at all, rather than silently returning nothing', () => {
        const state = budgetState({budgetSegmentId: 'seg-1'});
        expect(reasonOf(() => activeGrants(state, context(foreignSegmentLedger())))).toBe('SESSION_GRANT_LEDGER_MISMATCH');
        expect(reasonOf(() => effectiveSessionCeilings(OPERATOR_STANDARD_LIMITS, state, context(foreignSegmentLedger()))))
            .toBe('SESSION_GRANT_LEDGER_MISMATCH');
        expect(reasonOf(() => admitModelBackedTurn(state, OPERATOR_STANDARD_LIMITS, context(foreignSegmentLedger()))))
            .toBe('SESSION_GRANT_LEDGER_MISMATCH');
    });

    it('refuses to record a grant bound to a foreign budget segment into this segment ledger', () => {
        const foreignState = budgetState({budgetSegmentId: 'seg-foreign'});
        const foreign = evaluateSessionGrant(grantRequest({budgetSegmentId: 'seg-foreign'}), foreignState,
            OPERATOR_STANDARD_LIMITS, context(emptySessionGrantLedger(foreignState)));
        const state = budgetState({budgetSegmentId: 'seg-1'});
        expect(reasonOf(() => recordSessionGrant(state, context(EMPTY), foreign))).toBe('SESSION_GRANT_LEDGER_MISMATCH');
    });

    it('refuses a ledger belonging to a different operator session', () => {
        const otherState = budgetState({operatorSessionId: 'os-other', laneId: 'lane-1'});
        const otherLedger = emptySessionGrantLedger(otherState);
        expect(reasonOf(() => activeGrants(budgetState(), context(otherLedger)))).toBe('SESSION_GRANT_LEDGER_MISMATCH');
    });

    it('refuses to draw against a foreign-segment grant', () => {
        const state = budgetState({budgetSegmentId: 'seg-1'});
        expect(reasonOf(() => consumeGrantTurn(state, context(foreignSegmentLedger()), 'draw-1')))
            .toBe('SESSION_GRANT_LEDGER_MISMATCH');
    });

    it('gives a forked segment its own empty ledger with no inherited allowance', () => {
        const parent = budgetState({sessionModelBackedTurns: 50});
        record(evaluateSessionGrant(grantRequest(), parent, OPERATOR_STANDARD_LIMITS, context(EMPTY)), parent);
        const forked = budgetState({operatorSessionId: 'os-2', budgetSegmentId: 'seg-2', sessionModelBackedTurns: 50});
        const forkedLedger = emptySessionGrantLedger(forked);
        expect(activeGrants(forked, context(forkedLedger))).toEqual([]);
        expect(admitModelBackedTurn(forked, OPERATOR_STANDARD_LIMITS, context(forkedLedger)).modelBackedTurnAdmitted).toBeFalse();
    });
});

describe('CA-17 C01-01 — the grant request declares its own budget segment', () => {
    it('refuses a request whose declared segment disagrees with the session state', () => {
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({budgetSegmentId: 'seg-elsewhere'}),
            budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY)))).toBe('SESSION_GRANT_LEDGER_MISMATCH');
    });

    it('binds the issued grant to the declared segment', () => {
        const grant = evaluateSessionGrant(grantRequest(), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY));
        expect(grant.budgetSegmentId).toBe('seg-1');
    });

    it('refuses a replay whose declared segment differs from the recorded grant', () => {
        const ledger = record(evaluateSessionGrant(grantRequest(), budgetState(), OPERATOR_STANDARD_LIMITS, context(EMPTY)));
        const other = budgetState({budgetSegmentId: 'seg-2'});
        expect(reasonOf(() => evaluateSessionGrant(grantRequest({budgetSegmentId: 'seg-2'}), other,
            budgetLimits(), context(ledger)))).toBe('SESSION_GRANT_LEDGER_MISMATCH');
    });
});
