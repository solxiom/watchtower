import {createHash} from 'node:crypto';
import {existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {
    acquireInitLocks, releaseInitLocks, restoreGitignore, shouldUpdateGitignore, updateGitignore, writeBindings
} from '../../src/foundation/index.js';
import {acquireInitLockLease} from '../../src/foundation/initLocks.js';

describe('lane binding mutator', function () {
    it('updates and conditionally restores .gitignore, including a missing file', async function () {
        const root = fixture();
        const controlHome = join(root, 'control');
        mkdirSync(controlHome);
        try {
            expect(await shouldUpdateGitignore(controlHome)).toBeTrue();
            const update = await updateGitignore(controlHome);
            expect(readFileSync(join(controlHome, '.gitignore'), 'utf8')).toBe('/.watchtower/\n');
            expect(update.originalDigest).toBe(hash(''));
            expect(await restoreGitignore(controlHome, update.originalDigest)).toBeTrue();
            expect(existsSync(join(controlHome, '.gitignore'))).toBeFalse();
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('preserves an existing file, avoids duplicates, and refuses a changed rollback target', async function () {
        const root = fixture();
        const controlHome = join(root, 'control');
        mkdirSync(controlHome);
        const path = join(controlHome, '.gitignore');
        writeFileSync(path, 'node_modules/\n');
        try {
            const update = await updateGitignore(controlHome);
            expect(await shouldUpdateGitignore(controlHome)).toBeFalse();
            expect((await updateGitignore(controlHome)).writtenDigest).toBe(update.writtenDigest);
            writeFileSync(path, 'changed\n');
            expect(await restoreGitignore(controlHome, update.originalDigest)).toBeFalse();
            expect(readFileSync(path, 'utf8')).toBe('changed\n');
        } finally { rmSync(root, {recursive: true, force: true}); }
    });

    it('writes canonical bindings and releases the four locks in reverse ownership scope', async function () {
        const root = fixture();
        const controlHome = join(root, 'control');
        const laneDir = join(controlHome, '.watchtower', 'lanes', 'lane-a');
        const dataHome = join(root, 'data');
        mkdirSync(join(laneDir, 'state'), {recursive: true});
        mkdirSync(join(laneDir, 'coordinator', 'operator-sessions'), {recursive: true});
        const repository = join(root, 'repository');
        mkdirSync(repository);
        try {
            await writeBindings(laneDir, [{id: 'main', path: repository, branch: 'main', worktreeMode: 'dedicated', role: 'primary', access: 'write'}]);
            expect(JSON.parse(readFileSync(join(laneDir, 'repositories.local.json'), 'utf8')).repositories[0].path).toBe(repository);
            const lease = await acquireInitLockLease(controlHome, 'lane-a', {dataHome, timeoutMs: 100, pollMs: 1});
            expect(lease.paths).toEqual([
                join(dataHome, 'index', '.membership-index.lock'), join(laneDir, 'state', 'lane.lock'),
                join(laneDir, 'coordinator', 'operator-sessions', 'session.lock'), join(dataHome, 'index', '.publication.lock')
            ]);
            await lease.release();
            await acquireInitLocks(controlHome, 'lane-a', {dataHome, timeoutMs: 100, pollMs: 1});
            await releaseInitLocks();
        } finally { rmSync(root, {recursive: true, force: true}); }
    });
});

function fixture(): string { return mkdtempSync(join(tmpdir(), 'watchtower-lc04-bindings-')); }
function hash(value: string): string { return createHash('sha256').update(value).digest('hex'); }
