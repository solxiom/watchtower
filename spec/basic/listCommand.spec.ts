import Ajv2020 from 'ajv/dist/2020.js';
import {join} from 'node:path';
import {writeFileSync} from 'node:fs';
import {makeArgMap} from '@nirvana/base/utils/argUtil';
import {LaneListService, renderResult, buildCommandResult} from '../../src/foundation/index.js';
import {loadV1SchemaBundle} from '../../src/foundation/schemaComposition/schemaBundle.js';
import type {LaneListWarning, MembershipWarningReason, WatchtowerError} from '../../src/contracts/index.js';
import {parseReadCommandOptions} from '../../src/commands/readCommandOptions.js';
import {
    createLane, createReadCommandFixture, repository, treeSnapshot, writeMembershipIndex
} from './readCommandFixtures.js';

describe('ListCommand read projection', function () {
    it('returns a schema-valid empty page and renders human/JSON from the same value without writes', function () {
        const fixture = createReadCommandFixture();
        try {
            const before = treeSnapshot(fixture.controlHome, fixture.dataHome);
            expectCode(() => service().list({...query(fixture), cursor: 'not-json'}), 'ERR_CURSOR_INVALID');
            const page = service().list(query(fixture));
            const verbose = service().list({...query(fixture), verbose: true});
            expect(page.items).toEqual([]);
            expect(page.warnings).toEqual([]);
            expect(page.diagnostics).toBeNull();
            expect(verbose.diagnostics?.relevantLaneCount).toBe(0);
            expect(verbose.diagnostics?.matchedLaneCount).toBe(0);
            expect(verbose.diagnostics?.pageItemCount).toBe(0);
            expect(schemaValid('laneListPage', page)).toBeTrue();
            expect(schemaValid('laneListPage', verbose)).toBeTrue();
            expect(warningReasonContractIsClosed).toBeTrue();
            expect(schemaValid('laneListPage', {...page, warnings: [{laneId: 'lane', reason: 'ARBITRARY'}]})).toBeFalse();
            const envelope = buildCommandResult('list', page);
            const verboseEnvelope = buildCommandResult('list', verbose);
            expect(JSON.parse(renderResult(envelope, {json: true, noColor: true})).data).toEqual(page);
            expect(JSON.parse(renderResult(verboseEnvelope, {json: true, noColor: true})).data).toEqual(verbose);
            expect(renderResult(envelope, {json: false, noColor: true})).toContain(page.revision);
            expect(renderResult(verboseEnvelope, {json: false, noColor: true}))
                .not.toBe(renderResult(envelope, {json: false, noColor: true}));
            expect(treeSnapshot(fixture.controlHome, fixture.dataHome)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('projects stable identity, lifecycle, active batch, runtime, and conflict fields', function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {activeBatch: 'RM-10'});
            createLane(fixture, {slug: 'lane-b', laneId: '22222222-2222-4222-8222-222222222222',
                initiativeId: 'initiative-b'});
            const before = treeSnapshot(fixture.controlHome, fixture.dataHome);
            const page = service().list(query(fixture));
            expect(page.items.map(item => item.slug)).toEqual(['lane-a', 'lane-b']);
            expect(page.items[0].activeBatch).toBe('RM-10');
            expect(page.items[0].runtimeVersion).toBe('1.0.0');
            expect(page.items[0].repositoryCount).toBe(1);
            expect(page.items[0].lifecycle).toBe('active');
            expect(page.items[0].conflictState).toBe('detected');
            expect(page.items[0].conflicts).toContain('shared-write');
            expect(service().list({...query(fixture), initiative: 'initiative-b'}).items.map(item => item.slug)).toEqual(['lane-b']);
            expect(service().list({...query(fixture), lane: 'lane-a'}).items.map(item => item.slug)).toEqual(['lane-a']);
            expect(treeSnapshot(fixture.controlHome, fixture.dataHome)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('discovers a multi-repository lane from a validated secondary membership without repair', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneId = '33333333-3333-4333-8333-333333333333';
            createLane(fixture, {laneId, repositories: [
                repository('main', fixture.controlHome, 'primary', 'write'),
                repository('secondary', fixture.secondary, 'integration', 'read')
            ]});
            writeMembershipIndex(fixture, {[fixture.secondary]: {laneId, laneHome: fixture.controlHome}});
            const before = treeSnapshot(fixture.root);
            const page = service().list({cwd: fixture.secondary, environment: env(fixture)});
            expect(page.items.length).toBe(1);
            expect(page.items[0].laneId).toBe(laneId);
            expect(page.items[0].repositoryCount).toBe(2);
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('enumerates 203 lanes once in stable pages and rejects mismatched or stale offsets beyond 200', function () {
        const fixture = createReadCommandFixture();
        try {
            for (let index = 0; index < 203; index += 1) createLane(fixture, {
                slug: `lane-${String(index).padStart(3, '0')}`,
                laneId: `00000000-0000-4000-8000-${String(index + 1).padStart(12, '0')}`,
                initiativeId: 'initiative-page', lifecycle: 'paused'
            });
            const before = treeSnapshot(fixture.root);
            const items: string[] = [];
            const revisions = new Set<string>();
            const cursors: string[] = [];
            let cursor: string | undefined;
            do {
                const page = service().list({...query(fixture), cursor, limit: 101});
                expect(page.items.length).toBeLessThanOrEqual(page.limit);
                items.push(...page.items.map(item => item.slug));
                revisions.add(page.revision);
                cursor = page.nextCursor ?? undefined;
                if (cursor !== undefined) cursors.push(cursor);
            } while (cursor !== undefined);
            expect(items.length).toBe(203);
            expect(new Set(items).size).toBe(203);
            expect(items).toEqual([...items].sort());
            expect(revisions.size).toBe(1);
            expect(cursors.length).toBe(2);
            const laterCursor = cursors[cursors.length - 1];
            if (laterCursor === undefined) fail('expected an offset greater than 200');
            expectCode(() => service().list({...query(fixture), cursor: 'not-json'}), 'ERR_CURSOR_INVALID');
            expectCode(() => service().list({...query(fixture), initiative: 'other',
                cursor: laterCursor, limit: 101}), 'ERR_CURSOR_INVALID');
            expect(treeSnapshot(fixture.root)).toBe(before);
            writeFileSync(join(fixture.controlHome, '.watchtower', 'lanes', 'lane-202', 'state',
                'coordinator-lane-state.txt'), 'lane_status=active\n');
            const stale = treeSnapshot(fixture.root);
            expectCode(() => service().list({...query(fixture), cursor: laterCursor, limit: 101}),
                'ERR_CURSOR_INVALID');
            expect(treeSnapshot(fixture.root)).toBe(stale);
        } finally { fixture.remove(); }
    });

    it('reports a stale membership as an empty warning page and never repairs it', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneId = '44444444-4444-4444-8444-444444444444';
            writeMembershipIndex(fixture, {[fixture.secondary]: {laneId, laneHome: join(fixture.root, 'missing')}});
            const before = treeSnapshot(fixture.root);
            const page = service().list({cwd: fixture.secondary, environment: env(fixture)});
            expect(page.items).toEqual([]);
            expect(page.warnings.length).toBe(1);
            expect(page.warnings[0].laneId).toBe(laneId);
            expect(page.warnings[0].reason).toBe('LANE_JSON_MISSING');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('classifies missing, wrong-type, duplicate, supported, and unsupported install identity without writes', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture);
            writeFileSync(join(laneDir, 'state', 'lane.lock'), 'busy');
            const before = treeSnapshot(fixture.root);
            expect(service().list(query(fixture)).items.length).toBe(1);
            expect(treeSnapshot(fixture.root)).toBe(before);
            const installPath = join(laneDir, 'install.json');
            const invalid = [
                {cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'},
                {schemaVersion: '1', cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'}
            ];
            for (const value of invalid) {
                writeFileSync(installPath, JSON.stringify(value));
                const snapshot = treeSnapshot(fixture.root);
                expectCode(() => service().list(query(fixture)), 'ERR_INVALID_LANE_CONFIG');
                expect(treeSnapshot(fixture.root)).toBe(snapshot);
            }
            writeFileSync(installPath, '{"schemaVersion":1,"runtimeVersion":"1","runtimeVersion":"2"}');
            const corrupt = treeSnapshot(fixture.root);
            expectCode(() => service().list(query(fixture)), 'ERR_INVALID_LANE_CONFIG');
            expect(treeSnapshot(fixture.root)).toBe(corrupt);
            writeFileSync(installPath, JSON.stringify({schemaVersion: 2, cliVersion: '1.0.0',
                runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'}));
            const unsupported = treeSnapshot(fixture.root);
            expectCode(() => service().list(query(fixture)), 'ERR_UNSUPPORTED_VERSION');
            expect(treeSnapshot(fixture.root)).toBe(unsupported);
            writeFileSync(installPath, JSON.stringify({schemaVersion: 1, cliVersion: '1.0.0',
                runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'}));
            expect(service().list(query(fixture)).items.length).toBe(1);
        } finally { fixture.remove(); }
    });

    it('validates list pagination syntax before command execution', function () {
        expect(parseReadCommandOptions(makeArgMap(['--limit=200', '--cursor=abc']), 'list'))
            .toEqual(jasmine.objectContaining({limit: 200, cursor: 'abc'}));
        expectCode(() => parseReadCommandOptions(makeArgMap(['--limit=0']), 'list'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['--limit=201']), 'list'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['--cursor']), 'list'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['show', '--limit=1']), 'config'), 'ERR_INVALID_ARGUMENT');
    });
});

function service(): LaneListService { return new LaneListService(); }
function env(fixture: ReturnType<typeof createReadCommandFixture>): NodeJS.ProcessEnv {
    return {WATCHTOWER_DATA_HOME: fixture.dataHome};
}

type Equal<Left, Right> = (<Value>() => Value extends Left ? 1 : 2) extends
    (<Value>() => Value extends Right ? 1 : 2) ? true : false;
const warningReasonContractIsClosed: Equal<LaneListWarning['reason'], MembershipWarningReason> = true;
function query(fixture: ReturnType<typeof createReadCommandFixture>) {
    return {cwd: fixture.controlHome, environment: env(fixture)};
}
function expectCode(action: () => unknown, code: string): void {
    try { action(); fail(`expected ${code}`); } catch (error) { expect((error as WatchtowerError).code).toBe(code); }
}
function schemaValid(definition: string, value: unknown): boolean {
    const loaded = loadV1SchemaBundle();
    if (loaded.ok === false) return false;
    const ajv = new Ajv2020({strict: false});
    ajv.addSchema(loaded.bundle.schema);
    return ajv.getSchema(`${loaded.bundle.id}#/$defs/${definition}`)?.(value) === true;
}
