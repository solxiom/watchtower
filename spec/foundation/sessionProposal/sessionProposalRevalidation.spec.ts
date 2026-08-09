/**
 * CA-26 acceptance proof — **current-state validation** and **stale/illegal
 * refusal**.
 *
 * `operator-session.md` §15.1 (`REVALIDATED → REJECTED_STALE_OR_ILLEGAL`), §23
 * (`OPERATOR_SESSION_PROPOSAL_STALE` / `_ILLEGAL`), and
 * `coordinator-automation.md` §21 "Every transition is revalidated against
 * current state immediately before commit". A confirmation is never sufficient:
 * these specs move the world after confirmation and prove the bridge refuses.
 */
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {effectJournalPath} from '../../../src/foundation/effect/index.js';
import {
    confirmed, invocationsOf, makeLaneDir, OPERATOR_SESSION_ID, removeLaneDir, scenario, type Scenario
} from './support/sessionProposalFixtures.js';

describe('CA-26 current-state validation — state read fresh at every step', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('applies a confirmed proposal whose world has not moved', async function () {
        confirmed(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result.status).toBe('applied');
        expect(invocationsOf(scene.runner)).toBe(1);
    });

    it('re-reads current state rather than reusing the state the confirmation saw', async function () {
        confirmed(scene);
        const before = scene.state.reads;
        await scene.service.apply(scene.applyRequest);
        expect(scene.state.reads).toBeGreaterThan(before);
    });

    it('refuses as stale when the lane snapshot moved after confirmation', async function () {
        confirmed(scene);
        moveSnapshot(scene);
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_STALE'}));
        expect(invocationsOf(scene.runner)).toBe(0);
        expect(existsSync(effectJournalPath(laneDir))).toBeFalse();
    });

    it('refuses as stale when a claim was taken over the proposal target after confirmation', async function () {
        confirmed(scene);
        scene.state.set({...scene.state.get(), activeClaims: [{claimId: 'claim-9', targetIds: ['B1']}]});
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_STALE'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('refuses as stale when the target batch is no longer dispatchable', async function () {
        confirmed(scene);
        const state = scene.state.get();
        scene.state.set({...state, laneState: {...state.laneState, batches: {B1: {batchId: 'B1', status: 'accepted'}}}});
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_STALE'}));
    });

    it('records the terminal rejected-stale-or-illegal state and publishes the validator rejection', async function () {
        confirmed(scene);
        moveSnapshot(scene);
        await scene.service.apply(scene.applyRequest);
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('rejected-stale-or-illegal');
        expect(scene.journal.events.map((event) => event.type))
            .toEqual(['operator-session-proposal-confirmed', 'operator-session-proposal-rejected']);
        expect(scene.journal.events[1].payload.rejectedBy).toBe('validator');
    });

    it('never re-applies a proposal already rejected as stale', async function () {
        confirmed(scene);
        moveSnapshot(scene);
        await scene.service.apply(scene.applyRequest);
        const again = await scene.service.apply(scene.applyRequest);
        expect(again).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_CONFIRMATION_REQUIRED'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });
});

describe('CA-26 illegal refusal — authority the session does not have', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses a coordinator proposal type no operator session may confirm', function () {
        const result = scene.service.record({
            operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001', proposalType: 'amendment-request',
            proposal: {...scene.wire, type: 'propose-reconciliation', body: {projectionId: 'proj-1', plan: 'rewrite'},
                requestedEffects: [{effect: 'reconcile-projection'}]}
        });
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_TYPE_NOT_PERMITTED'}));
    });

    it('refuses a proposal whose coordinator type does not match its declared session category', function () {
        const result = scene.service.record({
            operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001', proposalType: 'hold-place',
            proposal: scene.wire
        });
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_TYPE_MISMATCH'}));
    });

    it('refuses as illegal when the envelope no longer permits the proposal type', async function () {
        confirmed(scene);
        const state = scene.state.get();
        scene.state.set({...state, envelope: {...state.envelope, permittedProposalTypes: ['escalate']}});
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'OPERATOR_SESSION_PROPOSAL_ILLEGAL'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('refuses a malformed proposal at the schema boundary before anything is stored', function () {
        const result = scene.service.record({
            operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001', proposalType: 'candidate-select',
            proposal: {...scene.wire, body: {batchId: 'B1', extra: 'not-in-the-closed-body'}}
        });
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_SCHEMA_INVALID'}));
        expect(scene.store.read(OPERATOR_SESSION_ID, scene.proposalId).kind).toBe('missing');
    });

    it('refuses a duplicate proposal ID rather than overwriting the live lifecycle', function () {
        confirmed(scene);
        const result = scene.service.record({
            operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0002',
            proposalType: 'candidate-select', proposal: scene.wire
        });
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_DUPLICATE'}));
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('operator-confirmed');
    });
});

describe('CA-26 corrupt, missing, and foreign durable state', function () {
    let laneDir: string;
    let scene: Scenario;
    beforeEach(function () { laneDir = makeLaneDir(); scene = scenario(laneDir); });
    afterEach(function () { removeLaneDir(laneDir); });

    it('refuses an unknown proposal without creating one', async function () {
        const result = await scene.service.apply({...scene.applyRequest, proposalId: 'prop-unknown'});
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_NOT_FOUND'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('refuses a truncated document rather than treating it as absent', async function () {
        confirmed(scene);
        writeFileSync(scene.store.path(OPERATOR_SESSION_ID, scene.proposalId), '{"schemaVersion":1,"proposalId"');
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECORD_INVALID'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('refuses a document whose projected expiry disagrees with the carried proposal', async function () {
        confirmed(scene);
        rewrite(scene, (document) => { document.expiresAt = '2099-01-01T00:00:00Z'; });
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECORD_INVALID'}));
    });

    it('refuses a document belonging to a different lane', async function () {
        confirmed(scene);
        rewrite(scene, (document) => { document.laneId = 'lane-other'; });
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_SESSION_MISMATCH'}));
    });

    it('refuses a document whose identity does not match its carried proposal', async function () {
        confirmed(scene);
        rewrite(scene, (document) => { document.proposalId = 'prop-renamed'; });
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECORD_INVALID'}));
    });

    it('refuses a proposal identity that tries to escape the lane directory', async function () {
        const result = await scene.service.apply({...scene.applyRequest, proposalId: '../../../etc/passwd'});
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_RECORD_INVALID'}));
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('refuses an expired proposal and records the terminal expired state', async function () {
        confirmed(scene);
        rewriteProposalExpiry(scene, '2026-08-06T11:00:00Z');
        const result = await scene.service.apply(scene.applyRequest);
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_EXPIRED'}));
        const read = scene.store.read(OPERATOR_SESSION_ID, scene.proposalId);
        expect(read.kind === 'document' && read.document.state).toBe('expired');
        expect(invocationsOf(scene.runner)).toBe(0);
    });

    it('refuses to record an already-expired proposal', function () {
        const fresh = scenario(laneDir);
        const result = fresh.service.record({
            operatorSessionId: OPERATOR_SESSION_ID, sourceTurnId: 'turn-0001', proposalType: 'candidate-select',
            proposal: {...fresh.wire, expiresAt: '2026-08-06T11:00:00Z'}
        });
        expect(result).toEqual(jasmine.objectContaining({status: 'refused', reason: 'SESSION_PROPOSAL_EXPIRED'}));
    });
});

function moveSnapshot(scene: Scenario): void {
    const state = scene.state.get();
    scene.state.set({...state, laneState: {...state.laneState, snapshotDigest: `sha256:${'9'.repeat(64)}`}});
}

function rewrite(scene: Scenario, mutate: (document: Record<string, unknown>) => void): void {
    const path = scene.store.path(OPERATOR_SESSION_ID, scene.proposalId);
    const document = JSON.parse(readFileSync(path, 'utf8')) as Record<string, unknown>;
    mutate(document);
    writeFileSync(path, `${JSON.stringify(document)}\n`);
}

/** Expiry lives on the carried proposal; the projected copy must move with it or the document is corrupt. */
function rewriteProposalExpiry(scene: Scenario, expiresAt: string): void {
    rewrite(scene, (document) => {
        document.expiresAt = expiresAt;
        (document.proposal as Record<string, unknown>).expiresAt = expiresAt;
    });
}
