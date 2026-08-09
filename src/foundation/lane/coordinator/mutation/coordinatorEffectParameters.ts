/**
 * The pure projection from one already-validated proposal to the declared
 * runtime action's task input (CA-25).
 *
 * Every field here is copied from a value some accepted owner already proved:
 * the proposal body (CA-09's `validateProposalShape` plus `ProposalValidator`),
 * the lane identity CA-13's context source resolved, and the current-state
 * facts CA-09 validated. Nothing is defaulted, inferred, or invented — a
 * command that filled in a missing scope, expiry, seal, or authority would be
 * authoring the effect rather than carrying it, which is exactly the
 * command-local authority this batch must not have.
 *
 * An effect whose declared action has no packaged task in this runtime has no
 * entry. That is reported as a typed refusal before any lock or journal write
 * rather than emulated with a substitute input (pack rule: "Do not silently
 * emulate an unsupported effect").
 */
import type {DecisionProposal, EffectType} from '../../../../contracts/proposals.js';
import type {JsonObject} from '../../../../contracts/types.js';
import type {LaneRuntimeContext} from '../../../../contracts/taskRuntime.js';
import type {ValidationContext} from '../../../proposal/proposalValidatorContracts.js';

export interface EffectParameterInput {
    readonly proposal: DecisionProposal;
    readonly context: LaneRuntimeContext;
    readonly state: ValidationContext;
}

export type EffectParameters =
    | {readonly ok: true; readonly parameters: JsonObject}
    | {readonly ok: false; readonly effect: EffectType | null; readonly detail: string};

/**
 * Build the task input for the proposal's single requested effect. CA-10
 * refuses a proposal carrying anything other than exactly one requested
 * effect, so a different count is that owner's refusal, not this one's.
 */
export function effectParametersFor(input: EffectParameterInput): EffectParameters {
    const effects = input.proposal.requestedEffects;
    if (effects.length !== 1) {
        return {ok: false, effect: null,
            detail: `an effect plan is built from exactly one requested effect; this proposal carries ${effects.length}.`};
    }
    const effect = effects[0].effect;
    const lane = {laneDir: input.context.laneDir, laneId: input.state.laneId};
    const proposal = input.proposal;
    if (effect === 'place-hold' && proposal.type === 'place-hold') {
        return ok({schemaVersion: 1, operation: 'place', ...lane, scope: [...proposal.body.scope],
            reason: proposal.body.reason, expiresAt: proposal.body.expiresAt, origin: input.state.origin});
    }
    if (effect === 'release-hold' && proposal.type === 'release-hold') {
        return ok({schemaVersion: 1, operation: 'release', ...lane, holdId: proposal.body.holdId});
    }
    if (effect === 'create-amendment-request' && proposal.type === 'request-pack-amendment') {
        return ok({schemaVersion: 1, operation: 'create-request', ...lane,
            packId: proposal.body.packId, reason: proposal.body.reason});
    }
    if (effect === 'activate-pack-revision' && proposal.type === 'admit-pack-amendment') {
        return ok({schemaVersion: 1, operation: 'admit', ...lane,
            affectedWorktreeIds: affectedWorktrees(input.state, proposal.body.blockerId),
            body: {...proposal.body}, authority: authorityOf(input.state)});
    }
    return {ok: false, effect,
        detail: `the installed task catalog packages no task for the declared "${effect}" action, so this proposal cannot be carried by a command.`};
}

/** The worktrees the accepted assignment records already bind to this blocker. */
function affectedWorktrees(state: ValidationContext, blockerId: string): readonly string[] {
    return Object.values(state.originalAssignments)
        .filter((assignment) => assignment.blockerId === blockerId)
        .map((assignment) => assignment.worktreeId);
}

function authorityOf(state: ValidationContext): JsonObject {
    return {
        packActiveSeal: state.packIndex.activeSeal,
        ...(state.packAuthorSessionId === undefined ? {} : {packAuthorSessionId: state.packAuthorSessionId}),
        ...(state.operatorSession === undefined
            ? {}
            : {operatorSession: {sessionId: state.operatorSession.sessionId, role: state.operatorSession.role}})
    };
}

function ok(parameters: JsonObject): EffectParameters {
    return {ok: true, parameters};
}
