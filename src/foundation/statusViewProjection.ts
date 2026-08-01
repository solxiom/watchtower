import type {LaneStatusV1, RepositoryBinding, StatusRelatedLane, StatusRepositoryView,
    StatusWarningCode} from '../contracts/index.js';
import type {StatusLane} from './statusLaneTypes.js';
import type {StatusSessionObservation} from './StatusLiveObserver.js';

export function repositoryViews(lane: StatusLane, bindings: readonly RepositoryBinding[]): StatusRepositoryView[] {
    return lane.manifest.repositories.map(repository => {
        const binding = bindings.find(item => item.id === repository.id);
        return {id: repository.id, role: repository.role, access: repository.access,
            path: binding?.path ?? null, branch: binding?.branch ?? null,
            worktreeMode: binding?.worktreeMode ?? null};
    });
}

export function workerSessionViews(sessions: StatusSessionObservation): LaneStatusV1['workerSessions'] {
    return {implementer: {name: sessions.expected?.workers.implementer ?? null,
        present: sessions.workerPresent.implementer}, reviewer: {
        name: sessions.expected?.workers.reviewer ?? null, present: sessions.workerPresent.reviewer}};
}

export function relatedLaneViews(lane: StatusLane): StatusRelatedLane[] {
    return Object.entries(lane.manifest.relations ?? {}).flatMap(([relation, laneId]) =>
        laneId === undefined ? [] : [{relation, laneId}]);
}

export function watcherWarnings(lifecycle: string, running: boolean, heartbeat: string,
    warnings: StatusWarningCode[]): void {
    if (lifecycle === 'active' && !running) warnings.push('WATCHER_MISSING');
    if (heartbeat === 'stale') warnings.push('WATCHER_STALE');
    if (heartbeat === 'invalid') warnings.push('WATCHER_HEARTBEAT_INVALID');
    if (lifecycle === 'active' && heartbeat === 'absent') warnings.push('WATCHER_HEARTBEAT_ABSENT');
}
