/**
 * CA-25 command-boundary fences: one operation may not spend another's
 * authority, and the identity an operator typed must be the identity the
 * durable proposal already names.
 */
import {validateProposalShape} from '../../../src/foundation/proposal/proposalSchema.js';
import {
    checkMutationFences, isAdvisoryOperation, permittedProposalTypes
} from '../../../src/foundation/lane/coordinator/mutation/coordinatorMutationFences.js';
import {
    authorizationFor, escalateFixture, makeLaneDir, placeHoldFixture, removeLaneDir, requestFor,
    resolutionProposeFixture
} from './support/mutationFixtures.js';

describe('coordinator mutation fences (CA-25)', () => {
    let laneDir: string;
    beforeEach(() => { laneDir = makeLaneDir(); });
    afterEach(() => { removeLaneDir(laneDir); });

    it('refuses a proposal type the operation may not carry', () => {
        const {wire, state} = escalateFixture();
        const request = requestFor(laneDir, 'resolution-resume', authorizationFor(wire, state), {subject: 'blocker-1'});
        const result = checkMutationFences(request, validateProposalShape(wire));
        expect(result?.reason).toBe('COORDINATOR_MUTATION_TYPE_NOT_PERMITTED');
    });

    it('binds a cycle to the trigger the authorized proposal cites', () => {
        const {wire, state} = placeHoldFixture();
        const authorization = authorizationFor(wire, state);
        const proposal = validateProposalShape(wire);
        expect(checkMutationFences(requestFor(laneDir, 'cycle', authorization, {subject: 'trigger-1'}), proposal)).toBeNull();
        const mismatched = checkMutationFences(requestFor(laneDir, 'cycle', authorization, {subject: 'trigger-9'}), proposal);
        expect(mismatched?.reason).toBe('COORDINATOR_MUTATION_SUBJECT_MISMATCH');
    });

    it('binds an escalation to its own cycle and its own reason text', () => {
        const {wire, state} = escalateFixture();
        const authorization = authorizationFor(wire, state);
        const proposal = validateProposalShape(wire);
        expect(checkMutationFences(
            requestFor(laneDir, 'escalate', authorization, {subject: 'cycle-1', reason: 'blocked'}), proposal
        )).toBeNull();
        expect(checkMutationFences(
            requestFor(laneDir, 'escalate', authorization, {subject: 'cycle-2', reason: 'blocked'}), proposal
        )?.reason).toBe('COORDINATOR_MUTATION_SUBJECT_MISMATCH');
        expect(checkMutationFences(
            requestFor(laneDir, 'escalate', authorization, {subject: 'cycle-1', reason: 'a different reason'}), proposal
        )?.reason).toBe('COORDINATOR_MUTATION_SUBJECT_MISMATCH');
    });

    it('binds a resolution operation to the blocker its body names', () => {
        const {wire, state} = resolutionProposeFixture();
        const authorization = authorizationFor(wire, state);
        const proposal = validateProposalShape(wire);
        expect(checkMutationFences(requestFor(laneDir, 'resolution-propose', authorization, {subject: 'blocker-1'}), proposal)).toBeNull();
        expect(checkMutationFences(requestFor(laneDir, 'resolution-propose', authorization, {subject: 'blocker-2'}), proposal)?.reason)
            .toBe('COORDINATOR_MUTATION_SUBJECT_MISMATCH');
    });

    it('refuses --reason outside escalate', () => {
        const {wire, state} = placeHoldFixture();
        const request = requestFor(laneDir, 'cycle', authorizationFor(wire, state), {subject: 'trigger-1', reason: 'safety'});
        expect(checkMutationFences(request, validateProposalShape(wire))?.reason).toBe('COORDINATOR_MUTATION_INPUT_INVALID');
    });

    it('permits only effect-carrying proposals on cycle and marks propose advisory', () => {
        expect(permittedProposalTypes('cycle')).not.toContain('classify-reject');
        expect(permittedProposalTypes('cycle')).not.toContain('escalate');
        expect(permittedProposalTypes('escalate')).toEqual(['escalate', 'place-hold']);
        expect(isAdvisoryOperation('resolution-propose')).toBeTrue();
        expect(isAdvisoryOperation('resolution-resume')).toBeFalse();
    });
});
