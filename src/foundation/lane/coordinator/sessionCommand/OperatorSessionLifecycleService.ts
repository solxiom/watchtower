/**
 * The durable-lifecycle half of the `wt coordinator session` boundary
 * (CA-24; `docs/spec/v1.md` §9, `docs/spec/cli-session.md` §9.2).
 *
 * It owns no state machine. Legality is CA-15's `SessionLifecycle`, durable
 * bytes are CA-15's `SessionStore`, and this service's only job is to name one
 * accepted transition per command form, in one place, and translate the one
 * typed error CA-15 raises. It holds no lane mutation lock: an operator-session
 * lifecycle change is not a lane effect (`v1.md` §11.9).
 */
import type {JsonObject} from '../../../../contracts/types.js';
import type {ForkSessionParams, OperatorSession, SessionState} from '../../../../contracts/operatorSession.js';
import {OperatorSessionError, SessionLifecycle} from '../session/index.js';
import {
    sessionCommandFailure, type SessionCommandResult, type SessionWriteAction
} from '../../../../contracts/sessionCommand.js';
import {effectivePins, sessionRow} from './sessionCommandProjection.js';
import {
    SessionCommandTargetResolver, type SessionCommandQuery, type SessionCommandTarget,
    type SessionCommandTargetOptions
} from './sessionCommandTarget.js';

/** The exact accepted target state each lifecycle form asks for. */
const TARGET: Readonly<Record<'suspend' | 'resume' | 'close', SessionState>> = Object.freeze({
    suspend: 'suspended', resume: 'open', close: 'closed'
});

export class OperatorSessionLifecycleService {
    private readonly resolver: SessionCommandTargetResolver;

    constructor(options: SessionCommandTargetOptions = {}) {
        this.resolver = new SessionCommandTargetResolver(options);
    }

    /** `session suspend|resume|close <id>` — one accepted transition, or a typed refusal. */
    transition(query: SessionCommandQuery, form: 'suspend' | 'resume' | 'close', sessionId: string, dryRun: boolean): SessionCommandResult {
        return this.write(query, form, sessionId, dryRun, (target, lifecycle) => {
            const session = target.store.loadSession(sessionId);
            const to = TARGET[form];
            const validation = lifecycle.validateTransition(session.state, to);
            if (!validation.valid) throw new OperatorSessionError(validation.code ?? 'OPERATOR_SESSION_STATE_INVALID', form, sessionId);
            const base: JsonObject = {from: session.state, to};
            if (dryRun) return {...base, applied: false};
            return {...base, applied: true, session: sessionRow(lifecycle.transition(session, to, `session ${form}`))};
        });
    }

    /** `session fork <id> [--topic]` — a child session bound to the same lane. */
    fork(query: SessionCommandQuery, sessionId: string, params: ForkSessionParams, dryRun: boolean): SessionCommandResult {
        return this.write(query, 'fork', sessionId, dryRun, (target, lifecycle) => {
            const parent = target.store.loadSession(sessionId);
            if (parent.state === 'pruned') throw new OperatorSessionError('OPERATOR_SESSION_STATE_INVALID', 'fork session', sessionId);
            const base: JsonObject = {parentOperatorSessionId: parent.operatorSessionId};
            if (dryRun) return {...base, applied: false};
            return {...base, applied: true, session: sessionRow(lifecycle.forkSession(parent, params))};
        });
    }

    /**
     * `session pin|unpin <id> <ref>` — one durable `operator-session-pinned`
     * metadata event. The event, not a rewritten snapshot, is the record of
     * record, so a pin history stays reconstructible from the journal alone.
     */
    pin(query: SessionCommandQuery, form: 'pin' | 'unpin', sessionId: string, ref: string, dryRun: boolean): SessionCommandResult {
        return this.write(query, form, sessionId, dryRun, (target) => {
            const session = target.store.loadSession(sessionId);
            const entries = target.store.readJournalResult(sessionId).entries;
            const current = effectivePins(session, entries);
            const added = form === 'pin';
            if (added === current.includes(ref)) {
                throw new OperatorSessionError('OPERATOR_SESSION_REFERENCE_INVALID', `${form} reference`, ref);
            }
            const base: JsonObject = {ref, added};
            if (dryRun) return {...base, applied: false, pinnedRefs: current};
            target.store.appendEvent(sessionId, 'operator-session-pinned', {ref, added});
            const next = target.store.readJournalResult(sessionId).entries;
            return {...base, applied: true, pinnedRefs: effectivePins(session, next)};
        });
    }

    /**
     * `session prune <id>` — retire retained text while the journal tombstone
     * survives. A `closed` session is archived first: both steps are accepted
     * `SessionLifecycle` transitions and both are journaled, and the result
     * names every transition applied rather than performing a silent one.
     */
    prune(query: SessionCommandQuery, sessionId: string, dryRun: boolean): SessionCommandResult {
        return this.write(query, 'prune', sessionId, dryRun, (target, lifecycle) => {
            const session = target.store.loadSession(sessionId);
            const steps = pruneSteps(session.state);
            if (steps === null) throw new OperatorSessionError('OPERATOR_SESSION_STATE_INVALID', 'prune session', sessionId);
            const base: JsonObject = {from: session.state, transitions: [...steps]};
            if (dryRun) return {...base, applied: false};
            let current = session;
            for (const step of steps) current = lifecycle.transition(current, step, 'session prune');
            return {...base, applied: true, session: sessionRow(current)};
        });
    }

    private write(
        query: SessionCommandQuery, action: SessionWriteAction, sessionId: string, dryRun: boolean,
        apply: (target: SessionCommandTarget, lifecycle: SessionLifecycle) => JsonObject
    ): SessionCommandResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        const lifecycle = new SessionLifecycle({store: resolved.target.store});
        try {
            const result = apply(resolved.target, lifecycle);
            return {
                ok: true,
                data: {
                    schemaVersion: 1, action, laneId: resolved.target.laneId, operatorSessionId: sessionId,
                    dryRun, applied: result.applied === true, detail: null, result
                }
            };
        } catch (error) {
            if (!(error instanceof OperatorSessionError)) throw error;
            return sessionCommandFailure(writeReason(error), sessionId, error.message);
        }
    }
}

/** The accepted transition chain from a prunable state, or `null` when there is none. */
function pruneSteps(state: SessionState): readonly SessionState[] | null {
    if (state === 'archived') return ['pruned'];
    return state === 'closed' ? ['archived', 'pruned'] : null;
}

function writeReason(error: OperatorSessionError): 'SESSION_COMMAND_NOT_FOUND' | 'SESSION_COMMAND_TURN_ACTIVE' | 'SESSION_COMMAND_REFERENCE_INVALID' | 'SESSION_COMMAND_STATE_INVALID' | 'SESSION_COMMAND_JOURNAL_UNAVAILABLE' {
    switch (error.code) {
        case 'OPERATOR_SESSION_NOT_FOUND': return 'SESSION_COMMAND_NOT_FOUND';
        case 'OPERATOR_SESSION_TURN_ACTIVE': return 'SESSION_COMMAND_TURN_ACTIVE';
        case 'OPERATOR_SESSION_REFERENCE_INVALID': return 'SESSION_COMMAND_REFERENCE_INVALID';
        case 'OPERATOR_SESSION_STATE_INVALID': return 'SESSION_COMMAND_STATE_INVALID';
        default: return 'SESSION_COMMAND_JOURNAL_UNAVAILABLE';
    }
}
