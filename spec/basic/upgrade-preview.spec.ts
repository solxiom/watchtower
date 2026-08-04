import Ajv2020 from 'ajv/dist/2020.js';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {InstallManifestV1} from '../../src/contracts/manifests.js';
import type {KnowledgeManifestV1, RuntimeManifestV1} from '../../src/contracts/runtimeKnowledgeManifests.js';
import {UpgradePlanner} from '../../src/foundation/upgrade/index.js';
import type {UpgradeFileSystem, UpgradePathKind} from '../../src/foundation/upgrade/index.js';
import type {UpgradeAssetDeclaration, UpgradePlannerInput} from '../../src/contracts/upgrade.js';
import UpgradeCommand from '../../src/commands/upgrade/UpgradeCommand.js';
import {createCli} from '../../src/run.js';

describe('UpgradePlanner', () => {
    it('classifies identical managed assets as preserved', () => {
        const plan = makePlanner().plan(input({current: assets('a'), target: assets('a')}));
        expect(plan.matrix.assets.map(item => item.classification)).toEqual(['preserved']);
        expect(plan.preserved[0].path).toBe('bin/a.sh');
    });

    it('classifies a new target asset as added', () => {
        const plan = makePlanner().plan(input({current: assets('a'), target: {...assets('a'), ...assets('b')}}));
        expect(plan.added.map(item => item.path)).toEqual(['bin/b.sh']);
    });

    it('classifies a removed current asset as removed', () => {
        const plan = makePlanner().plan(input({current: {...assets('a'), ...assets('b')}, target: assets('a')}));
        expect(plan.removed.map(item => item.path)).toEqual(['bin/b.sh']);
    });

    it('classifies a checksum change as changed', () => {
        const plan = makePlanner().plan(input({current: assets('a'), target: assets('a', 'b')}));
        expect(plan.changed.map(item => item.path)).toEqual(['bin/a.sh']);
        expect(plan.changed[0].currentSha256).not.toBe(plan.changed[0].targetSha256);
    });

    it('classifies a regular file at a managed path as a conflict', () => {
        const fileSystem = new TrackingFileSystem({'/lane/bin/a.sh': 'regular'});
        const plan = makePlanner(fileSystem).plan(input({current: assets('a'), target: assets('a')}));
        expect(plan.conflicts.map(item => item.path)).toEqual(['bin/a.sh']);
    });

    it('does not write while producing a preview', () => {
        const fileSystem = new TrackingFileSystem();
        makePlanner(fileSystem).plan(input({current: assets('a'), target: assets('a')}));
        expect(fileSystem.writes).toBe(0);
        expect(fileSystem.inspected).toEqual(['/lane/bin/a.sh']);
    });

    it('rejects an incompatible lane schema before returning a plan', () => {
        const runtime = runtimeManifest({compatibleLaneSchemaVersions: []}) as unknown as RuntimeManifestV1;
        expect(() => makePlanner().plan(input({current: assets('a'), target: assets('a'), targetRuntime: runtime})))
            .toThrowError(/compatible lane schema/);
    });

    it('rejects incompatible runtime and knowledge declarations', () => {
        const knowledge = knowledgeManifest({compatibleRuntimeVersions: ['9.9.9']});
        expect(() => makePlanner().plan(input({current: assets('a'), target: assets('a'), targetKnowledge: knowledge})))
            .toThrowError(/runtime\/knowledge/);
    });

    it('produces an upgradePlan that validates against the schema bundle', () => {
        const plan = makePlanner().plan(input({current: assets('a'), target: assets('a')}));
        const schema = JSON.parse(readFileSync(join(process.cwd(), 'docs/spec/schemas/v1.schema.json'), 'utf8')) as Record<string, unknown>;
        const ajv = new Ajv2020({strict: false});
        ajv.addSchema(schema);
        const validate = ajv.getSchema('https://nirvana.dev/watchtower/spec/v1.schema.json#/$defs/upgradePlan');
        expect(validate).toBeDefined();
        expect(validate!(plan)).toBeTrue();
    });

    it('registers upgrade and keeps its command and help fragments synchronized', async () => {
        const cli = await createCli();
        expect(await cli.commandManager.hasCommand('upgrade')).toBeTrue();
        const help = JSON.parse(readFileSync(join(process.cwd(), 'help', 'help.json'), 'utf8')) as {
            commands: Array<{name: string; usage: string}>;
        };
        const command = help.commands.find(item => item.name === 'upgrade');
        const fragment = JSON.parse(readFileSync(join(process.cwd(), 'help', 'commands', 'upgrade.hlp.json'), 'utf8')) as {
            usage: string;
        };
        expect(command).toBeDefined();
        expect(command!.usage).toBe(fragment.usage);
        expect(command!.usage).toBe(`wt ${new UpgradeCommand().usage}`);
    });
});

function makePlanner(fileSystem: UpgradeFileSystem = new TrackingFileSystem()): UpgradePlanner { return new UpgradePlanner({fileSystem}); }

function input(options: {
    readonly current: Readonly<Record<string, UpgradeAssetDeclaration>>;
    readonly target: Readonly<Record<string, UpgradeAssetDeclaration>>;
    readonly targetRuntime?: RuntimeManifestV1;
    readonly targetKnowledge?: KnowledgeManifestV1;
}): UpgradePlannerInput {
    return {laneDir: '/lane', laneSchemaVersion: 1, currentInstall: install(options.current),
        targetRuntime: options.targetRuntime ?? runtimeManifest(), targetKnowledge: options.targetKnowledge ?? knowledgeManifest(),
        targetManagedAssets: options.target};
}

function install(managedAssets: Readonly<Record<string, UpgradeAssetDeclaration>>): InstallManifestV1 {
    return {schemaVersion: 1, cliVersion: '1.0.0', runtimeVersion: '1.0.0', knowledgeVersion: '1.0.0', mode: 'linked',
        taskRuntime: {catalogId: 'watchtower-runtime-nvb/v1', catalogSha256: digestValue('1'),
            profile: 'implementation-v1', configTarget: '/runtime/config', moduleTarget: '/runtime/module'}, managedAssets};
}

function runtimeManifest(overrides: Omit<Partial<RuntimeManifestV1>, 'compatibleLaneSchemaVersions'> &
    {readonly compatibleLaneSchemaVersions?: readonly number[]} = {}): RuntimeManifestV1 {
    return {schemaVersion: 1, manifestId: 'watchtower-runtime/v1', runtimeVersion: '1.0.0', minimumCliVersion: '1.0.0',
        compatibleLaneSchemaVersions: [1], compatibleKnowledgeVersions: ['1.0.0'], assets: [], actions: [], requiredCommands: [], ...overrides} as unknown as RuntimeManifestV1;
}

function knowledgeManifest(overrides: Partial<KnowledgeManifestV1> = {}): KnowledgeManifestV1 {
    return {schemaVersion: 1, manifestId: 'watchtower-knowledge/v1', knowledgeVersion: '1.0.0', compatibleRuntimeVersions: ['1.0.0'],
        provenance: {repository: 'pack', commit: '1'.repeat(40), importRecordSha256: digestValue('2')}, assets: [], ...overrides};
}

function assets(...names: [string, string?]): Readonly<Record<string, UpgradeAssetDeclaration>> {
    const [name, digest = 'a'] = names;
    return {[`bin/${name}.sh`]: {target: `/runtime/${name}.sh`, sha256: digestValue(digest)}};
}

function digestValue(value: string): `sha256:${string}` { return `sha256:${value.repeat(64).slice(0, 64)}`; }

class TrackingFileSystem implements UpgradeFileSystem {
    writes = 0;
    inspected: string[] = [];
    constructor(private readonly kinds: Readonly<Record<string, UpgradePathKind>> = {}) {}
    inspect(path: string): UpgradePathKind { this.inspected.push(path); return this.kinds[path] ?? 'symlink'; }
}
