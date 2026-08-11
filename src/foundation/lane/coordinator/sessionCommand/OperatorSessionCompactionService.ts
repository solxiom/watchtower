/**
 * `wt coordinator session compact <session-id> [--dry-run]` (CA-24 over
 * CA-16R; `docs/spec/cli-session.md` §9.2).
 *
 * CA-16R's `SessionCompactor` owns retention selection and the durable
 * compaction; this service names its two accepted entry points and resolves
 * the two roots it needs from the accepted lane path owner. `--dry-run` calls
 * `previewCompact`, which selects without removing, so a preview can never be
 * the thing that frees bytes.
 */
import type {CompactOptions} from '../../../../contracts/index.js';
import {SessionIndexError} from '../../../../contracts/index.js';
import {SessionCompactor} from '../../../index/sessions/index.js';
import {buildLaneFilePath} from '../../../paths/index.js';
import {
    sessionCommandFailure, type SessionCommandResult
} from '../../../../contracts/sessionCommand.js';
import {
    SessionCommandTargetResolver, type SessionCommandQuery, type SessionCommandTargetOptions
} from './sessionCommandTarget.js';

/** The lane-relative roots CA-16R compacts between; both are accepted layout. */
const INDEX_ROOT = 'coordinator/index/sessions';
const SESSIONS_ROOT = 'coordinator/operator-sessions';

/** Retention defaults from `operator-session.md` §14; an operator may only tighten them. */
export const DEFAULT_COMPACT_OPTIONS: CompactOptions = Object.freeze({
    keepRecentTurns: 50, keepRecentDays: 30, keepPinnedOnly: false, keepProposalSourceTurns: true
});

export class OperatorSessionCompactionService {
    private readonly resolver: SessionCommandTargetResolver;

    constructor(options: SessionCommandTargetOptions = {}) {
        this.resolver = new SessionCommandTargetResolver(options);
    }

    async compact(
        query: SessionCommandQuery, sessionId: string, dryRun: boolean,
        options: CompactOptions = DEFAULT_COMPACT_OPTIONS
    ): Promise<SessionCommandResult> {
        const resolved = this.resolver.resolve(query);
        if (!resolved.ok) return resolved;
        const indexRoot = buildLaneFilePath(resolved.target.laneDir, INDEX_ROOT);
        const sessionsRoot = buildLaneFilePath(resolved.target.laneDir, SESSIONS_ROOT);
        try {
            const outcome = dryRun
                ? await SessionCompactor.previewCompact(indexRoot, sessionsRoot, sessionId, options)
                : await SessionCompactor.compact(indexRoot, sessionsRoot, sessionId, options);
            return {
                ok: true,
                data: {
                    schemaVersion: 1, action: 'compact', laneId: resolved.target.laneId,
                    operatorSessionId: sessionId, dryRun, applied: !dryRun, detail: null,
                    result: {...outcome}
                }
            };
        } catch (error) {
            if (!(error instanceof SessionIndexError)) throw error;
            return sessionCommandFailure('SESSION_COMMAND_COMPACTION_REFUSED', sessionId, `${error.reason}: ${error.message}`);
        }
    }
}
