/**
 * Operator-witness helper for REL-01 phase 7b only.
 *
 * Simulates coordinator/operator authoring of a CA-25-valid cycle authorization
 * capsule. Implementer recovery must not call this to unblock a blocked batch;
 * it exists so automated e2e can replay an operator witness that already
 * happened outside the implementer session.
 */
import {ProposalValidator} from '../../../src/foundation/proposal/index.js';
import {baseContext, fixtureFor, proposalFor} from '../../foundation/proposal/support/proposalFixtures.js';
import {writeCapsule} from '../../foundation/coordinatorMutation/support/mutationFixtures.js';

const TRIGGER = 'rel-one-cycle-trigger';

export function cycleTriggerId(): string {
    return TRIGGER;
}

/** Writes `coordinator/authorizations/cycle.json` after CA-09 validation. */
export function witnessCycleAuthorizationCapsule(laneDir: string): string {
    const fixture = fixtureFor('place-hold');
    const evidence = Object.freeze(['finding:F1', `event:${TRIGGER}`]);
    const wire = proposalFor(fixture, {evidenceRefs: evidence});
    const base = baseContext({origin: fixture.origin, decisionClass: fixture.decisionClass, ...fixture.contextOverrides});
    const state = baseContext({
        origin: fixture.origin, decisionClass: fixture.decisionClass, ...fixture.contextOverrides,
        envelope: {...base.envelope, evidenceRefs: evidence}
    });
    const validation = new ProposalValidator().validateProposal(wire, state);
    if (!validation.valid) {
        const codes = validation.errors.map((entry) => entry.code).join(', ');
        throw new Error(`operator witness capsule would fail CA-09: ${codes}`);
    }
    return writeCapsule(laneDir, 'cycle', wire, state);
}
