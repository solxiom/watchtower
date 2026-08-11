import {
    ATTACHMENT_LIMITS, type ActiveTurnOwner, AttachmentError, type AttachmentBinding, type AttachmentResult,
    type AttachmentSessionPort, type AttachmentState, attachmentAcceptsTurns,
    type BoundedTurnRequest, type DurableTurnResult, type TurnAdmission
} from '../../contracts/tuiAttachment.js';
import {utf8Bytes} from '../../contracts/tuiConversation.js';
import {
    isCount, isRecord, onlyKeys, parseAttachmentBinding, parseAttachmentOpen,
    parseDurableTurnResult, parseTurnAdmission
} from './attachmentPortValidation.js';

export interface TuiAttachmentControllerOptions { readonly port: AttachmentSessionPort; readonly maxTurnRequestBytes?: number; }

/**
 * The ephemeral local attachment front door. It resolves the `cli-session.md
 * §4` attachment state, admits at most one turn per operator session, and
 * waits for a durable turn result without ever launching a competing
 * invocation.
 *
 * It is not durable session authority: it holds no session write lock, lane
 * mutation lock, endpoint reservation, or budget grant, and it neither creates
 * nor closes an operator session. Every durable answer arrives as `unknown`
 * and is proved by `attachmentPortValidation` before it may change local
 * state; this class owns the state machine and nothing else.
 */
export class TuiAttachmentController {
    private state: AttachmentState = 'STARTING';
    private binding: AttachmentBinding | null = null;
    private owner: ActiveTurnOwner | null = null;
    /** Turns this attachment durably established a right to await; `wait()` accepts nothing else. */
    private readonly awaitable = new Set<string>();
    private readonly maxRequestBytes: number;

    constructor(private readonly options: TuiAttachmentControllerOptions) {
        this.maxRequestBytes = bounded(options.maxTurnRequestBytes, ATTACHMENT_LIMITS.maxTurnRequestBytes);
    }

    current(): AttachmentState { return this.state; }
    activeTurnOwner(): ActiveTurnOwner | null { return this.owner; }

    /**
     * Binds to an existing durable operator session. Attaching appends no turn
     * and changes no lifecycle state; an observer binding settles in
     * `OBSERVING`, and a session that cannot accept input settles in
     * `SESSION_UNAVAILABLE` with bounded read-only navigation still available.
     *
     * Cancellation is checked twice: before the durable open, and again after
     * it returns but **before** any local commit. A port that ignores its
     * signal must not be able to attach an abandoned attachment — an abort
     * that lands during the open leaves the controller in `STARTING` with no
     * binding, owner, or state committed.
     */
    async start(binding: unknown, signal: AbortSignal): Promise<AttachmentResult> {
        const parsed = parseAttachmentBinding(binding);
        if (signal.aborted) throw new AttachmentError('ATTACHMENT_WAIT_CANCELLED', parsed.attachmentId, 'The attachment was cancelled before it opened.');
        const answer = await this.options.port.open(parsed, signal);
        if (signal.aborted) throw new AttachmentError('ATTACHMENT_WAIT_CANCELLED', parsed.attachmentId, 'The attachment was cancelled while it was opening.');
        const opened = parseAttachmentOpen(answer, parsed);
        this.binding = parsed;
        this.owner = opened.activeTurnOwner;
        this.state = opened.state;
        return opened;
    }

    /**
     * Submits one bounded turn. An observer is refused before any durable call
     * reaches the session; a session already running a turn returns the owner
     * rather than a second invocation, and only an explicit
     * `--wait-for-active-turn` binding may convert that contention into a wait.
     */
    async submit(request: unknown): Promise<TurnAdmission> {
        const binding = this.requireBinding();
        const parsed = this.parseRequest(request, binding);
        if (binding.role === 'observer') {
            return refused('OPERATOR_SESSION_OBSERVER_READ_ONLY', 'An observer attachment accepts no natural-language turns or mutations.', null);
        }
        if (!attachmentAcceptsTurns(this.state, binding.role)) {
            return refused('OPERATOR_SESSION_STATE_INVALID', `A ${this.state} attachment cannot append input.`, this.owner);
        }
        const admission = parseTurnAdmission(await this.options.port.admit(parsed), binding);
        if (admission.kind === 'admitted') {
            this.state = 'TURN_ACTIVE';
            this.owner = null;
            this.awaitable.add(admission.turnId);
            return admission;
        }
        if (admission.kind === 'waiting') this.awaitable.add(admission.owner.turnId);
        this.owner = admission.owner;
        return admission;
    }

    /**
     * Waits for one durable turn result. A turn is awaitable only after this
     * attachment established a durable relationship with it — its own admitted
     * turn, or the owner turn of an explicit wait admission. An arbitrary
     * caller-supplied identity is refused with `ATTACHMENT_WAIT_UNAUTHORIZED`
     * before any durable call, so a wait can never be used as an unfenced read
     * of another session's turn.
     *
     * The wait is cancellable and holds no lock, so an operator may abandon it
     * at any time; a cancelled wait changes no durable state and leaves the
     * durable turn to its own owner.
     */
    async wait(turnId: unknown, signal: AbortSignal): Promise<DurableTurnResult> {
        const binding = this.requireBinding();
        if (typeof turnId !== 'string' || turnId.length === 0) throw new AttachmentError('ATTACHMENT_STATE_INVALID', binding.attachmentId, 'A durable turn identity is a non-empty string.');
        if (!this.awaitable.has(turnId)) throw new AttachmentError('ATTACHMENT_WAIT_UNAUTHORIZED', turnId, 'This attachment has no admitted or waiting relationship with that turn.');
        if (signal.aborted) throw new AttachmentError('ATTACHMENT_WAIT_CANCELLED', turnId, 'The wait was cancelled before it started.');
        const result = parseDurableTurnResult(await this.options.port.awaitTurn(turnId, signal), turnId, binding);
        if (signal.aborted) throw new AttachmentError('ATTACHMENT_WAIT_CANCELLED', turnId, 'The wait was cancelled while it was in flight.');
        if (this.state === 'TURN_ACTIVE') this.state = 'ATTACHED';
        this.awaitable.delete(turnId);
        this.owner = null;
        return result;
    }

    /** Detaching never closes or suspends the durable operator session. */
    detach(): AttachmentState {
        this.state = 'STOPPED';
        this.owner = null;
        this.awaitable.clear();
        return this.state;
    }

    private requireBinding(): AttachmentBinding {
        if (!this.binding) throw new AttachmentError('ATTACHMENT_STATE_INVALID', 'attachment', 'The attachment has not been started.');
        return this.binding;
    }

    /** Operator-supplied turn input, bounded and fenced to this exact attachment before any durable call. */
    private parseRequest(value: unknown, binding: AttachmentBinding): BoundedTurnRequest {
        const invalid = (detail: string): never => { throw new AttachmentError('ATTACHMENT_STATE_INVALID', binding.attachmentId, detail); };
        if (!isRecord(value) || !onlyKeys(value, ['binding', 'text', 'bytes', 'usesModel', 'revision'])) return invalid('The request is not a closed bounded-turn envelope.');
        if (typeof value.text !== 'string' || value.text.length === 0) return invalid('A submitted turn carries non-empty text.');
        if (!isCount(value.bytes) || value.bytes !== utf8Bytes(value.text)) return invalid('The request byte count does not match its text.');
        if (value.bytes > this.maxRequestBytes) return invalid(`A submitted turn exceeds ${this.maxRequestBytes} bytes.`);
        if (typeof value.usesModel !== 'boolean' || !isCount(value.revision)) return invalid('The request model flag or revision is not a closed value.');
        const requested = parseAttachmentBinding(value.binding);
        if (requested.attachmentId !== binding.attachmentId || requested.operatorSessionId !== binding.operatorSessionId || requested.laneId !== binding.laneId) {
            return invalid('The request belongs to another attachment, lane, or operator session.');
        }
        return Object.freeze({binding, text: value.text, bytes: value.bytes, usesModel: value.usesModel, revision: value.revision});
    }
}

function refused(reason: 'OPERATOR_SESSION_OBSERVER_READ_ONLY' | 'OPERATOR_SESSION_STATE_INVALID', detail: string, owner: ActiveTurnOwner | null): TurnAdmission {
    return Object.freeze({kind: 'refused', reason, detail, owner});
}
function bounded(value: number | undefined, hardMaximum: number): number {
    if (typeof value !== 'number' || !Number.isFinite(value) || value < 1) return hardMaximum;
    return Math.min(Math.floor(value), hardMaximum);
}
