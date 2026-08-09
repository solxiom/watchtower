/**
 * `SessionProposalService` — the session-proposal lifecycle and effect bridge
 * (CA-26; `operator-session.md` §15, `coordinator-automation.md` §15/§21,
 * `v1-contracts.md` §5).
 *
 * "Operator-session advice has no effect authority. Any proposed mutation
 * requires separate operator confirmation, current-state revalidation, and the
 * normal effect executor." This class is that sentence and nothing more: it
 * records a proposed effect, records an explicit confirmation bound to the
 * exact proposal and current state, revalidates through CA-09's sole validator,
 * and hands one validated proposal to CA-10's sole executor exactly once. It
 * never mutates lane state itself.
 *
 * Front door only: fences (`sessionProposalGates`), lifecycle
 * (`sessionProposalStates`), durable bytes (`SessionProposalStore`), the
 * write-ahead publication transaction (`sessionProposalRecorder`), reason
 * translation (`sessionProposalRefusals`), assembly (`sessionProposalRequests`),
 * and terminal bookkeeping (`sessionProposalOutcome`) each own their algorithm.
 */
import {
    EffectExecutionError, type SessionProposalApplyResult, type SessionProposalConfirmResult,
    type SessionProposalPreviewResult, type SessionProposalRecordResult, type SessionProposalRefused,
    type SessionProposalRejectResult, type ProposalValidationResult
} from '../../../../contracts/index.js';
import type {EffectRequest} from '../../../effect/index.js';
import type {ValidationContext} from '../../../proposal/index.js';
import {
    confirmedContext, isExpired, planConfirmation, planRejection, provisionalContext, revalidate, shapeProposal,
    verifyConfirmation, type ShapedProposal
} from './sessionProposalGates.js';
import {documentForOutcome, isSettledEffect, settledEffectOf, settledOutcome} from './sessionProposalOutcome.js';
import {nodeLaneMutationLock} from '../queue/laneMutationLock.js';
import {SessionProposalRecorder} from './sessionProposalRecorder.js';
import {isRetryableEffectReason, isSessionProposalRefusal, refuse, refuseFromEffect} from './sessionProposalRefusals.js';
import {candidateFor, effectRequestFor} from './sessionProposalRequests.js';
import type {
    ApplySessionProposalRequest, RecordSessionProposalRequest, SessionProposalRef, SessionProposalServiceDeps
} from './sessionProposalServiceContracts.js';
import {APPLY_ENTRY_STATE} from './sessionProposalStates.js';

export class SessionProposalService {
    private readonly recorder: SessionProposalRecorder;

    constructor(private readonly deps: SessionProposalServiceDeps) {
        this.recorder = new SessionProposalRecorder(deps.store, deps.journal, nodeLaneMutationLock(deps.laneDir));
    }

    /** PROPOSED — a bounded requested effect from a turn (§15.1); no authority granted. */
    record(request: RecordSessionProposalRequest): SessionProposalRecordResult {
        const now = this.deps.clock.now();
        const laneId = this.deps.state.read().laneId;
        const document = candidateFor({...request, laneId, now});
        if (isSessionProposalRefusal(document)) return document;
        const shaped = shapeProposal(document, laneId);
        if (isSessionProposalRefusal(shaped)) return shaped;
        if (isExpired(shaped.proposal, now)) {
            return refuse('SESSION_PROPOSAL_EXPIRED', 'proposal.expiresAt', 'the proposal is already expired and cannot be recorded');
        }
        return this.recorder.create(document) ?? {status: 'recorded', document};
    }

    /**
     * OPERATOR_CONFIRMED — explicit intent, bound to the exact proposal bytes and
     * current state shown. It grants no authority: `apply` re-reads and revalidates.
     *
     * Review correction CA26-R2-02: the entire read-decide-write runs as one
     * `recorder.transition` under the lane lock, against bytes read fresh inside
     * it — never the caller's own pre-lock snapshot — so a concurrent second
     * confirmation (or a race against `reject`) can no longer both observe
     * `proposed` and both commit.
     */
    confirm(ref: SessionProposalRef, confirmedBySessionId: string): SessionProposalConfirmResult {
        const now = this.deps.clock.now();
        const currentState = this.deps.state.read();
        const outcome = this.recorder.transition(ref.operatorSessionId, ref.proposalId, currentState.laneId,
            (fresh) => planConfirmation(fresh, confirmedBySessionId, currentState, now));
        if (isSessionProposalRefusal(outcome)) return outcome;
        if (outcome.document.state === 'expired') {
            return refuse('SESSION_PROPOSAL_EXPIRED', 'proposal.expiresAt', 'the proposal expired before confirm', true);
        }
        return {status: 'confirmed', document: outcome.document};
    }

    /**
     * OPERATOR_REJECTED — the operator declined; terminal, and no effect ever ran.
     * Same locked fresh-read-decide-write shape as `confirm` (CA26-R2-02).
     */
    reject(ref: SessionProposalRef, reason: string): SessionProposalRejectResult {
        const outcome = this.recorder.transition(ref.operatorSessionId, ref.proposalId, this.deps.state.read().laneId,
            (fresh) => planRejection(fresh, reason));
        if (isSessionProposalRefusal(outcome)) return outcome;
        return {status: 'operator-rejected', document: outcome.document};
    }

    /**
     * `apply --dry-run` (§15.4): current-state revalidation plus the effect plan,
     * computed without a single write. Evaluated under a provisional confirmation
     * so it is useful *before* confirming; `confirmationRequired` says plainly
     * whether a durable confirmation exists yet.
     */
    preview(request: ApplySessionProposalRequest): SessionProposalPreviewResult {
        const currentState = this.deps.state.read();
        const shaped = this.load(request, currentState.laneId);
        if (isSessionProposalRefusal(shaped)) return shaped;
        if (isExpired(shaped.proposal, this.deps.clock.now())) {
            return refuse('SESSION_PROPOSAL_EXPIRED', 'proposal.expiresAt', 'the proposal has expired');
        }
        const revalidation = revalidate(shaped, provisionalContext(shaped, currentState), this.deps.validator, false);
        if (isSessionProposalRefusal(revalidation)) return revalidation;
        try {
            return {
                status: 'preview', document: shaped.document, revalidation,
                plan: this.deps.executor.plan(this.effectRequest(request, shaped, currentState, revalidation)),
                confirmationRequired: shaped.document.confirmation === null
            };
        } catch (error) {
            if (error instanceof EffectExecutionError) return refuseFromEffect(error.reason, error.subject, error.message);
            throw error;
        }
    }

    /**
     * REVALIDATED → EFFECT_PREPARED → EFFECT_VERIFIED | EFFECT_UNCERTAIN.
     *
     * One durable confirmation, one freshly read current state, one validator
     * verdict, one executor call. A proposal already carrying a verified effect
     * returns that recorded outcome without reaching the executor again, so a
     * replayed apply is idempotent by construction, not by the executor's fence
     * alone.
     */
    async apply(request: ApplySessionProposalRequest): Promise<SessionProposalApplyResult> {
        const currentState = this.deps.state.read();
        const shaped = this.load(request, currentState.laneId);
        if (isSessionProposalRefusal(shaped)) return shaped;
        const settled = settledOutcome(shaped.document);
        if (settled !== null) return settled;
        if (shaped.document.state !== APPLY_ENTRY_STATE) {
            return refuse('OPERATOR_SESSION_CONFIRMATION_REQUIRED', 'state',
                `a proposal in state "${shaped.document.state}" has no explicit confirmation to apply`);
        }
        if (isExpired(shaped.proposal, this.deps.clock.now())) return this.recorder.expire(shaped.document, 'apply');
        const confirmationRefusal = verifyConfirmation(shaped, currentState);
        if (confirmationRefusal !== null) return this.recorder.rejectStaleOrIllegal(shaped.document, confirmationRefusal);
        const revalidation = revalidate(shaped, confirmedContext(shaped, currentState), this.deps.validator, true);
        if (isSessionProposalRefusal(revalidation)) return this.recorder.rejectStaleOrIllegal(shaped.document, revalidation);
        const outcome = await this.deps.executor.apply(this.effectRequest(request, shaped, currentState, revalidation));
        if (!isSettledEffect(outcome)) {
            const refusal = refuseFromEffect(outcome.reason, outcome.subject, outcome.message);
            return isRetryableEffectReason(outcome.reason)
                ? refusal : this.recorder.rejectStaleOrIllegal(shaped.document, refusal);
        }
        const document = documentForOutcome(shaped.document, outcome, this.deps.clock.now());
        const failure = this.recorder.replace(document, null, shaped.document);
        if (failure === null) return {status: outcome.status, document, outcome, effect: settledEffectOf(document)};
        // The effect already ran, so a lost race here is never "nothing happened": CA-10's
        // effect journal is the authority, and recovery reads it rather than repeating (§12.2).
        return failure.reason === 'SESSION_PROPOSAL_WRITE_CONFLICT'
            ? refuse('SESSION_PROPOSAL_RECOVERY_REQUIRED', 'document',
                `the effect committed but another writer transitioned this proposal first; resolve the outcome from the effect journal (${failure.message})`)
            : failure;
    }

    /**
     * Durable bytes become trusted only through the store's loader, read fresh
     * under the lane lock. Every load settles the event an interrupted
     * transition still owes; if that settle cannot complete, the fence refuses
     * with `SESSION_PROPOSAL_RECOVERY_REQUIRED` rather than letting an
     * unpublished lifecycle state survive into the next step (CA26-R2-01).
     */
    private load(ref: SessionProposalRef, laneId: string): ShapedProposal | SessionProposalRefused {
        return this.recorder.loadFresh(ref.operatorSessionId, ref.proposalId, laneId);
    }

    private effectRequest(
        request: ApplySessionProposalRequest, shaped: ShapedProposal,
        currentState: ValidationContext, validation: ProposalValidationResult
    ): EffectRequest {
        return effectRequestFor(this.deps, request, shaped, currentState, validation);
    }
}
