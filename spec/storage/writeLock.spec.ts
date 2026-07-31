import {spawnSync} from 'node:child_process';
import {existsSync, readFileSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {WatchtowerError} from '../../src/contracts/index.js';
import {readProcessStartIdentity} from '../../src/foundation/process/processIdentity.js';
import {acquireWriteLock} from '../../src/foundation/storage/sqliteWriteLock.js';
import {createLockRecord, readLockRecord, tryCreateLockRecord} from '../../src/foundation/storage/writeLockRecord.js';
import {GRAPH_SCHEMA, makeWorkDir, rejectionCode, removeWorkDir, storageAt} from './support/storeFixtures.js';

/**
 * Ownership and exclusion proof for the cross-process projection/index
 * publication lock. These fixtures address the lock adapter directly — it is
 * capsule-internal and deliberately absent from the storage barrel — so the
 * durable §11 record, PID + process-start liveness, stale reclaim, timeout, and
 * release ownership are each proved independently of the store that uses them.
 */
function lockFileFor(dir: string): string {
    return join(dir, 'pack.sqlite.lock');
}

/** A PID that has certainly exited, for dead-owner fixtures. */
function deadPid(): number {
    return spawnSync(process.execPath, ['-e', 'process.exit(0)']).pid as number;
}

/**
 * Canonical-UUID markers. These fixtures must exercise liveness and release
 * ownership, so their tokens have to pass record validation — a non-UUID marker
 * would be rejected as an invalid record and the test would silently pass for
 * the wrong reason.
 */
const ACTIVE_TOKEN = '00000000-0000-4000-8000-00000000ac71';
const STALE_TOKEN = '00000000-0000-4000-8000-000000005ea1';
const DEAD_TOKEN = '00000000-0000-4000-8000-00000000dead';
const SUCCESSOR_TOKEN = '00000000-0000-4000-8000-0000000055cc';

/** Write a complete, well-formed durable record with chosen owner fields. */
function writeRecord(path: string, overrides: Partial<ReturnType<typeof createLockRecord>>): void {
    writeFileSync(path, JSON.stringify({...createLockRecord(), ...overrides}));
}

describe('mutation lock durable record shape', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('records the five distinct v1-contracts §11 fields', async function () {
        const path = lockFileFor(dir);
        const held = await acquireWriteLock(path);
        const raw = JSON.parse(readFileSync(path, 'utf8'));
        expect(Object.keys(raw).sort()).toEqual(['acquiredAt', 'command', 'pid', 'processStartIdentity', 'token']);
        expect(raw.pid).toBe(process.pid);
        expect(raw.processStartIdentity).toBe(readProcessStartIdentity(process.pid) as string);
        // Process start identity is its own field, never the acquisition time.
        expect(raw.processStartIdentity).not.toBe(raw.acquiredAt);
        expect(Date.parse(raw.acquiredAt)).not.toBeNaN();
        await held.release();
    });

    it('keeps the command identity bounded, redacted, and path-free', async function () {
        const path = lockFileFor(dir);
        const held = await acquireWriteLock(path);
        const {command} = JSON.parse(readFileSync(path, 'utf8'));
        expect(command.length).toBeGreaterThan(0);
        expect(command.length).toBeLessThanOrEqual(120);
        expect(command).toMatch(/^[A-Za-z0-9._ -]+$/);
        expect(command).not.toContain('/');
        expect(command).not.toContain(dir);
        await held.release();
    });

    it('writes the same durable record shape for a reclaim sentinel', function () {
        // The production sentinel is created by exactly this call pair.
        const sentinel = `${lockFileFor(dir)}.reclaim`;
        expect(tryCreateLockRecord(sentinel, createLockRecord())).toBeTrue();
        const raw = JSON.parse(readFileSync(sentinel, 'utf8'));
        expect(Object.keys(raw).sort()).toEqual(['acquiredAt', 'command', 'pid', 'processStartIdentity', 'token']);
        expect(readLockRecord(sentinel)).not.toBeNull();
    });
});

describe('mutation lock exclusion and timeout', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('excludes a second acquisition while the first holder is active', async function () {
        const path = lockFileFor(dir);
        const held = await acquireWriteLock(path);
        expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 100}))).toBe('ERR_LOCK_CONFLICT');
        await held.release();
        const next = await acquireWriteLock(path, {timeoutMs: 1000});
        await next.release();
    });

    it('waits at least the configured timeout before reporting a conflict', async function () {
        const path = lockFileFor(dir);
        const held = await acquireWriteLock(path);
        const started = Date.now();
        let error: unknown;
        try {
            await acquireWriteLock(path, {timeoutMs: 250, pollMs: 10});
        } catch (thrown) {
            error = thrown;
        }
        const elapsed = Date.now() - started;
        expect(error).toBeInstanceOf(WatchtowerError);
        expect((error as WatchtowerError).code).toBe('ERR_LOCK_CONFLICT');
        expect(elapsed).toBeGreaterThanOrEqual(250);
        expect(elapsed).toBeLessThan(5000);
        await held.release();
    });

    it('does not name a filesystem root in the conflict diagnostic', async function () {
        const path = lockFileFor(dir);
        const held = await acquireWriteLock(path);
        let error: unknown;
        try {
            await acquireWriteLock(path, {timeoutMs: 50});
        } catch (thrown) {
            error = thrown;
        }
        expect((error as Error).message).not.toContain(dir);
        expect((error as Error).message).toContain('pack.sqlite.lock');
        await held.release();
    });
});

describe('mutation lock process-identity liveness', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('treats a matching PID and matching process start as an active holder', async function () {
        // Real live process, real recorded start identity, foreign token: the
        // owner is genuinely running, so the lock must not be reclaimed.
        const path = lockFileFor(dir);
        writeRecord(path, {
            pid: process.pid,
            processStartIdentity: readProcessStartIdentity(process.pid) as string,
            token: ACTIVE_TOKEN
        });
        expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 150, pollMs: 10}))).toBe('ERR_LOCK_CONFLICT');
        expect(JSON.parse(readFileSync(path, 'utf8')).token).toBe(ACTIVE_TOKEN);
    });

    it('treats a reused PID with a mismatched process start as a stale owner', async function () {
        // Same live PID, but the recorded start identity belongs to a different
        // real process (pid 1). This is the reused-PID case a PID-only check
        // cannot detect: it must be reclaimable, not a permanent block.
        const path = lockFileFor(dir);
        const foreignStart = readProcessStartIdentity(1) as string;
        expect(foreignStart).not.toBe(readProcessStartIdentity(process.pid) as string);
        writeRecord(path, {pid: process.pid, processStartIdentity: foreignStart, token: STALE_TOKEN});

        const taken = await acquireWriteLock(path, {timeoutMs: 1000, pollMs: 10});
        expect(JSON.parse(readFileSync(path, 'utf8')).token).not.toBe(STALE_TOKEN);
        await taken.release();
        expect(existsSync(path)).toBeFalse();
    });

    it('reclaims a lock whose recorded owner process is dead', async function () {
        const path = lockFileFor(dir);
        writeRecord(path, {pid: deadPid(), token: DEAD_TOKEN});
        const taken = await acquireWriteLock(path, {timeoutMs: 1000, pollMs: 10});
        expect(JSON.parse(readFileSync(path, 'utf8')).token).not.toBe(DEAD_TOKEN);
        await taken.release();
        expect(existsSync(path)).toBeFalse();
    });

    it('fails safe on a malformed record instead of stealing the lock', async function () {
        const path = lockFileFor(dir);
        writeFileSync(path, '{"pid":');
        expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 150, pollMs: 10}))).toBe('ERR_LOCK_CONFLICT');
        expect(existsSync(path)).toBeTrue();
    });

    it('fails safe when a record omits a required §11 field', async function () {
        const path = lockFileFor(dir);
        // A dead PID, but no process start identity: unverifiable, so the
        // record must not be reclaimed on PID evidence alone.
        writeFileSync(path, JSON.stringify({pid: deadPid(), token: 'incomplete', acquiredAt: new Date().toISOString()}));
        expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 150, pollMs: 10}))).toBe('ERR_LOCK_CONFLICT');
        expect(JSON.parse(readFileSync(path, 'utf8')).token).toBe('incomplete');
    });
});

describe('mutation lock release ownership', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('never lets a release delete a lock owned by a different acquisition', async function () {
        const path = lockFileFor(dir);
        const held = await acquireWriteLock(path);
        writeRecord(path, {token: SUCCESSOR_TOKEN});
        await held.release();
        expect(existsSync(path)).toBeTrue();
        expect(JSON.parse(readFileSync(path, 'utf8')).token).toBe(SUCCESSOR_TOKEN);
    });

    it('is idempotent on repeated release', async function () {
        const path = lockFileFor(dir);
        const held = await acquireWriteLock(path);
        await held.release();
        await held.release();
        expect(existsSync(path)).toBeFalse();
    });

    it('does not reclaim a stale lock while an active sentinel holds the reclaim', async function () {
        const path = lockFileFor(dir);
        writeRecord(path, {pid: deadPid(), token: DEAD_TOKEN});
        // An active reclaimer owns the sentinel; a competing reclaim must defer.
        expect(tryCreateLockRecord(`${path}.reclaim`, createLockRecord())).toBeTrue();
        expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 150, pollMs: 10}))).toBe('ERR_LOCK_CONFLICT');
        expect(JSON.parse(readFileSync(path, 'utf8')).token).toBe(DEAD_TOKEN);
    });
});

describe('mutation lock ordering against SQLite transactions', function () {
    let dir: string;
    beforeEach(function () { dir = makeWorkDir(); });
    afterEach(function () { removeWorkDir(dir); });

    it('takes the lock before any SQLite connection or transaction is opened', async function () {
        const storage = storageAt(dir);
        const seeded = await storage.open('pack', GRAPH_SCHEMA, {create: true});
        await seeded.close();

        // Hold the store's lock directly; a writable open must be refused by the
        // lock, outside SQLite, leaving no database sidecar behind.
        const held = await acquireWriteLock(lockFileFor(dir));
        expect(await rejectionCode(storage.open('pack', GRAPH_SCHEMA, {lockTimeoutMs: 100}))).toBe('ERR_LOCK_CONFLICT');
        expect(existsSync(join(dir, 'pack.sqlite-wal'))).toBeFalse();
        await held.release();

        const writable = await storage.open('pack', GRAPH_SCHEMA, {lockTimeoutMs: 1000});
        await writable.close();
    }, 20000);
});
