import {spawnSync} from 'node:child_process';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {HelpJSON} from '@nirvana/base/cli/contracts/types';
import {view as helpView} from '@nirvana/base/cli/help';

describe('wt version correction-02 CLI proof', function () {
    it('accepts Nirvana hyphenated flags in JSON and human modes', function () {
        const json = cli(['version', '--json', '--no-color']);
        expect(json.status).toBe(0);
        expect(JSON.parse(json.stdout).data.cliVersion).toBeDefined();

        const human = cli(['version', '--no-color']);
        expect(human.status).toBe(0);
        expect(human.stdout).toContain('"cliVersion"');
    });

    it('accepts --lane before resolving the requested lane', function () {
        const result = cli(['version', '--lane=missing-lane', '--json']);
        expect(result.status).not.toBe(0);
        expect(result.stderr).toContain('ERR_LANE_NOT_FOUND');
        expect(result.stderr).not.toContain('ERR_INVALID_ARGUMENT');
    });

    it('renders required version, upgrade, and skill descriptions from the static help registry', async function () {
        const data = JSON.parse(readFileSync(join(process.cwd(), 'help', 'help.json'), 'utf8')) as HelpJSON;
        const expected = {
            version: 'Report the CLI, runtime, knowledge, and lane-schema versions.',
            upgrade: 'Preview or atomically apply a compatible managed runtime upgrade.',
            skill: 'Preview or install the bundled Watchtower coordinator knowledge pack for Codex, Cursor, or Claude.'
        } as const;
        for (const [commandName, description] of Object.entries(expected)) {
            const writes: string[] = [];
            const write = process.stdout.write;
            process.stdout.write = ((chunk: string | Uint8Array) => { writes.push(String(chunk)); return true; }) as typeof process.stdout.write;
            try {
                await helpView.commandIndex({appName: 'wt', commandName, data, commandManager: {all: async () => []} as never});
            } finally { process.stdout.write = write; }
            const output = writes.join('').replace(/\s+/gu, ' ');
            expect(output).toContain(description.replace(/\s+/gu, ' '));
            expect(output).not.toContain('[ NO DESCRIPTION ENTRY ]');
        }
    });
});

function cli(args: string[]) {
    const entry = join(process.cwd(), 'build', 'src', 'cli.js');
    const source = `import run from ${JSON.stringify(entry)}; await run(...JSON.parse(process.env.WT_PROOF_ARGS));`;
    return spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
        cwd: process.cwd(), encoding: 'utf8', env: {...process.env,
            WT_PROOF_ARGS: JSON.stringify(args), WATCHTOWER_DATA_HOME: join(process.cwd(), '.tmp-version-proof')}
    });
}
