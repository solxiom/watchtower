import {chmodSync, mkdirSync, symlinkSync, writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {createLane, createReadCommandFixture, treeSnapshot} from './readCommandFixtures.js';

describe('wt status real CLI proof', function () {
    it('proves normal, JSON, verbose, and error modes without changing recursive inventory', function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {lifecycle: 'paused'});
            const tools = join(fixture.root, 'tools'); mkdirSync(tools);
            const tmux = join(tools, 'tmux'); writeFileSync(tmux, '#!/bin/sh\nexit 0\n'); chmodSync(tmux, 0o755);
            symlinkSync('/usr/bin/git', join(tools, 'git'));
            const tmuxOnly = join(fixture.root, 'tmux-only'); mkdirSync(tmuxOnly);
            const limitedTmux = join(tmuxOnly, 'tmux'); writeFileSync(limitedTmux, '#!/bin/sh\nexit 0\n');
            chmodSync(limitedTmux, 0o755);
            const before = treeSnapshot(fixture.root);
            const normal = cli(fixture.controlHome, fixture.dataHome, tools, []);
            const json = cli(fixture.controlHome, fixture.dataHome, tools, ['--json']);
            const verbose = cli(fixture.controlHome, fixture.dataHome, tools, ['--json', '--verbose']);
            const unavailable = cli(fixture.controlHome, fixture.dataHome, tmuxOnly, ['--json']);
            expect(normal.status).toBe(0); expect(normal.stdout).toContain('"slug": "lane-a"');
            expect(json.status).toBe(0); expect(JSON.parse(json.stdout).data.runtime.available).toBeFalse();
            expect(verbose.status).toBe(0); expect(JSON.parse(verbose.stdout).data.diagnostics.rejectedEventCount).toBe(0);
            expect(JSON.parse(unavailable.stdout).data.health.warnings
                .map((warning: {code: string}) => warning.code)).toContain('REPOSITORY_UNAVAILABLE');
            expect(JSON.parse(unavailable.stdout).data.packIntegrity.status).not.toBe('valid');
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }

        const empty = createReadCommandFixture();
        try {
            const before = treeSnapshot(empty.root);
            const error = cli(empty.controlHome, empty.dataHome, '/usr/bin', ['--json']);
            expect(error.status).not.toBe(0); expect(error.stderr).toContain('ERR_LANE_NOT_FOUND');
            expect(treeSnapshot(empty.root)).toBe(before);
        } finally { empty.remove(); }

        const adjacent = createReadCommandFixture();
        try {
            createLane(adjacent, {lifecycle: 'paused'});
            const adjacentDir = createLane(adjacent, {slug: 'lane-b',
                laneId: '22222222-2222-4222-8222-222222222222', lifecycle: 'paused'});
            writeFileSync(join(adjacentDir, 'repositories.local.json'), '{}\n');
            const before = treeSnapshot(adjacent.root);
            const result = cli(adjacent.controlHome, adjacent.dataHome, '/usr/bin', ['--json', '--lane=lane-a']);
            expect(result.status).toBe(0);
            expect(JSON.parse(result.stdout).data.health.warnings.map((warning: {code: string}) => warning.code))
                .toContain('CONFLICT_OBSERVATION_INCOMPLETE');
            expect(treeSnapshot(adjacent.root)).toBe(before);
        } finally { adjacent.remove(); }
    });
});

function cli(cwd: string, dataHome: string, path: string, args: string[]) {
    const entry = join(process.cwd(), 'build', 'src', 'cli.js');
    const source = `import run from ${JSON.stringify(entry)}; await run(...JSON.parse(process.env.WT_PROOF_ARGS));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {cwd, encoding: 'utf8',
        env: {...process.env, WT_PROOF_ARGS: JSON.stringify(['status', '--no-color', ...args]),
            WATCHTOWER_DATA_HOME: dataHome, PATH: path}});
    return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}
