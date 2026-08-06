import {PROPOSAL_TYPES} from '../../../src/contracts/index.js';
import {ProposalValidator, computeIdempotencyKey} from '../../../src/foundation/proposal/ProposalValidator.js';
import {baseContext, contextFor, FIXTURES, fixtureFor, proposalFor, typedProposalFor, PAST, SNAPSHOT_DIGEST} from './support/proposalFixtures.js';

describe('ProposalValidator — all 14 proposal types', function () {
    it('has exactly the fourteen closed v1 proposal types', function () {
        expect(PROPOSAL_TYPES.length).toBe(14);
        expect(new Set(PROPOSAL_TYPES).size).toBe(14);
    });

    it('accepts the minimum valid proposal for every type', function () {
        const validator = new ProposalValidator();
        for (const fixture of FIXTURES) {
            const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture));
            expect(result.valid).withContext(fixture.type).toBeTrue();
            expect(result.errors).withContext(fixture.type).toEqual([]);
        }
    });
});

describe('ProposalValidator — origin/class/effect matrix', function () {
    const validator = new ProposalValidator();

    it('rejects every type from a permitted-origin-excluded submitter', function () {
        for (const fixture of FIXTURES) {
            const wrongOrigin = fixture.origin === 'operator' ? 'coordinator-D2' : 'operator';
            if (validator.getPermittedOrigins(fixture.type).includes(wrongOrigin)) continue;
            const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {origin: wrongOrigin}));
            expect(result.valid).withContext(fixture.type).toBeFalse();
            expect(result.errors[0].code).withContext(fixture.type).toBe('PROPOSAL_ORIGIN_MISMATCH');
        }
    });

    it('rejects every class-floored type below its minimum decision class', function () {
        for (const fixture of FIXTURES) {
            if (validator.validateProposal(proposalFor(fixture), contextFor(fixture, {decisionClass: 'M0'})).errors[0]?.code !== 'PROPOSAL_CLASS_INSUFFICIENT') continue;
            const result = validator.validateProposal(proposalFor(fixture), contextFor(fixture, {decisionClass: 'M0'}));
            expect(result.errors[0].code).withContext(fixture.type).toBe('PROPOSAL_CLASS_INSUFFICIENT');
        }
        expect(validator.validateProposal(proposalFor(fixtureFor('escalate')), contextFor(fixtureFor('escalate'), {decisionClass: 'M0'})).errors[0].code).toBe('PROPOSAL_CLASS_INSUFFICIENT');
    });

    it('rejects every type when requesting an effect outside its legal set', function () {
        for (const fixture of FIXTURES) {
            const illegalEffect = fixture.type === 'select-ready-batch' ? 'open-escalation' : 'dispatch-batch';
            const proposal = proposalFor(fixture, {requestedEffects: [{effect: illegalEffect}]});
            const result = validator.validateProposal(proposal, contextFor(fixture));
            expect(result.valid).withContext(fixture.type).toBeFalse();
            expect(result.errors[0].code).withContext(fixture.type).toBe('PROPOSAL_EFFECT_ILLEGAL');
        }
    });

    it('rejects a non-empty effect list for advisory-only types', function () {
        const fixture = fixtureFor('classify-reject');
        const proposal = proposalFor(fixture, {requestedEffects: [{effect: 'open-correction'}]});
        const result = new ProposalValidator().validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_EFFECT_ILLEGAL');
    });

    it('reports the exact permitted-origin and legal-effect sets from the closed matrix', function () {
        expect(validator.getPermittedOrigins('select-ready-batch')).toEqual(['coordinator-D1', 'operator']);
        expect(validator.getLegalEffects('select-ready-batch')).toEqual(['dispatch-batch']);
        expect(validator.getLegalEffects('classify-reject')).toEqual([]);
        expect(validator.getPermittedOrigins('propose-specification-resolution')).toEqual(['architect-advisor']);
        expect(validator.getLegalEffects('admit-pack-amendment')).toEqual(['activate-pack-revision']);
        expect(validator.getLegalEffects('resume-specification-blocked-session')).toEqual(['resume-blocked-session']);
    });
});

describe('ProposalValidator — stale, expired, and duplicate', function () {
    const validator = new ProposalValidator();

    it('rejects a stale snapshot digest', function () {
        const fixture = fixtureFor('select-ready-batch');
        const proposal = proposalFor(fixture, {snapshotDigest: `sha256:${'f'.repeat(64)}`});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_STALE_SNAPSHOT');
    });

    it('rejects an expired proposal', function () {
        const fixture = fixtureFor('select-ready-batch');
        const proposal = proposalFor(fixture, {expiresAt: PAST});
        const result = validator.validateProposal(proposal, contextFor(fixture));
        expect(result.errors[0].code).toBe('PROPOSAL_EXPIRED');
    });

    it('detects a duplicate via its recomputed idempotency key', function () {
        const fixture = fixtureFor('select-ready-batch');
        const proposal = proposalFor(fixture);
        const context = contextFor(fixture);
        const key = computeIdempotencyKey(context.laneId, proposal.proposalId, 'dispatch-batch', ['B1'], proposal.snapshotDigest, context.policyVersion);
        const duplicateContext = contextFor(fixture, {journalState: {completedIdempotencyKeys: new Set([key])}});
        const result = validator.validateProposal(proposal, duplicateContext);
        expect(result.errors[0].code).toBe('PROPOSAL_DUPLICATE');
        const shaped = typedProposalFor(fixture);
        expect(validator.isProposalDuplicate(shaped, duplicateContext)).toBeTrue();
        expect(validator.isProposalDuplicate(shaped, context)).toBeFalse();
    });

    it('computes an identical idempotency key from identical inputs', function () {
        const first = computeIdempotencyKey('lane-1', 'prop-1', 'dispatch-batch', ['B1'], SNAPSHOT_DIGEST, 'shipping-v1');
        const second = computeIdempotencyKey('lane-1', 'prop-1', 'dispatch-batch', ['B1'], SNAPSHOT_DIGEST, 'shipping-v1');
        expect(first).toBe(second);
        expect(first).toMatch(/^sha256:[0-9a-f]{64}$/);
        expect(computeIdempotencyKey('lane-2', 'prop-1', 'dispatch-batch', ['B1'], SNAPSHOT_DIGEST, 'shipping-v1')).not.toBe(first);
    });
});

describe('ProposalValidator — schema-invalid, illegal, and malformed input', function () {
    const validator = new ProposalValidator();
    const fixture = fixtureFor('select-ready-batch');
    const context = contextFor(fixture);

    it('rejects a non-object proposal', function () {
        expect(validator.validateProposal('not-an-object', context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
        expect(validator.validateProposal(null, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('rejects a missing required field', function () {
        const proposal: Record<string, unknown> = {...proposalFor(fixture)};
        delete proposal.snapshotDigest;
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('tolerates an additive top-level field per the canonical additionalProperties:true schema', function () {
        const proposal = {...proposalFor(fixture), rationale: 'bounded operator-facing rationale'};
        const result = validator.validateProposal(proposal, context);
        expect(result.valid).toBeTrue();
    });

    it('rejects an extra unsupported body field for its type', function () {
        const proposal = {...proposalFor(fixture), body: {...fixture.body, unexpected: true}};
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('rejects an unsupported proposal type', function () {
        const proposal = {...proposalFor(fixture), type: 'invent-a-type'};
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('rejects a malformed snapshot digest', function () {
        const proposal = {...proposalFor(fixture), snapshotDigest: 'not-a-digest'};
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('rejects a non-RFC-3339 expiry', function () {
        const proposal = {...proposalFor(fixture), expiresAt: 'tomorrow'};
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('rejects duplicate evidenceRefs members', function () {
        const proposal = {...proposalFor(fixture), evidenceRefs: ['finding:F1', 'finding:F1']};
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('rejects a body missing a required field for its type', function () {
        const proposal = {...proposalFor(fixture), body: {}};
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('rejects an unrecognized requested-effect code', function () {
        const proposal = {...proposalFor(fixture), requestedEffects: [{effect: 'delete-everything'}]};
        expect(validator.validateProposal(proposal, context).errors[0].code).toBe('PROPOSAL_SCHEMA_INVALID');
    });

    it('never mutates the proposal or context arguments it is given', function () {
        const proposal = proposalFor(fixture);
        const frozenContext = baseContext();
        const before = JSON.stringify(proposal);
        validator.validateProposal(proposal, frozenContext);
        expect(JSON.stringify(proposal)).toBe(before);
    });
});
