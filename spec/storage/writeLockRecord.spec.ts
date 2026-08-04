import {readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {readProcessStartIdentity} from '../../src/foundation/observation/index.js';
import {acquireWriteLock} from '../../src/foundation/storage/sqliteWriteLock.js';
import {createLockRecord, readLockRecord} from '../../src/foundation/storage/writeLockRecord.js';
import {makeWorkDir, rejectionCode, removeWorkDir} from './support/storeFixtures.js';

/**
 * Adversarial proof that a durable lock record is untrusted input.
 *
 * A lock file is attacker-influenced text. If an arbitrary string were accepted
 * as a `processStartIdentity`, it would mismatch the real process occupying the
 * PID, be classified as a reused PID, and license reclaiming a live holder's
 * lock. Every case below must therefore fail closed: rejected by the parser,
 * bounded `ERR_LOCK_CONFLICT` from acquisition, and the original record left
 * byte-identical.
 */
function liveRecord() {
    return {
        ...createLockRecord(),
        pid: process.pid,
        processStartIdentity: readProcessStartIdentity(process.pid) as string
    };
}

/** A record whose owner is a PID that cannot be running (Linux `pid_max`). */
function deadOwnerRecord() {
    return {
        ...createLockRecord(),
        pid: 4194303,
        processStartIdentity: 'linux-boot:1:start:1',
        token: '00000000-0000-4000-8000-000000000000'
    };
}

const INVALID_RECORDS: ReadonlyArray<readonly [string, string]> = [
    // The reviewer's independently reproduced adverse record.
    ['crafted stale-authority record', JSON.stringify({
        pid: process.pid,
        processStartIdentity: 'not-a-process-start-identity',
        command: '../../secret --token=exposed',
        acquiredAt: 'not-a-timestamp',
        token: 'not-a-uuid'
    })],
    ['broken JSON', '{"pid":'],
    ['not an object', '"just a string"'],
    ['array', '[1,2,3]'],
    ['oversized', JSON.stringify({...liveRecord(), command: 'a'.repeat(5000)})],
    ['extra field', JSON.stringify({...liveRecord(), extra: 'nope'})],
    ['missing field', JSON.stringify((({token, ...rest}) => rest)(liveRecord()))],
    ['invalid start grammar', JSON.stringify({...liveRecord(), processStartIdentity: 'linux-boot:abc:start:xyz'})],
    ['start grammar leading zero', JSON.stringify({...liveRecord(), processStartIdentity: 'linux-boot:007:start:5'})],
    ['empty start identity', JSON.stringify({...liveRecord(), processStartIdentity: ''})],
    ['command with path', JSON.stringify({...liveRecord(), command: '../../secret'})],
    ['command with argument', JSON.stringify({...liveRecord(), command: 'node --token=exposed'})],
    ['overlong command', JSON.stringify({...liveRecord(), command: 'x'.repeat(121)})],
    ['invalid timestamp', JSON.stringify({...liveRecord(), acquiredAt: 'not-a-timestamp'})],
    ['non-canonical timestamp', JSON.stringify({...liveRecord(), acquiredAt: '2026-07-31T19:00:00+03:00'})],
    ['invalid token', JSON.stringify({...liveRecord(), token: 'not-a-uuid'})],
    ['uppercase token', JSON.stringify({...liveRecord(), token: createLockRecord().token.toUpperCase()})],
    ['pid zero', JSON.stringify({...liveRecord(), pid: 0})],
    ['pid negative', JSON.stringify({...liveRecord(), pid: -5})],
    ['pid fractional', JSON.stringify({...liveRecord(), pid: 12.5})],
    ['pid beyond pid_max', JSON.stringify({...liveRecord(), pid: 999999999})],
    ['pid as string', JSON.stringify({...liveRecord(), pid: String(process.pid)})]
];

describe('durable lock record validation', function () {
    let dir: string;
    let path: string;
    beforeEach(function () { dir = makeWorkDir(); path = join(dir, 'pack.sqlite.lock'); });
    afterEach(function () { removeWorkDir(dir); });

    it('accepts a record this process actually minted', async function () {
        const held = await acquireWriteLock(path);
        const parsed = readLockRecord(path);
        expect(parsed).not.toBeNull();
        expect((parsed as {pid: number}).pid).toBe(process.pid);
        await held.release();
    });

    for (const [name, payload] of INVALID_RECORDS) {
        it(`rejects ${name}`, function () {
            writeFileSync(path, payload);
            expect(readLockRecord(path)).toBeNull();
        });
    }
});

describe('invalid lock record fails closed on acquisition', function () {
    let dir: string;
    let path: string;
    beforeEach(function () { dir = makeWorkDir(); path = join(dir, 'pack.sqlite.lock'); });
    afterEach(function () { removeWorkDir(dir); });

    for (const [name, payload] of INVALID_RECORDS) {
        it(`refuses to steal the lock for ${name}`, async function () {
            writeFileSync(path, payload);
            const before = readFileSync(path);
            expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 120, pollMs: 10}))).toBe('ERR_LOCK_CONFLICT');
            expect(readFileSync(path).equals(before)).toBeTrue();
        });
    }
});

describe('invalid reclaim sentinel fails closed', function () {
    let dir: string;
    let path: string;
    let sentinel: string;
    beforeEach(function () {
        dir = makeWorkDir();
        path = join(dir, 'pack.sqlite.lock');
        sentinel = `${path}.reclaim`;
    });
    afterEach(function () { removeWorkDir(dir); });

    // Controls proving this suite's reclaim path is genuinely reached, so the
    // cases below fail for the intended reason rather than vacuously.
    it('reclaims a dead owner when no sentinel is present', async function () {
        writeFileSync(path, JSON.stringify(deadOwnerRecord()));
        const taken = await acquireWriteLock(path, {timeoutMs: 1000, pollMs: 10});
        await taken.release();
    });

    it('is blocked by a sentinel whose own owner is alive', async function () {
        writeFileSync(path, JSON.stringify(deadOwnerRecord()));
        writeFileSync(sentinel, JSON.stringify(createLockRecord()));
        expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 120, pollMs: 10}))).toBe('ERR_LOCK_CONFLICT');
    });

    for (const [name, payload] of INVALID_RECORDS) {
        it(`never deletes an unverifiable sentinel for ${name}`, async function () {
            writeFileSync(path, JSON.stringify(deadOwnerRecord()));
            writeFileSync(sentinel, payload);
            const before = readFileSync(sentinel);
            expect(await rejectionCode(acquireWriteLock(path, {timeoutMs: 120, pollMs: 10}))).toBe('ERR_LOCK_CONFLICT');
            expect(readFileSync(sentinel).equals(before)).toBeTrue();
            rmSync(sentinel, {force: true});
        });
    }
});
