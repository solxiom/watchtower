/**
 * Fixtures for the CA-24 session command specs.
 *
 * The lane is a real temporary directory and every operator session is
 * materialized by the accepted CA-15 producer (`SessionStore.createSession`,
 * `acquireTurn`, `appendTurn`, `transitionSession`), so the proofs run against
 * producer bytes rather than a transcription of the format. Only lane
 * *selection* is stubbed: `CoordinatorReadService.resolve` is CA-14's accepted
 * owner and discovering a real control home is not what these specs are
 * proving.
 */
import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import type {DiscoveredLane} from '../../../../src/foundation/discovery/index.js';
import {
    CoordinatorReadService, type CoordinatorReadTarget
} from '../../../../src/foundation/lane/coordinator/CoordinatorReadService.js';
import {NodeCoordinatorReadFileStore} from '../../../../src/foundation/lane/coordinator/CoordinatorReadFileStore.js';
import {SessionLifecycle, SessionStore} from '../../../../src/foundation/lane/coordinator/session/index.js';
import type {OperatorSession, TurnRecord} from '../../../../src/contracts/operatorSession.js';

export const LANE_ID = 'a2f5d0c8-0a7e-4a55-9e5b-3f0c1b2d4e6f';

export interface SessionLaneFixture {
    readonly laneDir: string;
    readonly lane: DiscoveredLane;
    readonly store: SessionStore;
    readonly reads: CoordinatorReadService;
    readonly query: {readonly cwd: string};
    dispose(): void;
}

/** A lane selector that always answers with this fixture's lane. */
class FixedLaneReads extends CoordinatorReadService {
    constructor(private readonly lane: DiscoveredLane) { super(); }
    override resolve(): CoordinatorReadTarget {
        return {lane: this.lane, fileStore: new NodeCoordinatorReadFileStore()};
    }
}

/** A lane selector that refuses, the way an ambiguous or absent lane does. */
export class RefusingLaneReads extends CoordinatorReadService {
    override resolve(): CoordinatorReadTarget {
        throw new Error('no lane matched the current repository');
    }
}

export function createSessionLane(prefix = 'wt-ca24-'): SessionLaneFixture {
    const laneDir = mkdtempSync(join(tmpdir(), prefix));
    let sequence = 0;
    const store = new SessionStore({laneDir, idFactory: () => `opsess-${++sequence}`});
    const lane: DiscoveredLane = {
        laneId: LANE_ID, slug: 'ca-24', initiativeId: 'watchtower-v1', kind: 'implementation',
        controlHome: laneDir, laneDir, lifecycle: 'active',
        manifest: {
            schemaVersion: 1, laneId: LANE_ID, kind: 'implementation', slug: 'ca-24',
            initiativeId: 'watchtower-v1', controlHomeRepository: 'watchtower', laneDir, repositories: []
        }
    };
    return {
        laneDir, lane, store, reads: new FixedLaneReads(lane), query: {cwd: laneDir},
        dispose: () => rmSync(laneDir, {recursive: true, force: true})
    };
}

export function openSession(fixture: SessionLaneFixture, topic: string): OperatorSession {
    return fixture.store.createSession({laneId: LANE_ID, policyProfileId: 'operator-standard', topic});
}

/** One complete durable turn, appended through the accepted producer path. */
export function appendTurn(
    fixture: SessionLaneFixture, session: OperatorSession, turnId: string, index: number,
    usage: Readonly<Record<string, number>> = {inputTokens: 10, outputTokens: 20}
): OperatorSession {
    const active = new SessionLifecycle({store: fixture.store}).startTurn(session, turnId);
    const turn: TurnRecord = {
        schemaVersion: 1, turnId, operatorSessionId: session.operatorSessionId, turn: index, state: 'complete',
        operatorMessage: {content: `question ${index}`, bytes: 12}, resolvedRefs: [], unresolvedRefs: [],
        snapshot: {revision: index}, decisionClass: 'M0', routingRuleId: 'projection-query-v1', endpointId: null,
        response: {text: `answer ${index}`}, usage: {...usage}, stale: false,
        completedAt: new Date(Date.parse('2026-08-10T00:00:00Z') + index * 1000).toISOString()
    };
    fixture.store.appendTurn(active.operatorSessionId, turn);
    return fixture.store.loadSession(session.operatorSessionId);
}
