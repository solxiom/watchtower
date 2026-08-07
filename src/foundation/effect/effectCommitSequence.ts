/**
 * The commit point and everything after it (CA-10;
 * `docs/spec/nirvana-integration-architecture.md` §7 steps 5–9,
 * `docs/spec/coordinator-automation.md` §12.2).
 *
 * This capsule owns exactly one guarantee: **once `attempted` is journaled, no
 * path leaves without a terminal record and a typed `EffectOutcome`.** Before
 * `attempted` the effect provably has not run and the caller may simply refuse;
 * after it, the task may already have taken hold, so a rejected runner, a
 * failed verification, and a failure to spend the single-use envelope are all
 * resolved into `COORDINATOR_EFFECT_UNCERTAIN` or a typed refusal rather than
 * escaping as an exception (correction-01 CA10-02).
 *
 * That is why this is separate from `EffectExecutor`: the executor sequences
 * the *pre-commit* fences, where failing is free, and this owns the
 * *post-commit* recovery discipline, where failing must still be recorded. The
 * two have genuinely different rules for what a failure means.
 */
import type {EffectJournalRecord, EffectOutcome, EffectPlan} from '../../contracts/effects.js';
import type {LaneRuntimeContext} from '../../contracts/taskRuntime.js';
import {appendEffectPhase} from './effectJournal.js';
import {verifyEffectPostconditions} from './effectVerification.js';
import {consumeInvocationEnvelope, type WrittenEnvelope} from './invocationEnvelopeWriter.js';
import type {EffectClock, EffectFileSystem, EffectIdFactory, EffectTaskRunner} from './effectPorts.js';

export interface CommitSequenceDeps {
    readonly files: EffectFileSystem;
    readonly clock: EffectClock;
    readonly ids: EffectIdFactory;
    readonly runner: EffectTaskRunner;
}

export interface CommitSequenceInput {
    readonly laneDir: string;
    readonly plan: EffectPlan;
    readonly envelope: WrittenEnvelope;
    readonly runtimeContext: LaneRuntimeContext;
    readonly cancellation?: AbortSignal;
    /** Records already appended by the pre-commit phase, in order. */
    readonly records: readonly EffectJournalRecord[];
    /** Sequence number of the last appended record. */
    readonly lastSequence: number;
}

/** Journal `attempted`, invoke exactly one catalog task, verify, and settle. */
export async function invokeAndVerify(input: CommitSequenceInput, deps: CommitSequenceDeps): Promise<EffectOutcome> {
    const {laneDir, plan, envelope} = input;
    const records = [...input.records];
    let sequence = input.lastSequence;
    let outcome: EffectOutcome;

    records.push(journal(laneDir, plan, 'attempted', 'invoking one catalog task', sequence += 1, deps));
    try {
        const run = await deps.runner.run({
            actionId: plan.actionId, context: input.runtimeContext, input: plan.parameters,
            invocationEnvelope: envelope.path, cancellation: input.cancellation
        });
        const verification = verifyEffectPostconditions(plan, run);
        records.push(journal(laneDir, plan, verification.status, verification.detail, sequence += 1, deps));
        outcome = verification.status === 'verified'
            ? {status: 'applied', plan, runResult: run, journal: records}
            : verification.status === 'uncertain'
                ? {status: 'uncertain', plan, reason: 'COORDINATOR_EFFECT_UNCERTAIN', message: verification.detail, journal: records}
                : {status: 'refused', reason: 'EFFECT_POSTCONDITION_FAILED', subject: plan.actionId, message: verification.detail};
    } catch (error) {
        // The runner rejected instead of returning a typed result. The task may
        // or may not have taken effect — which is the definition of uncertain,
        // regardless of the action's scope.
        const detail = `the task runner rejected before returning a typed result: ${messageOf(error)}`;
        records.push(journal(laneDir, plan, 'uncertain', detail, sequence += 1, deps));
        outcome = {status: 'uncertain', plan, reason: 'COORDINATOR_EFFECT_UNCERTAIN', message: detail, journal: records};
    }
    return spendEnvelope(input, records, sequence, outcome, deps);
}

/**
 * Spend the envelope before the lock is released (§7 step 9). A cleanup failure
 * never masks or discards the effect's own outcome; it is recorded as its own
 * uncertain condition, because a surviving unspent envelope is a live authority
 * that must be resolved from durable state.
 */
function spendEnvelope(
    input: CommitSequenceInput, records: EffectJournalRecord[], sequence: number,
    outcome: EffectOutcome, deps: CommitSequenceDeps
): EffectOutcome {
    try {
        consumeInvocationEnvelope(input.envelope.path, deps.files, deps.clock);
        return outcome;
    } catch (error) {
        const detail = `the effect completed as "${outcome.status}" but its single-use envelope could not be spent: ${messageOf(error)}`;
        const journaled = tryJournal(input.laneDir, input.plan, detail, sequence + 1, deps);
        return {
            status: 'uncertain', plan: input.plan, reason: 'COORDINATOR_EFFECT_UNCERTAIN', message: detail,
            journal: journaled === null ? records : [...records, journaled]
        };
    }
}

function journal(
    laneDir: string, plan: EffectPlan, phase: Parameters<typeof appendEffectPhase>[2],
    detail: string, sequence: number, deps: CommitSequenceDeps
): EffectJournalRecord {
    return appendEffectPhase(laneDir, plan, phase, detail, sequence, deps);
}

/** Best-effort terminal append, used only on a path that is already failing. */
function tryJournal(
    laneDir: string, plan: EffectPlan, detail: string, sequence: number, deps: CommitSequenceDeps
): EffectJournalRecord | null {
    try {
        return journal(laneDir, plan, 'uncertain', detail, sequence, deps);
    } catch {
        return null;
    }
}

export function messageOf(error: unknown): string {
    return error instanceof Error ? error.message : String(error);
}
