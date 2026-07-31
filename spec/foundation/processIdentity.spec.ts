import {spawn, spawnSync} from 'node:child_process';
import {once} from 'node:events';
import {
    UNVERIFIABLE_START_IDENTITY,
    classifyRecordedProcess,
    currentCommandIdentity,
    currentProcessIdentity,
    isValidCommandIdentity,
    isValidProcessStartIdentity,
    readProcessStartIdentity
} from '../../src/foundation/process/processIdentity.js';

/**
 * Proof for the focused process-identity adapter that supplies the
 * `v1-contracts.md §11` process start identity. §11 states a PID alone is
 * insufficient stale-lock proof, so these fixtures use real operating-system
 * processes rather than synthetic values.
 */
describe('process start identity', function () {
    it('reads a stable marker for a live process', function () {
        const first = readProcessStartIdentity(process.pid);
        const second = readProcessStartIdentity(process.pid);
        expect(first).not.toBeNull();
        expect(second).toBe(first as string);
    });

    it('distinguishes two different real processes', function () {
        expect(readProcessStartIdentity(1)).not.toBe(readProcessStartIdentity(process.pid) as string);
    });

    it('returns null rather than guessing for an absent process', function () {
        const gone = spawnSync(process.execPath, ['-e', 'process.exit(0)']).pid as number;
        expect(readProcessStartIdentity(gone)).toBeNull();
        expect(readProcessStartIdentity(-1)).toBeNull();
    });
});

describe('current process identity record fields', function () {
    it('supplies distinct pid, start identity, and command values', function () {
        const identity = currentProcessIdentity();
        expect(identity.pid).toBe(process.pid);
        expect(identity.processStartIdentity).toBe(readProcessStartIdentity(process.pid) as string);
        expect(identity.processStartIdentity).not.toBe(UNVERIFIABLE_START_IDENTITY);
        expect(identity.command.length).toBeGreaterThan(0);
    });

    it('keeps the command identity bounded, character-safe, and path-free', function () {
        const command = currentCommandIdentity();
        expect(command.length).toBeLessThanOrEqual(120);
        expect(command).toMatch(/^[A-Za-z0-9._ -]+$/);
        expect(command).not.toContain('/');
        expect(command).not.toContain(process.execPath);
    });
});

describe('process start identity grammar', function () {
    it('accepts a minted marker and the explicit unverifiable marker', function () {
        expect(isValidProcessStartIdentity(readProcessStartIdentity(process.pid) as string)).toBeTrue();
        expect(isValidProcessStartIdentity(currentProcessIdentity().processStartIdentity)).toBeTrue();
        expect(isValidProcessStartIdentity(UNVERIFIABLE_START_IDENTITY)).toBeTrue();
        expect(isValidProcessStartIdentity('linux-boot:0:start:0')).toBeTrue();
    });

    it('rejects arbitrary text that would otherwise fake PID reuse', function () {
        for (const value of [
            'not-a-process-start-identity', '', 'linux-boot:abc:start:xyz', 'linux-boot:007:start:5',
            'linux-boot:1:start:', 'linux-boot::start:1', 'linux-boot:1:start:1 ', ' linux-boot:1:start:1',
            'LINUX-BOOT:1:START:1', 'linux-boot:1:start:1:extra', 42, null, undefined, {}
        ]) {
            expect({value, valid: isValidProcessStartIdentity(value)}).toEqual({value, valid: false});
        }
    });
});

describe('command identity policy', function () {
    it('accepts what the minter produces', function () {
        expect(isValidCommandIdentity(currentCommandIdentity())).toBeTrue();
        expect(isValidCommandIdentity('node watchtower.mjs')).toBeTrue();
        expect(isValidCommandIdentity('wt')).toBeTrue();
    });

    it('rejects paths, arguments, empty, and overlong values', function () {
        for (const value of [
            '', '../../secret', '/usr/bin/node', 'node --token=exposed', 'a'.repeat(121),
            'node\nwatchtower', 'node\u0000', 'node  double', ' leading', 'trailing ', 7, null
        ]) {
            expect({value, valid: isValidCommandIdentity(value)}).toEqual({value, valid: false});
        }
    });
});

describe('recorded process classification', function () {
    it('classifies a matching pid and start identity as active', function () {
        expect(classifyRecordedProcess(currentProcessIdentity())).toBe('active');
    });

    it('classifies a reused pid with a mismatched start identity as stale', function () {
        expect(classifyRecordedProcess({
            pid: process.pid,
            processStartIdentity: readProcessStartIdentity(1) as string
        })).toBe('stale');
    });

    it('classifies an exited real process as dead', async function () {
        const child = spawn(process.execPath, ['-e', 'setTimeout(() => {}, 50)'], {stdio: 'ignore'});
        const recorded = {
            pid: child.pid as number,
            processStartIdentity: readProcessStartIdentity(child.pid as number) as string
        };
        expect(classifyRecordedProcess(recorded)).toBe('active');
        await once(child, 'exit');
        expect(classifyRecordedProcess(recorded)).toBe('dead');
    }, 20000);

    it('classifies an unverifiable start identity as unverifiable, never stale', function () {
        expect(classifyRecordedProcess({
            pid: process.pid,
            processStartIdentity: UNVERIFIABLE_START_IDENTITY
        })).toBe('unverifiable');
    });
});
