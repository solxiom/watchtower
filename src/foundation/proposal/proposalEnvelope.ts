/**
 * Envelope/predecessor authority and capability fences — run right after
 * schema/stale/expiry and before origin/class legality
 * (`specification-resolution-batch-amendment.md` Batch Ownership row for
 * CA-07/CA-09; CA-07 `DecisionEnvelope.permittedProposalTypes`/`.packIndex`).
 * A proposal is only as trustworthy as the immutable envelope that authorized
 * it: the type must have been permitted by that envelope, its referenced
 * evidence and pack provenance must still match current state, and the
 * resolved endpoint must meet the proposal type's capability floor. Every
 * function is pure and reads only `DecisionProposal`/`ValidationContext`.
 */
import type {DecisionProposal, ProposalType, ValidationError} from '../../contracts/index.js';
import type {ValidationContext} from './proposalValidatorContracts.js';
import {proposalRule} from './proposalMatrix.js';

const CAPABILITY_ORDER: Readonly<Record<string, number>> = Object.freeze({C2: 0, C3: 1, C5: 2});

function error(code: ValidationError['code'], subject: string, message: string): ValidationError {
    return Object.freeze({code, subject, message});
}

export function checkEnvelopeBinding(proposal: DecisionProposal, context: ValidationContext): ValidationError | null {
    const envelope = context.envelope;
    if (!envelope.permittedProposalTypes.includes(proposal.type)) {
        return error('PROPOSAL_TYPE_NOT_PERMITTED', 'type', `proposal type "${proposal.type}" was not permitted by the authorizing decision envelope`);
    }
    if (!proposal.evidenceRefs.every((ref) => envelope.evidenceRefs.includes(ref))) {
        return error('PROPOSAL_EVIDENCE_DRIFT', 'evidenceRefs', 'proposal references evidence outside the authorizing envelope');
    }
    if (envelope.packSealId !== context.packIndex.packSealId || envelope.manifestDigest !== context.packIndex.manifestDigest) {
        return error('PROPOSAL_EVIDENCE_DRIFT', 'envelope', 'authorizing envelope pack provenance no longer matches the current pack index');
    }
    return null;
}

export function checkCapability(type: ProposalType, context: ValidationContext): ValidationError | null {
    const minimum = proposalRule(type).minimumCapability;
    if (minimum === null) return null;
    const actual = context.envelope.endpointCapabilityClass;
    return CAPABILITY_ORDER[actual] >= CAPABILITY_ORDER[minimum]
        ? null
        : error('PROPOSAL_CAPABILITY_INSUFFICIENT', 'envelope.endpointCapabilityClass', `endpoint capability "${actual}" is below the "${minimum}" floor for proposal type "${type}"`);
}
