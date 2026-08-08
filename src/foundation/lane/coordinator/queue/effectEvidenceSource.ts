/**
 * Binds the cursor's durability evidence to CA-10's accepted effect journal
 * (CA-13).
 *
 * The cursor may advance only after the terminal outcome event is fsynced
 * (`v1-contracts.md` §9). "Fsynced" is proved the only way it can be proved
 * after the fact: by re-reading the authoritative journal through its accepted
 * reader and finding the record there. This module therefore contains no
 * parser, no phase table, and no journal path of its own — a second effect
 * journal reader would be a second answer to "did this effect settle?".
 */
import {readEffectJournal} from '../../../effect/effectJournal.js';
import {nodeEffectFileSystem} from '../../../effect/nodeEffectFileSystem.js';
import type {EffectFileSystem} from '../../../effect/effectPorts.js';
import type {EffectOutcome} from '../../../../contracts/effects.js';
import type {EffectEvidence, EffectEvidenceSource} from './queuePorts.js';

export function effectEvidenceFromJournal(
    laneDir: string, files: EffectFileSystem = nodeEffectFileSystem
): EffectEvidenceSource {
    return Object.freeze({
        confirmTerminalEvent(eventId: string): EffectEvidence {
            const record = readEffectJournal(laneDir, files).records.find((entry) => entry.eventId === eventId);
            if (record === undefined) return {kind: 'absent'};
            const {phase, idempotencyKey} = record.payload;
            if (phase === 'uncertain') return {kind: 'uncertain', idempotencyKey};
            // `prepared` and `attempted` are the interrupted case, not evidence
            // of a settled effect: treating either as terminal is exactly the
            // cursor advance that loses an effect across a crash.
            return phase === 'verified' || phase === 'failed' ? {kind: 'confirmed', idempotencyKey} : {kind: 'absent'};
        }
    });
}

/**
 * The outcome event ID a completed CA-10 call recorded, or `null` for an
 * outcome that produced no terminal journal record.
 *
 * A caller holding an `EffectOutcome` uses this to name the event the cursor
 * must be checked against. It is deliberately only a *name*: the in-memory
 * outcome is never itself accepted as proof of durability, because a crash
 * between verification and `fsync` leaves exactly that value looking correct.
 */
export function outcomeEventId(outcome: EffectOutcome): string | null {
    if (outcome.status === 'replayed') return outcome.recordedOutcome.eventId;
    if (outcome.status === 'refused') return null;
    const terminal = [...outcome.journal].reverse()
        .find((record) => record.payload.phase === 'verified' || record.payload.phase === 'failed' || record.payload.phase === 'uncertain');
    return terminal?.eventId ?? null;
}
