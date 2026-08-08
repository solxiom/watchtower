/**
 * The interrupted-cycle recovery state machine (CA-13;
 * `docs/spec/coordinator-automation.md` §14).
 *
 * "Interrupted cycles are recoverable from their journal state" and "no stage
 * is inferred from tmux prose" (§14). The mapping below is the whole policy:
 * one journaled phase in, one recovery action out, total over the closed phase
 * vocabulary and pure. It has no clock, no filesystem, and no knowledge of how
 * the phase was discovered, so a reviewer can read the safety argument for
 * every crash point in one place.
 *
 * The asymmetry between `effect-prepared` and `effect-attempted` is the
 * important one: a prepared plan never touched anything, so re-attempting it
 * under its idempotency key is safe; an attempted effect may or may not have
 * committed, so the only sound move is to run the verify phase and escalate
 * when verification cannot decide.
 */
import {
    CYCLE_PHASE_EVENTS, type CycleRecoveryAction, type CycleRecoveryPlan, type CyclePhaseEvent
} from '../../../../contracts/coordinatorReplay.js';
import type {CycleHistoryEntry} from './queuePorts.js';

const RECOVERY_ACTIONS: Readonly<Record<CyclePhaseEvent, CycleRecoveryAction | null>> = Object.freeze({
    /** Created but not routed — nothing external happened, so rerouting is safe. */
    'coordinator-cycle-requested': 'reroute',
    /** Routed but no proposal arrived — re-invoke the endpoint if budget still allows. */
    'coordinator-routed': 'reinvoke',
    /** Proposal bytes recorded but not validated — re-validate against *current* state. */
    'coordinator-proposal-received': 'revalidate',
    /** Plan journaled, nothing attempted — re-attempt under the same idempotency key. */
    'coordinator-effect-prepared': 'reattempt-idempotent',
    /** Execution started with an unknown postcondition — verify, never blindly retry. */
    'coordinator-effect-attempted': 'verify',
    /** Verified but the cycle never closed — the remaining work is bookkeeping. */
    'coordinator-effect-verified': 'mark-complete',
    /** Terminal: a complete cycle is not recovery work. */
    'coordinator-cycle-complete': null
});

export function isCyclePhaseEvent(value: string): value is CyclePhaseEvent {
    return (CYCLE_PHASE_EVENTS as readonly string[]).includes(value);
}

/**
 * How far along the §14 lifecycle a journaled event places a cycle; `-1` for
 * an event outside the closed phase vocabulary.
 *
 * Cycle phases are published across two journals — the coordinator journal and
 * CA-10's effect journal — whose sequences are independent. "Last record read
 * wins" would therefore let interleaving decide a cycle's phase. Progress
 * along the fixed lifecycle is the only ordering that holds regardless of
 * which journal a reader reached first.
 */
export function phaseRank(eventType: string): number {
    return (CYCLE_PHASE_EVENTS as readonly string[]).indexOf(eventType);
}

/**
 * The recovery plan for one interrupted cycle, or `null` when the cycle is
 * complete and needs none.
 *
 * A cycle whose last journaled phase is not a recognized phase event is
 * reported as `REPLAY_CYCLE_ORPHANED` with an `escalate` action rather than
 * guessed at: "unknown event types do not affect projections and make
 * automated mutation pause with an integrity diagnostic"
 * (`v1-contracts.md` §9).
 */
export function planCycleRecovery(entry: CycleHistoryEntry): CycleRecoveryPlan | null {
    if (!isCyclePhaseEvent(entry.lastPhase)) {
        return Object.freeze({
            cycleId: entry.cycleId, correlationId: entry.correlationId,
            lastPhase: 'coordinator-cycle-requested' as const, action: 'escalate' as const,
            reason: 'REPLAY_CYCLE_ORPHANED' as const, priorUncertainCycleId: null
        });
    }
    const action = RECOVERY_ACTIONS[entry.lastPhase];
    if (action === null) return null;
    return Object.freeze({
        cycleId: entry.cycleId, correlationId: entry.correlationId, lastPhase: entry.lastPhase,
        action, reason: null, priorUncertainCycleId: null
    });
}

/**
 * Replace a `verify` plan with an escalation when the durable evidence for the
 * attempted effect is itself uncertain. The distinction matters: `verify` says
 * "the postcondition is knowable, go read it", while an uncertain journal
 * record says the lane already recorded that it cannot know.
 */
export function escalateUncertain(plan: CycleRecoveryPlan, priorUncertainCycleId: string): CycleRecoveryPlan {
    return Object.freeze({
        ...plan, action: 'escalate' as const, reason: 'REPLAY_UNCERTAIN_OUTCOME' as const, priorUncertainCycleId
    });
}
