import type {
    LaneManifestV1,
    LaneLifecycle,
    LaneStatusV1,
    ResolvedLane,
    WorkerEventV1,
    WorkspaceContext
} from '../../src/contracts/index.js';

const manifest: LaneManifestV1 = {
    schemaVersion: 1,
    laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2',
    kind: 'implementation',
    slug: 'sql-backends',
    initiativeId: 'sql-backends-v1',
    controlHomeRepository: 'nirvana',
    laneDir: '.watchtower/lanes/sql-backends',
    implementationPack: {repository: 'nirvana', path: 'docs/spec/implementation/sql-backends'},
    repositories: [{id: 'nirvana', role: 'primary', access: 'write'}],
    relations: {producedFrom: 'prior-lane'},
    claims: [{repository: 'nirvana', paths: ['framework/**'], mode: 'exclusive-write'}]
};

const lane: ResolvedLane = {
    laneId: manifest.laneId,
    slug: manifest.slug,
    initiativeId: manifest.initiativeId,
    kind: manifest.kind,
    controlHome: '/projects/nirvana',
    laneDir: '/projects/nirvana/.watchtower/lanes/sql-backends',
    manifest,
    repositories: [{...manifest.repositories[0], path: '/projects/nirvana', branch: 'feature/sql', worktreeMode: 'dedicated'}]
};

const status: LaneStatusV1 = {
    lane: {id: manifest.laneId, slug: manifest.slug, initiativeId: manifest.initiativeId, kind: 'implementation', controlHome: lane.controlHome},
    repositories: lane.repositories,
    lifecycle: {status: 'unknown', activeBatch: null},
    health: {status: 'invalid', warnings: []},
    workerSessions: {}, watcher: {}, coordinator: {}, runtime: {}
};

const workerEvent: WorkerEventV1 = {
    schemaVersion: 1,
    eventId: 'event:handoff:1',
    type: 'handoff',
    sequence: 0,
    at: '2026-07-31T00:00:00Z',
    laneId: manifest.laneId,
    producer: 'worker:implementer',
    correlationId: 'cycle:1',
    causationId: null,
    policyVersion: 'v1',
    payload: {role: 'implementer', batch: 'RM-01', session: 'session:1'}
};

describe('Watchtower v1 domain types', function () {
    it('models every RM-01 domain contract at valid and boundary values', function () {
        const workspace: WorkspaceContext = {cwd: '/', workspace: '/', resolution: 'current-directory'};
        const extendedManifest: LaneManifestV1 = {...manifest, futureExtension: true};
        const extendedEvent: WorkerEventV1 = {...workerEvent, futureExtension: true};
        expect(lane.repositories[0].access).toBe('write');
        expect(status.lifecycle.status).toBe('unknown');
        expect(workspace.resolution).toBe('current-directory');
        expect(workerEvent.sequence).toBe(0);
        expect(workerEvent.causationId).toBeNull();
        expect(extendedManifest.futureExtension).toBeTrue();
        expect(extendedEvent.futureExtension).toBeTrue();
    });

    it('rejects intended invalid literals from otherwise complete fixtures', function () {
        // @ts-expect-error Resource claims are not repository access modes.
        const invalidClaim: LaneManifestV1 = {...manifest, claims: [{repository: 'nirvana', paths: [], mode: 'write'}]};
        // @ts-expect-error Persisted lifecycle excludes read-model uncertainty.
        const invalidLifecycle: LaneLifecycle = 'unknown';
        // @ts-expect-error Worker event type is closed in schema version 1.
        const invalidEvent: WorkerEventV1 = {...workerEvent, type: 'unknown'};
        // @ts-expect-error Worker role is carried in the payload and is closed.
        const invalidRole: WorkerEventV1 = {...workerEvent, payload: {...workerEvent.payload, role: 'operator'}};
        // @ts-expect-error Durable event envelope requires a numeric sequence.
        const invalidSequence: WorkerEventV1 = {...workerEvent, sequence: 'zero'};
        expect(invalidClaim).toBeDefined();
        expect(invalidLifecycle).toBeDefined();
        expect(invalidEvent).toBeDefined();
        expect(invalidRole).toBeDefined();
        expect(invalidSequence).toBeDefined();
    });
});
