/**
 * Closed contracts for the session-proposal lifecycle and its effect bridge
 * (CA-26; `docs/spec/operator-session.md` §15.1/§15.4, §22, §23,
 * `docs/spec/coordinator-automation.md` §15/§21,
 * `docs/spec/v1-contracts.md` §5).
 *
 * "Operator-session advice has no effect authority. Any proposed mutation
 * requires separate operator confirmation, current-state revalidation, and the
 * normal effect executor" (`coordinator-automation.md` §15). These are that
 * bridge's vocabulary and nothing else: the durable proposal artifact, the
 * confirmation binding, the recorded effect reference, and the closed outcome
 * unions. Nothing here validates, decides, or executes.
 *
 * The lifecycle state vocabulary is **not** redefined here. `SessionProposalState`
 * is CA-16R's accepted `SESSION_PROPOSAL_STATES`, which already spells the
 * §15.1 lifecycle exactly; a second copy would be a second authority.
 */
import type {EffectOutcome, EffectPlan, EffectReason} from './effects.js';
import type {ProposalType, ProposalValidationResult} from './proposals.js';
import type {SessionProposalState, SessionProposalType} from './sessionIndex.js';
import type {JsonObject} from './types.js';

/**
 * Every refusal this bridge can report.
 *
 * `OPERATOR_SESSION_*` members are the canonical `operator-session.md` §23
 * codes and keep their exact names; the `SESSION_PROPOSAL_*` members are this
 * capability's own artifact-level reasons, which §23 does not name because the
 * durable proposal record is a v1 implementation artifact rather than a
 * specified wire value.
 */
export const SESSION_PROPOSAL_REASONS = [
    'SESSION_PROPOSAL_SCHEMA_INVALID',
    'SESSION_PROPOSAL_NOT_FOUND',
    'SESSION_PROPOSAL_RECORD_INVALID',
    'SESSION_PROPOSAL_DUPLICATE',
    'SESSION_PROPOSAL_SESSION_MISMATCH',
    'SESSION_PROPOSAL_TYPE_NOT_PERMITTED',
    'SESSION_PROPOSAL_TYPE_MISMATCH',
    'SESSION_PROPOSAL_CATEGORY_NOT_EFFECT_BEARING',
    'SESSION_PROPOSAL_STATE_INVALID',
    'SESSION_PROPOSAL_EXPIRED',
    'SESSION_PROPOSAL_CONFIRMATION_BINDING_MISMATCH',
    'SESSION_PROPOSAL_RECOVERY_REQUIRED',
    'SESSION_PROPOSAL_STORE_UNWRITABLE',
    'SESSION_PROPOSAL_WRITE_CONFLICT',
    'SESSION_PROPOSAL_LANE_LOCKED',
    'OPERATOR_SESSION_NOT_FOUND',
    'OPERATOR_SESSION_CONFIRMATION_REQUIRED',
    'OPERATOR_SESSION_PROPOSAL_STALE',
    'OPERATOR_SESSION_PROPOSAL_ILLEGAL'
] as const;
export type SessionProposalReason = typeof SESSION_PROPOSAL_REASONS[number];

/**
 * The coordinator proposal type each session-proposal category must carry
 * (`operator-session.md` §15.2, `v1-contracts.md` §5). A category is the
 * operator-facing name for a confirmable session effect; the mapped
 * `ProposalType` is the closed coordinator vocabulary the effect bridge
 * actually validates and executes. Several categories legitimately share one
 * coordinator type — a dispatch pause *is* a scoped hold — so the mapping is
 * many-to-one and the category is declared by the caller, never guessed from
 * the body.
 *
 * **Confirmation authority is not origin.** §5's registry fixes each type's
 * *origin* ("`request-reroute` | D1", "`request-pack-amendment` | D2 plus
 * operator confirmation") and separately fixes what a normal operator may
 * *confirm* ("rerouting within an already approved endpoint pool, amendment
 * requests, finite grants, scoped holds"). A routing override or amendment
 * request is therefore authored by the coordinator endpoint that owns that
 * decision class and confirmed by the operator — exactly the §15.3 flow. This
 * bridge never supplies or widens an origin: the caller's `ValidationContext`
 * carries it and CA-09's accepted matrix is the only judge of it.
 *
 * `escalation-close` is `null` because the closed v1 registry has no proposal
 * type or effect that expresses closing an escalation. `escalate`/
 * `open-escalation` opens the attention session; §18.6 resolves an escalation
 * "only through a confirmed legal proposal or explicit operator closure with
 * rationale", and that closure is the session-lifecycle route
 * (`wt coordinator session close`), not an effect this bridge may plan.
 * Recording one here fails closed with
 * `SESSION_PROPOSAL_CATEGORY_NOT_EFFECT_BEARING` rather than laundering a
 * closure into an `open-escalation` effect.
 *
 * The six coordinator proposal types absent from this table
 * (`classify-reject`, `open-correction`, `propose-reconciliation`,
 * `propose-specification-resolution`, `admit-pack-amendment`,
 * `resume-specification-blocked-session`) — and `escalate` — are not
 * confirmable through an operator session: §15.2 routes scope, dependency, and
 * review changes to the authoritative amendment workflow instead. Submitting
 * one here fails closed with `SESSION_PROPOSAL_TYPE_NOT_PERMITTED`.
 */
export const SESSION_PROPOSAL_COORDINATOR_TYPES: Readonly<Record<SessionProposalType, ProposalType | null>> = Object.freeze({
    'hold-place': 'place-hold',
    'hold-release': 'release-hold',
    'dispatch-pause': 'place-hold',
    'dispatch-resume': 'release-hold',
    'candidate-select': 'select-ready-batch',
    'routing-override': 'request-reroute',
    'budget-override': 'grant-session-budget',
    'amendment-request': 'request-pack-amendment',
    'correction-supersede': 'select-correction-route',
    'escalation-close': null
});

/**
 * The operator's recorded intent, bound to the exact proposal bytes and the
 * exact current state they were shown (§15.1 "Operator confirmation records
 * intent but grants no arbitrary authority"). The three digests are what make
 * a confirmation non-transferable: apply recomputes each against the stored
 * bytes and freshly read state, so a confirmation can never authorize a
 * different proposal or a later world. They are kept apart rather than folded
 * into one value so a refusal can say *which* half moved — changed proposal
 * bytes are `SESSION_PROPOSAL_CONFIRMATION_BINDING_MISMATCH`, a changed world
 * is the canonical `OPERATOR_SESSION_PROPOSAL_STALE`.
 */
export interface SessionProposalConfirmation {
    readonly confirmedBySessionId: string;
    readonly confirmedAt: string;
    /** Digest of the exact proposal bytes shown; a change here is tampering, not staleness. */
    readonly proposalDigest: `sha256:${string}`;
    /** Digest of the exact current-state facts shown; a change here is staleness. */
    readonly currentStateDigest: `sha256:${string}`;
    /** Digest over both halves plus the confirming session — a forged combination fails even when both halves are copied. */
    readonly bindingDigest: `sha256:${string}`;
}

/**
 * The write-ahead publication intent for one lifecycle transition.
 *
 * The durable proposal document and the CA-15 session journal are two
 * authorities and cannot be written in one atomic step. Rather than let a
 * journal failure be reported as if the state change had not happened, the
 * state change *and its owed event* commit together in the document: the
 * transition is persisted with `status: 'pending'`, the event is appended, and
 * the document is persisted again as `published`. A crash or journal failure
 * anywhere in that sequence leaves a durable, self-describing debt that the
 * next load settles.
 *
 * The recorded members are exactly what rebuilds the payload — the payload
 * itself is derived from the already-persisted document, so a republished
 * event can never describe a state that was not durable first. Recovery is
 * at-least-once: a crash between the successful append and the `published`
 * mark republishes one byte-identical duplicate, which a consumer keyed by
 * (`proposalId`, `event`, `resultingState`) collapses. It is never
 * at-most-once, because a lost event is a lost authoritative fact.
 */
export interface SessionProposalPublication {
    readonly event: 'operator-session-proposal-confirmed' | 'operator-session-proposal-rejected';
    /** Who rejected, for a rejection event; `null` for a confirmation. */
    readonly rejectedBy: 'operator' | 'validator' | null;
    readonly reason: string | null;
    readonly detail: string | null;
    readonly status: 'pending' | 'published';
}

/** A publication intent before it is committed — the same record without its lifecycle status. */
export type SessionProposalPublicationIntent = Omit<SessionProposalPublication, 'status'>;

/** What the sole effect executor actually did, recorded so a replay never repeats it. */
export interface SessionProposalEffectRecord {
    readonly idempotencyKey: string;
    readonly status: 'applied' | 'replayed' | 'uncertain';
    readonly effect: string;
    readonly recordedAt: string;
}

/**
 * The durable `coordinator/operator-sessions/<id>/proposals/<proposalId>.json`
 * artifact (`operator-session.md` §20).
 *
 * `proposalType`, `state`, `sourceTurnId`, `createdAt`, and `expiresAt` are
 * exactly the members CA-16R's accepted `sessionIndexRows.ts` projects into
 * `session_proposals`; this producer and that reader are one contract with two
 * ends. `expiresAt` is a projection of `proposal.expiresAt`, never an
 * independently authored second expiry — the reader of this document proves
 * they agree.
 */
export interface SessionProposalDocument {
    readonly schemaVersion: 1;
    readonly proposalId: string;
    readonly operatorSessionId: string;
    readonly laneId: string;
    readonly sourceTurnId: string;
    readonly proposalType: SessionProposalType;
    readonly state: SessionProposalState;
    readonly createdAt: string;
    readonly expiresAt: string;
    /** The wire-shaped `$defs.decisionProposal` document, validated only by CA-09's owner. */
    readonly proposal: JsonObject;
    readonly confirmation: SessionProposalConfirmation | null;
    readonly effect: SessionProposalEffectRecord | null;
    /** The event this state owes the session journal, and whether it has been appended. */
    readonly publication: SessionProposalPublication | null;
}

/** A refusal that granted no authority and started no effect. */
export interface SessionProposalRefused {
    readonly status: 'refused';
    readonly reason: SessionProposalReason;
    readonly subject: string;
    readonly message: string;
    /** The sole validator's verdict, when a revalidation produced this refusal. */
    readonly revalidation?: ProposalValidationResult;
    /** The sole executor's reason, when the executor produced this refusal. */
    readonly effectReason?: EffectReason;
    /** `true` when the durable record moved to a terminal `rejected-stale-or-illegal` state (§15.1). */
    readonly recordRejected: boolean;
}

export interface SessionProposalRecorded {
    readonly status: 'recorded';
    readonly document: SessionProposalDocument;
}

export interface SessionProposalConfirmed {
    readonly status: 'confirmed';
    readonly document: SessionProposalDocument;
}

/**
 * The operator declined (§15.1 `PROPOSED → OPERATOR_REJECTED`). It is a
 * distinct status from `confirmed` because it is the opposite fact: the
 * lifecycle is terminal, no confirmation exists, and no effect will ever run.
 */
export interface SessionProposalRejected {
    readonly status: 'operator-rejected';
    readonly document: SessionProposalDocument;
}

/**
 * The `apply --dry-run` value (§15.4). It is produced without a single write,
 * and it is evaluated with a **provisional** confirmation so an operator can
 * see the revalidation and effect plan before deciding — `confirmationRequired`
 * says plainly that no durable confirmation exists yet. Apply itself never
 * uses a provisional confirmation.
 */
export interface SessionProposalPreview {
    readonly status: 'preview';
    readonly document: SessionProposalDocument;
    readonly revalidation: ProposalValidationResult;
    readonly plan: EffectPlan;
    readonly confirmationRequired: boolean;
}

/** The effect committed, replayed, or ended uncertain through the one executor. */
export interface SessionProposalApplied {
    readonly status: 'applied' | 'replayed' | 'uncertain';
    readonly document: SessionProposalDocument;
    /**
     * The executor's outcome when this call reached the executor, and `null`
     * when the already-recorded effect was replayed straight from the durable
     * record. Reporting `null` rather than a synthesized outcome is what makes
     * "the executor was not invoked a second time" legible to the caller.
     */
    readonly outcome: EffectOutcome | null;
    readonly effect: SessionProposalEffectRecord;
}

export type SessionProposalRecordResult = SessionProposalRecorded | SessionProposalRefused;
export type SessionProposalConfirmResult = SessionProposalConfirmed | SessionProposalRefused;
export type SessionProposalRejectResult = SessionProposalRejected | SessionProposalRefused;
export type SessionProposalPreviewResult = SessionProposalPreview | SessionProposalRefused;
export type SessionProposalApplyResult = SessionProposalApplied | SessionProposalRefused;
