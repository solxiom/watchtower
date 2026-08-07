/**
 * Immediately-before-commit revalidation (CA-10;
 * `docs/spec/coordinator-automation.md` §21 "Every transition is revalidated
 * against current state immediately before commit", §12.1).
 *
 * The gap between planning a proposal and committing its effect is exactly
 * where a concurrent writer, an expiring hold, an activated pack revision, or a
 * new lane snapshot can invalidate a decision that was legal a moment ago. The
 * plan carries a `preconditionDigest` of the facts it was built from; this
 * capsule re-derives that digest from state read *after* the lock was taken and
 * refuses on any difference.
 *
 * The digest formula is CA-10's planner's, reused here — a second checklist
 * would be a second, silently divergent, definition of "unchanged".
 */
import {EffectExecutionError, type EffectPlan} from '../../contracts/effects.js';
import type {DecisionProposal} from '../../contracts/proposals.js';
import type {ProposalValidationResult} from '../../contracts/proposals.js';
import type {ValidationContext} from '../proposal/proposalValidatorContracts.js';
import {preconditionDigest} from './effectPlanner.js';

export interface RevalidationInput {
    readonly plan: EffectPlan;
    readonly proposal: DecisionProposal;
    /** Lane facts read under the acquired lock, not the pre-lock projection. */
    readonly lockedState: ValidationContext;
    /** The sole validator re-run against `lockedState`. */
    readonly revalidation: ProposalValidationResult;
}

/**
 * Prove the plan still describes current state. Every refusal here happens
 * before the commit point, so authoritative bytes are unchanged and the caller
 * may build a superseding cycle rather than recover.
 */
export function assertStillCommittable(input: RevalidationInput): void {
    const {plan, proposal, lockedState, revalidation} = input;
    if (!revalidation.valid) {
        throw new EffectExecutionError('EFFECT_STATE_CHANGED', proposal.proposalId,
            `Revalidation under the lock rejected this proposal (${revalidation.errors[0]?.code ?? 'unknown'}).`);
    }
    if (lockedState.laneId !== plan.laneId || lockedState.policyVersion !== plan.policyVersion) {
        throw new EffectExecutionError('EFFECT_STATE_CHANGED', plan.laneId,
            'The locked lane identity or policy version differs from the planned one.');
    }
    if (lockedState.packIndex.activeSeal !== lockedState.envelope.packSealId
        && lockedState.packIndex.packSealId !== lockedState.envelope.packSealId) {
        throw new EffectExecutionError('EFFECT_PACK_SEAL_DRIFT', lockedState.packIndex.activeSeal,
            'The active pack seal no longer matches the seal the decision envelope authorized.');
    }
    if (preconditionDigest(proposal, lockedState) !== plan.preconditionDigest) {
        throw new EffectExecutionError('EFFECT_STATE_CHANGED', plan.proposalId,
            'Lane state, pack seal, endpoint pool, claims, or holds changed after this effect was planned.');
    }
}
