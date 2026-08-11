/**
 * Closed contracts for the CA-22 live-attachment boundary: the ephemeral
 * attachment state machine of `cli-session.md §4`, the streaming states of
 * `cli-session.md §8`, the normalized presentation-event vocabulary of
 * `cli-session.md §6`, the concurrency/notification rules of `cli-session.md
 * §12`, the P0–P5 attention order of `tui-operational-experience.md §4`, and
 * the cross-attachment conflict rules of `tui-operational-experience.md §6`.
 *
 * Owned components hold no journal, SQLite, provider, effect-executor, or
 * filesystem authority. Every byte they present arrives through one of the
 * ports declared here, already validated into this closed vocabulary. Queue,
 * accumulator, refresh, and cache maxima are mandatory constructor policy.
 * Normative sources: `cli-session.md §§4,6,8,9.5,12`,
 * `tui-operational-experience.md §§4,6`, `tui-interface-contracts.md §CA-22`.
 */
import type {TuiAttentionPriority} from './tuiShell.js';

/**
 * Refusals an owned attachment component raises. The `OPERATOR_SESSION_*`
 * members are the normative codes of `operator-session.md §23` and are reused
 * verbatim rather than re-spelled; the `ATTACHMENT_*` and `TURN_STREAM_*`
 * members name failures that exist only inside this ephemeral boundary.
 */
export const ATTACHMENT_REASONS = [
    'OPERATOR_SESSION_TURN_ACTIVE', 'OPERATOR_SESSION_OBSERVER_READ_ONLY', 'OPERATOR_SESSION_STATE_INVALID',
    'OPERATOR_SESSION_RESPONSE_INVALID', 'OPERATOR_SESSION_RESPONSE_STALE', 'OPERATOR_SESSION_INDEX_STALE',
    'ATTACHMENT_BINDING_INVALID', 'ATTACHMENT_STATE_INVALID', 'ATTACHMENT_EVENT_INVALID', 'ATTACHMENT_EVENT_REPLAYED',
    'ATTACHMENT_WAIT_CANCELLED', 'ATTACHMENT_QUEUE_OVERFLOW', 'ATTACHMENT_CHECKPOINT_INVALID', 'ATTACHMENT_CHECKPOINT_REGRESSED',
    'ATTACHMENT_IDENTITY_MISMATCH', 'ATTACHMENT_WAIT_UNAUTHORIZED', 'ATTACHMENT_DETAIL_INVALID', 'ATTACHMENT_DETAIL_LIMIT_EXCEEDED',
    'ATTACHMENT_PAGE_INVALID', 'TURN_STREAM_STATE_INVALID', 'TURN_STREAM_CHUNK_INVALID', 'TURN_STREAM_LIMIT_REACHED', 'TURN_RESULT_INVALID'
] as const;
export type AttachmentReason = typeof ATTACHMENT_REASONS[number];

/** Every refusal an owned attachment component raises; callers branch on `reason`, never message text. */
export class AttachmentError extends Error {
    constructor(readonly reason: AttachmentReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'AttachmentError';
    }
}

/**
 * The finite maxima of `cli-session.md §§8,12` and
 * `tui-operational-experience.md §4`. Constructor policy may lower these,
 * never raise them, so a hostile or buggy producer cannot grow an unbounded
 * second event queue behind a slow renderer.
 */
export const ATTACHMENT_LIMITS = Object.freeze({
    maxProvisionalChunks: 512, maxProvisionalBytes: 65536, maxProvisionalPreviewBytes: 4096,
    maxNotificationQueue: 100, maxAttentionItems: 50, maxCoalescedEvents: 256,
    minRefreshIntervalMs: 250, maxWaitMs: 900000, maxTurnRequestBytes: 32768,
    maxDetailKeys: 16, maxDetailDepth: 4, maxDetailBytes: 8192, maxDetailArrayItems: 32, maxDetailStringBytes: 4096
});

/** The ephemeral local attachment states of `cli-session.md §4`; none of them is durable session authority. */
export type AttachmentState = 'STARTING' | 'ATTACHED' | 'TURN_ACTIVE' | 'OBSERVING' | 'SESSION_UNAVAILABLE' | 'DETACHING' | 'STOPPED';
/** `cli-session.md §9.5`: an observer holds no write lock, endpoint slot, or budget reservation. */
export type AttachmentRole = 'operator' | 'observer';
/** The `cli-session.md §8` streaming state machine: `PREFLIGHT → PROVISIONAL* → VALIDATING → terminal`. */
export type TurnStreamState = 'PREFLIGHT' | 'PROVISIONAL' | 'VALIDATING' | 'VALIDATED' | 'STALE_VALIDATED' | 'INTERRUPTED' | 'FAILED';

/** The exact normalized presentation-event names of `cli-session.md §6`; this list is closed. */
export const PRESENTATION_EVENT_TYPES = [
    'attachment.opened', 'session.bound', 'turn.preflight', 'turn.invocation-started', 'turn.provisional',
    'turn.validated', 'turn.stale', 'turn.interrupted', 'turn.failed', 'proposal.available',
    'effect.preview', 'effect.confirmed', 'effect.result', 'lane.notification', 'budget.updated', 'attachment.detached'
] as const;
export type PresentationEventType = typeof PRESENTATION_EVENT_TYPES[number];

/**
 * The stable identity every presentation event carries. `sequence` is the
 * durable order of `tui-operational-experience.md §4`; `eventId` breaks ties.
 */
export interface PresentationEventIdentity {
    readonly eventId: string; readonly sequence: number; readonly laneId: string;
    readonly operatorSessionId: string; readonly turnId: string | null;
    readonly correlationId: string; readonly revision: number;
}
/** One validated presentation event: closed type, proven identity, and a bounded JSON-only detail record. */
export interface ValidatedPresentationEvent extends PresentationEventIdentity {
    readonly type: PresentationEventType;
    readonly detail: Readonly<Record<string, AttachmentJsonValue>>;
}
export type AttachmentJsonValue = string | number | boolean | null | readonly AttachmentJsonValue[] | {readonly [key: string]: AttachmentJsonValue};

/**
 * The CA-22-owned slice of the shell view model. CA-19 owns `TuiShellViewModel`
 * and CA-24 composes this slice into it; nothing here re-derives layout,
 * theme, focus, inspector, or timeline paging state.
 */
export interface AttachmentViewModel {
    readonly attachment: AttachmentState;
    readonly role: AttachmentRole;
    readonly stream: TurnStreamState | null;
    readonly activeTurnId: string | null;
    readonly provisional: ProvisionalView | null;
    readonly attention: readonly AttachmentAttentionItem[];
    readonly notifications: readonly AttachmentAttentionItem[];
    readonly confirmation: ConfirmationView | null;
    readonly followLive: boolean;
    readonly newOutput: boolean;
    readonly composerLocked: boolean;
    readonly revision: number;
    readonly lastSequence: number;
    readonly budget: string;
}
export interface ProvisionalView { readonly turnId: string; readonly text: string; readonly bytes: number; readonly chunks: number; readonly authoritative: false; readonly truncated: boolean; }
/**
 * A visible confirmation derived from an exact durable revision. Per
 * `tui-operational-experience.md §6` it becomes invalid the moment that
 * revision moves, and an invalid confirmation can never be accepted.
 */
export interface ConfirmationView {
    readonly confirmationId: string; readonly title: string; readonly reasonCode: string;
    readonly derivedRevision: number; readonly valid: boolean; readonly invalidatedBy: string | null;
}
export interface AttachmentAttentionItem {
    readonly priority: TuiAttentionPriority; readonly sequence: number; readonly eventId: string;
    readonly label: string; readonly type: PresentationEventType; readonly stealsFocus: false;
}

/**
 * One provider-normalized streaming chunk. `cli-session.md §6` requires the
 * provider adapter to normalize streaming and usage telemetry before a
 * reducer sees it, so the accumulator receives an index and byte count it can
 * order and bound rather than a raw provider frame.
 */
export interface NormalizedTurnChunk { readonly turnId: string; readonly index: number; readonly text: string; readonly bytes: number; }
/** The result of appending one chunk: the ordered non-authoritative view plus what the bound cost. */
export interface ProvisionalUpdate { readonly state: TurnStreamState; readonly view: ProvisionalView; readonly accepted: boolean; readonly duplicate: boolean; readonly droppedBytes: number; }
/** One complete schema-valid response; only this may become the recorded answer. */
export interface ValidatedTurnResult { readonly turnId: string; readonly text: string; readonly stale: boolean; readonly revision: number; readonly usage: Readonly<Record<string, AttachmentJsonValue>>; }
/**
 * The validated replacement of provisional content. `differsFromProvisional`
 * drives the `cli-session.md §8` rule that a validated answer differing from
 * provisional prose is printed distinctly.
 */
export interface ValidatedReplacement {
    readonly state: 'VALIDATED' | 'STALE_VALIDATED'; readonly turnId: string; readonly text: string;
    readonly differsFromProvisional: boolean; readonly provisionalRetained: false; readonly authoritative: true; readonly revision: number;
}
/** Provisional content kept only as interrupted/failed diagnostic evidence; never an answer, never a proposal. */
export interface InterruptedReplacement {
    readonly state: 'INTERRUPTED' | 'FAILED'; readonly turnId: string; readonly reason: string;
    readonly diagnosticText: string; readonly diagnosticBytes: number; readonly authoritative: false; readonly appliedProposal: false;
}

/** Identifies one local attachment to one durable operator session. */
export interface AttachmentBinding {
    readonly laneId: string; readonly operatorSessionId: string; readonly attachmentId: string;
    readonly role: AttachmentRole; readonly stream: boolean; readonly waitForActiveTurn: boolean;
}
export interface AttachmentResult {
    readonly binding: AttachmentBinding; readonly state: AttachmentState;
    readonly activeTurnOwner: ActiveTurnOwner | null; readonly revision: number; readonly createdSession: false;
}
/**
 * The durable lane/session identity every port answer must carry. Binding each
 * answer to this pair is what stops a foreign-lane or foreign-session reply
 * from mutating local attachment state.
 */
export interface DurableSessionIdentity { readonly laneId: string; readonly operatorSessionId: string; }
/** `tui-operational-experience.md §6`: contention shows the owner and start time, never a competing invocation. */
export interface ActiveTurnOwner extends DurableSessionIdentity { readonly turnId: string; readonly attachmentId: string; readonly startedAt: string; }

export interface BoundedTurnRequest { readonly binding: AttachmentBinding; readonly text: string; readonly bytes: number; readonly usesModel: boolean; readonly revision: number; }
export type TurnAdmission =
    | {readonly kind: 'admitted'; readonly turnId: string; readonly revision: number; readonly laneId: string; readonly operatorSessionId: string; readonly attachmentId: string}
    | {readonly kind: 'waiting'; readonly owner: ActiveTurnOwner; readonly holdsLock: false}
    | {readonly kind: 'refused'; readonly reason: AttachmentReason; readonly detail: string; readonly owner: ActiveTurnOwner | null};
export interface DurableTurnResult extends DurableSessionIdentity {
    readonly turnId: string; readonly state: 'complete' | 'interrupted' | 'failed' | 'cancelled';
    readonly stale: boolean; readonly revision: number; readonly text: string; readonly usage: Readonly<Record<string, AttachmentJsonValue>>;
}

/**
 * The single durable boundary an attachment may use. The accepted session
 * capabilities behind it own lifecycle, routing, budget, and effect
 * authority; the attachment only admits, waits, and observes.
 */
export interface AttachmentSessionPort {
    open(binding: AttachmentBinding, signal: AbortSignal): Promise<unknown>;
    admit(request: BoundedTurnRequest): Promise<unknown>;
    awaitTurn(turnId: string, signal: AbortSignal): Promise<unknown>;
}

/** A durable journal/index checkpoint; notifications derive mechanically from it and never advance it. */
export interface DurableCheckpoint { readonly laneId: string; readonly sequence: number; readonly revision: number; readonly digest: string; }
/**
 * One polled notification page. It names the lane, operator session, and
 * checkpoint it was derived from, so a foreign or regressed page is refused
 * before it can touch the queue or the retained checkpoint.
 */
export interface NotificationPage extends DurableSessionIdentity {
    readonly checkpoint: DurableCheckpoint; readonly items: readonly AttachmentAttentionItem[];
}
export interface NotificationUpdate {
    readonly checkpoint: DurableCheckpoint; readonly items: readonly AttachmentAttentionItem[];
    readonly coalesced: number; readonly dropped: number; readonly deferred: boolean;
    readonly advancedWatcherCursor: false; readonly usedModel: false;
}
export interface NotificationCheckpointPort { poll(checkpoint: DurableCheckpoint, signal: AbortSignal): Promise<unknown>; }

/**
 * The `tui-operational-experience.md §4` priority of one event class. Every
 * closed event type maps to exactly one priority, so a new lower-priority
 * event can never displace a visible higher-priority condition.
 */
export function presentationEventPriority(type: PresentationEventType): TuiAttentionPriority {
    if (type === 'attachment.detached') return 'P0';
    if (type === 'turn.stale' || type === 'effect.confirmed') return 'P1';
    if (type === 'turn.interrupted' || type === 'turn.failed') return 'P2';
    if (type === 'budget.updated') return 'P3';
    if (type === 'proposal.available' || type === 'effect.result' || type === 'lane.notification') return 'P4';
    return 'P5';
}

/**
 * Deterministic P0–P5 ordering: priority, then durable sequence, then stable
 * event ID. Ties never depend on arrival order, so two attachments replaying
 * the same durable events present the same list.
 */
export function orderAttentionItems(items: readonly AttachmentAttentionItem[]): readonly AttachmentAttentionItem[] {
    const rank: Record<TuiAttentionPriority, number> = {P0: 0, P1: 1, P2: 2, P3: 3, P4: 4, P5: 5};
    return Object.freeze([...items].sort((a, b) => rank[a.priority] - rank[b.priority] || a.sequence - b.sequence || a.eventId.localeCompare(b.eventId)));
}

/** The legal `cli-session.md §8` stream transitions; anything else is a typed invalid-state refusal. */
export function turnStreamTransitionAllowed(from: TurnStreamState, to: TurnStreamState): boolean {
    if (from === 'PREFLIGHT') return to === 'PROVISIONAL' || to === 'VALIDATING' || to === 'INTERRUPTED' || to === 'FAILED';
    if (from === 'PROVISIONAL') return to === 'PROVISIONAL' || to === 'VALIDATING' || to === 'INTERRUPTED' || to === 'FAILED';
    if (from === 'VALIDATING') return to === 'VALIDATED' || to === 'STALE_VALIDATED' || to === 'INTERRUPTED' || to === 'FAILED';
    return false;
}

/** `cli-session.md §4`: `SESSION_UNAVAILABLE` and `OBSERVING` accept no natural-language input. */
export function attachmentAcceptsTurns(state: AttachmentState, role: AttachmentRole): boolean {
    return role === 'operator' && (state === 'ATTACHED' || state === 'TURN_ACTIVE');
}

/** Validates one untrusted durable checkpoint; a regressing sequence or revision is refused, never silently accepted. */
export function validateDurableCheckpoint(value: unknown, previous: DurableCheckpoint | null): DurableCheckpoint {
    if (!isRecord(value) || !onlyKeys(value, ['laneId', 'sequence', 'revision', 'digest']) || !isText(value.laneId)
        || !isCount(value.sequence) || !isCount(value.revision) || !isText(value.digest)) {
        throw new AttachmentError('ATTACHMENT_CHECKPOINT_INVALID', 'checkpoint', 'The checkpoint is not a closed lane checkpoint envelope.');
    }
    const next = Object.freeze({laneId: value.laneId, sequence: value.sequence, revision: value.revision, digest: value.digest});
    if (previous && previous.laneId !== next.laneId) throw new AttachmentError('ATTACHMENT_CHECKPOINT_INVALID', next.laneId, 'The checkpoint belongs to another lane.');
    if (previous && (next.sequence < previous.sequence || next.revision < previous.revision)) {
        throw new AttachmentError('ATTACHMENT_CHECKPOINT_REGRESSED', next.laneId, 'The checkpoint moved backwards relative to the retained checkpoint.');
    }
    return next;
}

function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && Object.getPrototypeOf(value) === Object.prototype; }
function onlyKeys(value: Record<string, unknown>, keys: readonly string[]): boolean { return Object.keys(value).length === keys.length && Object.keys(value).every((key) => keys.includes(key)); }
function isText(value: unknown): value is string { return typeof value === 'string' && value.length > 0; }
function isCount(value: unknown): value is number { return Number.isInteger(value) && (value as number) >= 0; }
