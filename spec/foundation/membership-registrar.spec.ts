import {mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {cmd} from '@nirvana/base/terminal';
import {registerLane, registerLaneWithRetry} from '../../src/foundation/lifecycle/index.js';

const LANE_ID = '10000000-0000-4000-8000-000000000001';

describe('membership registrar', function () {
    it('registers all bindings, prunes stale entries, and is idempotent', async function () {
        const root = mkdtempSync(join(tmpdir(), 'watchtower-lc04-membership-'));
        const controlHome = join(root, 'control');
        const dataHome = join(root, 'data');
        mkdirSync(controlHome, {recursive: true});
        initGit(controlHome);
        const laneDir = createLane(controlHome);
        const stale = join(root, 'stale');
        mkdirSync(stale);
        mkdirSync(join(dataHome, 'index'), {recursive: true});
        writeFileSync(join(dataHome, 'index', 'repository-memberships.json'), JSON.stringify({
            [stale]: {laneId: LANE_ID, laneHome: stale}
        }));
        try {
            expect((await registerLane(laneDir, {dataHome, timeoutMs: 500, pollMs: 1})).registered).toBeTrue();
            const indexPath = join(dataHome, 'index', 'repository-memberships.json');
            const first = JSON.parse(readFileSync(indexPath, 'utf8'));
            expect(first[controlHome]).toEqual({laneId: LANE_ID, laneHome: controlHome});
            expect(first[stale]).toBeUndefined();
            expect(Object.keys(first)).toEqual([controlHome]);
            expect((await registerLane(laneDir, {dataHome, timeoutMs: 500, pollMs: 1})).registered).toBeTrue();
            expect(Object.keys(JSON.parse(readFileSync(indexPath, 'utf8')))).toEqual([controlHome]);
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('retries a transient failure and returns an explicit final warning', async function () {
        let attempts = 0;
        const sleeps: number[] = [];
        const success = await registerLaneWithRetry('/lane', 2, {
            register: async () => { attempts += 1; if (attempts === 1) throw new Error('busy'); return {registered: true, retryCount: 0}; },
            sleep: async milliseconds => { sleeps.push(milliseconds); }
        });
        expect(success).toEqual({registered: true, retryCount: 1});
        expect(sleeps).toEqual([25]);
        const failed = await registerLaneWithRetry('/lane', 2, {
            register: async () => { throw new Error('permission denied'); },
            sleep: async () => undefined
        });
        expect(failed.registered).toBeFalse();
        expect(failed.retryCount).toBe(2);
        expect(failed.warning).toContain('home-discoverable');
        expect(attempts).toBe(2);
    });

    it('fails closed for corrupt and concurrently changed index bytes', async function () {
        const root = mkdtempSync(join(tmpdir(), 'watchtower-lc04-index-'));
        const controlHome = join(root, 'control');
        const dataHome = join(root, 'data');
        mkdirSync(controlHome, {recursive: true});
        initGit(controlHome);
        const laneDir = createLane(controlHome);
        const indexPath = join(dataHome, 'index', 'repository-memberships.json');
        mkdirSync(join(dataHome, 'index'), {recursive: true});
        try {
            writeFileSync(indexPath, '{');
            const corrupt = readFileSync(indexPath, 'hex');
            await expectAsync(registerLane(laneDir, {dataHome, timeoutMs: 500, pollMs: 1})).toBeRejected();
            expect(readFileSync(indexPath, 'hex')).toBe(corrupt);
            writeFileSync(indexPath, '{}');
            await expectAsync(registerLane(laneDir, {dataHome, timeoutMs: 500, pollMs: 1,
                beforePublish: async path => { writeFileSync(path, '{"other":{}}'); }})).toBeRejected();
            expect(readFileSync(indexPath, 'utf8')).toBe('{"other":{}}');
        } finally { rmSync(root, {recursive: true, force: true}); }
    });
});

function createLane(controlHome: string): string {
    const laneDir = join(controlHome, '.watchtower', 'lanes', 'lane-a');
    mkdirSync(join(laneDir, 'state'), {recursive: true});
    mkdirSync(join(laneDir, 'coordinator', 'operator-sessions'), {recursive: true});
    writeFileSync(join(laneDir, 'lane.json'), JSON.stringify({schemaVersion: 1, laneId: LANE_ID, kind: 'implementation', slug: 'lane-a', initiativeId: 'initiative', controlHomeRepository: 'main', laneDir: '.watchtower/lanes/lane-a', repositories: [{id: 'main', role: 'primary', access: 'write'}]}));
    writeFileSync(join(laneDir, 'repositories.local.json'), JSON.stringify({schemaVersion: 1, repositories: [{id: 'main', path: controlHome, branch: 'main', worktreeMode: 'dedicated', role: 'primary', access: 'write'}]}));
    return laneDir;
}

function initGit(path: string): void {
    cmd.execSync({command: 'git', args: ['init', '--quiet', '--initial-branch=main'], options: {cwd: path, stdio: 'ignore'}});
    cmd.execSync({command: 'git', args: ['-c', 'user.name=watchtower', '-c', 'user.email=watchtower@example.test', 'commit', '--allow-empty', '--quiet', '--message=initial'], options: {cwd: path, stdio: 'ignore'}});
}
