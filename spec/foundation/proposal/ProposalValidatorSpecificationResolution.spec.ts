/**
 * Split from `ProposalValidator.spec.ts` (structural-gate line ceiling —
 * `implementation-quality-and-agent-rules.md`): the specification-resolution
 * lifecycle surface — active-hold conflict/expiry, `admit-pack-amendment`
 * fail-closed admission (F-01), and `resume-specification-blocked-session`
 * fail-closed resume (F-01) — sharing the same fixture builders as the
 * sibling spec files in this directory.
 */
import {ProposalValidator} from '../../../src/foundation/proposal/ProposalValidator.js';
import {contextFor, fixtureFor, proposalFor, ACTIVE_SEAL, CANDIDATE_SEAL, CHANGED_PATHS, CHANGED_REQUIREMENT_IDS, COMMIT_SHA, IMPACT_DIGEST, PARENT_COMMIT_SHA, PAST, SEAL_ALGORITHM, SEAL_VERSION} from './support/proposalFixtures.js';

describe('ProposalValidator — active hold conflict and expiry', function () {
    const validator = new ProposalValidator();

    it('rejects dispatch when the target batch intersects an active hold', function () {
        const fixture = fixtureFor('select-ready-batch');
        const context = contextFor(fixture, {activeHolds: [{holdId: 'hold-1', scope: ['B1'], status: 'active'}]});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_CLAIM_CONFLICT');
    });

    it('does not reject dispatch when the intersecting hold has already expired', function () {
        const fixture = fixtureFor('select-ready-batch');
        const context = contextFor(fixture, {activeHolds: [{holdId: 'hold-1', scope: ['B1'], status: 'expired'}]});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.valid).toBeTrue();
    });

    it('rejects open-correction, request-reroute, and grant-session-budget when the target intersects an active hold', function () {
        const cases: ReadonlyArray<{readonly type: 'open-correction' | 'request-reroute' | 'grant-session-budget'; readonly scope: string}> = [
            {type: 'open-correction', scope: 'B1'}, {type: 'request-reroute', scope: 'ep-2'}, {type: 'grant-session-budget', scope: 'session-1'}
        ];
        for (const testCase of cases) {
            const fixture = fixtureFor(testCase.type);
            const context = contextFor(fixture, {activeHolds: [{holdId: 'hold-1', scope: [testCase.scope], status: 'active'}]});
            const result = validator.validateProposal(proposalFor(fixture), context);
            expect(result.errors[0].code).withContext(testCase.type).toBe('PROPOSAL_CLAIM_CONFLICT');
        }
    });

    it('does not conflict release-hold against the very hold it targets', function () {
        const fixture = fixtureFor('release-hold');
        const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture));
        expect(result.valid).toBeTrue();
    });

    it('rejects a place-hold effect that would create an already-expired hold', function () {
        const fixture = fixtureFor('place-hold');
        const proposal = proposalFor(fixture, {body: {...fixture.body, expiresAt: PAST}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });
});

describe('ProposalValidator — admit-pack-amendment fail-closed admission', function () {
    const validator = new ProposalValidator();
    const fixture = fixtureFor('admit-pack-amendment');

    it('rejects admission with no accepted amendment record', function () {
        const context = contextFor(fixture, {acceptedAmendments: {}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_AUTHORITY_REQUIRED');
    });

    it('rejects a forged candidateSeal that does not match the accepted record', function () {
        const proposal = proposalFor(fixture, {body: {...fixture.body, candidateSeal: `sha256:${'9'.repeat(64)}`}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_SEAL_INVALID');
    });

    it('rejects a forged reviewedCommit that does not match the accepted record', function () {
        const proposal = proposalFor(fixture, {body: {...fixture.body, reviewedCommit: '1'.repeat(40)}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_SEAL_INVALID');
    });

    it('rejects the wrong blockerId or resolutionId binding', function () {
        const wrongBlocker = proposalFor(fixture, {body: {...fixture.body, blockerId: 'blocker-other'}});
        expect(validator.validateProposal(wrongBlocker, contextFor(fixture)).errors[0].code).toBe('PROPOSAL_SEAL_INVALID');
        const wrongResolution = proposalFor(fixture, {body: {...fixture.body, resolutionId: 'res-other'}});
        expect(validator.validateProposal(wrongResolution, contextFor(fixture)).errors[0].code).toBe('PROPOSAL_SEAL_INVALID');
    });

    it('rejects an accepted record with no independent reviewer distinct from its author', function () {
        const context = contextFor(fixture, {
            acceptedAmendments: {
                'amend-1': {
                    amendmentRequestId: 'amend-1', blockerId: 'blocker-1', resolutionId: 'res-1', supersedesSeal: fixture.body.supersedesSeal as string,
                    candidateSeal: fixture.body.candidateSeal as string, parentReviewedCommit: PARENT_COMMIT_SHA, newReviewedCommit: fixture.body.reviewedCommit as string,
                    packAcceptanceRef: 'pack-acceptance.json', reviewerSessionId: 'author-session-1', authorSessionId: 'author-session-1',
                    committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true,
                    changedPaths: CHANGED_PATHS, changedRequirementIds: CHANGED_REQUIREMENT_IDS, impactDigest: IMPACT_DIGEST, sealAlgorithm: SEAL_ALGORITHM, sealVersion: SEAL_VERSION
                }
            }
        });
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_INDEPENDENCE_VIOLATION');
    });

    it('rejects admission when candidateSeal equals the current active seal — not a replacement', function () {
        const proposal = proposalFor(fixture, {body: {...fixture.body, candidateSeal: ACTIVE_SEAL}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_SEAL_INVALID');
        expect(result.errors[0].subject).toBe('body.candidateSeal');
    });

    it('rejects an accepted record whose candidateSeal does not reproduce from its own declared provenance', function () {
        const context = contextFor(fixture, {
            acceptedAmendments: {
                'amend-1': {
                    amendmentRequestId: 'amend-1', blockerId: 'blocker-1', resolutionId: 'res-1', supersedesSeal: ACTIVE_SEAL,
                    candidateSeal: CANDIDATE_SEAL, parentReviewedCommit: PARENT_COMMIT_SHA, newReviewedCommit: COMMIT_SHA,
                    packAcceptanceRef: 'pack-acceptance.json', reviewerSessionId: 'reviewer-1', authorSessionId: 'author-session-1',
                    committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true,
                    changedPaths: ['docs/spec/tampered.md'], changedRequirementIds: CHANGED_REQUIREMENT_IDS, impactDigest: IMPACT_DIGEST, sealAlgorithm: SEAL_ALGORITHM, sealVersion: SEAL_VERSION
                }
            }
        });
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_SEAL_INVALID');
        expect(result.errors[0].subject).toBe('body.candidateSeal');
    });

    it('accepts a valid independent admission matching the accepted record', function () {
        const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture));
        expect(result.valid).toBeTrue();
    });
});

describe('ProposalValidator — resume-specification-blocked-session sync fail-closed', function () {
    const validator = new ProposalValidator();
    const fixture = fixtureFor('resume-specification-blocked-session');

    it('rejects resume with no admitted revision for the blocker', function () {
        const context = contextFor(fixture, {admittedRevisions: {}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('rejects resume with no worktree-sync record', function () {
        const context = contextFor(fixture, {worktreeSyncRecords: {}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('rejects resume against a stale (not-synchronized) worktree', function () {
        const context = contextFor(fixture, {worktreeSyncRecords: {'wt-1': {worktreeId: 'wt-1', status: 'stale', syncedRevision: COMMIT_SHA}}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('rejects resume when the synchronized revision lacks ancestry to the admitted revision', function () {
        const context = contextFor(fixture, {worktreeSyncRecords: {'wt-1': {worktreeId: 'wt-1', status: 'synchronized', syncedRevision: '1'.repeat(40)}}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('rejects resume when the proposal claims a different revision than the worktree actually synchronized', function () {
        const proposal = proposalFor(fixture, {body: {...fixture.body, syncedRevision: '2'.repeat(40)}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
    });

    it('rejects resume targeting an arbitrary worker session not bound to the original blocker assignment', function () {
        const proposal = proposalFor(fixture, {body: {...fixture.body, workerSessionId: 'attacker-session'}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
        expect(result.errors[0].subject).toBe('body.workerSessionId');
    });

    it('rejects resume with no original assignment recorded for the blocker at all', function () {
        const context = contextFor(fixture, {originalAssignments: {}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
        expect(result.errors[0].subject).toBe('body.workerSessionId');
    });

    it('rejects resume when the original assignment claims are no longer active', function () {
        const context = contextFor(fixture, {
            originalAssignments: {'blocker-1': {blockerId: 'blocker-1', workerSessionId: 'worker-1', operatorSessionId: 'opsess-1', worktreeId: 'wt-1', claimIds: ['claim-original']}},
            activeClaims: []
        });
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
        expect(result.errors[0].subject).toBe('body.blockerId');
    });

    it('rejects resume whose body names an operator-session identity other than the original assignment (substituted body identity)', function () {
        const proposal = proposalFor(fixture, {body: {...fixture.body, operatorSessionId: 'opsess-attacker'}});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
        expect(result.errors[0].subject).toBe('body.operatorSessionId');
    });

    it('rejects resume driven under a substituted operator session even when the body names the original identity', function () {
        const context = contextFor(fixture, {operatorSession: {sessionId: 'operator-session-attacker', role: 'operator', confirmedProposalIds: new Set<string>()}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.errors[0].code).toBe('PROPOSAL_PRECONDITION_FAILED');
        expect(result.errors[0].subject).toBe('operatorSession.sessionId');
    });

    it('accepts a valid resume with an admitted revision and synchronized worktree', function () {
        const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture));
        expect(result.valid).toBeTrue();
    });

    it('accepts a valid resume driven under the original operator-session identity', function () {
        const context = contextFor(fixture, {operatorSession: {sessionId: 'opsess-1', role: 'operator', confirmedProposalIds: new Set<string>()}});
        const result = validator.validateProposal(proposalFor(fixture), context);
        expect(result.valid).toBeTrue();
    });
});
