/**
 * Recovery for envelope artifacts that never reached a task (CA-10;
 * corrections 02-04).
 *
 * Authoring a valid envelope and recovering a failed one are different concerns
 * with different rules, so they live apart. This module owns exactly the
 * second: proving an artifact is gone, reporting honestly when it is not, and
 * reconciling residue a crashed attempt left behind.
 *
 * The rule correction 04 exists to enforce: a cleanup failure is **never**
 * reported as success. Swallowing it leaves an unspent envelope that silently
 * blocks every later retry of an effect that never ran, which is worse than the
 * failure it hides.
 */
import {EffectExecutionError, type EnvelopeDiscard} from '../../contracts/effects.js';
import type {EffectFileSystem} from './effectPorts.js';
/**
 * Remove an envelope that provably never reached a task — creation failed
 * partway, the `prepared` journal append failed just after it, or a prior
 * attempt was interrupted (correction-02 CA10-01, correction-03, correction-04).
 *
 * Deliberately *no* consumed receipt is written. A receipt marks single use as
 * spent, and writing one for an effect that never ran would wedge the
 * idempotency key from the other direction: every later retry refused as
 * already-consumed.
 *
 * Removal itself can fail. Correction 04: that is **reported, never swallowed**.
 * Returning `orphaned` is what lets the caller refuse with an actionable typed
 * state instead of claiming a cleanup that did not happen — a silent failure
 * here leaves an unspent envelope that blocks every future retry.
 */
export function discardUnusedEnvelope(path: string, files: EffectFileSystem): EnvelopeDiscard {
    try {
        files.remove(path);
    } catch (error) {
        return {kind: 'orphaned', path, cause: error instanceof Error ? error.message : String(error)};
    }
    // `remove` is absence-tolerant, so a clean return means the path is gone.
    // Prove it rather than assume it: a port that silently no-ops would
    // otherwise let a live artifact be reported as removed.
    return files.fileExists(path)
        ? {kind: 'orphaned', path, cause: 'the envelope still exists after removal reported success'}
        : {kind: 'removed'};
}
/**
 * Reconcile an envelope found at this plan's path before creating a new one
 * (correction-04).
 *
 * Safe because of one invariant: an envelope is created **and** consumed inside
 * a single lane-lock hold, and `classifyReplay` has already proved this
 * idempotency key has no journal record. An envelope present under our own lane
 * lock therefore cannot belong to a live writer of this lane — it is the
 * residue of a crashed or failed earlier attempt whose effect never ran.
 *
 * Without the lane lock that reasoning does not hold, so the conservative
 * conflict is reported instead of deleting an artifact whose owner is unknown.
 */
export function reconcileOrphanEnvelope(path: string, laneLockHeld: boolean, files: EffectFileSystem): void {
    if (!laneLockHeld) {
        throw new EffectExecutionError('COORDINATOR_EFFECT_CONFLICT', path,
            'An invocation envelope for this idempotency key already exists and the lane lock is not held, so its owner cannot be proved.');
    }
    const discard = discardUnusedEnvelope(path, files);
    if (discard.kind === 'orphaned') throw orphanedEnvelope(discard.path, discard.cause);
}
/**
 * Remove the artifact this call may have created, then raise the error that
 * describes what actually happened. When cleanup also fails the refusal becomes
 * `EFFECT_ENVELOPE_ORPHANED` — correction 04's requirement that a failed
 * cleanup is never reported as a plain write failure, because the two demand
 * different operator action.
 */
export function cleanUpThenFail(path: string, cause: unknown, files: EffectFileSystem): EffectExecutionError {
    const discard = discardUnusedEnvelope(path, files);
    return discard.kind === 'orphaned'
        ? orphanedEnvelope(discard.path, `${messageOf(cause)}; cleanup also failed: ${discard.cause}`)
        : envelopeWriteFailed(path, cause);
}

function envelopeWriteFailed(path: string, cause: unknown): EffectExecutionError {
    return new EffectExecutionError('EFFECT_ENVELOPE_WRITE_FAILED', path,
        `The invocation envelope could not be durably created; no envelope artifact remains and this effect may be retried: ${messageOf(cause)}`);
}

/**
 * The actionable recovery state. It names the exact artifact to remove and
 * states plainly that the effect never ran, so an operator (or the next
 * automatic attempt, once the artifact is gone) can act without inspecting the
 * journal to work out whether anything happened.
 */
function orphanedEnvelope(path: string, cause: string): EffectExecutionError {
    return new EffectExecutionError('EFFECT_ENVELOPE_ORPHANED', path,
        `An unspent invocation envelope remains at ${path} and could not be removed (${cause}). `
        + 'The effect never ran and no journal record or consumed receipt was written. '
        + 'Remove that file to allow this idempotency key to be retried; do not create a consumed receipt for it.');
}

function messageOf(cause: unknown): string {
    return cause instanceof Error ? cause.message : String(cause);
}
