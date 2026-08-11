import {
    AttachmentError, type AttachmentRole, type AttachmentState,
    type AttachmentViewModel, type ConfirmationView, type ValidatedPresentationEvent
} from '../../contracts/tuiAttachment.js';
import {AttachmentAttentionLedger} from './AttachmentAttentionLedger.js';
import {validatePresentationEvent} from '../../contracts/attachmentDetailSchema.js';
import type {TerminalTextSanitizer} from '../../contracts/tuiConversation.js';
import {AttachmentStreamTracker} from './AttachmentStreamTracker.js';

export interface PresentationEventReducerOptions {
    readonly laneId: string; readonly operatorSessionId: string; readonly role: AttachmentRole;
    readonly sanitizer: TerminalTextSanitizer; readonly maxAttentionItems?: number;
    readonly maxProvisionalChunks?: number; readonly maxProvisionalBytes?: number;
}

/**
 * The single reducer from validated presentation events to the CA-22 slice of
 * the shell view model. It reads no journal, index, provider, or clock and
 * performs no effect; every transition comes from the event's own identity.
 *
 * It enforces what a live attachment cannot get wrong: a lower priority never
 * displaces a visible higher-priority condition; any event past a
 * confirmation's derived revision invalidates it and nothing re-arms it;
 * follow tracks the live edge only while the operator is at it; and no event
 * steals focus, moves the composer, or clears input. Streaming state and
 * provisional bytes belong to `AttachmentStreamTracker`, never to this class.
 */
export class PresentationEventReducer {
    private readonly ledger: AttachmentAttentionLedger;
    private readonly tracker: AttachmentStreamTracker;
    private state: AttachmentViewModel;

    constructor(private readonly options: PresentationEventReducerOptions) {
        this.ledger = new AttachmentAttentionLedger(options.maxAttentionItems);
        this.tracker = new AttachmentStreamTracker({
            sanitizer: options.sanitizer, maxChunks: options.maxProvisionalChunks, maxBytes: options.maxProvisionalBytes
        });
        this.state = initialModel(options.role);
    }

    current(): AttachmentViewModel { return this.state; }

    /**
     * Validates, then fences against identity and replay. Invalidation runs
     * **before** apply: a later `effect.preview` must find the retained
     * confirmation already invalid, or it would replace a superseded
     * confirmation with a fresh valid one and re-arm what §6 forbids.
     */
    reduce(event: unknown): AttachmentViewModel {
        const validated = this.fence(validatePresentationEvent(event));
        const invalidated = {...this.state, confirmation: invalidate(this.state.confirmation, validated)};
        const next = this.apply(invalidated, validated);
        this.state = Object.freeze({
            ...next,
            revision: Math.max(next.revision, validated.revision),
            lastSequence: validated.sequence
        });
        return this.state;
    }

    /** Scroll intent from the operator, not from a producer: leaving the live edge disables follow. */
    setFollowLive(followLive: boolean): AttachmentViewModel {
        this.state = Object.freeze({...this.state, followLive, newOutput: followLive ? false : this.state.newOutput});
        return this.state;
    }

    /** The only way a superseded confirmation leaves the model; §6 forbids any automatic retry. */
    dismissConfirmation(): AttachmentViewModel {
        this.state = Object.freeze({...this.state, confirmation: null});
        return this.state;
    }

    private fence(event: ValidatedPresentationEvent): ValidatedPresentationEvent {
        if (event.laneId !== this.options.laneId || event.operatorSessionId !== this.options.operatorSessionId) {
            throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', event.eventId, 'The event belongs to another lane or operator session.');
        }
        if (event.sequence <= this.state.lastSequence) {
            throw new AttachmentError('ATTACHMENT_EVENT_REPLAYED', event.eventId, 'The event is not newer than the retained durable sequence.');
        }
        return event;
    }

    private apply(state: AttachmentViewModel, event: ValidatedPresentationEvent): AttachmentViewModel {
        const withAttention = {...state, attention: this.ledger.record(state.attention, event), notifications: this.ledger.recordNotification(state.notifications, event)};
        if (event.type === 'attachment.opened') return {...withAttention, attachment: this.options.role === 'observer' ? 'OBSERVING' : 'ATTACHED'};
        if (event.type === 'attachment.detached') return {...withAttention, ...this.tracker.end(), attachment: 'STOPPED', activeTurnId: null, composerLocked: true};
        if (event.type === 'session.bound') return {...withAttention, ...this.bind(event)};
        if (event.type === 'turn.preflight') return {...withAttention, ...this.tracker.begin(state.stream, event.turnId), activeTurnId: event.turnId};
        if (event.type === 'turn.invocation-started') return {...withAttention, ...this.tracker.invoke(this.sameTurn(state, event), state.stream), attachment: this.turnActive(state), activeTurnId: event.turnId};
        if (event.type === 'turn.provisional') return {...withAttention, ...this.provisional(state, event)};
        if (event.type === 'turn.validated') return {...withAttention, ...this.settle(state, event, event.detail.stale === true ? 'STALE_VALIDATED' : 'VALIDATED'), newOutput: !state.followLive};
        if (event.type === 'turn.interrupted') return {...withAttention, ...this.settle(state, event, 'INTERRUPTED')};
        if (event.type === 'turn.failed') return {...withAttention, ...this.settle(state, event, 'FAILED')};
        if (event.type === 'effect.preview') return {...withAttention, confirmation: this.preview(state, event)};
        if (event.type === 'budget.updated') return {...withAttention, budget: text(event.detail.budget) ?? state.budget};
        return withAttention;
    }

    /** `tui-operational-experience.md §6`: close, suspension, pruning, or authorization loss locks the composer. */
    private bind(event: ValidatedPresentationEvent): Partial<AttachmentViewModel> {
        const lifecycle = text(event.detail.lifecycle);
        if (lifecycle === 'closed' || lifecycle === 'suspended' || lifecycle === 'pruned' || lifecycle === 'archived') {
            return {...this.tracker.end(), attachment: 'SESSION_UNAVAILABLE', activeTurnId: null, composerLocked: true, confirmation: null};
        }
        return {attachment: this.options.role === 'observer' ? 'OBSERVING' : 'ATTACHED', composerLocked: this.options.role === 'observer'};
    }

    /** `cli-session.md §9.5`: an observer receives no foreign provisional chunks; otherwise the tracker bounds them. */
    private provisional(state: AttachmentViewModel, event: ValidatedPresentationEvent): Partial<AttachmentViewModel> {
        if (this.options.role === 'observer' || event.turnId === null) return {};
        const turnId = this.sameTurn(state, event);
        return {
            ...this.tracker.append(turnId, state.stream, event.detail.index, event.detail.text),
            activeTurnId: turnId, attachment: this.turnActive(state), newOutput: !state.followLive
        };
    }

    private settle(state: AttachmentViewModel, event: ValidatedPresentationEvent, to: 'VALIDATED' | 'STALE_VALIDATED' | 'INTERRUPTED' | 'FAILED'): Partial<AttachmentViewModel> {
        this.sameTurn(state, event);
        return {...this.tracker.settle(state.stream, to), attachment: this.settledState(state), activeTurnId: null};
    }

    /**
     * The active-turn identity fence. One operator session runs at most one
     * turn (`cli-session.md §12`), so once a turn is live every further
     * streaming or settlement event must name it; a mismatch is a producer
     * defect, refused before any tracker, accumulator, or view mutation.
     */
    private sameTurn(state: AttachmentViewModel, event: ValidatedPresentationEvent): string {
        const turnId = event.turnId ?? state.activeTurnId;
        if (turnId === null) throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', event.eventId, 'The event names no turn and no turn is active.');
        if (state.activeTurnId !== null && turnId !== state.activeTurnId) {
            throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', event.eventId, `The event belongs to ${turnId} while ${state.activeTurnId} is the active turn.`);
        }
        return turnId;
    }

    /** A superseded confirmation is never re-armed; a fresh preview needs an explicit dismissal first. */
    private preview(state: AttachmentViewModel, event: ValidatedPresentationEvent): ConfirmationView | null {
        if (state.confirmation && !state.confirmation.valid) return state.confirmation;
        const confirmationId = text(event.detail.confirmationId);
        if (!confirmationId) return state.confirmation;
        return Object.freeze({
            confirmationId, title: text(event.detail.title) ?? 'Confirm', reasonCode: text(event.detail.reasonCode) ?? 'CONFIRM',
            derivedRevision: event.revision, valid: true, invalidatedBy: null
        });
    }

    /** An observer's local state never becomes writable, and an unavailable session never becomes active. */
    private turnActive(state: AttachmentViewModel): AttachmentState {
        if (this.options.role === 'observer' || state.attachment === 'SESSION_UNAVAILABLE' || state.attachment === 'STOPPED') return state.attachment;
        return 'TURN_ACTIVE';
    }

    private settledState(state: AttachmentViewModel): AttachmentState {
        return this.options.role === 'operator' && state.attachment === 'TURN_ACTIVE' ? 'ATTACHED' : state.attachment;
    }
}

function initialModel(role: AttachmentRole): AttachmentViewModel {
    return Object.freeze({
        attachment: 'STARTING' as AttachmentState, role, stream: null, activeTurnId: null, provisional: null,
        attention: Object.freeze([]), notifications: Object.freeze([]), confirmation: null,
        followLive: true, newOutput: false, composerLocked: role === 'observer', revision: 0, lastSequence: -1, budget: 'unknown'
    });
}

/**
 * Any accepted event past the confirmation's derived revision invalidates it,
 * regardless of event type, recording the responsible durable event. Equal
 * revisions preserve validity, and nothing here ever re-arms.
 */
function invalidate(confirmation: ConfirmationView | null, event: ValidatedPresentationEvent): ConfirmationView | null {
    if (!confirmation || !confirmation.valid || event.revision <= confirmation.derivedRevision) return confirmation;
    return Object.freeze({...confirmation, valid: false, invalidatedBy: event.eventId});
}

function text(value: unknown): string | null { return typeof value === 'string' && value.length > 0 ? value : null; }
