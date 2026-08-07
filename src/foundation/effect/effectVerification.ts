/**
 * Independent postcondition verification of one applied effect (CA-10;
 * `docs/spec/nirvana-integration-architecture.md` §7 step 7,
 * `docs/spec/coordinator-automation.md` §12.2/§18
 * `coordinator-effect-verified`).
 *
 * §8 of the integration architecture keeps the channels distinct: `NvbRunEvent`
 * is diagnostic telemetry and `NvbRunResult` is "input to Watchtower
 * verification" — not the verification itself. So a task claiming success is
 * necessary and never sufficient: the result must also be a schema-shaped
 * `$defs.mutationResult` that reports the effect as applied and names the
 * planned targets.
 *
 * The distinction that matters most here is failed versus *unknown*. A
 * lane-local effect that did not verify simply did not commit. An external
 * effect (tmux launch, Git push) that started and then could not be verified is
 * `COORDINATOR_EFFECT_UNCERTAIN`: recovery must read the journal rather than
 * repeat an unknown effect, so this module reports that state instead of
 * collapsing it into a retryable failure.
 */
import type {EffectPlan} from '../../contracts/effects.js';
import type {LaneTaskRunResult} from '../../contracts/taskRuntime.js';
import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';

export type VerificationStatus = 'verified' | 'failed' | 'uncertain';

export interface VerificationOutcome {
    readonly status: VerificationStatus;
    readonly detail: string;
}

export function verifyEffectPostconditions(plan: EffectPlan, run: LaneTaskRunResult): VerificationOutcome {
    if (run.outcome === 'cancelled') return classifyIncomplete(plan, `the task was cancelled by ${run.signal}`);
    if (run.outcome === 'failed') return classifyIncomplete(plan, `the task failed with ${run.reason}`);
    if (run.taskId !== plan.taskId || run.actionId !== plan.actionId) {
        return {status: 'failed', detail: 'the run result names a different action or task than the plan'};
    }
    return verifyMutationResult(plan, run.result);
}

/**
 * `$defs.mutationResult` requires `applied`, `changed`, `unchanged`, and
 * `warnings`. A completed run whose result does not carry that shape has not
 * proved anything, so it is a verification failure rather than an assumed
 * success.
 */
function verifyMutationResult(plan: EffectPlan, result: unknown): VerificationOutcome {
    if (!isJsonObject(result) || typeof result.applied !== 'boolean'
        || !Array.isArray(result.changed) || !Array.isArray(result.unchanged) || !Array.isArray(result.warnings)) {
        return {status: 'failed', detail: 'the task result is not a mutationResult-shaped postcondition report'};
    }
    if (!result.applied) {
        return {status: 'failed', detail: 'the task reported that the effect was not applied'};
    }
    const touched = new Set([...result.changed, ...result.unchanged].filter((entry): entry is string => typeof entry === 'string'));
    const missing = plan.targetIds.filter((target) => !touched.has(target));
    if (missing.length > 0) {
        return classifyIncomplete(plan, `the applied result does not account for target(s) ${missing.join(', ')}`);
    }
    return {status: 'verified', detail: 'postconditions verified against the mutation result'};
}

/**
 * A lane-local effect commits under the lock or not at all, so an unverified
 * one simply did not happen. An external effect may already have taken effect
 * outside the transaction, so the same evidence means "unknown", not "no".
 */
function classifyIncomplete(plan: EffectPlan, detail: string): VerificationOutcome {
    return {status: plan.scope === 'external' ? 'uncertain' : 'failed', detail};
}
