/**
 * Split from `ProposalValidator.spec.ts` (structural-gate line ceiling —
 * `implementation-quality-and-agent-rules.md`): state-precondition,
 * claim/budget/confirmation/authority, envelope-binding/capability, and
 * CA-02/CA-03 predecessor-evidence (F-05) checks, sharing the same fixture
 * builders as the sibling spec files in this directory.
 */
import {ProposalValidator} from '../../../src/foundation/proposal/ProposalValidator.js';
import {contextFor, fixtureFor, predecessorAcceptanceRecords, predecessorCurrentStateDocument, predecessorEvidenceDocument, proposalFor} from './support/proposalFixtures.js';

describe('ProposalValidator — state preconditions', function () {
    const validator = new ProposalValidator();

    it('requires a pending batch before select-ready-batch dispatch', function () {
        const fixture = fixtureFor('select-ready-batch');
        const proposal = proposalFor(fixture, {body: {batchId: 'B2'}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('requires an existing target batch for classify-reject, open-correction, and select-correction-route', function () {
        for (const type of ['classify-reject', 'open-correction', 'select-correction-route'] as const) {
            const fixture = fixtureFor(type);
            const field = type === 'classify-reject' ? 'targetBatch' : 'batchId';
            const proposal = proposalFor(fixture, {body: {...fixture.body, [field]: 'B-missing'}});
            const result = validator.validateProposal(proposal, contextFor(fixture));
            expect(result.errors[0].code).withContext(type).toBe('PROPOSAL_PRECONDITION_FAILED');
        }
    });

    it('requires the reroute target inside the active routing policy pool', function () {
        const fixture = fixtureFor('request-reroute');
        const proposal = proposalFor(fixture, {body: {...fixture.body, toEndpointId: 'ep-outside'}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_REROUTE_INVALID');
    });

    it('requires the reroute target present in current endpoint/reservation state, not only the routing policy pool', function () {
        const fixture = fixtureFor('request-reroute');
        const context = contextFor(fixture, {endpointState: [{endpointId: 'ep-1', capacityPoolId: 'pool-1'}]});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_REROUTE_INVALID');
        expect(result.errors[0].subject).toBe('body.toEndpointId');
    });

    it('requires supersedesSeal to match the current active pack seal for admit-pack-amendment', function () {
        const fixture = fixtureFor('admit-pack-amendment');
        const proposal = proposalFor(fixture, {body: {...fixture.body, supersedesSeal: `sha256:${'9'.repeat(64)}`}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_SEAL_INVALID');
    });

    it('requires the blocker hold already released before resume-specification-blocked-session', function () {
        const fixture = fixtureFor('resume-specification-blocked-session');
        const context = contextFor(fixture, {activeHolds: [{holdId: 'hold-blocker-1', scope: ['blocker-1'], status: 'active'}]});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('requires the hold to exist and be active before release-hold', function () {
        const fixture = fixtureFor('release-hold');
        const missing = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {activeHolds: []}));
        expect(missing.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
        const expired = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {activeHolds: [{holdId: 'hold-1', scope: ['B1'], status: 'expired'}]}));
        expect(expired.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });
});

describe('ProposalValidator — claim conflict, budget, confirmation, and authority', function () {
    const validator = new ProposalValidator();

    it('rejects an effect whose target is already held by an active claim', function () {
        const fixture = fixtureFor('select-ready-batch');
        const context = contextFor(fixture, {activeClaims: [{claimId: 'claim-1', targetIds: ['B1']}]});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_CLAIM_CONFLICT');
    });

    it('rejects a session-budget grant exceeding the lane-wide ceiling and protected reserve', function () {
        const fixture = fixtureFor('grant-session-budget');
        const proposal = proposalFor(fixture, {body: {...fixture.body, grantTokens: 10_000}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_BUDGET_OVER_LIMIT');
    });

    it('requires operator confirmation for an always-confirm type', function () {
        const fixture = fixtureFor('propose-reconciliation');
        const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {operatorSession: undefined}));
        expect(result.errors[0].code).toBe('PROPOSAL_CONFIRMATION_REQUIRED');
    });

    it('requires confirmation only when the origin is operator for an operator-origin-only type', function () {
        const fixture = fixtureFor('select-ready-batch');
        const automated = validator.validateProposal(proposalFor(fixture), contextFor(fixture));
        expect(automated.valid).toBeTrue();
        const unconfirmedOperator = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {origin: 'operator', decisionClass: 'D1'}));
        expect(unconfirmedOperator.errors[0].code).toBe('PROPOSAL_CONFIRMATION_REQUIRED');
        const confirmedOperator = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {
            origin: 'operator', decisionClass: 'D1',
            operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['prop-select-ready-batch'])}
        }));
        expect(confirmedOperator.valid).toBeTrue();
    });

    it('requires the recorded pack/spec-authority role for admit-pack-amendment', function () {
        const fixture = fixtureFor('admit-pack-amendment');
        const context = contextFor(fixture, {operatorSession: {sessionId: 'authority-1', role: 'operator', confirmedProposalIds: new Set(['prop-admit-pack-amendment'])}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_AUTHORITY_REQUIRED');
    });

    it('requires the confirming session to be the named spec-authority session', function () {
        const fixture = fixtureFor('admit-pack-amendment');
        const context = contextFor(fixture, {operatorSession: {sessionId: 'someone-else', role: 'pack-spec-authority', confirmedProposalIds: new Set(['prop-admit-pack-amendment'])}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_AUTHORITY_REQUIRED');
    });

    it('rejects admission when the spec-authority session equals the pack-author session (independence violation)', function () {
        const fixture = fixtureFor('admit-pack-amendment');
        const context = contextFor(fixture, {packAuthorSessionId: 'authority-1'});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_INDEPENDENCE_VIOLATION');
    });

    it('never lets an architect advisor confirm or apply its own resolution — advisory-only carries no legal effect', function () {
        const fixture = fixtureFor('propose-specification-resolution');
        expect(validator.getLegalEffects('propose-specification-resolution')).toEqual([]);
        const proposal = proposalFor(fixture, {requestedEffects: [{effect: 'activate-pack-revision'}]});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_EFFECT_ILLEGAL');
    });
});

describe('ProposalValidator — envelope binding and capability', function () {
    const validator = new ProposalValidator();

    it('rejects a proposal type the authorizing envelope did not permit', function () {
        const fixture = fixtureFor('select-ready-batch');
        const context = contextFor(fixture, {envelope: {...contextFor(fixture).envelope, permittedProposalTypes: ['classify-reject']}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_TYPE_NOT_PERMITTED');
    });

    it('rejects a proposal referencing evidence outside the authorizing envelope', function () {
        const fixture = fixtureFor('select-ready-batch');
        const proposal = proposalFor(fixture, {evidenceRefs: ['finding:F1', 'finding:not-in-envelope']});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('rejects a stale envelope whose pack provenance no longer matches the current pack index', function () {
        const fixture = fixtureFor('select-ready-batch');
        const base = contextFor(fixture);
        const context = contextFor(fixture, {envelope: {...base.envelope, packSealId: 'seal-stale'}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('requires the C5 capability floor for propose-specification-resolution', function () {
        const fixture = fixtureFor('propose-specification-resolution');
        const base = contextFor(fixture);
        const context = contextFor(fixture, {envelope: {...base.envelope, endpointCapabilityClass: 'C3'}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_CAPABILITY_INSUFFICIENT');
    });
});

describe('ProposalValidator — CA-02/CA-03 predecessor evidence (F-05)', function () {
    const validator = new ProposalValidator();
    const fixture = fixtureFor('select-ready-batch');

    it('rejects a missing predecessor evidence document', function () {
        const context = contextFor(fixture, {predecessorEvidence: undefined});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('rejects an invalid (non-object) predecessor evidence document', function () {
        const context = contextFor(fixture, {predecessorEvidence: 'not-an-object'});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('rejects stale predecessor current state whose index revision has moved past the evidence', function () {
        const context = contextFor(fixture, {predecessorCurrentState: {...predecessorCurrentStateDocument(), index: {...predecessorCurrentStateDocument().index, revision: 99}}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('rejects corrupt predecessor current state that is not in the accepted state', function () {
        const context = contextFor(fixture, {predecessorCurrentState: {...predecessorCurrentStateDocument(), index: {...predecessorCurrentStateDocument().index, state: 'stale'}}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('rejects an unaccepted predecessor acceptance record (not committed)', function () {
        const records = predecessorAcceptanceRecords();
        const context = contextFor(fixture, {predecessorAcceptanceRecords: [{...records[0] as Record<string, unknown>, committed: false}, records[1]]});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('fails closed (never throws) when predecessorAcceptanceRecords is missing or malformed', function () {
        const missing = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {predecessorAcceptanceRecords: undefined as unknown as readonly [unknown, unknown]}));
        expect(missing.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
        const wrongLength = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {predecessorAcceptanceRecords: [predecessorAcceptanceRecords()[0]] as unknown as readonly [unknown, unknown]}));
        expect(wrongLength.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
    });

    it('rejects an internally-consistent but stale predecessor pack identity that no longer matches the current pack index', function () {
        const staleEvidence = {...predecessorEvidenceDocument(), index: {...predecessorEvidenceDocument().index, packIndex: {...predecessorEvidenceDocument().index.packIndex, packSealId: 'old-seal'}}};
        const staleCurrent = {...predecessorCurrentStateDocument(), index: {...predecessorCurrentStateDocument().index, packIndex: {...predecessorCurrentStateDocument().index.packIndex, packSealId: 'old-seal'}}};
        const [indexRecord, projectionRecord] = predecessorAcceptanceRecords();
        const staleRecords: readonly [unknown, unknown] = [{...indexRecord as Record<string, unknown>, packSealId: 'old-seal'}, {...projectionRecord as Record<string, unknown>, packSealId: 'old-seal'}];
        const context = contextFor(fixture, {predecessorEvidence: staleEvidence, predecessorCurrentState: staleCurrent, predecessorAcceptanceRecords: staleRecords});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
        expect(result.errors[0].subject).toContain('packIndex');
    });

    it('rejects an internally-consistent predecessor whose manifestDigest no longer matches the current pack index (the guard\'s second branch)', function () {
        const staleDigest = `sha256:${'9'.repeat(64)}`;
        const staleEvidence = {...predecessorEvidenceDocument(), index: {...predecessorEvidenceDocument().index, packIndex: {...predecessorEvidenceDocument().index.packIndex, manifestDigest: staleDigest}}};
        const staleCurrent = {...predecessorCurrentStateDocument(), index: {...predecessorCurrentStateDocument().index, packIndex: {...predecessorCurrentStateDocument().index.packIndex, manifestDigest: staleDigest}}};
        const [indexRecord, projectionRecord] = predecessorAcceptanceRecords();
        const staleRecords: readonly [unknown, unknown] = [{...indexRecord as Record<string, unknown>, subjectDigest: staleDigest}, {...projectionRecord as Record<string, unknown>}];
        const context = contextFor(fixture, {predecessorEvidence: staleEvidence, predecessorCurrentState: staleCurrent, predecessorAcceptanceRecords: staleRecords});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_EVIDENCE_DRIFT');
        expect(result.errors[0].subject).toContain('packIndex');
    });

    it('accepts a proposal whose current state rests on valid accepted CA-02/CA-03 predecessor evidence', function () {
        const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture));
        expect(result.valid).toBeTrue();
    });
});
