import {mkdirSync, utimesSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {acquirePointerLock} from '../../../src/foundation/pack/index/packIndexPointerLock.js';
import {makeWorkDir, removeWorkDir} from '../../storage/support/storeFixtures.js';

/** A syntactically valid abandoned-holder record carrying exactly the normative five keys. */
function deadRecord(extra: Record<string, unknown> = {}): Record<string, unknown> {
    return {
        pid: 999999, processStartIdentity: 'linux-boot:1:start:1', command: 'node',
        acquiredAt: new Date(0).toISOString(), token: '11111111-1111-1111-1111-111111111111',
        ...extra
    };
}

describe('acquirePointerLock', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); mkdirSync(join(dir, 'pack'), {recursive: true}); });
    afterEach(function () { removeWorkDir(dir); });

    it('acquires and releases an uncontended lock', async function () {
        const lock = await acquirePointerLock(join(dir, 'pack'), 200);
        if ('reason' in lock) throw new Error('expected an acquired lock');
        lock.release();
        const second = await acquirePointerLock(join(dir, 'pack'), 200);
        expect('reason' in second).toBe(false);
        if (!('reason' in second)) second.release();
    });

    it('fails closed with PACK_INDEX_LOCK_CONFLICT when the lock is held past the timeout', async function () {
        const held = await acquirePointerLock(join(dir, 'pack'), 200);
        if ('reason' in held) throw new Error('expected an acquired lock');
        try {
            const blocked = await acquirePointerLock(join(dir, 'pack'), 60);
            expect(blocked).toEqual({ok: false, reason: 'PACK_INDEX_LOCK_CONFLICT', target: join(dir, 'pack'), detail: 'the pack-index pointer lock is held'});
        } finally {
            held.release();
        }
    });

    it('never evicts a live, long-running holder no matter how old the lock file appears', async function () {
        const held = await acquirePointerLock(join(dir, 'pack'), 200);
        if ('reason' in held) throw new Error('expected an acquired lock');
        try {
            // Back-date the lock file's mtime well past any age threshold a naive reclaimer would use.
            // Reclaim is liveness-based (this test process is alive) — not age-based — so this must still fail closed.
            const lockPath = join(dir, 'pack', '.current.lock');
            const old = new Date(Date.now() - 3600000);
            utimesSync(lockPath, old, old);
            const contended = await acquirePointerLock(join(dir, 'pack'), 80);
            expect('reason' in contended).toBe(true);
            if ('reason' in contended) expect(contended.reason).toBe('PACK_INDEX_LOCK_CONFLICT');
        } finally {
            held.release();
        }
    });

    it('reclaims a lock abandoned by a dead process carrying the exact normative five-key record', async function () {
        const lockPath = join(dir, 'pack', '.current.lock');
        writeFileSync(lockPath, JSON.stringify(deadRecord()));
        const reclaimed = await acquirePointerLock(join(dir, 'pack'), 500);
        expect('reason' in reclaimed).toBe(false);
        if (!('reason' in reclaimed)) reclaimed.release();
    });

    it('never reclaims a lock record with a malformed shape, keeping the current holder', async function () {
        const lockPath = join(dir, 'pack', '.current.lock');
        writeFileSync(lockPath, '999999\n');
        const blocked = await acquirePointerLock(join(dir, 'pack'), 60);
        expect('reason' in blocked).toBe(true);
        if ('reason' in blocked) expect(blocked.reason).toBe('PACK_INDEX_LOCK_CONFLICT');
    });

    it('never reclaims a dead-PID record with a missing normative key', async function () {
        const lockPath = join(dir, 'pack', '.current.lock');
        const withoutCommand: Record<string, unknown> = deadRecord();
        delete withoutCommand.command;
        writeFileSync(lockPath, JSON.stringify(withoutCommand));
        const blocked = await acquirePointerLock(join(dir, 'pack'), 60);
        expect('reason' in blocked).toBe(true);
        if ('reason' in blocked) expect(blocked.reason).toBe('PACK_INDEX_LOCK_CONFLICT');
    });

    it('never reclaims a dead-PID record carrying an extra key, even though the process is provably dead', async function () {
        const lockPath = join(dir, 'pack', '.current.lock');
        writeFileSync(lockPath, JSON.stringify(deadRecord({hostname: 'extra-field-not-in-the-normative-grammar'})));
        const blocked = await acquirePointerLock(join(dir, 'pack'), 60);
        expect('reason' in blocked).toBe(true);
        if ('reason' in blocked) expect(blocked.reason).toBe('PACK_INDEX_LOCK_CONFLICT');
    });
});
