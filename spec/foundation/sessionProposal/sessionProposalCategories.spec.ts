/**
 * CA-26 acceptance proof — **every normative operator-confirmable category is
 * executable, under exactly the authority the accepted matrix grants it**.
 *
 * `operator-session.md` §15.2 lists the effects requiring confirmation and
 * `v1-contracts.md` §5 lists what a normal operator may confirm: rerouting,
 * amendment requests, finite grants, scoped holds, candidate selection,
 * correction supersession, and escalation closure. §5 separately fixes each
 * proposal type's *origin* — D1 for `request-reroute`, D2 for
 * `request-pack-amendment` and `select-correction-route`, `operator` for holds,
 * grants, and operator batch selection.
 *
 * Those two registries are not the same registry, and this file is the proof of
 * that reading: each category is driven end to end through CA-09's **own**
 * accepted fixture — its origin, decision class, and collaborating state — so a
 * category can only pass here if the sole validator actually permits it. A
 * category submitted under an origin the matrix does not permit is refused, and
 * `escalation-close`, which the closed registry cannot express as an effect at
 * all, is refused with its own exact reason rather than executed as something
 * else.
 */
import {existsSync} from 'node:fs';
import {effectJournalPath} from '../../../src/foundation/effect/index.js';
import {getPermittedOrigins} from '../../../src/foundation/proposal/proposalMatrix.js';
import {
    confirmed, EFFECT_BEARING_CATEGORIES, invocationsOf, makeLaneDir, OPERATOR_SESSION_ID, removeLaneDir,
    scenario, storedDocument, type Scenario
} from './support/sessionProposalFixtures.js';

describe('CA-26 §15.2 — every effect-bearing category applies through the accepted validator', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    for (const category of EFFECT_BEARING_CATEGORIES) {
        it(`confirms and applies "${category}" exactly once through the sole executor`, async function () {
            const scene = scenario(laneDir, {category});
            confirmed(scene);
            const result = await scene.service.apply(scene.applyRequest);
            if (result.status === 'refused') throw new Error(`${category} refused: ${result.reason} — ${result.message}`);
            expect(result.status).toBe('applied');
            expect(result.effect.effect).toBe(scene.effect);
            expect(invocationsOf(scene.runner)).toBe(1);
            expect(storedDocument(scene).state).toBe('effect-verified');
        });
    }

    /**
     * The origin the fixture carries is the matrix's, not this bridge's. This
     * asserts that pairing directly, so a future matrix change that moves a
     * category's permitted origin fails here rather than silently widening what
     * an operator session can execute.
     */
    for (const category of EFFECT_BEARING_CATEGORIES) {
        it(`drives "${category}" under an origin the accepted matrix permits`, function () {
            const scene = scenario(laneDir, {category});
            expect(getPermittedOrigins(scene.coordinatorType)).toContain(scene.state.get().origin);
        });
    }
});

describe('CA-26 §15.2 — a category submitted under an origin the matrix refuses', function () {
    let laneDir: string;
    beforeEach(function () { laneDir = makeLaneDir(); });
    afterEach(function () { removeLaneDir(laneDir); });

    /**
     * `request-reroute` is confirmable by a normal operator and originates at
     * D1. Substituting `operator` as the *origin* is exactly the conflation this
     * bridge must not make: CA-09 answers `PROPOSAL_ORIGIN_MISMATCH`, which
     * arrives here as the canonical §23 illegal code, with no effect run.
     */
    it('refuses a routing override whose origin is not the one the matrix permits', async function () {
        const scene = scenario(laneDir, {category: 'routing-override', contextOverrides: {origin: 'operator'}});
        confirmed(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_ILLEGAL'}));
        if (result.status !== 'refused') return;
        expect(result.revalidation?.errors[0]?.code).toBe('PROPOSAL_ORIGIN_MISMATCH');
        expect(invocationsOf(scene.runner)).toBe(0);
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
    });

    it('refuses an amendment request whose origin is not the one the matrix permits', async function () {
        const scene = scenario(laneDir, {category: 'amendment-request', contextOverrides: {origin: 'coordinator-D1'}});
        confirmed(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_ILLEGAL'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });
});

describe('CA-26 §18.6 — escalation closure is not an effect this bridge may plan', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses to record an escalation-close proposal with its own exact reason', function () {
        const result = scene.service.record({
            operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001', proposalType: 'escalation-close',
            proposal: {...scene.wire, type: 'escalate', body: {reason: 'blocked', profile: 'default'},
                requestedEffects: [{effect: 'open-escalation'}]}
        });
        expect(result).toEqual(jasmine.objectContaining({
            status: 'refused', reason: 'SESSION_PROPOSAL_CATEGORY_NOT_EFFECT_BEARING'
        }));
    });

    it('never accepts an escalate proposal through any category, so open-escalation stays unreachable', function () {
        const result = scene.service.record({
            operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001', proposalType: 'candidate-select',
            proposal: {...scene.wire, type: 'escalate', body: {reason: 'blocked', profile: 'default'},
                requestedEffects: [{effect: 'open-escalation'}]}
        });
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_TYPE_NOT_PERMITTED'}));
        expect(scene.store.read(OPERATOR_SESSION_ID, 'prop-escalate').kind).toBe('missing');
    });
});
