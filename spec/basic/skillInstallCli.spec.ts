import Ajv2020 from 'ajv/dist/2020.js';
import {spawnSync} from 'node:child_process';
import {existsSync, mkdirSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {loadV1SchemaBundle} from '../../src/foundation/schemaBundle.js';
import {createKnowledgePackFixture, type KnowledgePackFixture} from './skillInstallFixtures.js';

describe('wt skill install real CLI proof', function () {
    it('previews by default with zero writes, then installs and records the version with --replace', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const preview = cli(fixture, ['skill', 'install', 'codex', '--json']);
            expect(preview.status).toBe(0);
            const previewBody = JSON.parse(preview.stdout);
            expect(previewBody.data.applied).toBeFalse();
            expect(schemaValid(previewBody.data)).toBeTrue();
            expect(existsSync(join(fixture.home, '.codex', 'skills', 'watchtower-coordinator'))).toBeFalse();

            const installed = cli(fixture, ['skill', 'install', 'codex', '--replace', '--json']);
            expect(installed.status).toBe(0);
            const installedBody = JSON.parse(installed.stdout);
            expect(installedBody.data.applied).toBeTrue();
            expect(installedBody.data.hostNotification).toBe('unverified');
            expect(schemaValid(installedBody.data)).toBeTrue();
            expect(existsSync(join(fixture.home, '.codex', 'skills', 'watchtower-coordinator', 'AGENTS.md'))).toBeTrue();
        } finally { fixture.remove(); }
    });

    it('performs zero writes under --dry-run even with --replace', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const result = cli(fixture, ['skill', 'install', 'claude', '--dry-run', '--replace', '--json']);
            expect(result.status).toBe(0);
            expect(JSON.parse(result.stdout).data.applied).toBeFalse();
            expect(existsSync(join(fixture.home, '.claude', 'skills', 'watchtower-coordinator'))).toBeFalse();
        } finally { fixture.remove(); }
    });

    it('refuses an existing destination without --replace in non-interactive mode (exit 5)', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const destination = join(fixture.home, '.claude', 'skills', 'watchtower-coordinator');
            mkdirSync(destination, {recursive: true});
            writeFileSync(join(destination, 'AGENTS.md'), 'stale\n');
            const result = cli(fixture, ['skill', 'install', 'claude', '--json']);
            expect(result.status).toBe(5);
            expect(result.stderr).toContain('ERR_CONFIRMATION_REQUIRED');
        } finally { fixture.remove(); }
    });

    it('exits 2 on an unknown host', function () {
        const fixture = createKnowledgePackFixture();
        try {
            const result = cli(fixture, ['skill', 'install', 'not-a-host', '--json']);
            expect(result.status).toBe(2);
            expect(result.stderr).toContain('ERR_INVALID_ARGUMENT');
        } finally { fixture.remove(); }
    });

    it('exits 4 when no versioned knowledge pack is staged', function () {
        const fixture = createKnowledgePackFixture({omitManifest: true});
        try {
            const result = cli(fixture, ['skill', 'install', 'codex', '--json']);
            expect(result.status).toBe(4);
            expect(result.stderr).toContain('ERR_MISSING_DEPENDENCY');
        } finally { fixture.remove(); }
    });
});

function cli(fixture: KnowledgePackFixture, args: readonly string[]) {
    const entry = join(process.cwd(), 'build', 'src', 'cli.js');
    const source = `import run from ${JSON.stringify(entry)}; await run(...JSON.parse(process.env.WT_PROOF_ARGS));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
        cwd: fixture.projectRoot, encoding: 'utf8',
        env: {
            ...process.env, WT_PROOF_ARGS: JSON.stringify([...args]), HOME: fixture.home,
            WATCHTOWER_DATA_HOME: fixture.dataHome, PATH: '/usr/bin:/bin'
        }
    });
    return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}

function schemaValid(value: unknown): boolean {
    const loaded = loadV1SchemaBundle();
    if (loaded.ok === false) return false;
    const ajv = new Ajv2020({strict: false});
    ajv.addSchema(loaded.bundle.schema);
    return ajv.getSchema(`${loaded.bundle.id}#/$defs/mutationResult`)?.(value) === true;
}
