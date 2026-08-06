/**
 * `ProposalValidator` — the sole validation authority for v1 typed proposals
 * (`docs/spec/v1-contracts.md` §5, `docs/spec/coordinator-automation.md` §12.1,
 * `specification-resolution-batch-amendment.md`). Every effect the executor
 * (not-yet-accepted CA-10) may take is gated by one call to `validateProposal`;
 * no other module may duplicate this pipeline or the idempotency-key formula.
 *
 * The checks run in a fixed order — schema, predecessor evidence, staleness,
 * expiry, envelope binding, origin, class, capability, effect legality,
 * idempotency, precondition, claim/hold conflict, budget, confirmation,
 * spec-resolution authority — and stop at the first failure: a proposal never
 * accumulates a second, contradictory rejection reason, and no check runs past a boundary
 * that already failed closed. Every method is pure: no filesystem, clock, or
 * model access, and no mutation of `proposal` or `currentState`.
 */
import type {DecisionProposal, EffectType, ProposalOrigin, ProposalReason, ProposalType, ProposalValidationResult} from '../../contracts/index.js';
import {computeIdempotencyKey} from './proposalIdempotency.js';
import {ProposalShapeError} from './proposalErrors.js';
import {checkCapability, checkEnvelopeBinding} from './proposalEnvelope.js';
import {getLegalEffects, getPermittedOrigins, proposalRule} from './proposalMatrix.js';
import {checkBudget, checkClaimConflict, checkConfirmation, checkPrecondition, extractTargetIds} from './proposalPreconditions.js';
import {checkSpecResolutionAuthority} from './proposalSpecResolution.js';
import {checkPredecessorEvidence} from './proposalPredecessor.js';
import {validateProposalShape} from './proposalSchema.js';
import type {ValidationContext} from './proposalValidatorContracts.js';

const CLASS_ORDER: Readonly<Record<string, number>> = Object.freeze({M0: 0, D1: 1, D2: 2, D3: 3});

export class ProposalValidator {
    validateProposal(proposal: unknown, currentState: ValidationContext): ProposalValidationResult {
        let shaped: DecisionProposal;
        try {
            shaped = validateProposalShape(proposal);
        } catch (thrown) {
            if (thrown instanceof ProposalShapeError) return invalid(thrown.reason, thrown.subject, thrown.message);
            throw thrown;
        }

        const predecessorError = checkPredecessorEvidence(currentState);
        if (predecessorError !== null) return invalid(predecessorError.code, predecessorError.subject, predecessorError.message);

        if (shaped.snapshotDigest !== currentState.laneState.snapshotDigest) {
            return invalid('PROPOSAL_STALE_SNAPSHOT', 'snapshotDigest', 'proposal snapshot digest does not match current lane state');
        }
        if (Date.parse(shaped.expiresAt) <= Date.parse(currentState.now)) {
            return invalid('PROPOSAL_EXPIRED', 'expiresAt', 'proposal has expired');
        }

        const envelopeError = checkEnvelopeBinding(shaped, currentState);
        if (envelopeError !== null) return invalid(envelopeError.code, envelopeError.subject, envelopeError.message);

        const originError = checkOrigin(shaped.type, currentState.origin);
        if (originError !== null) return invalid(...originError);
        const classError = checkClass(shaped.type, currentState.decisionClass);
        if (classError !== null) return invalid(...classError);
        const capabilityError = checkCapability(shaped.type, currentState);
        if (capabilityError !== null) return invalid(capabilityError.code, capabilityError.subject, capabilityError.message);

        const effectError = checkEffects(shaped);
        if (effectError !== null) return invalid(...effectError);

        if (this.isProposalDuplicate(shaped, currentState)) {
            return invalid('PROPOSAL_DUPLICATE', 'requestedEffects', 'idempotency key for this proposal has already been completed');
        }

        const precondition = checkPrecondition(shaped, currentState);
        if (precondition !== null) return invalid(precondition.code, precondition.subject, precondition.message);
        const claim = checkClaimConflict(shaped, currentState);
        if (claim !== null) return invalid(claim.code, claim.subject, claim.message);
        const budget = checkBudget(shaped, currentState);
        if (budget !== null) return invalid(budget.code, budget.subject, budget.message);
        const confirmation = checkConfirmation(shaped, currentState.origin, currentState);
        if (confirmation !== null) return invalid(confirmation.code, confirmation.subject, confirmation.message);
        const authority = checkSpecResolutionAuthority(shaped, currentState);
        if (authority !== null) return invalid(authority.code, authority.subject, authority.message);

        return Object.freeze({valid: true, errors: Object.freeze([]), warnings: Object.freeze([])});
    }

    /** Recomputes every requested effect's idempotency key against the injected journal state — no hidden ledger inside this validator. */
    isProposalDuplicate(proposal: DecisionProposal, currentState: ValidationContext): boolean {
        const targetIds = extractTargetIds(proposal);
        return proposal.requestedEffects.some((requested) => currentState.journalState.completedIdempotencyKeys.has(
            computeIdempotencyKey(currentState.laneId, proposal.proposalId, requested.effect, targetIds, proposal.snapshotDigest, currentState.policyVersion)
        ));
    }

    getPermittedOrigins(proposalType: ProposalType): readonly ProposalOrigin[] {
        return getPermittedOrigins(proposalType);
    }

    getLegalEffects(proposalType: ProposalType): readonly EffectType[] {
        return getLegalEffects(proposalType);
    }
}

export {computeIdempotencyKey};

function checkOrigin(type: ProposalType, origin: ProposalOrigin): readonly [code: 'PROPOSAL_ORIGIN_MISMATCH', subject: string, message: string] | null {
    return getPermittedOrigins(type).includes(origin) ? null : ['PROPOSAL_ORIGIN_MISMATCH', 'origin', `origin "${origin}" is not permitted for proposal type "${type}"`];
}

function checkClass(type: ProposalType, decisionClass: string): readonly [code: 'PROPOSAL_CLASS_INSUFFICIENT', subject: string, message: string] | null {
    const minimum = proposalRule(type).minimumClass;
    if (minimum === null) return null;
    return CLASS_ORDER[decisionClass] >= CLASS_ORDER[minimum] ? null : ['PROPOSAL_CLASS_INSUFFICIENT', 'decisionClass', `decision class "${decisionClass}" is below the "${minimum}" floor for proposal type "${type}"`];
}

function checkEffects(proposal: DecisionProposal): readonly [code: 'PROPOSAL_EFFECT_ILLEGAL', subject: string, message: string] | null {
    const legal = getLegalEffects(proposal.type);
    const illegal = proposal.requestedEffects.find((requested) => !legal.includes(requested.effect));
    if (illegal !== undefined) return ['PROPOSAL_EFFECT_ILLEGAL', 'requestedEffects', `effect "${illegal.effect}" is not legal for proposal type "${proposal.type}"`];
    if (legal.length === 0 && proposal.requestedEffects.length > 0) return ['PROPOSAL_EFFECT_ILLEGAL', 'requestedEffects', `proposal type "${proposal.type}" maps to no direct effect`];
    return null;
}

function invalid(code: ProposalReason, subject: string, message: string): ProposalValidationResult {
    return Object.freeze({valid: false, errors: Object.freeze([Object.freeze({code, subject, message})]), warnings: Object.freeze([])});
}
