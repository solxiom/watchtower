/**
 * The durable side of CA-22's `AttachmentSessionPort`, over CA-15's accepted
 * operator-session owner (CA-24).
 *
 * CA-22 built the attachment state machine and its trust boundary but bound it
 * to no durable session; this is that binding and nothing more. It opens a
 * session, admits at most one turn through `SessionLifecycle`/`SessionStore`,
 * and reads a settled turn back. It decides no routing class, invokes no
 * endpoint, and holds no lane mutation lock: a model-backed turn is refused by
 * the command boundary before it ever reaches this port, because
 * `parseTurnAdmission` admits exactly one refusal reason and silently emulating
 * an unsupported route is forbidden.
 */
import {randomUUID} from 'node:crypto';
import type {
    ActiveTurnOwner, AttachmentBinding, AttachmentSessionPort, BoundedTurnRequest
} from '../../../../contracts/tuiAttachment.js';
import type {OperatorSession, TurnRecord} from '../../../../contracts/operatorSession.js';
import {OperatorSessionError, SessionLifecycle, SessionStore} from '../session/index.js';

/** One deterministic model-free answer for one admitted turn. */
export interface M0TurnAnswer {
    readonly text: string;
    readonly usage: Readonly<Record<string, number>>;
}

export interface DurableAttachmentPortOptions {
    readonly store: SessionStore;
    readonly laneId: string;
    /** Produces the M0 answer for an admitted turn; never a model, never an effect. */
    readonly answer: (request: BoundedTurnRequest) => M0TurnAnswer;
    readonly now?: () => string;
    readonly turnIdFactory?: () => string;
}

export class DurableAttachmentSessionPort implements AttachmentSessionPort {
    private readonly lifecycle: SessionLifecycle;
    private readonly now: () => string;
    private readonly nextTurnId: () => string;
    /**
     * The one operator session this port has been bound to. `awaitTurn`
     * receives only a turn identity, and resolving it by scanning every
     * session in the lane would be exactly the unbounded read this pack
     * forbids — so an unbound port refuses instead of searching.
     */
    private bound: string | null = null;

    constructor(private readonly options: DurableAttachmentPortOptions) {
        this.lifecycle = new SessionLifecycle({store: options.store});
        this.now = options.now ?? (() => new Date().toISOString());
        this.nextTurnId = options.turnIdFactory ?? (() => `turn-${randomUUID()}`);
    }

    /** Attaching appends no turn and changes no lifecycle state. */
    async open(binding: AttachmentBinding, signal: AbortSignal): Promise<unknown> {
        if (signal.aborted) return {state: 'STOPPED', activeTurnOwner: null, revision: 0, createdSession: false};
        const session = this.load(binding.operatorSessionId);
        if (session === null) return {state: 'SESSION_UNAVAILABLE', activeTurnOwner: null, revision: 0, createdSession: false};
        this.bound = session.operatorSessionId;
        const revision = this.revision(session.operatorSessionId);
        return {
            state: this.openState(binding, session), activeTurnOwner: this.owner(binding, session),
            revision, createdSession: false
        };
    }

    /**
     * One durable turn per session. The fence is CA-15's own `acquireTurn`
     * compare-and-set, so a second attachment loses the race durably rather
     * than by this port's own read.
     */
    async admit(request: BoundedTurnRequest): Promise<unknown> {
        const binding = request.binding;
        const session = this.load(binding.operatorSessionId);
        if (session === null) {
            return {kind: 'refused', reason: 'OPERATOR_SESSION_TURN_ACTIVE', detail: 'the operator session is no longer readable', owner: null};
        }
        this.bound = session.operatorSessionId;
        const turnId = this.nextTurnId();
        let active: OperatorSession;
        try {
            active = this.lifecycle.startTurn(session, turnId, 'attachment turn');
        } catch (error) {
            if (!(error instanceof OperatorSessionError)) throw error;
            const current = this.load(binding.operatorSessionId);
            return {
                kind: 'refused', reason: 'OPERATOR_SESSION_TURN_ACTIVE',
                detail: error.message, owner: current === null ? null : this.owner(binding, current)
            };
        }
        this.options.store.appendTurn(active.operatorSessionId, this.turnRecord(active, request, turnId));
        return {
            kind: 'admitted', turnId, revision: this.revision(binding.operatorSessionId),
            laneId: binding.laneId, operatorSessionId: binding.operatorSessionId, attachmentId: binding.attachmentId
        };
    }

    /** The settled durable turn, read back from the journal that recorded it. */
    async awaitTurn(turnId: string, signal: AbortSignal): Promise<unknown> {
        if (signal.aborted) return null;
        const sessionId = this.bound;
        if (sessionId === null) return null;
        const turn = this.options.store.readTurn(sessionId, turnId);
        return {
            laneId: this.options.laneId, operatorSessionId: sessionId, turnId, state: turn.state,
            stale: turn.stale, revision: this.revision(sessionId),
            text: typeof turn.response?.text === 'string' ? turn.response.text : '',
            usage: turn.usage as Readonly<Record<string, never>>
        };
    }

    private openState(binding: AttachmentBinding, session: OperatorSession): string {
        if (binding.role === 'observer') return 'OBSERVING';
        return session.state === 'open' || session.state === 'active-turn' ? 'ATTACHED' : 'SESSION_UNAVAILABLE';
    }

    private owner(binding: AttachmentBinding, session: OperatorSession): ActiveTurnOwner | null {
        if (session.state !== 'active-turn' || session.activeTurnId === null) return null;
        return {
            laneId: binding.laneId, operatorSessionId: session.operatorSessionId, turnId: session.activeTurnId,
            attachmentId: `durable:${session.operatorSessionId}`, startedAt: session.lastTurnAt ?? this.now()
        };
    }

    private turnRecord(session: OperatorSession, request: BoundedTurnRequest, turnId: string): TurnRecord {
        const answer = this.options.answer(request);
        return {
            schemaVersion: 1, turnId, operatorSessionId: session.operatorSessionId, turn: session.turnCount + 1,
            state: 'complete', operatorMessage: {content: request.text, bytes: request.bytes}, resolvedRefs: [],
            unresolvedRefs: [], snapshot: {laneId: this.options.laneId, revision: request.revision},
            decisionClass: 'M0', routingRuleId: 'projection-query-v1', endpointId: null,
            response: {text: answer.text}, usage: {...answer.usage}, stale: false, completedAt: this.now()
        };
    }

    private load(sessionId: string): OperatorSession | null {
        try { return this.options.store.loadSession(sessionId); } catch { return null; }
    }

    private revision(sessionId: string): number {
        try { return this.options.store.readJournalResult(sessionId).nextSequence; } catch { return 0; }
    }
}
