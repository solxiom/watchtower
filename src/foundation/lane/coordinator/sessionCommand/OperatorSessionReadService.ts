/**
 * The read-only half of the `wt coordinator session` boundary (CA-24;
 * `docs/spec/v1.md` §9, `docs/spec/cli-session.md` §9.1).
 *
 * Every answer comes from CA-15's accepted `SessionStore` read methods and
 * CA-24's pure projections. This service never writes, never repairs a
 * journal, never invokes a model, and never widens a caller's limit: an
 * unreadable or absent session is a closed refusal, not an empty result.
 */
import type {JsonObject} from '../../../../contracts/types.js';
import type {SessionFilters, TurnFilters} from '../../../../contracts/operatorSession.js';
import {OperatorSessionError} from '../session/index.js';
import {
    sessionCommandFailure, type SessionCommandResult, type SessionReadAction
} from '../../../../contracts/sessionCommand.js';
import {
    budgetProjection, effectivePins, journalRow, proposalProjection, sessionRow, turnRow
} from './sessionCommandProjection.js';
import {
    SessionCommandTargetResolver, type SessionCommandQuery, type SessionCommandTarget,
    type SessionCommandTargetOptions
} from './sessionCommandTarget.js';

/** Records rendered per `export`/`history` page before the operator must page again. */
export const MAX_EXPORT_RECORDS = 500;

export class OperatorSessionReadService {
    private readonly resolver: SessionCommandTargetResolver;

    constructor(options: SessionCommandTargetOptions = {}) {
        this.resolver = new SessionCommandTargetResolver(options);
    }

    list(query: SessionCommandQuery, filters: SessionFilters = {}): SessionCommandResult {
        return this.read(query, 'list', null, (target) => ({
            sessions: target.store.listSessions(filters).map(sessionRow)
        }));
    }

    show(query: SessionCommandQuery, sessionId: string): SessionCommandResult {
        return this.read(query, 'show', sessionId, (target) => {
            const session = target.store.loadSession(sessionId);
            const entries = target.store.readJournalResult(sessionId);
            return {
                session: sessionRow(session), pinnedRefs: effectivePins(session, entries.entries),
                journalStatus: entries.status, journalEvents: entries.entries.length
            };
        });
    }

    history(query: SessionCommandQuery, sessionId: string, filters: TurnFilters = {}): SessionCommandResult {
        return this.read(query, 'history', sessionId, (target) => {
            const turns = target.store.listTurns(sessionId, filters);
            return {turns: turns.map(turnRow), returned: turns.length};
        });
    }

    /**
     * Deterministic rendering of retained records — the journal itself, not a
     * summary of it. Truncation is reported rather than hidden so an operator
     * never mistakes a bounded page for a complete history.
     */
    export(query: SessionCommandQuery, sessionId: string, since?: string): SessionCommandResult {
        return this.read(query, 'export', sessionId, (target) => {
            const session = target.store.loadSession(sessionId);
            const entries = target.store.readJournal(sessionId, since);
            const page = entries.slice(0, MAX_EXPORT_RECORDS);
            return {
                session: sessionRow(session), records: page.map(journalRow),
                truncated: entries.length > page.length, cursor: page.at(-1)?.eventId ?? null
            };
        });
    }

    budget(query: SessionCommandQuery, sessionId: string): SessionCommandResult {
        return this.read(query, 'budget', sessionId, (target) => {
            const session = target.store.loadSession(sessionId);
            const entries = target.store.readJournalResult(sessionId).entries;
            const turns = target.store.listTurns(sessionId, {limit: MAX_EXPORT_RECORDS});
            return {
                budgetSegmentId: session.budgetSegmentId,
                budget: budgetProjection(turns, entries)
            };
        });
    }

    proposals(query: SessionCommandQuery, sessionId: string): SessionCommandResult {
        return this.read(query, 'proposals', sessionId, (target) => ({
            proposals: proposalProjection(target.store.readJournalResult(sessionId).entries)
        }));
    }

    /**
     * One read shape for every form: resolve the lane, run the projection, and
     * translate exactly one owner's typed error. An unexpected error is
     * re-thrown rather than being flattened into a session refusal that would
     * claim more knowledge than this boundary has.
     */
    private read(
        query: SessionCommandQuery, action: SessionReadAction, sessionId: string | null,
        project: (target: SessionCommandTarget) => JsonObject
    ): SessionCommandResult {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        try {
            return {
                ok: true,
                data: {
                    schemaVersion: 1, action, laneId: resolved.target.laneId, operatorSessionId: sessionId,
                    dryRun: false, applied: false, detail: null, result: project(resolved.target)
                }
            };
        } catch (error) {
            if (!(error instanceof OperatorSessionError)) throw error;
            return sessionCommandFailure(readReason(error), sessionId ?? resolved.target.laneId, error.message);
        }
    }
}

function readReason(error: OperatorSessionError): 'SESSION_COMMAND_NOT_FOUND' | 'SESSION_COMMAND_JOURNAL_UNAVAILABLE' {
    return error.code === 'OPERATOR_SESSION_NOT_FOUND' ? 'SESSION_COMMAND_NOT_FOUND' : 'SESSION_COMMAND_JOURNAL_UNAVAILABLE';
}
