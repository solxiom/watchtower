/**
 * What the durable journal already says about one idempotency key (CA-10;
 * `docs/spec/v1-contracts.md` §9 "Replay of an already completed idempotency
 * key returns the recorded outcome without repeating its effect",
 * `docs/spec/coordinator-automation.md` §12.2).
 *
 * The distinction this capsule exists to make is *settled* versus *interrupted*.
 * A key with a terminal record is settled: the recorded outcome is returned and
 * nothing runs again. A key that appears only as `prepared` or `attempted` is
 * an effect that started and never reported — the one case where repeating
 * would risk a second real-world side effect, so it is surfaced as uncertain
 * for resolution from durable state rather than retried.
 *
 * Keeping this decision here rather than inside the executor means the retry,
 * crash-recovery, and duplicate-cycle paths cannot each grow their own slightly
 * different idea of what counts as "already done".
 */
import type {EffectJournalRecord, EffectPlan, EffectOutcome} from '../../contracts/effects.js';
import {findLatestPhase, findSettledOutcome, type JournalRead} from './effectJournal.js';

/**
 * The replay verdict for `plan`, or `null` when this key is genuinely new and
 * the effect may proceed.
 */
export function classifyReplay(journal: JournalRead, plan: EffectPlan): EffectOutcome | null {
    const settled = findSettledOutcome(journal, plan.idempotencyKey);
    if (settled !== null) return {status: 'replayed', plan, recordedOutcome: settled};
    const latest = findLatestPhase(journal, plan.idempotencyKey);
    return latest === null ? null : interrupted(plan, latest);
}

function interrupted(plan: EffectPlan, latest: EffectJournalRecord): EffectOutcome {
    return {
        status: 'uncertain', plan, reason: 'COORDINATOR_EFFECT_UNCERTAIN', journal: [latest],
        message: `A previous attempt for this idempotency key stopped at "${latest.payload.phase}"; resolve it from durable state before retrying.`
    };
}
