/**
 * The read-only operator-session evidence the `session-turns` provider
 * classifies.
 *
 * It answers three questions and nothing else: does every discovered session
 * still load and replay, is its journal complete, and does every turn the
 * journal reports as durable still have its complete artifact set on disk. It
 * reaches every one of those answers through CA-15's accepted `SessionStore`
 * read methods (`listSessions`, `readJournalResult`, `listTurns`), so session
 * identity, replay, and turn projection keep exactly one owner. It never calls
 * `recoverJournal` or any other repairing method, and it holds no judgment
 * about pass/warn/fail — that classification is the provider's.
 */
import {join} from 'node:path';
import type {LaneDiscoveryFileSystem} from '../../discovery/index.js';
import {SessionStore, type OperatorSession} from '../../lane/index.js';
import {buildLaneFilePath} from '../../paths/index.js';

/** The complete durable artifact set `SessionStore.appendTurn` materializes for one turn. */
export const TURN_ARTIFACTS = Object.freeze(['operator.md', 'coordinator.md', 'response.json', 'snapshot.json', 'usage.json'] as const);

/** Sessions inspected per doctor run. Beyond this the lane needs compaction, not a longer scan. */
export const MAX_INSPECTED_SESSIONS = 200;

export interface SessionTurnFinding {
    readonly operatorSessionId: string;
    readonly turnId: string;
    readonly missingArtifacts: readonly string[];
}

export interface SessionTurnEvidence {
    readonly inspected: number;
    readonly truncated: boolean;
    readonly activeTurnSessions: readonly string[];
    readonly incompleteJournals: readonly string[];
    readonly incompleteTurns: readonly SessionTurnFinding[];
}

export interface SessionEvidenceRefusal {
    readonly kind: 'refused';
    readonly error: unknown;
}

export type SessionEvidenceResult =
    | {readonly kind: 'evidence'; readonly evidence: SessionTurnEvidence}
    | SessionEvidenceRefusal;

/** Collects evidence for every operator session in the lane, or reports the first refusal. */
export function collectSessionTurnEvidence(laneDir: string, fileSystem: LaneDiscoveryFileSystem): SessionEvidenceResult {
    const store = new SessionStore(laneDir);
    let sessions: readonly OperatorSession[];
    try {
        sessions = store.listSessions({limit: MAX_INSPECTED_SESSIONS});
    } catch (error) {
        return {kind: 'refused', error};
    }
    const activeTurnSessions: string[] = [];
    const incompleteJournals: string[] = [];
    const incompleteTurns: SessionTurnFinding[] = [];
    for (const session of sessions) {
        if (session.state === 'active-turn') activeTurnSessions.push(session.operatorSessionId);
        try {
            if (store.readJournalResult(session.operatorSessionId).status !== 'complete') {
                incompleteJournals.push(session.operatorSessionId);
            }
            collectTurnFindings(store, session, laneDir, fileSystem, incompleteTurns);
        } catch (error) {
            return {kind: 'refused', error};
        }
    }
    return {
        kind: 'evidence',
        evidence: {
            inspected: sessions.length,
            truncated: sessions.length === MAX_INSPECTED_SESSIONS,
            activeTurnSessions, incompleteJournals, incompleteTurns
        }
    };
}

function collectTurnFindings(
    store: SessionStore, session: OperatorSession, laneDir: string,
    fileSystem: LaneDiscoveryFileSystem, into: SessionTurnFinding[]
): void {
    for (const turn of store.listTurns(session.operatorSessionId, {limit: MAX_INSPECTED_SESSIONS})) {
        const missingArtifacts = TURN_ARTIFACTS.filter(
            artifact => !isFile(laneDir, fileSystem, session.operatorSessionId, turn.turnId, artifact)
        );
        if (missingArtifacts.length > 0) {
            into.push({operatorSessionId: session.operatorSessionId, turnId: turn.turnId, missingArtifacts});
        }
    }
}

function isFile(
    laneDir: string, fileSystem: LaneDiscoveryFileSystem, sessionId: string, turnId: string, artifact: string
): boolean {
    const relative = join('coordinator', 'operator-sessions', sessionId, 'turns', turnId, artifact);
    return fileSystem.inspect(buildLaneFilePath(laneDir, relative))?.kind === 'file';
}
