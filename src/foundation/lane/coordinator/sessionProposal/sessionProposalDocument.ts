/**
 * Durable session-proposal bytes → one closed typed document, and back.
 *
 * Everything read from `coordinator/operator-sessions/<id>/proposals/*.json`
 * enters as `unknown`: the file may be truncated, hand-edited, replayed from an
 * older schema, or produced by a different lane. Nothing else in this capsule
 * may inspect raw bytes, and this module never touches a filesystem, a clock,
 * or the validator — it decides only whether a value *is* a document.
 *
 * Every layer is **closed**: the document, its confirmation, its effect record,
 * and its publication record each declare their exact member set, and an
 * unsupported member is a typed refusal rather than a silently dropped value.
 * The one deliberate exception is the embedded `proposal`, which is CA-09's
 * `$defs.decisionProposal` and is validated only by CA-09's owner — its member
 * set is that schema's to close, and transcribing it here would create a second
 * authority. What this module does prove about it is agreement: the projected
 * `expiresAt` the CA-16R index reads must be the carried proposal's own expiry.
 */
import {
    SESSION_PROPOSAL_COORDINATOR_TYPES, SESSION_PROPOSAL_STATES, SESSION_PROPOSAL_TYPES,
    type ProposalType, type SessionProposalDocument, type SessionProposalState, type SessionProposalType
} from '../../../../contracts/index.js';
import type {
    SessionProposalConfirmation, SessionProposalEffectRecord, SessionProposalPublication
} from '../../../../contracts/sessionProposal.js';
import type {JsonObject} from '../../../../contracts/types.js';
import {
    asJsonObject, closedObject, date, digest, fail, identity, member, optionalMember, optionalText,
    requiredMember, text
} from './sessionProposalValues.js';

export {SessionProposalDocumentError} from './sessionProposalValues.js';

const EFFECT_STATUSES: readonly SessionProposalEffectRecord['status'][] = Object.freeze(['applied', 'replayed', 'uncertain']);
const PUBLICATION_EVENTS: readonly SessionProposalPublication['event'][] =
    Object.freeze(['operator-session-proposal-confirmed', 'operator-session-proposal-rejected']);
const PUBLICATION_STATUSES: readonly SessionProposalPublication['status'][] = Object.freeze(['pending', 'published']);
const REJECTED_BY: readonly NonNullable<SessionProposalPublication['rejectedBy']>[] = Object.freeze(['operator', 'validator']);

const DOCUMENT_MEMBERS: readonly string[] = Object.freeze([
    'schemaVersion', 'proposalId', 'operatorSessionId', 'laneId', 'sourceTurnId', 'proposalType',
    'state', 'createdAt', 'expiresAt', 'proposal', 'confirmation', 'effect', 'publication'
]);
const CONFIRMATION_MEMBERS: readonly string[] = Object.freeze([
    'confirmedBySessionId', 'confirmedAt', 'proposalDigest', 'currentStateDigest', 'bindingDigest'
]);
const EFFECT_MEMBERS: readonly string[] = Object.freeze(['idempotencyKey', 'status', 'effect', 'recordedAt']);
const PUBLICATION_MEMBERS: readonly string[] = Object.freeze(['event', 'rejectedBy', 'reason', 'detail', 'status']);

export function parseSessionProposalDocument(value: unknown): SessionProposalDocument {
    const raw = closedObject(value, 'document', DOCUMENT_MEMBERS);
    if (raw.schemaVersion !== 1) fail('document.schemaVersion', 'unsupported session-proposal schema version');
    const proposalType = member(raw.proposalType, SESSION_PROPOSAL_TYPES, 'document.proposalType');
    const state = member(raw.state, SESSION_PROPOSAL_STATES, 'document.state');
    const proposal = asJsonObject(raw.proposal, 'document.proposal');
    assertProjectedExpiry(raw.expiresAt, proposal);
    const parsedConfirmation = confirmation(requiredMember(raw, 'confirmation', 'document.confirmation'));
    const parsedEffect = effectRecord(requiredMember(raw, 'effect', 'document.effect'));
    const parsedPublication = publication(requiredMember(raw, 'publication', 'document.publication'));
    assertLifecycleInvariants(state, parsedConfirmation, parsedEffect, parsedPublication);
    return Object.freeze({
        schemaVersion: 1,
        proposalId: identity(raw.proposalId, 'document.proposalId'),
        operatorSessionId: identity(raw.operatorSessionId, 'document.operatorSessionId'),
        laneId: text(raw.laneId, 'document.laneId'),
        sourceTurnId: text(raw.sourceTurnId, 'document.sourceTurnId'),
        proposalType,
        state,
        createdAt: date(raw.createdAt, 'document.createdAt'),
        expiresAt: date(raw.expiresAt, 'document.expiresAt'),
        proposal,
        confirmation: parsedConfirmation,
        effect: parsedEffect,
        publication: parsedPublication
    });
}

type Presence = 'absent' | 'present' | 'either';
type PublicationRule = 'none' | 'confirmed' | 'rejected' | 'confirmed-or-none';

interface LifecycleShape {
    readonly confirmation: Presence;
    readonly effect: Presence;
    readonly publication: PublicationRule;
}

/**
 * What each §15.1 state *means* about the rest of the record (review correction
 * CA26-R3-01).
 *
 * Every member was previously validated in isolation, so a forged document
 * could claim `effect-verified` while carrying no effect at all, or carry a
 * published *confirmation* event while claiming a state no confirmation
 * produces. Each such combination is unreachable through this capsule's own
 * writers, which is exactly why a stored document exhibiting one is corrupt or
 * hand-edited and must fail closed rather than be read as authority.
 *
 * `revalidated` and `effect-prepared` are in-flight states reached inside one
 * `apply`; they descend from a confirmation and may still owe its event, so
 * they permit the confirmed publication or none.
 */
const LIFECYCLE_SHAPES: Readonly<Record<SessionProposalState, LifecycleShape>> = Object.freeze({
    proposed: {confirmation: 'absent', effect: 'absent', publication: 'none'},
    'operator-confirmed': {confirmation: 'present', effect: 'absent', publication: 'confirmed'},
    revalidated: {confirmation: 'present', effect: 'absent', publication: 'confirmed-or-none'},
    'effect-prepared': {confirmation: 'present', effect: 'absent', publication: 'confirmed-or-none'},
    'effect-verified': {confirmation: 'present', effect: 'present', publication: 'none'},
    'effect-uncertain': {confirmation: 'present', effect: 'present', publication: 'none'},
    'operator-rejected': {confirmation: 'absent', effect: 'absent', publication: 'rejected'},
    // Expiry is terminal from `proposed` (no confirmation) and from `operator-confirmed` (one), so either is legal.
    expired: {confirmation: 'either', effect: 'absent', publication: 'rejected'},
    'rejected-stale-or-illegal': {confirmation: 'present', effect: 'absent', publication: 'rejected'}
});

function assertLifecycleInvariants(
    state: SessionProposalState, confirmationRecord: SessionProposalConfirmation | null,
    effect: SessionProposalEffectRecord | null, publicationRecord: SessionProposalPublication | null
): void {
    const shape = LIFECYCLE_SHAPES[state];
    assertPresence(shape.confirmation, confirmationRecord, state, 'document.confirmation');
    assertPresence(shape.effect, effect, state, 'document.effect');
    assertPublication(shape.publication, publicationRecord, state);
}

function assertPresence(rule: Presence, value: unknown, state: SessionProposalState, subject: string): void {
    if (rule === 'present' && value === null) fail(subject, `is required for a proposal in state "${state}"`);
    if (rule === 'absent' && value !== null) fail(subject, `must be absent for a proposal in state "${state}"`);
}

function assertPublication(rule: PublicationRule, value: SessionProposalPublication | null, state: SessionProposalState): void {
    if (rule === 'none') {
        if (value !== null) fail('document.publication', `must be absent for a proposal in state "${state}"`);
        return;
    }
    if (value === null) {
        if (rule !== 'confirmed-or-none') fail('document.publication', `is required for a proposal in state "${state}"`);
        return;
    }
    const expected = rule === 'rejected' ? 'operator-session-proposal-rejected' : 'operator-session-proposal-confirmed';
    if (value.event !== expected) {
        fail('document.publication.event', `must be "${expected}" for a proposal in state "${state}", not "${value.event}"`);
    }
    assertPublicationMetadata(value);
}

/**
 * The publication's metadata must agree with its own event (review correction
 * CA26-R4-01).
 *
 * The event alone was checked against the state, leaving the three metadata
 * members free: a rejection could claim no actor, no reason, and no detail,
 * and a confirmation could carry rejection metadata. Neither is producible —
 * `planRejection` and `recordTerminal` always supply all three, and the
 * confirmation intent always supplies none — so a stored document exhibiting
 * either is forged or corrupt, and the rebuilt payload it would republish
 * would misdescribe what happened.
 */
function assertPublicationMetadata(value: SessionProposalPublication): void {
    const rejection = value.event === 'operator-session-proposal-rejected';
    for (const [member, present] of [
        ['rejectedBy', value.rejectedBy !== null], ['reason', value.reason !== null], ['detail', value.detail !== null]
    ] as const) {
        if (rejection && !present) fail(`document.publication.${member}`, `is required for a "${value.event}" publication`);
        if (!rejection && present) fail(`document.publication.${member}`, `must be absent for a "${value.event}" publication`);
    }
}

/**
 * The projected expiry the session index reads must be the carried proposal's
 * own `expiresAt`. Without this, a hand-edited document could advertise a live
 * expiry to the index while carrying an already-expired proposal.
 */
function assertProjectedExpiry(projected: unknown, proposal: JsonObject): void {
    if (proposal.expiresAt !== projected) {
        fail('document.expiresAt', 'projected expiry does not match the carried proposal expiry');
    }
}

/**
 * The coordinator proposal type a session category is allowed to carry (§15.2),
 * or `null` for a category the closed v1 effect registry cannot express.
 */
export function requiredCoordinatorType(proposalType: SessionProposalType): ProposalType | null {
    return SESSION_PROPOSAL_COORDINATOR_TYPES[proposalType];
}

/** `true` only for the coordinator proposal types §15.2 allows an operator session to confirm. */
export function isSessionConfirmableType(type: ProposalType): boolean {
    return Object.values(SESSION_PROPOSAL_COORDINATOR_TYPES).includes(type);
}

/** `true` when the category routes to an effect at all, rather than to the session-lifecycle workflow. */
export function isEffectBearingCategory(proposalType: SessionProposalType): boolean {
    return SESSION_PROPOSAL_COORDINATOR_TYPES[proposalType] !== null;
}

export function withState(document: SessionProposalDocument, state: SessionProposalState): SessionProposalDocument {
    return Object.freeze({...document, state});
}

export function withConfirmation(
    document: SessionProposalDocument, state: SessionProposalState, value: SessionProposalConfirmation
): SessionProposalDocument {
    return Object.freeze({...document, state, confirmation: Object.freeze({...value})});
}

export function withEffect(
    document: SessionProposalDocument, state: SessionProposalState, value: SessionProposalEffectRecord
): SessionProposalDocument {
    return Object.freeze({...document, state, effect: Object.freeze({...value})});
}

export function withPublication(
    document: SessionProposalDocument, value: SessionProposalPublication | null
): SessionProposalDocument {
    return Object.freeze({...document, publication: value === null ? null : Object.freeze({...value})});
}

function confirmation(value: unknown): SessionProposalConfirmation | null {
    if (value === null) return null;
    const raw = closedObject(value, 'document.confirmation', CONFIRMATION_MEMBERS);
    return Object.freeze({
        confirmedBySessionId: text(raw.confirmedBySessionId, 'document.confirmation.confirmedBySessionId'),
        confirmedAt: date(raw.confirmedAt, 'document.confirmation.confirmedAt'),
        proposalDigest: digest(raw.proposalDigest, 'document.confirmation.proposalDigest'),
        currentStateDigest: digest(raw.currentStateDigest, 'document.confirmation.currentStateDigest'),
        bindingDigest: digest(raw.bindingDigest, 'document.confirmation.bindingDigest')
    });
}

function effectRecord(value: unknown): SessionProposalEffectRecord | null {
    if (value === null) return null;
    const raw = closedObject(value, 'document.effect', EFFECT_MEMBERS);
    return Object.freeze({
        idempotencyKey: text(raw.idempotencyKey, 'document.effect.idempotencyKey'),
        status: member(raw.status, EFFECT_STATUSES, 'document.effect.status'),
        effect: text(raw.effect, 'document.effect.effect'),
        recordedAt: date(raw.recordedAt, 'document.effect.recordedAt')
    });
}

function publication(value: unknown): SessionProposalPublication | null {
    if (value === null) return null;
    const raw = closedObject(value, 'document.publication', PUBLICATION_MEMBERS);
    return Object.freeze({
        event: member(raw.event, PUBLICATION_EVENTS, 'document.publication.event'),
        rejectedBy: optionalMember(requiredMember(raw, 'rejectedBy', 'document.publication.rejectedBy'), REJECTED_BY, 'document.publication.rejectedBy'),
        reason: optionalText(requiredMember(raw, 'reason', 'document.publication.reason'), 'document.publication.reason'),
        detail: optionalText(requiredMember(raw, 'detail', 'document.publication.detail'), 'document.publication.detail'),
        status: member(raw.status, PUBLICATION_STATUSES, 'document.publication.status')
    });
}
