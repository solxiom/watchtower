/**
 * CA-26 acceptance proof — **explicit confirmation**.
 *
 * `operator-session.md` §15.1/§15.4 and `coordinator-automation.md` §21:
 * "unconfirmed proposals produce no effects", and apply "requires explicit
 * confirmation". These specs prove the confirmation is real, exclusive to the
 * owning session, bound to the exact proposal bytes and current state, and
 * durable before any event claims it.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {effectJournalPath} from '../../../src/foundation/effect/index.js';
import {
    confirmed, invocationsOf, makeLaneDir, OPERATOR_SESSION_ID, recorded, removeLaneDir, scenario, storedDocument,
    type Scenario
} from './support/sessionProposalFixtures.js';

describe('CA-26 explicit confirmation — an unconfirmed proposal produces no effect', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('records a proposal in the proposed state with no confirmation and no effect', function () {
        recorded(scene);
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind).toBe('document');
        if (read.kind !== 'document') return;
        expect(read.document.state).toBe('proposed');
        expect(read.document.confirmation).toBeNull();
        expect(read.document.effect).toBeNull();
    });

    it('refuses to apply an unconfirmed proposal and never reaches the executor', async function () {
        recorded(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_CONFIRMATION_REQUIRED'}));
        expect(invocationsOf(scene.runner)).toBe(0);
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
    });

    it('leaves the proposal applicable after an unconfirmed apply refusal', async function () {
        recorded(scene);
        await scene.service.apply(scene.applyRequest);
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('proposed');
    });

    it('publishes no session-journal event for a proposal that was only recorded', function () {
        recorded(scene);
        expect(scene.journal.events).toEqual([]);
    });
});

describe('CA-26 explicit confirmation — who may confirm, and what it binds', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('records the confirmation durably and publishes exactly one confirmed event', function () {
        confirmed(scene);
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('operator-confirmed');
        expect(scene.journal.events.map((event) => event.type)).toEqual(['operator-session-proposal-confirmed']);
        expect(scene.journal.events[0].payload.proposalId).toBe(scene.proposalId);
    });

    it('refuses a confirmation from a session that does not own the proposal', function () {
        recorded(scene);
        const result = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'opsess-other');
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_SESSION_MISMATCH'}));
        expect(scene.journal.events).toEqual([]);
    });

    it('refuses a second confirmation of an already-confirmed proposal', function () {
        confirmed(scene);
        const result = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_STATE_INVALID'}));
    });

    it('binds the confirmation to a digest that changes when the current state changes', function () {
        confirmed(scene);
        const first = digestOf(scene);
        removeLaneDir(laneDir);
        laneDir = makeLaneDir();
        const moved = scenario(laneDir, {contextOverrides: {activeClaims: [{claimId: 'claim-9', targetIds: ['B7']}]}});
        confirmed(moved);
        expect(digestOf(moved)).not.toBe(first);
    });

    it('binds the confirmation to the exact proposal bytes', function () {
        confirmed(scene);
        const first = digestOf(scene);
        removeLaneDir(laneDir);
        laneDir = makeLaneDir();
        const other = scenario(laneDir);
        recorded(other, {evidenceRefs: ['finding:F1', 'finding:F2']});
        other.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: other.proposalId}, OPERATOR_SESSION_ID);
        expect(digestOf(other)).not.toBe(first);
    });

    it('refuses to apply a confirmation whose bound digest no longer reproduces', async function () {
        confirmed(scene);
        tamperBindingDigest(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_CONFIRMATION_BINDING_MISMATCH'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('refuses to apply when current state reports no operator session at all', async function () {
        confirmed(scene);
        scene.state.set({...scene.state.get(), operatorSession: undefined});
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_NOT_FOUND'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('reports a confirmation whose journal append failed as confirmed, with the event still owed', function () {
        recorded(scene);
        scene.journal.failNext();
        const result = scene.service.confirm({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, OPERATOR_SESSION_ID);
        expect(result.status).toBe('confirmed');
        expect(storedDocument(scene).state).toBe('operator-confirmed');
        expect(storedDocument(scene).publication)
            .toEqual(jasmine.objectContaining({event: 'operator-session-proposal-confirmed', status: 'pending'}));
        expect(scene.journal.events).toEqual([]);
    });
});

describe('CA-26 explicit confirmation — operator rejection is terminal', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('moves an operator-rejected proposal to a terminal state and publishes the rejection', function () {
        recorded(scene);
        const result = scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'not now');
        expect(result.status).toBe('operator-rejected');
        expect(storedDocument(scene).state).toBe('operator-rejected');
        expect(storedDocument(scene).confirmation).toBeNull();
        expect(scene.journal.events.map((event) => event.type)).toEqual(['operator-session-proposal-rejected']);
        expect(scene.journal.events[0].payload.rejectedBy).toBe('operator');
    });

    it('never applies an operator-rejected proposal', async function () {
        recorded(scene);
        scene.service.reject({operatorSessionId: OPERATOR_SESSION_ID, proposalId: scene.proposalId}, 'not now');
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_CONFIRMATION_REQUIRED'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });
});

function digestOf(scene: Scenario): string {
    const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
    if (read.kind !== 'document' || read.document.confirmation === null) throw new Error('expected a confirmed document');
    return read.document.confirmation.bindingDigest;
}

/** Rewrite only the stored binding digest, exactly as a hand-edited or replayed confirmation would look. */
function tamperBindingDigest(scene: Scenario): void {
    const path = scene.store.path(OPERATOR_SESSION_ID, scene.proposalId);
    const document = JSON.parse(readFileSync(path, 'utf8')) as {confirmation: {bindingDigest: string}};
    document.confirmation.bindingDigest = `sha256:${'0'.repeat(64)}`;
    writeFileSync(path, `${JSON.stringify(document)}\n`);
}
