import Ajv2020 from 'ajv/dist/2020.js';
import {join} from 'node:path';
import {readFileSync, writeFileSync} from 'node:fs';
import {makeArgMap} from '@nirvana/base/utils/argUtil';
import type {WatchtowerError} from '../../src/contracts/index.js';
import {
    ResolvedConfigService, buildCommandResult, renderResult
} from '../../src/foundation/index.js';
import {loadV1SchemaBundle} from '../../src/foundation/schemaBundle.js';
import {parseReadCommandOptions, validateRawReadCommandArguments} from '../../src/commands/readCommandOptions.js';
import ConfigCommand from '../../src/commands/ConfigCommand.js';
import ListCommand from '../../src/commands/ListCommand.js';
import {createCli} from '../../src/run.js';
import {
    createLane, createReadCommandFixture, replaceWithSymlink, repository, treeSnapshot, writeMembershipIndex
} from './readCommandFixtures.js';

describe('ConfigCommand resolved projection', function () {
    it('redacts every sensitive key while preserving safe config and human/JSON parity without writes', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneId = '11111111-1111-4111-8111-111111111111';
            createLane(fixture, {configLines: identityConfig(fixture.controlHome, laneId).concat([
                'API_TOKEN="top-secret-token"', 'CLIENT_SECRET="top-secret-client"',
                'USER_PASSWORD="top-secret-password"', 'PUBLIC_KEY="top-secret-key"',
                'CREDENTIAL_FILE="top-secret-credential"', 'VISIBLE_VALUE="safe"'
            ])});
            writeFileSync(join(fixture.controlHome, '.watchtower', 'lanes', 'lane-a', 'state', 'lane.lock'), 'busy');
            const before = treeSnapshot(fixture.root);
            const normal = service().show(query(fixture));
            const result = service().show({...query(fixture), verbose: true});
            expect(result.config.VISIBLE_VALUE).toBe('safe');
            expect(result.redactedKeys).toEqual([
                'API_TOKEN', 'CLIENT_SECRET', 'CREDENTIAL_FILE', 'PUBLIC_KEY', 'USER_PASSWORD'
            ]);
            expect(Object.values(result.config).join(' ')).not.toContain('top-secret');
            expect(normal.diagnostics).toBeNull();
            expect(result.diagnostics?.relevantLaneCount).toBe(1);
            expect(result.diagnostics?.logicalRepositoryCount).toBe(1);
            expect(result.diagnostics?.localRepositoryCount).toBe(1);
            expect(result.diagnostics?.configKeyCount).toBe(13);
            expect(result.diagnostics?.redactedKeyCount).toBe(5);
            expect(schemaValid('resolvedConfig', result)).toBeTrue();
            const envelope = buildCommandResult('config show', result);
            const json = renderResult(envelope, {json: true, noColor: true});
            const human = renderResult(envelope, {json: false, noColor: true});
            expect(JSON.parse(json).data).toEqual(result);
            expect(human).toContain('[REDACTED]');
            expect(human).not.toContain('top-secret');
            expect(human).not.toBe(renderResult(buildCommandResult('config show', normal), {json: false, noColor: true}));
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('fails closed on ambiguity and resolves an explicit ID with source provenance', function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture);
            const laneId = '22222222-2222-4222-8222-222222222222';
            createLane(fixture, {slug: 'lane-b', laneId, initiativeId: 'initiative-b'});
            const before = treeSnapshot(fixture.root);
            expectCode(() => service().show(query(fixture)), 'ERR_AMBIGUOUS_SELECTION');
            const selected = service().show({...query(fixture), lane: laneId});
            expect(selected.laneId).toBe(laneId);
            expect(selected.sources.lane).toBe('explicit');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('shows logical and local multi-repository bindings from a secondary worktree', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneId = '33333333-3333-4333-8333-333333333333';
            createLane(fixture, {laneId, repositories: [
                repository('main', fixture.controlHome, 'primary', 'write'),
                repository('secondary', fixture.secondary, 'integration', 'read')
            ]});
            writeMembershipIndex(fixture, {[fixture.secondary]: {laneId, laneHome: fixture.controlHome}});
            const before = treeSnapshot(fixture.root);
            const result = service().show({cwd: fixture.secondary, environment: env(fixture)});
            expect(result.logicalRepositories.length).toBe(2);
            expect(result.repositories.map(item => item.path)).toEqual([fixture.controlHome, fixture.secondary]);
            expect(result.runtimeRoot).toBe(join(fixture.dataHome, 'runtimes', '1.0.0'));
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }
    });

    it('rejects missing, duplicate, unsupported, inconsistent, and symlink-escaped config without repair', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture);
            const configPath = join(laneDir, 'lane.config.env');
            const cases = [
                identityConfig(fixture.controlHome, '11111111-1111-4111-8111-111111111111').slice(1).join('\n'),
                `${identityConfig(fixture.controlHome, '11111111-1111-4111-8111-111111111111').join('\n')}\nLANE_ID=duplicate`,
                `${identityConfig(fixture.controlHome, '11111111-1111-4111-8111-111111111111').join('\n')}\nBAD=$(id)`,
                identityConfig(fixture.controlHome, '99999999-9999-4999-8999-999999999999').join('\n')
            ];
            for (const content of cases) {
                writeFileSync(configPath, `${content}\n`);
                const before = treeSnapshot(fixture.root);
                expectCode(() => service().show(query(fixture)), 'ERR_INVALID_LANE_CONFIG');
                expect(treeSnapshot(fixture.root)).toBe(before);
            }
            const outside = join(fixture.root, 'outside.env');
            writeFileSync(outside, `${identityConfig(fixture.controlHome, '11111111-1111-4111-8111-111111111111').join('\n')}\n`);
            replaceWithSymlink(configPath, outside);
            const escaped = treeSnapshot(fixture.root);
            expectCode(() => service().show(query(fixture)), 'ERR_PATH_ESCAPE');
            expect(treeSnapshot(fixture.root)).toBe(escaped);
        } finally { fixture.remove(); }
    });

    it('classifies install schema identity through config show and leaves every failure byte-identical', function () {
        const fixture = createReadCommandFixture();
        try {
            const laneDir = createLane(fixture);
            const installPath = join(laneDir, 'install.json');
            const invalid = [
                {cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'},
                {schemaVersion: '1', cliVersion: '1.0.0', runtimeVersion: '1.0.0',
                    knowledgeVersion: '1.0.0', mode: 'linked'}
            ];
            for (const value of invalid) {
                writeFileSync(installPath, JSON.stringify(value));
                const before = treeSnapshot(fixture.root);
                expectCode(() => service().show(query(fixture)), 'ERR_INVALID_LANE_CONFIG');
                expect(treeSnapshot(fixture.root)).toBe(before);
            }
            writeFileSync(installPath, JSON.stringify({schemaVersion: 2, cliVersion: '1.0.0',
                runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'}));
            const unsupported = treeSnapshot(fixture.root);
            expectCode(() => service().show(query(fixture)), 'ERR_UNSUPPORTED_VERSION');
            expect(treeSnapshot(fixture.root)).toBe(unsupported);
            writeFileSync(installPath, JSON.stringify({schemaVersion: 1, cliVersion: '1.0.0',
                runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked'}));
            expect(service().show(query(fixture)).runtimeVersion).toBe('1.0.0');
        } finally { fixture.remove(); }
    });

    it('rejects malformed command syntax, missing subcommand, extra arguments, values on booleans, and duplicate values', function () {
        expectCode(() => parseReadCommandOptions(makeArgMap([]), 'config'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['show', 'extra']), 'config'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['show', '--json=yes']), 'config'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['show', '--lane=a', '--lane=b']), 'config'), 'ERR_INVALID_ARGUMENT');
        expectCode(() => validateRawReadCommandArguments(['config', 'show', '--lane=a', '--lane=a']),
            'ERR_INVALID_ARGUMENT');
        expectCode(() => parseReadCommandOptions(makeArgMap(['--unsupported']), 'list'), 'ERR_INVALID_ARGUMENT');
        expect(parseReadCommandOptions(makeArgMap(['show', '--json', '--no-color']), 'config'))
            .toEqual(jasmine.objectContaining({json: true, noColor: true}));
    });

    it('registers both command front doors and keeps their help fragments synchronized', async function () {
        const cli = await createCli();
        expect(await cli.commandManager.hasCommand('list')).toBeTrue();
        expect(await cli.commandManager.hasCommand('config')).toBeTrue();
        const help = JSON.parse(readFileSync(join(process.cwd(), 'help', 'help.json'), 'utf8'));
        expect(help.commands.map((command: {name: string}) => command.name)).toContain('list');
        expect(help.commands.map((command: {name: string}) => command.name)).toContain('config');
        expect(JSON.parse(readFileSync(join(process.cwd(), 'help', 'commands', 'list.hlp.json'), 'utf8')).usage)
            .toContain('wt list');
        expect(JSON.parse(readFileSync(join(process.cwd(), 'help', 'commands', 'config.hlp.json'), 'utf8')).usage)
            .toContain('wt config show');
        expect(new ListCommand().usage).toContain('--verbose');
        expect(new ConfigCommand().usage).toContain('--verbose');
    });
});

function service(): ResolvedConfigService { return new ResolvedConfigService(); }
function env(fixture: ReturnType<typeof createReadCommandFixture>): NodeJS.ProcessEnv {
    return {WATCHTOWER_DATA_HOME: fixture.dataHome};
}
function query(fixture: ReturnType<typeof createReadCommandFixture>) {
    return {cwd: fixture.controlHome, environment: env(fixture)};
}
function identityConfig(home: string, laneId: string): string[] {
    return [`LANE_ID="${laneId}"`, 'LANE_SLUG="lane-a"', 'INITIATIVE_ID="initiative-a"',
        'HOME_REPOSITORY_ID="main"', `WORKSPACE="${home}"`, 'TMUX_PREFIX="wt"',
        'IMPL_PACK_REL="docs/spec/implementation/test-pack"'];
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
