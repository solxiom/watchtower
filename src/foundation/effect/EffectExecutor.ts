/**
 * `EffectExecutor` — the sole v1 effect authority for a lane (CA-10;
 * `docs/spec/coordinator-automation.md` §12/§21 "Exactly one effect authority
 * exists for a lane", `docs/spec/nirvana-integration-architecture.md` §7).
 *
 * Front door only. It sequences focused collaborators — plan, lock, replay
 * fence, revalidate, envelope, prepare journal, then the commit sequence — and
 * owns none of their algorithms. Planning, locking, journaling, envelope
 * authorship, and verification each live with their own owner here.
 *
 * It owns the **pre-commit** fences, whose rule is absolute: every failure
 * before the single NVB invocation leaves the authoritative journal
 * byte-for-byte unchanged (correction-02 CA10-01). That comes from ordering,
 * not compensation — a terminal `failed` record is still a mutation. Envelope
 * creation therefore precedes the first journal append: it is the last step
 * that can fail while the effect provably has not run, and it touches only this
 * capability's own `coordinator/effects/` scratch. `prepared` is appended last,
 * and if that append fails the envelope is discarded unspent, leaving the
 * journal untouched and the idempotency key retryable.
 *
 * This reads `nirvana-integration-architecture.md` §7's steps 3-4 as naming the
 * required recovery records, not as fixing their physical write order; the
 * batch failure-order contract is the stricter rule and governs.
 *
 * Everything from the commit point onward, where a failure must still be
 * recorded, belongs to `effectCommitSequence.ts`.
 */
import {
    EffectExecutionError, type EffectOutcome, type EffectPlan, type EffectJournalRecord, type EnvelopeDiscard
} from '../../contracts/effects.js';
import type {DecisionProposal, ProposalValidationResult} from '../../contracts/proposals.js';
import type {JsonObject} from '../../contracts/types.js';
import type {ValidationContext} from '../proposal/proposalValidatorContracts.js';
import {appendEffectPhase, readEffectJournal} from './effectJournal.js';
import {planEffect, resolveEffectBinding} from './effectPlanner.js';
import {classifyReplay} from './effectReplay.js';
import {assertStillCommittable} from './effectRevalidation.js';
import {invokeAndVerify, messageOf} from './effectCommitSequence.js';
import {writeInvocationEnvelope, type WrittenEnvelope} from './invocationEnvelopeWriter.js';
import {discardUnusedEnvelope} from './envelopeRecovery.js';
import {acquireEffectLocks, type HeldEffectLock, type LockLevel} from './laneEffectLock.js';
import type {
    EffectActionResolver, EffectClock, EffectFileSystem, EffectIdFactory, EffectTaskRunner
} from './effectPorts.js';
import type {LaneRuntimeContext, PinnedTaskRuntimeTarget} from '../../contracts/taskRuntime.js';

export interface EffectExecutorDeps {
    readonly files: EffectFileSystem;
    readonly clock: EffectClock;
    readonly ids: EffectIdFactory;
    readonly runner: EffectTaskRunner;
    readonly actions: EffectActionResolver;
    readonly target: PinnedTaskRuntimeTarget;
}

export interface EffectRequest {
    readonly laneDir: string;
    readonly cycleId: string;
    readonly proposal: DecisionProposal;
    /** The sole validator's pre-lock result. */
    readonly validation: ProposalValidationResult;
    readonly currentState: ValidationContext;
    readonly parameters: JsonObject;
    readonly runtimeContext: LaneRuntimeContext;
    /** Lane facts and a fresh validator verdict read under the lock (§21). */
    readonly revalidate: () => {state: ValidationContext; result: ProposalValidationResult};
    readonly lockLevels?: readonly LockLevel[];
    readonly cancellation?: AbortSignal;
}

/** Every lane-local effect takes the lane lock; §11 order is enforced by the lock owner. */
const DEFAULT_LOCK_LEVELS: readonly LockLevel[] = Object.freeze(['lane']);

export class EffectExecutor {
    constructor(private readonly deps: EffectExecutorDeps) {}

    /** Side-effect-free preview — the exact value `cycle --dry-run` renders. */
    plan(request: EffectRequest): EffectPlan {
        return planEffect({
            proposal: request.proposal, validation: request.validation, currentState: request.currentState,
            cycleId: request.cycleId, parameters: request.parameters,
            binding: resolveEffectBinding(request.proposal, this.deps.actions)
        });
    }

    async apply(request: EffectRequest): Promise<EffectOutcome> {
        let plan: EffectPlan;
        try {
            plan = this.plan(request);
        } catch (error) {
            return refusalFor(error);
        }
        let lock: HeldEffectLock;
        try {
            lock = acquireEffectLocks(request.laneDir, request.lockLevels ?? DEFAULT_LOCK_LEVELS, this.deps.files);
        } catch (error) {
            return refusalFor(error);
        }
        try {
            return await this.applyUnderLock(request, plan, lock);
        } catch (error) {
            return refusalFor(error);
        } finally {
            lock.release();
        }
    }

    private async applyUnderLock(request: EffectRequest, plan: EffectPlan, lock: HeldEffectLock): Promise<EffectOutcome> {
        const journal = readEffectJournal(request.laneDir, this.deps.files);
        const replayed = classifyReplay(journal, plan);
        if (replayed !== null) return replayed;

        const locked = request.revalidate();
        assertStillCommittable({plan, proposal: request.proposal, lockedState: locked.state, revalidation: locked.result});

        const binding = resolveEffectBinding(request.proposal, this.deps.actions);

        // The envelope is built *before* the first journal append (correction-02
        // CA10-01). Envelope creation is the last step that can fail without the
        // effect having run, and it touches only this capability's own
        // `coordinator/effects/` scratch — not the journal. Ordering it here is
        // what makes conflict, race, and I/O failures leave the authoritative
        // journal byte-for-byte unchanged, rather than compensated after the
        // fact: a terminal `failed` record is still a mutation, and the contract
        // requires no mutation at all before the commit point.
        let envelope: WrittenEnvelope;
        try {
            envelope = writeInvocationEnvelope(
                {
                    laneDir: request.laneDir, plan, binding, target: this.deps.target,
                    lockId: lock.lockId, laneLockHeld: lock.levels.includes('lane')
                }, this.deps
            );
        } catch (error) {
            return envelopeRefusal(error, plan);
        }

        // From here to the commit point only the `prepared` append remains. If
        // that append itself fails, the envelope is discarded unspent so the
        // journal is still untouched and the idempotency key stays retryable.
        const records: EffectJournalRecord[] = [];
        const sequence = journal.nextSequence;
        try {
            records.push(this.journal(request.laneDir, plan, 'prepared', 'effect plan journaled', sequence));
        } catch (error) {
            // The envelope must not outlive a failed prepare. If it cannot be
            // removed, the orphan is reported instead of the append failure:
            // the surviving artifact is what actually blocks the next retry.
            const discard = discardUnusedEnvelope(envelope.path, this.deps.files);
            return discard.kind === 'orphaned' ? orphanRefusal(discard) : refusalFor(error);
        }
        return await invokeAndVerify({
            laneDir: request.laneDir, plan, envelope, runtimeContext: request.runtimeContext,
            cancellation: request.cancellation, records, lastSequence: sequence
        }, this.deps);
    }

    private journal(laneDir: string, plan: EffectPlan, phase: Parameters<typeof appendEffectPhase>[2], detail: string, sequence: number): EffectJournalRecord {
        return appendEffectPhase(laneDir, plan, phase, detail, sequence, this.deps);
    }
}

/**
 * An envelope that never existed cannot have authorized anything, so this is a
 * plain typed refusal with the journal untouched — never an uncertain outcome.
 */
function envelopeRefusal(error: unknown, plan: EffectPlan): EffectOutcome {
    if (error instanceof EffectExecutionError) {
        return {status: 'refused', reason: error.reason, subject: error.subject, message: error.message};
    }
    return {
        status: 'refused', reason: 'EFFECT_ENVELOPE_WRITE_FAILED', subject: plan.actionId,
        message: `the invocation envelope could not be created; no task ran and no journal record was written: ${messageOf(error)}`
    };
}

/**
 * The prepare record could not be appended *and* the envelope could not be
 * removed. The surviving artifact is what actually blocks the next retry, so it
 * — not the append failure — is what the caller is told about.
 */
function orphanRefusal(discard: Extract<EnvelopeDiscard, {kind: 'orphaned'}>): EffectOutcome {
    return {
        status: 'refused', reason: 'EFFECT_ENVELOPE_ORPHANED', subject: discard.path,
        message: `The prepare record could not be appended and the unspent invocation envelope at ${discard.path} could not be removed (${discard.cause}). `
            + 'The effect never ran and no journal record or consumed receipt was written. '
            + 'Remove that file to allow this idempotency key to be retried.'
    };
}

function refusalFor(error: unknown): EffectOutcome {
    if (error instanceof EffectExecutionError) {
        return {status: 'refused', reason: error.reason, subject: error.subject, message: error.message};
    }
    throw error;
}
