/**
 * Lane-state precondition, claim/conflict, budget, and confirmation checks —
 * pipeline steps 7-9 (`docs/spec/coordinator-automation.md` §12.1). The
 * specification-resolution admission/resume authority checks are a distinct
 * concern owned by `proposalSpecResolution.ts`; `checkResumePrecondition` is
 * consumed here only to dispatch the `resume-specification-blocked-session`
 * precondition case. Every function is pure: it reads
 * `DecisionProposal`/`ValidationContext` and returns a `ValidationError | null`,
 * never throwing and never mutating either argument. Every switch narrows on
 * `proposal.body.type` (not the sibling `proposal.type`) so each case's typed
 * body fields are read without a cast.
 */
import type {DecisionProposal, ValidationError} from '../../contracts/index.js';
import type {ValidationContext} from './proposalValidatorContracts.js';
import {proposalRule} from './proposalMatrix.js';
import {checkResumePrecondition} from './proposalSpecResolution.js';

function error(code: ValidationError['code'], subject: string, message: string): ValidationError {
    return Object.freeze({code, subject, message});
}

/** The body field(s) that identify the effect target(s) — used for both the claim/conflict check and the idempotency key's `targetIds`. */
export function extractTargetIds(proposal: DecisionProposal): readonly string[] {
    const body = proposal.body;
    switch (body.type) {
        case 'select-ready-batch': return [body.batchId];
        case 'classify-reject': return [body.targetBatch];
        case 'open-correction': return [body.batchId];
        case 'select-correction-route': return [body.batchId];
        case 'request-reroute': return [body.toEndpointId];
        case 'propose-reconciliation': return [body.projectionId];
        case 'request-pack-amendment': return [body.packId];
        case 'propose-specification-resolution': return [body.blockerId];
        case 'admit-pack-amendment': return [body.amendmentRequestId];
        case 'resume-specification-blocked-session': return [body.workerSessionId];
        case 'grant-session-budget': return [body.sessionId];
        case 'place-hold': return [...body.scope];
        case 'release-hold': return [body.holdId];
        case 'escalate': return [];
    }
}

export function checkPrecondition(proposal: DecisionProposal, context: ValidationContext): ValidationError | null {
    const body = proposal.body;
    switch (body.type) {
        case 'select-ready-batch': {
            const batch = context.laneState.batches[body.batchId];
            return batch !== undefined && batch.status === 'pending' ? null : error('PROPOSAL_PRECONDITION_FAILED', 'body.batchId', 'batch must be pending to dispatch');
        }
        case 'classify-reject':
            return context.laneState.batches[body.targetBatch] !== undefined ? null : error('PROPOSAL_PRECONDITION_FAILED', 'body.targetBatch', 'target batch must exist');
        case 'open-correction':
        case 'select-correction-route':
            return context.laneState.batches[body.batchId] !== undefined ? null : error('PROPOSAL_PRECONDITION_FAILED', 'body.batchId', 'target batch must exist');
        case 'request-reroute': {
            if (!context.routingPolicy.activeEndpointPool.includes(body.toEndpointId)) {
                return error('PROPOSAL_REROUTE_INVALID', 'body.toEndpointId', 'reroute target is outside the active routing policy endpoint pool');
            }
            return context.endpointState.some((endpoint) => endpoint.endpointId === body.toEndpointId)
                ? null : error('PROPOSAL_REROUTE_INVALID', 'body.toEndpointId', 'reroute target is absent from current endpoint/reservation state');
        }
        case 'admit-pack-amendment':
            return body.supersedesSeal === context.packIndex.activeSeal
                ? null : error('PROPOSAL_SEAL_INVALID', 'body.supersedesSeal', 'supersedesSeal does not match the current active pack seal');
        case 'resume-specification-blocked-session':
            return checkResumePrecondition(body, context);
        case 'place-hold':
            return Date.parse(body.expiresAt) > Date.parse(context.now)
                ? null : error('PROPOSAL_PRECONDITION_FAILED', 'body.expiresAt', 'hold expiresAt must be in the future relative to current state — a hold effect must not create an already-expired hold');
        case 'release-hold': {
            const hold = context.activeHolds.find((candidate) => candidate.holdId === body.holdId);
            return hold !== undefined && hold.status === 'active' ? null : error('PROPOSAL_PRECONDITION_FAILED', 'body.holdId', 'hold must exist and be active to release');
        }
        default:
            return null;
    }
}

/** A proposed effect must not target an active claim, nor intersect an active hold's scope — except `release-hold` itself, whose target is the hold's own identity, not its scope. */
export function checkClaimConflict(proposal: DecisionProposal, context: ValidationContext): ValidationError | null {
    const targets = extractTargetIds(proposal);
    if (targets.length === 0) return null;
    const claim = context.activeClaims.find((candidate) => candidate.targetIds.some((id) => targets.includes(id)));
    if (claim !== undefined) return error('PROPOSAL_CLAIM_CONFLICT', 'requestedEffects', `target already held by active claim "${claim.claimId}"`);
    if (proposal.body.type === 'release-hold') return null;
    const hold = context.activeHolds.find((candidate) => candidate.status === 'active' && candidate.scope.some((id) => targets.includes(id)));
    return hold === undefined ? null : error('PROPOSAL_CLAIM_CONFLICT', 'requestedEffects', `target intersects active hold "${hold.holdId}"`);
}

export function checkBudget(proposal: DecisionProposal, context: ValidationContext): ValidationError | null {
    if (proposal.body.type !== 'grant-session-budget') return null;
    const grant = proposal.body.grantTokens;
    const available = context.budgetState.laneWideCeilingTokens - context.budgetState.laneWideGrantedTokens - context.budgetState.protectedReserveTokens;
    return grant <= available ? null : error('PROPOSAL_BUDGET_OVER_LIMIT', 'body.grantTokens', 'grant exceeds the lane-wide ceiling or protected reserve');
}

function requiresConfirmation(type: DecisionProposal['type'], origin: string): boolean {
    const rule = proposalRule(type).confirmation;
    if (rule === 'never') return false;
    if (rule === 'always') return true;
    return origin === 'operator';
}

export function checkConfirmation(proposal: DecisionProposal, origin: string, context: ValidationContext): ValidationError | null {
    if (!requiresConfirmation(proposal.type, origin)) return null;
    const session = context.operatorSession;
    if (session === undefined || !session.confirmedProposalIds.has(proposal.proposalId)) {
        return error('PROPOSAL_CONFIRMATION_REQUIRED', 'operatorSession', 'operator confirmation is required for this proposal');
    }
    return null;
}
