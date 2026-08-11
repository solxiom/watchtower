import {
    AttachmentError, type ProvisionalView, type TurnStreamState, turnStreamTransitionAllowed
} from '../../contracts/tuiAttachment.js';
import type {TerminalTextSanitizer} from '../../contracts/tuiConversation.js';
import {ProvisionalTurnAccumulator} from './ProvisionalTurnAccumulator.js';

export interface AttachmentStreamTrackerOptions {
    readonly sanitizer: TerminalTextSanitizer;
    readonly maxChunks?: number; readonly maxBytes?: number;
}
/** What one streaming event resolves to: the proved §8 state and the bounded non-authoritative view. */
export interface StreamTransition { readonly stream: TurnStreamState | null; readonly provisional: ProvisionalView | null; }

/**
 * Owns one attachment's per-turn streaming lifecycle for the reducer: which
 * turn is live, its single bounded `ProvisionalTurnAccumulator`, and the
 * legality of every `cli-session.md §8` state move.
 *
 * Every transition is proved before it is applied, so an illegal move raises a
 * typed refusal and leaves both this tracker and the caller's view model
 * unchanged. A settled or ended turn releases its accumulator immediately, so
 * retained provisional bytes never outlive the turn that produced them.
 */
export class AttachmentStreamTracker {
    private accumulator: ProvisionalTurnAccumulator | null = null;

    constructor(private readonly options: AttachmentStreamTrackerOptions) {}

    /**
     * A new turn opens a fresh bounded accumulator and starts its own §8
     * machine at `PREFLIGHT`; the previous turn's provisional bytes are
     * released. The machine is per turn, so a *settled* predecessor never
     * blocks the next turn — but a still-live one does, because one operator
     * session may not run two turns at once (`cli-session.md §12`).
     */
    begin(current: TurnStreamState | null, turnId: string | null): StreamTransition {
        if (current !== null && !isSettled(current)) {
            throw new AttachmentError('TURN_STREAM_STATE_INVALID', turnId ?? 'turn', `A ${current} turn is still live; a second turn cannot start.`);
        }
        this.accumulator = turnId === null ? null : this.open(turnId);
        return {stream: 'PREFLIGHT', provisional: null};
    }

    /** Marks the durable invocation as started; provisional chunks may follow. */
    invoke(turnId: string, current: TurnStreamState | null): StreamTransition {
        this.requireTurn(turnId);
        return {stream: this.prove(current, 'PROVISIONAL'), provisional: null};
    }

    /**
     * Appends one chunk through the single bounded accumulator owner, which
     * enforces ordering, idempotent replay, the chunk/byte maxima, and visible
     * truncation. The §8 transition is proved *before* the chunk is appended,
     * so a late chunk on a settled turn mutates nothing.
     */
    append(turnId: string, current: TurnStreamState | null, index: unknown, text: unknown): StreamTransition {
        const accumulator = this.requireTurn(turnId);
        const stream = this.prove(current, 'PROVISIONAL');
        const update = accumulator.append({turnId, index, text, bytes: utf8Bytes(String(text ?? ''))});
        return {stream: update.state === 'PROVISIONAL' ? stream : update.state, provisional: update.view};
    }

    /**
     * The tracker-side half of the active-turn fence. An open accumulator
     * belongs to exactly one turn and is never silently redirected: a chunk
     * naming another turn is refused, leaving the accumulator and its retained
     * bytes untouched. A turn that has no accumulator yet opens one.
     */
    private requireTurn(turnId: string): ProvisionalTurnAccumulator {
        if (this.accumulator && this.accumulator.turnId !== turnId) {
            throw new AttachmentError('ATTACHMENT_IDENTITY_MISMATCH', turnId, `The stream owns ${this.accumulator.turnId}; it is never redirected to another turn.`);
        }
        this.accumulator = this.accumulator ?? this.open(turnId);
        return this.accumulator;
    }

    /**
     * Settles the turn. `cli-session.md §6` publishes no separate
     * `turn.validating` event, so a validated result implies the `VALIDATING`
     * step of the §8 machine and is proved through it rather than around it.
     */
    settle(current: TurnStreamState | null, to: TurnStreamState): StreamTransition {
        const validating = to === 'VALIDATED' || to === 'STALE_VALIDATED';
        const from = validating && current !== 'VALIDATING' ? this.prove(current, 'VALIDATING') : current;
        const stream = this.prove(from, to);
        this.accumulator = null;
        return {stream, provisional: null};
    }

    /** Detachment or session unavailability ends streaming outright and releases the accumulator. */
    end(): StreamTransition {
        this.accumulator = null;
        return {stream: null, provisional: null};
    }

    private open(turnId: string): ProvisionalTurnAccumulator {
        return new ProvisionalTurnAccumulator({
            turnId, sanitizer: this.options.sanitizer,
            maxChunks: this.options.maxChunks, maxBytes: this.options.maxBytes
        });
    }

    /** A stream transition is proved against `cli-session.md §8` before it may reach the view model. */
    private prove(from: TurnStreamState | null, to: TurnStreamState): TurnStreamState {
        if (from === null || from === to) return to;
        if (!turnStreamTransitionAllowed(from, to)) {
            throw new AttachmentError('TURN_STREAM_STATE_INVALID', this.accumulator?.turnId ?? 'turn', `A ${from} turn cannot move to ${to}.`);
        }
        return to;
    }
}

/** The §8 terminal states; only from one of these may a fresh turn begin. */
function isSettled(state: TurnStreamState): boolean {
    return state === 'VALIDATED' || state === 'STALE_VALIDATED' || state === 'INTERRUPTED' || state === 'FAILED';
}

function utf8Bytes(value: string): number { return new TextEncoder().encode(value).length; }
