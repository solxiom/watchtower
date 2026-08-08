import {writeFileSync} from 'node:fs';
import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {createLane, createReadCommandFixture, treeSnapshot} from './readCommandFixtures.js';

describe('wt doctor real CLI proof', function () {
    it('proves pass/fail reporting and exit codes without changing recursive inventory', function () {
        const fixture = createReadCommandFixture();
        try {
            createLane(fixture, {packAvailable: false});
            writeFileSync(join(fixture.controlHome, '.gitignore'), '.watchtower/\n');
            const before = treeSnapshot(fixture.root);
            const healthy = cli(fixture.controlHome, fixture.dataHome, ['--json']);
            expect(healthy.status).toBe(0);
            const report = JSON.parse(healthy.stdout).data;
            expect(report.summary).toEqual({pass: 5, warn: 0, fail: 0, skip: 0});
            expect(treeSnapshot(fixture.root)).toBe(before);
        } finally { fixture.remove(); }

        const broken = createReadCommandFixture();
        try {
            createLane(broken, {packAvailable: false});
            const before = treeSnapshot(broken.root);
            const result = cli(broken.controlHome, broken.dataHome, ['--json']);
            expect(result.status).toBe(4);
            const report = JSON.parse(result.stdout).data;
            const gitIgnoreCheck = report.checks.find((check: {id: string}) => check.id === 'git-ignore-coverage');
            expect(gitIgnoreCheck.status).toBe('fail');
            expect(report.summary.fail).toBeGreaterThanOrEqual(1);
            expect(result.stderr).toContain('ERR_PREFLIGHT_FAILED');
            expect(treeSnapshot(broken.root)).toBe(before);
        } finally { broken.remove(); }

        const missing = createReadCommandFixture();
        try {
            const before = treeSnapshot(missing.root);
            const error = cli(missing.controlHome, missing.dataHome, ['--json']);
            expect(error.status).not.toBe(0);
            expect(error.stderr).toContain('ERR_LANE_NOT_FOUND');
            expect(treeSnapshot(missing.root)).toBe(before);
        } finally { missing.remove(); }
    });
});

function cli(cwd: string, dataHome: string, args: string[]) {
    const entry = join(process.cwd(), 'build', 'src', 'cli.js');
    const source = `import run from ${JSON.stringify(entry)}; await run(...JSON.parse(process.env.WT_PROOF_ARGS));`;
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {cwd, encoding: 'utf8',
        env: {...process.env, WT_PROOF_ARGS: JSON.stringify(['doctor', '--no-color', ...args]),
            WATCHTOWER_DATA_HOME: dataHome}});
    return {status: result.status, stdout: result.stdout, stderr: result.stderr};
}
