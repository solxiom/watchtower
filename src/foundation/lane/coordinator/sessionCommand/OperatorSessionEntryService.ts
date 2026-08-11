/**
 * Session entry and the bounded `ask` interface (CA-24;
 * `docs/spec/cli-session.md` §4, `docs/spec/v1.md` §9).
 *
 * Two fences live here and nowhere else. Attachment entry requires an
 * interactive terminal in v1, so a non-interactive caller is refused *before*
 * any session is created — bare `session` must not leave a durable session
 * behind for a command that could never attach. And `ask` is model-free: CA-17
 * classifies the turn, and anything above `M0` is refused with a stable reason
 * because this lane has no accepted operator-turn endpoint executor. Emulating
 * one silently is exactly what the pack rules forbid.
 */
import {randomUUID} from 'node:crypto';
import type {AttachmentBinding} from '../../../../contracts/tuiAttachment.js';
import type {CreateSessionParams} from '../../../../contracts/operatorSession.js';
import {
    sessionCommandFailure, type SessionCommandResult
} from '../../../../contracts/sessionCommand.js';
import {classifySessionTurn} from '../sessionRouting/index.js';
import {OperatorSessionError} from '../session/index.js';
import {DurableAttachmentSessionPort} from './DurableAttachmentSessionPort.js';
import {sessionRow} from './sessionCommandProjection.js';
import {
    SessionCommandTargetResolver, type SessionCommandQuery, type SessionCommandTarget,
    type SessionCommandTargetOptions
} from './sessionCommandTarget.js';

/** The registered structured-query form `ask` answers without a model (§10.3). */
export const ASK_PROJECTION_FORM_ID = 'operator-session-projection-v1';

export interface SessionEntryRequest {
    readonly topic: string;
    readonly policyProfileId?: string;
    readonly tags?: readonly string[];
    readonly observe: boolean;
    readonly stream: boolean;
    readonly waitForActiveTurn: boolean;
    /** `process.stdout.isTTY`, injected so the fence is testable without a terminal. */
    readonly interactive: boolean;
}

export interface PreparedAttachment {
    readonly binding: AttachmentBinding;
    readonly port: DurableAttachmentSessionPort;
    readonly laneId: string;
    readonly operatorSessionId: string;
    readonly created: boolean;
}

export type PreparedAttachmentResult =
    | {readonly ok: true; readonly prepared: PreparedAttachment}
    | Extract<SessionCommandResult, {ok: false}>;

export interface AskRequest {
    readonly question: string;
    readonly operatorSessionId: string;
    /** A registered structured-query form id, or absent for natural language. */
    readonly queryFormId?: string;
}

export class OperatorSessionEntryService {
    private readonly resolver: SessionCommandTargetResolver;

    constructor(options: SessionCommandTargetOptions = {}) {
        this.resolver = new SessionCommandTargetResolver(options);
    }

    /** Bare `session`: create one open session and prepare its attachment. */
    create(query: SessionCommandQuery, request: SessionEntryRequest): PreparedAttachmentResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        const fence = terminalFence(request, 'session');
        if (fence !== null) return fence;
        const params: CreateSessionParams = {
            laneId: resolved.target.laneId, origin: 'operator', topic: request.topic,
            policyProfileId: request.policyProfileId ?? 'operator-standard', tags: [...(request.tags ?? [])]
        };
        try {
            const session = resolved.target.store.createSession(params);
            return {ok: true, prepared: this.prepare(resolved.target, session.operatorSessionId, request, true)};
        } catch (error) {
            if (!(error instanceof OperatorSessionError)) throw error;
            return sessionCommandFailure('SESSION_COMMAND_STATE_INVALID', resolved.target.laneId, error.message);
        }
    }

    /** `session attach <id>`: validate, then bind — never create, never transition. */
    attach(query: SessionCommandQuery, sessionId: string, request: SessionEntryRequest): PreparedAttachmentResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        const fence = terminalFence(request, 'session attach');
        if (fence !== null) return fence;
        try {
            resolved.target.store.loadSession(sessionId);
        } catch (error) {
            if (!(error instanceof OperatorSessionError)) throw error;
            return sessionCommandFailure('SESSION_COMMAND_NOT_FOUND', sessionId, error.message);
        }
        return {ok: true, prepared: this.prepare(resolved.target, sessionId, request, false)};
    }

    /**
     * `ask`: the stdin/pipe/one-result interface. It needs no terminal, and it
     * answers only what CA-17 classifies as `M0` — a registered projection
     * form over durable session bytes.
     */
    ask(query: SessionCommandQuery, request: AskRequest): SessionCommandResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        const turnId = `turn-${randomUUID()}`;
        const classification = classifySessionTurn({
            operatorSessionId: request.operatorSessionId, turnId, guards: [],
            form: request.queryFormId === undefined ? {kind: 'natural-language'} : {kind: 'structured-query', queryFormId: request.queryFormId},
            registeredQueryFormIds: [ASK_PROJECTION_FORM_ID], registeredBoundedFormIds: []
        });
        if (classification.decisionClass !== 'M0') {
            return sessionCommandFailure('SESSION_COMMAND_ROUTE_UNAVAILABLE', request.operatorSessionId,
                `a ${classification.decisionClass} operator turn requires an accepted endpoint executor, which this lane does not install; only the ${ASK_PROJECTION_FORM_ID} M0 form is answerable`);
        }
        return this.answerM0(resolved.target, request, classification.ruleId);
    }

    private answerM0(target: SessionCommandTarget, request: AskRequest, ruleId: string): SessionCommandResult {
        try {
            const session = target.store.loadSession(request.operatorSessionId);
            return {
                ok: true,
                data: {
                    schemaVersion: 1, action: 'ask', laneId: target.laneId,
                    operatorSessionId: session.operatorSessionId, dryRun: false, applied: false, detail: null,
                    result: {
                        decisionClass: 'M0', ruleId, usedModel: false, question: request.question,
                        answer: sessionRow(session)
                    }
                }
            };
        } catch (error) {
            if (!(error instanceof OperatorSessionError)) throw error;
            return sessionCommandFailure('SESSION_COMMAND_NOT_FOUND', request.operatorSessionId, error.message);
        }
    }

    private prepare(
        target: SessionCommandTarget, operatorSessionId: string, request: SessionEntryRequest, created: boolean
    ): PreparedAttachment {
        const binding: AttachmentBinding = Object.freeze({
            laneId: target.laneId, operatorSessionId, attachmentId: `att-${randomUUID()}`,
            role: request.observe ? 'observer' : 'operator', stream: request.stream,
            waitForActiveTurn: request.waitForActiveTurn
        });
        const port = new DurableAttachmentSessionPort({
            store: target.store, laneId: target.laneId,
            answer: () => ({text: '', usage: {inputTokens: 0, outputTokens: 0}})
        });
        return {binding, port, laneId: target.laneId, operatorSessionId, created};
    }
}

/**
 * Whether this process has an interactive terminal. It lives beside the fence
 * that consumes it — the command layer never reads `process` itself — and is
 * injectable so the fence is provable without a terminal.
 */
export function interactiveTerminal(): boolean {
    return process.stdin.isTTY === true && process.stdout.isTTY === true;
}

/** v1 requires an interactive terminal for every attachment form (§4). */
function terminalFence(request: SessionEntryRequest, form: string): Extract<SessionCommandResult, {ok: false}> | null {
    return request.interactive
        ? null
        : sessionCommandFailure('SESSION_COMMAND_TERMINAL_REQUIRED', form,
            'a full-screen attachment requires an interactive terminal; use `wt coordinator ask` or a `--json` read form instead');
}
