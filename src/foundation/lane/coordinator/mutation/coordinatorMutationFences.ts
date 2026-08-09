/**
 * The command-boundary fences for `cycle`, `escalate`, and the two mutating
 * specification-resolution operations (CA-25).
 *
 * These are refusals, not decisions. Each operation may only carry the proposal
 * types `docs/spec/v1-contracts.md` §5 and `docs/spec/specification-resolution.md`
 * §9 assign to it, and the identity the operator typed must be the identity the
 * durable proposal already names. Neither rule can make an unauthorized
 * mutation legal — CA-09 still validates every proposal and CA-10 still owns
 * every effect. Their only job is to stop one operation's capsule from being
 * spent through another operation's command, which no downstream owner can see.
 */
import type {DecisionProposal, ProposalType} from '../../../../contracts/proposals.js';
import type {
    CoordinatorMutationFailure, CoordinatorMutationOperation, CoordinatorMutationRequest
} from '../../../../contracts/coordinatorMutation.js';

/**
 * `escalate` also admits `place-hold` because §11.9 defines escalation as
 * "a durable attention operator session **and any policy-required safety
 * hold**" — the hold half is a distinct proposal, not a second effect on the
 * escalation proposal.
 */
const PERMITTED: Readonly<Record<CoordinatorMutationOperation, readonly ProposalType[]>> = Object.freeze({
    cycle: Object.freeze([
        'select-ready-batch', 'open-correction', 'select-correction-route', 'request-reroute',
        'propose-reconciliation', 'request-pack-amendment', 'grant-session-budget', 'place-hold', 'release-hold'
    ] as const),
    escalate: Object.freeze(['escalate', 'place-hold'] as const),
    'resolution-propose': Object.freeze(['propose-specification-resolution'] as const),
    'resolution-resume': Object.freeze(['resume-specification-blocked-session'] as const)
});

/** The permitted proposal types for one operation, in declaration order. */
export function permittedProposalTypes(operation: CoordinatorMutationOperation): readonly ProposalType[] {
    return PERMITTED[operation];
}

/**
 * `resolution propose` carries `propose-specification-resolution`, which
 * `v1-contracts.md` §5 maps to "advisory resolution record only; no pack
 * mutation" — it has no declared effect at all. The operation is therefore
 * preview-shaped by contract: there is nothing for the effect authority to
 * plan or apply, and a command that manufactured one would be creating the
 * mutation the specification forbids.
 */
export function isAdvisoryOperation(operation: CoordinatorMutationOperation): boolean {
    return operation === 'resolution-propose';
}

/**
 * Refuse a proposal whose type this operation may not carry, or whose durable
 * identity is not the one the operator named. Returns `null` when both fences
 * pass; every refusal happens before any lock, journal write, or task start.
 */
export function checkMutationFences(
    request: CoordinatorMutationRequest, proposal: DecisionProposal
): CoordinatorMutationFailure | null {
    const permitted = PERMITTED[request.operation];
    if (!permitted.includes(proposal.type)) {
        return failure('COORDINATOR_MUTATION_TYPE_NOT_PERMITTED', proposal.proposalId,
            `"${request.operation}" may carry only ${permitted.join(', ')}; the authorization capsule proposes "${proposal.type}".`);
    }
    return checkSubject(request, proposal) ?? checkReason(request, proposal);
}

function checkSubject(request: CoordinatorMutationRequest, proposal: DecisionProposal): CoordinatorMutationFailure | null {
    const subject = request.subject;
    if (subject === '') return null;
    if (request.operation === 'cycle') {
        return proposal.evidenceRefs.includes(subject) || proposal.evidenceRefs.includes(`event:${subject}`)
            ? null
            : failure('COORDINATOR_MUTATION_SUBJECT_MISMATCH', subject,
                'the authorized proposal cites no evidence for this trigger event; a cycle may not be spent on a different trigger.');
    }
    if (request.operation === 'escalate') {
        return proposal.cycleId === subject
            ? null
            : failure('COORDINATOR_MUTATION_SUBJECT_MISMATCH', subject,
                `the authorized proposal belongs to cycle "${proposal.cycleId}".`);
    }
    const blockerId = blockerOf(proposal);
    return blockerId === subject
        ? null
        : failure('COORDINATOR_MUTATION_SUBJECT_MISMATCH', subject,
            `the authorized proposal names blocker "${blockerId ?? 'none'}".`);
}

/**
 * `escalate --reason` is operator input describing an already-authored
 * proposal, so it must match that proposal's own reason exactly. A command that
 * accepted divergent text would be silently authoring the escalation reason
 * itself.
 */
function checkReason(request: CoordinatorMutationRequest, proposal: DecisionProposal): CoordinatorMutationFailure | null {
    if (request.reason === undefined) return null;
    if (request.operation !== 'escalate') {
        return failure('COORDINATOR_MUTATION_INPUT_INVALID', '--reason', '--reason is valid only for coordinator escalate.');
    }
    const authored = proposal.type === 'escalate' || proposal.type === 'place-hold' ? proposal.body.reason : null;
    return authored === request.reason
        ? null
        : failure('COORDINATOR_MUTATION_SUBJECT_MISMATCH', '--reason',
            'the authorized proposal states a different escalation reason; the command may not restate it.');
}

function blockerOf(proposal: DecisionProposal): string | null {
    return proposal.type === 'propose-specification-resolution' || proposal.type === 'resume-specification-blocked-session'
        ? proposal.body.blockerId
        : null;
}

function failure(
    reason: CoordinatorMutationFailure['reason'], target: string, detail: string
): CoordinatorMutationFailure {
    return {ok: false, reason, target, detail};
}
