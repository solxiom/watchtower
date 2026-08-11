import {join} from 'node:path';
import {OperatorSessionError} from '../../lane/index.js';
import {buildLaneFilePath} from '../../paths/index.js';
import type {DoctorCheckProvider, DoctorLaneContext} from '../DoctorCheckProvider.js';
import {fail, pass, skip, warn} from '../DoctorCheckResult.js';
import {
    collectSessionTurnEvidence, MAX_INSPECTED_SESSIONS, type SessionTurnEvidence
} from './sessionTurnEvidence.js';

const ID = 'session-turns' as const;
const SESSIONS_RELATIVE_PATH = join('coordinator', 'operator-sessions');

export interface SessionTurnCheckOptions {
    readonly collect?: typeof collectSessionTurnEvidence;
}

/**
 * Classifies operator-session identity, journal, turn, and attachment
 * evidence into exactly one doctor outcome.
 *
 * A session whose identity or journal will not replay is `fail`: the journal
 * is the durable authority for the session, and a lane that cannot read it has
 * lost that authority. A durable turn whose artifact set is incomplete is also
 * `fail` — the journal claims a completed turn whose bytes are not all there,
 * which is precisely a journal/artifact mismatch. An incompletely written
 * final journal line and a session still holding an active turn are `warn`:
 * §11.7 reserves the failing exit family for corruption and mismatch, and
 * both of these are states an explicit recovery or a live attachment owns, not
 * states doctor may repair.
 */
export function createSessionTurnCheck(options: SessionTurnCheckOptions = {}): DoctorCheckProvider {
    const collect = options.collect ?? collectSessionTurnEvidence;
    return {
        id: ID,
        run(context: DoctorLaneContext) {
            const laneDir = context.lane.laneDir;
            if (context.fileSystem.inspect(buildLaneFilePath(laneDir, SESSIONS_RELATIVE_PATH)) === undefined) {
                return skip(ID, 'No operator-session root (coordinator/operator-sessions) exists; this lane has never opened an operator session.');
            }
            const result = collect(laneDir, context.fileSystem);
            if (result.kind === 'refused') return reportRefusal(result.error);
            return reportEvidence(result.evidence);
        }
    };
}

export const sessionTurnCheck: DoctorCheckProvider = createSessionTurnCheck();

function reportRefusal(error: unknown) {
    if (error instanceof OperatorSessionError) {
        return fail(ID, `An operator session could not be read: ${error.message}`, 'ERR_INTEGRITY_FAILURE');
    }
    return fail(ID, 'An operator session could not be read: an unexpected error occurred.', 'ERR_INTEGRITY_FAILURE');
}

function reportEvidence(evidence: SessionTurnEvidence) {
    if (evidence.inspected === 0) {
        return skip(ID, 'The operator-session root exists but holds no operator session yet.');
    }
    if (evidence.incompleteTurns.length > 0) {
        const first = evidence.incompleteTurns[0];
        return fail(ID, `Turn ${first.turnId} of operator session ${first.operatorSessionId} is recorded complete in the journal but is missing ${
            first.missingArtifacts.join(', ')}${evidence.incompleteTurns.length > 1
            ? ` (${evidence.incompleteTurns.length - 1} further incomplete turn(s))` : ''}.`, 'ERR_INTEGRITY_FAILURE');
    }
    const pending = describePending(evidence);
    if (pending !== null) return warn(ID, pending);
    return pass(ID, `All ${evidence.inspected} operator session(s) replay cleanly and every durable turn has its complete artifact set.`);
}

function describePending(evidence: SessionTurnEvidence): string | null {
    const notes: string[] = [];
    if (evidence.incompleteJournals.length > 0) {
        notes.push(`${evidence.incompleteJournals.length} session journal(s) end in an incompletely written line and await explicit recovery (${
            evidence.incompleteJournals.join(', ')})`);
    }
    if (evidence.activeTurnSessions.length > 0) {
        notes.push(`${evidence.activeTurnSessions.length} session(s) still hold an active turn (${evidence.activeTurnSessions.join(', ')})`);
    }
    if (evidence.truncated) {
        notes.push(`inspection stopped at the bounded maximum of ${MAX_INSPECTED_SESSIONS} sessions`);
    }
    return notes.length === 0 ? null : `Operator sessions are readable, but ${notes.join('; ')}.`;
}
