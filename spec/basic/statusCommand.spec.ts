import Ajv2020 from 'ajv/dist/2020.js';
import {makeArgMap} from '@nirvana/base/utils/argUtil';
import {readFileSync, rmSync, symlinkSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import type {StatusWarningCode, WatchtowerError, WorkerEventRecord} from '../../src/contracts/index.js';
import StatusCommand from '../../src/commands/StatusCommand.js';
import {parseReadCommandOptions, validateRawReadCommandArguments} from '../../src/commands/readCommandOptions.js';
import {
    StatusProjection, buildCommandResult, renderResult
} from '../../src/foundation/index.js';
import {deriveStatusHealth} from '../../src/foundation/status/index.js';
import {loadV1SchemaBundle} from '../../src/foundation/schemaComposition/schemaBundle.js';
import {isRfc3339DateTime} from '../../src/foundation/schemaComposition/rfc3339DateTime.js';
import {StatusEventProjection} from '../../src/foundation/status/index.js';
import {createCli} from '../../src/run.js';
import {
    createLane, createReadCommandFixture, repository, treeSnapshot, writeJson, writeMembershipIndex
} from './readCommandFixtures.js';

const NOW = new Date('2026-08-01T10:05:00Z');

describe('StatusCommand read-only integration', function () {
    it('fails closed for an empty relevant set without creating lane or index bytes', async function () {
        const fixture = createReadCommandFixture();
        try {
            const before = treeSnapshot(fixture.root);
            await expectAsync(projection([]).project(query(fixture)))
                .toBeRejectedWith(jasmine.objectContaining({code: 'ERR_LANE_NOT_FOUND'}));
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('recursive proof inventory detects symlink-target bytes without following the link', function () {
        const fixture = createReadCommandFixture();
        try {
            const link = join(fixture.root, 'inventory-link');
            symlinkSync('missing-target-a', link);
            const first = treeSnapshot(fixture.root);
            rmSync(link); symlinkSync('missing-target-b', link);
            expect(treeSnapshot(fixture.root)).not.toBe(first);
        } finally { fixture.remove(); }
    });

    it('projects a healthy active lane and renders human/JSON parity without writes', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {activeBatch: 'RM-12'});
            writeFileSync(join(laneDir, 'state', 'watcher-heartbeat.txt'), '2026-08-01T10:04:30Z\n');
            writeFileSync(join(laneDir, 'lane.config.env'), `${readFileSync(join(laneDir, 'lane.config.env'), 'utf8')}API_TOKEN="never-render"\n`);
            const before = treeSnapshot(fixture.root);
            const result = await projection(['wt-lane-a-watch', 'wt-lane-a-implementer']).project(query(fixture));
            expect(result.health.status).toBe('ok');
            expect(result.health.warnings.length).toBe(0);
            expect(result.workerSessions.implementer.name).toBe('wt-lane-a-implementer');
            expect(result.workerSessions.implementer.present).toBeTrue();
            expect(result.watcher.running).toBeTrue();
            expect(result.watcher.heartbeatStatus).toBe('fresh');
            expect(result.watcher.lastHeartbeatAt).toBe('2026-08-01T10:04:30Z');
            expect(result.packIntegrity.status).toBe('valid');
            expect(result.runtime.qualification).toBe('valid');
            expect(result.runtime.configured).toBe('1.0.0');
            expect(result.runtime.installed).toBe('1.0.0');
            expect(result.runtime.available).toBeTrue();
            expect(result.runtime.availableVersions).toEqual(['1.0.0']);
            expect(schemaValid(result)).toBeTrue();
            expect(schemaValid({...result, health: {...result.health,
                warnings: [{code: 'ARBITRARY', severity: 'attention', message: 'x'}]}})).toBeFalse();
            expect(schemaValid({...result, health: {...result.health,
                warnings: [{code: 'WATCHER_STALE', severity: 'invalid', message: 'x'}]}})).toBeFalse();
            const availableCoordinator = {status: 'available' as const, queueDepth: 0, activeCycle: null,
                decisionClass: null, routeAvailable: false, lastOutcome: null,
                packIndex: {status: 'valid' as const, packSealId: result.packIntegrity.sealId},
                runtimeIndex: {status: 'unavailable' as const, projectionRevision: null}, budgetWarning: false,
                operatorSessions: {open: 1, suspended: 0, activeTurns: 0, budgetWarning: false,
                    staleProposals: 0, recent: [{operatorSessionId: 'operator-1', origin: 'operator' as const,
                        policyProfileId: 'default', state: 'open' as const, topic: null, turnCount: 0,
                        lastTurnAt: null, activeTurn: false, actionableHolds: 0, actionableProposals: 0}],
                    recentTruncated: false}, holds: []};
            expect(schemaValid({...result, coordinator: availableCoordinator})).toBeTrue();
            expect(schemaValid({...result, coordinator: {...availableCoordinator,
                operatorSessions: {...availableCoordinator.operatorSessions, recent: [{}]}}})).toBeFalse();
            expect(schemaValid({...result, conflicts: [{kind: 'tmux-prefix', lanes: [result.lane.id,
                '22222222-2222-4222-8222-222222222222'], prefix: 'wt'}]})).toBeTrue();
            expect(schemaValid({...result, conflicts: [{kind: 'proof-resource', lanes: [result.lane.id,
                '22222222-2222-4222-8222-222222222222'], resource: 'proof'}]})).toBeTrue();
            const envelope = buildCommandResult('status', result);
            const json = renderResult(envelope, {json: true, noColor: true});
            const human = renderResult(envelope, {json: false, noColor: true});
            expect(JSON.parse(json).data).toEqual(result);
            expect(human).toContain('"status": "ok"');
            expect(`${json}${human}`).not.toContain('never-render');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('applies the complete closed warning order and health precedence', function () {
        const codes: StatusWarningCode[] = [
            'RUNTIME_INTEGRITY_UNAVAILABLE', 'PENDING_WORKER_EVENT', 'DURABLE_EVENT_REJECTED',
            'DURABLE_EVENT_CORRUPT', 'WORKER_SESSION_MISSING',
            'WATCHER_STALE', 'WATCHER_HEARTBEAT_INVALID', 'WATCHER_HEARTBEAT_ABSENT', 'WATCHER_MISSING',
            'TMUX_UNAVAILABLE', 'LANE_BUSY', 'PROOF_RESOURCE_CONFLICTS_UNAVAILABLE', 'WRITABLE_CONFLICT',
            'CONFLICT_OBSERVATION_INCOMPLETE', 'REPOSITORY_UNAVAILABLE', 'MEMBERSHIP_INDEX_STALE',
            'SOURCE_BASELINE_OPTIONAL_UNAVAILABLE',
            'SOURCE_BASELINE_UNRELATED', 'SOURCE_BASELINE_UNAVAILABLE', 'SOURCE_BASELINE_CRITICAL',
            'IMPLEMENTATION_PACK_DRIFT', 'IMPLEMENTATION_PACK_UNACCEPTED',
            'IMPLEMENTATION_PACK_INVALID', 'IMPLEMENTATION_PACK_UNAVAILABLE', 'IMPLEMENTATION_PACK_MISSING',
            'INVALID_REPOSITORY_BINDINGS', 'INVALID_INSTALL', 'INVALID_LANE_CONFIG', 'INVALID_LANE_STATE'
        ];
        const invalid = deriveStatusHealth({lifecycle: 'complete', warningCodes: codes});
        expect(invalid.status).toBe('invalid');
        expect(invalid.warnings.map(item => item.code)).toEqual([...new Set(codes)].reverse());
        expect(invalid.warnings.slice(0, 5).every(item => item.severity === 'invalid')).toBeTrue();
        expect(deriveStatusHealth({lifecycle: 'complete', warningCodes: ['WATCHER_STALE']}).status).toBe('complete');
        expect(deriveStatusHealth({lifecycle: 'active', warningCodes: ['WATCHER_STALE']}).status).toBe('attention');
        expect(deriveStatusHealth({lifecycle: 'paused', warningCodes: []}).status).toBe('ok');
    });

    it('reports stale index, conflicts, busy lock, stale watcher, corrupt events, and unavailable tmux', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {activeBatch: 'RM-12'});
            createLane(fixture, {slug: 'lane-b', laneId: '22222222-2222-4222-8222-222222222222'});
            writeMembershipIndex(fixture, {[fixture.controlHome]: {
                laneId: '99999999-9999-4999-8999-999999999999', laneHome: join(fixture.root, 'missing')
            }});
            writeFileSync(join(laneDir, 'state', 'lane.lock'), 'busy');
            writeFileSync(join(laneDir, 'state', 'watcher-heartbeat.txt'), '2026-08-01T10:00:00Z\n');
            writeFileSync(join(laneDir, 'state', 'worker-events.jsonl'), `${JSON.stringify(event('blocked'))}\nmalformed\n`);
            const before = treeSnapshot(fixture.root);
            const result = await failingTmuxProjection().project({...query(fixture), lane: 'lane-a', verbose: true});
            const codes = result.health.warnings.map(item => item.code);
            expect(result.health.status).toBe('attention');
            expect(codes).toEqual([
                'MEMBERSHIP_INDEX_STALE', 'WRITABLE_CONFLICT', 'LANE_BUSY', 'TMUX_UNAVAILABLE',
                'WATCHER_MISSING', 'WATCHER_STALE', 'DURABLE_EVENT_CORRUPT', 'PENDING_WORKER_EVENT'
            ]);
            expect(result.conflicts.map(item => item.kind)).toContain('shared-write');
            expect(result.latestEvent?.type).toBe('blocked');
            expect(result.diagnostics?.membershipWarningCount).toBe(1);
            expect(result.diagnostics?.eventWarningCount).toBe(1);
            expect(result.diagnostics?.conflictCount).toBe(2);
            expect(schemaValid(result)).toBeTrue();
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('returns invalid health for each selected-lane integrity failure without repair', async function () {
        const cases: Array<{name: string; mutate: (fixture: Fixture, laneDir: string) => void; code: StatusWarningCode}> = [
            {name: 'state', mutate: (_fixture, laneDir) => writeFileSync(join(laneDir, 'state',
                'coordinator-lane-state.txt'), 'lane_status=broken\n'), code: 'INVALID_LANE_STATE'},
            {name: 'config', mutate: (_fixture, laneDir) => writeFileSync(join(laneDir, 'lane.config.env'),
                'API_TOKEN=hidden\n'), code: 'INVALID_LANE_CONFIG'},
            {name: 'install', mutate: (_fixture, laneDir) => writeFileSync(join(laneDir, 'install.json'), '{}'),
                code: 'INVALID_INSTALL'},
            {name: 'bindings', mutate: (_fixture, laneDir) => writeFileSync(join(laneDir,
                'repositories.local.json'), '{}'), code: 'INVALID_REPOSITORY_BINDINGS'},
            {name: 'pack', mutate: fixture => rmSync(join(fixture.controlHome, 'docs'), {recursive: true}),
                code: 'IMPLEMENTATION_PACK_MISSING'}
        ];
        for (const item of cases) {
            const fixture = createReadCommandFixture();
            try {
                const laneDir = createLane(fixture, {lifecycle: 'paused'});
                item.mutate(fixture, laneDir);
                const before = treeSnapshot(fixture.root);
                const result = await projection([]).project(query(fixture));
                expect(result.health.status).withContext(item.name).toBe('invalid');
                expect(result.health.warnings.map(warning => warning.code)).withContext(item.name).toContain(item.code);
                expect(schemaValid(result)).withContext(item.name).toBeTrue();
                expect(treeSnapshot(fixture.root)).withContext(item.name).toBe(before);
            } finally { fixture.remove(); }
        }
    });

    it('fails closed for an unsupported install version without writes', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {lifecycle: 'paused'});
            writeJson(join(laneDir, 'install.json'), {schemaVersion: 2, mode: 'linked',
                cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0'});
            const before = treeSnapshot(fixture.root);
            await expectAsync(projection([]).project(query(fixture)))
                .toBeRejectedWith(jasmine.objectContaining({code: 'ERR_UNSUPPORTED_VERSION'}));
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('supports secondary multi-repository selection and rejects ambiguity, path escape, and schema extras', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneId = '33333333-3333-4333-8333-333333333333';
            const laneDir = createLane(fixture, {laneId, lifecycle: 'paused', repositories: [
                repository('main', fixture.controlHome, 'primary', 'write'),
                repository('secondary', fixture.secondary, 'integration', 'read')
            ]});
            writeMembershipIndex(fixture, {[fixture.secondary]: {laneId, laneHome: fixture.controlHome}});
            const before = treeSnapshot(fixture.root);
            const result = await projection([]).project({cwd: fixture.secondary, environment: env(fixture)});
            expect(result.repositories.map(item => item.path)).toEqual([fixture.controlHome, fixture.secondary]);
            expect(treeSnapshot(fixture.root)).toBe(before);
            createLane(fixture, {slug: 'lane-b', laneId: '44444444-4444-4444-8444-444444444444', lifecycle: 'paused'});
            const ambiguous = treeSnapshot(fixture.root);
            await expectAsync(projection([]).project(query(fixture))).toBeRejectedWith(jasmine.objectContaining({code: 'ERR_AMBIGUOUS_SELECTION'}));
            expect(treeSnapshot(fixture.root)).toBe(ambiguous);
            expect(schemaValid({...result, extra: true})).toBeFalse();
            const outside = join(fixture.root, 'outside-events');
            writeFileSync(outside, '');
            symlinkSync(outside, join(laneDir, 'state', 'worker-events.jsonl'));
            const escaped = treeSnapshot(fixture.root);
            await expectAsync(projection([]).project({...query(fixture), lane: 'lane-a'}))
                .toBeRejectedWith(jasmine.objectContaining({code: 'ERR_PATH_ESCAPE'}));
            expect(treeSnapshot(fixture.root)).toBe(escaped);
        } finally { fixture.remove(); }
    });

    it('ignores foreign lane, incompatible role/type, future type, and wrong-session events', async function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture, {activeBatch: 'RM-12'});
            const records = [
                {...event('blocked'), sequence: 99, laneId: '22222222-2222-4222-8222-222222222222'},
                {...event('blocked'), sequence: 98, type: 'future-event'},
                {...event('blocked'), sequence: 97, type: 'accept'},
                {...event('blocked'), sequence: 96, payload: {...event('blocked').payload, session: 'foreign-session'}},
                {...event('blocked'), sequence: 2}
            ];
            writeFileSync(join(laneDir, 'state', 'worker-events.jsonl'),
                `${records.map(record => JSON.stringify(record)).join('\n')}\n`);
            const before = treeSnapshot(fixture.root);
            const result = await projection(['wt-lane-a-watch']).project({...query(fixture), verbose: true});
            expect(result.latestEvent?.sequence).toBe(2);
            expect(result.diagnostics?.rejectedEventCount).toBe(4);
            expect(result.health.warnings.map(warning => warning.code)).toContain('DURABLE_EVENT_REJECTED');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('accepts every closed event type only for its qualified role session', function () {
        const expected = {watcher: 'wt-lane-a-watch', workers: {implementer: 'wt-lane-a-implementer',
            reviewer: 'wt-lane-a-reviewer'}};
        const projector = new StatusEventProjection();
        const cases = [{type: 'handoff', role: 'implementer'}, {type: 'blocked', role: 'implementer'},
            {type: 'accept', role: 'reviewer'}, {type: 'reject', role: 'reviewer'},
            {type: 'blocked', role: 'reviewer'}] as const;
        cases.forEach((item, index) => {
            const warnings: StatusWarningCode[] = [];
            const record = {...event('blocked'), type: item.type, sequence: index,
                payload: {...event('blocked').payload, role: item.role, session: expected.workers[item.role]}};
            const result = projector.project([record], record.laneId, expected, warnings);
            expect(result.view?.type).withContext(`${item.role}:${item.type}`).toBe(item.type);
            expect(result.rejectedCount).toBe(0);
        });
    });

    it('reports authoritative tmux-prefix and proof-resource conflicts', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {lifecycle: 'active'});
            createLane(fixture, {slug: 'lane-b', laneId: '22222222-2222-4222-8222-222222222222'});
            const result = await new StatusProjection({runtime: qualifiedRuntime,
                tmuxObserver: () => ({async listSessionNames() { return []; }}),
                proofConflicts: {inspect: () => ({available: true, conflicts: [{kind: 'proof-resource',
                    lanes: ['11111111-1111-4111-8111-111111111111', '22222222-2222-4222-8222-222222222222'],
                    resource: 'fixture-proof'}]})}}).project({...query(fixture), lane: 'lane-b'});
            expect(result.conflicts.map(conflict => conflict.kind)).toContain('tmux-prefix');
            expect(result.conflicts.map(conflict => conflict.kind)).toContain('proof-resource');
        } finally { fixture.remove(); }
    });

    it('marks runtime qualification and a missing real tmux executable unavailable without writes', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {lifecycle: 'paused'});
            const before = treeSnapshot(fixture.root);
            const result = await new StatusProjection({now: () => NOW}).project({cwd: fixture.controlHome,
                environment: {WATCHTOWER_DATA_HOME: fixture.dataHome, PATH: join(fixture.root, 'no-tools')}});
            expect(result.runtime.qualification).toBe('unavailable');
            expect(result.runtime.configured).toBe('1.0.0');
            expect(result.runtime.installed).toBeNull();
            expect(result.runtime.available).toBeFalse();
            expect(result.runtime.availableVersions).toEqual([]);
            expect(result.health.warnings.map(warning => warning.code)).toContain('TMUX_UNAVAILABLE');
            expect(result.health.warnings.map(warning => warning.code)).toContain('RUNTIME_INTEGRITY_UNAVAILABLE');
            expect(result.health.warnings.map(warning => warning.code)).toContain('PROOF_RESOURCE_CONFLICTS_UNAVAILABLE');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('reaches absent and invalid heartbeat warnings plus complete health through projection', async function () {
        for (const heartbeat of ['absent', 'invalid', 'complete'] as const) {
            const fixture = createReadCommandFixture();
            try {
                const laneDir = createLane(fixture, heartbeat === 'complete' ? {lifecycle: 'complete'} :
                    {lifecycle: 'active', activeBatch: 'RM-12'});
                if (heartbeat === 'invalid') writeFileSync(join(laneDir, 'state', 'watcher-heartbeat.txt'), 'not-a-date\n');
                const result = await projection(heartbeat === 'complete' ? [] :
                    ['wt-lane-a-watch', 'wt-lane-a-implementer']).project(query(fixture));
                if (heartbeat === 'absent') expect(result.health.warnings.map(warning => warning.code))
                    .toContain('WATCHER_HEARTBEAT_ABSENT');
                if (heartbeat === 'invalid') expect(result.health.warnings.map(warning => warning.code))
                    .toContain('WATCHER_HEARTBEAT_INVALID');
                if (heartbeat === 'complete') expect(result.health.status).toBe('complete');
                expect(schemaValid(result)).toBeTrue();
            } finally { fixture.remove(); }
        }
    });

    it('projects an explicit unavailable pack-integrity observation as invalid health', async function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {lifecycle: 'paused'});
            const result = await new StatusProjection({runtime: qualifiedRuntime,
                packIntegrity: {async inspect(_lane, _bindings, warnings) {
                    warnings.push('IMPLEMENTATION_PACK_UNAVAILABLE'); return {status: 'unavailable', sealId: null};
                }}, tmuxObserver: () => ({async listSessionNames() { return []; }})}).project(query(fixture));
            expect(result.packIntegrity.status).toBe('unavailable');
            expect(result.health.status).toBe('invalid');
            expect(schemaValid(result)).toBeTrue();
        } finally { fixture.remove(); }
    });

    it('validates syntax and registers synchronized command help', async function () {
        expect(parseReadCommandOptions(makeArgMap(['--lane=lane-a', '--json']), 'status'))
            .toEqual(jasmine.objectContaining({lane: 'lane-a', json: true}));
        expectCode(() => parseReadCommandOptions(makeArgMap(['extra']), 'status'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['--limit=1']), 'status'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => validateRawReadCommandArguments(['status', '--lane=a', '--lane=b']), 'ERR_INVALID_ARGUMENT');
        const cli = await createCli();
        expect(await cli.commandManager.hasCommand('status')).toBeTrue();
        expect(new StatusCommand().usage).toContain('--verbose');
        const help = JSON.parse(readFileSync(join(process.cwd(), 'help', 'help.json'), 'utf8'));
        expect(help.commands.map((command: {name: string}) => command.name)).toContain('status');
        expect(JSON.parse(readFileSync(join(process.cwd(), 'help', 'commands', 'status.hlp.json'), 'utf8')).usage)
            .toContain('wt status');
    });
});

type Fixture = ReturnType<typeof createReadCommandFixture>;
function projection(sessions: readonly string[]): StatusProjection {
    return new StatusProjection({now: () => NOW, runtime: qualifiedRuntime,
        proofConflicts: availableProofConflicts,
        tmuxObserver: () => ({async listSessionNames() { return [...sessions]; }})});
}
function failingTmuxProjection(): StatusProjection {
    return new StatusProjection({now: () => NOW, runtime: qualifiedRuntime, proofConflicts: availableProofConflicts,
        tmuxObserver: () => ({async listSessionNames() {
        throw new Error('tmux unavailable');
    }})});
}
function query(fixture: Fixture) { return {cwd: fixture.controlHome, environment: env(fixture)}; }
function env(fixture: Fixture): NodeJS.ProcessEnv { return {WATCHTOWER_DATA_HOME: fixture.dataHome, PATH: '/usr/bin'}; }
function event(type: 'blocked'): WorkerEventRecord {
    return {schemaVersion: 1, eventId: 'event:1', type, sequence: 1, at: '2026-08-01T10:04:00Z',
        laneId: '11111111-1111-4111-8111-111111111111', producer: 'worker:implementer',
        correlationId: 'cycle:1', causationId: null, policyVersion: 'v1',
        payload: {role: 'implementer', batch: 'RM-12', session: 'wt-lane-a-implementer'}};
}
const qualifiedRuntime = {observe(configured: string | null) { return {qualification: 'valid' as const,
    configured, installed: configured, available: configured !== null,
    availableVersions: configured === null ? [] : [configured]}; }};
function schemaValid(value: unknown): boolean {
    const loaded = loadV1SchemaBundle();
    if (loaded.ok === false) return false;
    const ajv = new Ajv2020({strict: false});
    ajv.addFormat('uuid', /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i);
    ajv.addFormat('date-time', isRfc3339DateTime);
    ajv.addSchema(loaded.bundle.schema);
    return ajv.getSchema(`${loaded.bundle.id}#/$defs/laneStatus`)?.(value) === true;
}
const availableProofConflicts = {inspect: () => ({available: true, conflicts: []})};
function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`expected ${code}`); } catch (error) { expect((error as WatchtowerError).code).toBe(code); }
}
