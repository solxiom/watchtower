/**
 * What the durable record and the session journal say once a session proposal
 * reaches a terminal step (`docs/spec/operator-session.md` §15.1, §22).
 *
 * Two rules live here and nowhere else. First, the executor's outcome — not a
 * second inference — decides the next lifecycle state: `applied` and
 * `replayed` are both `effect-verified`, and `uncertain` stops at
 * `effect-uncertain` so recovery reads the effect journal rather than repeating
 * an unknown effect. Second, every journal payload is built from the durable
 * document already written, so a published event can never describe a state
 * that was not persisted first.
 *
 * Pure: no filesystem, no clock beyond the timestamp handed in, no executor.
 */
import type {
    EffectApplied, EffectOutcome, EffectReplayed, EffectUncertain, SessionProposalApplyResult,
    SessionProposalDocument, SessionProposalEffectRecord, SessionProposalReason
} from '../../../../contracts/index.js';
import type {SessionMetadataPayload} from '../../../../contracts/operatorSession.js';
import {withEffect} from './sessionProposalDocument.js';
import {refuse} from './sessionProposalRefusals.js';

/** The executor outcomes that carry a plan; a refusal is handled by the refusal owner instead. */
export type SettledEffect = EffectApplied | EffectReplayed | EffectUncertain;

export function isSettledEffect(outcome: EffectOutcome): outcome is SettledEffect {
    return outcome.status !== 'refused';
}

export function documentForOutcome(
    document: SessionProposalDocument, outcome: SettledEffect, now: string
): SessionProposalDocument {
    const state = outcome.status === 'uncertain' ? 'effect-uncertain' : 'effect-verified';
    return withEffect(document, state, {
        idempotencyKey: outcome.plan.idempotencyKey,
        status: outcome.status,
        effect: outcome.plan.effect,
        recordedAt: now
    });
}

/** `operator-session-proposal-confirmed` — "Operator confirmed proposal for revalidation" (§22). */
export function confirmedPayload(document: SessionProposalDocument): SessionMetadataPayload {
    const confirmation = document.confirmation;
    return {
        proposalId: document.proposalId,
        proposalType: document.proposalType,
        sourceTurnId: document.sourceTurnId,
        expiresAt: document.expiresAt,
        confirmedBySessionId: confirmation === null ? null : confirmation.confirmedBySessionId,
        bindingDigest: confirmation === null ? null : confirmation.bindingDigest
    };
}

/** `operator-session-proposal-rejected` — "Operator or validator rejected proposal" (§22); both producers use this one payload. */
export function rejectedPayload(
    document: SessionProposalDocument, rejectedBy: 'operator' | 'validator', reason: SessionProposalReason | string, detail: string
): SessionMetadataPayload {
    return {
        proposalId: document.proposalId,
        proposalType: document.proposalType,
        sourceTurnId: document.sourceTurnId,
        rejectedBy,
        reason,
        detail,
        resultingState: document.state
    };
}

/**
 * The answer for a proposal whose effect already settled, or `null` when it has
 * not. `effect-verified` replays the recorded outcome without reaching the
 * executor; `effect-uncertain` refuses, because §12.2 recovery reads the effect
 * journal rather than repeating an effect of unknown outcome.
 */
export function settledOutcome(document: SessionProposalDocument): SessionProposalApplyResult | null {
    if (document.state === 'effect-uncertain') {
        return refuse('SESSION_PROPOSAL_RECOVERY_REQUIRED', 'state',
            'the effect for this proposal started with an unknown postcondition; resolve it from the effect journal rather than retrying');
    }
    if (document.state !== 'effect-verified' || document.effect === null) return null;
    return {status: 'replayed', document, outcome: null, effect: document.effect};
}

export function settledEffectOf(document: SessionProposalDocument): SessionProposalEffectRecord {
    if (document.effect === null) throw new Error('documentForOutcome must record the effect it settled');
    return document.effect;
}
