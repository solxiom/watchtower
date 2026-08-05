import {spawnSync} from 'node:child_process';
import {join} from 'node:path';
import {treeSnapshot} from './readCommandFixtures.js';
import {createWatchLaneFixture, type WatchLaneFixture} from '../foundation/support/watchPreflightFixtures.js';

interface CliRun {
    readonly status: number | null;
    readonly signal: NodeJS.Signals | null;
    readonly stdout: string;
    readonly stderr: string;
}

const REPO_CWD = process.cwd();

function cliArgs(args: readonly string[]): {source: string} {
    const entry = join(REPO_CWD, 'build', 'src', 'cli.js');
    return {source: `import run from ${JSON.stringify(entry)}; await run(...${JSON.stringify(args)});`};
}

/**
 * Every run keeps the child's own process cwd at the repository root and
 * selects the fixture lane through `--workspace=<explicit>` —
 * `resolveWorkspaceContext`'s own documented override
 * (`src/foundation/paths/workspaceResolver.ts`) — instead of relying on the
 * spawned process's cwd for lane discovery.
 *
 * A real full-attach proof (successful preflight through a genuinely
 * activated pack index, inside a real spawned `wt watch` process) is not
 * exercised here: opening the accepted CA-01/CA-02 SQLite pack index through
 * its worker-thread-backed driver deterministically fails with
 * `DB_CONNECTION_CLOSED` specifically when the opening process was itself
 * spawned via `child_process.spawn()` from a running Node parent — reproduced
 * outside Jasmine, outside this repo's sandbox, and independent of any code
 * this batch owns (`src/foundation/index/`, `src/foundation/storage/`, and
 * `src/foundation/pack/index/` are foreign CA-01/CA-02 ownership). `wt watch`
 * itself is spawned by a real shell, not by a Node parent, in every real
 * deployment, so this is a nested-spawn test-harness limitation, not a
 * production defect. `WatchPreflight.spec.ts` proves the identical open/verify
 * path in-process against a real on-disk activated index, and
 * `watchAttachmentProcessProof.spec.ts` proves this batch's own required
 * exec/stdout/Ctrl-C/no-daemonization behavior through a real spawned process
 * using the real `WatchAttachment` runtime adapter directly, decoupled from
 * the foreign SQLite boundary.
 */
function cliSync(dataHome: string, args: readonly string[]): CliRun {
    const {source} = cliArgs(args);
    const result = spawnSync(process.execPath, ['--input-type=module', '--eval', source], {
        cwd: REPO_CWD, encoding: 'utf8', env: {...process.env, WATCHTOWER_DATA_HOME: dataHome}
    });
    return {status: result.status, signal: result.signal, stdout: result.stdout, stderr: result.stderr};
}

describe('wt watch real CLI proof', function () {
    it('rejects --json before any preflight effect', function () {
        const fixture: WatchLaneFixture = createWatchLaneFixture();
        try {
            const before = treeSnapshot(fixture.fixture.root);
            const run = cliSync(fixture.fixture.dataHome, ['watch', `--workspace=${fixture.fixture.controlHome}`, '--json']);
            expect(run.status).not.toBe(0);
            expect(run.stderr).toContain('ERR_INVALID_ARGUMENT');
            expect(treeSnapshot(fixture.fixture.root)).toBe(before);
        } finally {
            fixture.remove();
        }
    });

    it('fails closed with the missing-dependency exit code when the pack index was never activated', function () {
        const fixture: WatchLaneFixture = createWatchLaneFixture();
        try {
            const before = treeSnapshot(fixture.fixture.root);
            const run = cliSync(fixture.fixture.dataHome, ['watch', `--workspace=${fixture.fixture.controlHome}`, '--no-color']);
            expect(run.status).toBe(4);
            expect(run.stderr).toContain('ERR_MISSING_DEPENDENCY');
            expect(treeSnapshot(fixture.fixture.root)).toBe(before);
        } finally {
            fixture.remove();
        }
    });

    it('fails closed with the lane-not-found exit code outside any lane, performing no writes', function () {
        const fixture: WatchLaneFixture = createWatchLaneFixture();
        try {
            const before = treeSnapshot(fixture.fixture.root);
            const run = cliSync(fixture.fixture.dataHome, ['watch', `--workspace=${fixture.fixture.secondary}`, '--no-color']);
            expect(run.status).toBe(3);
            expect(run.stderr).toContain('ERR_LANE_NOT_FOUND');
            expect(treeSnapshot(fixture.fixture.root)).toBe(before);
        } finally {
            fixture.remove();
        }
    });
});
