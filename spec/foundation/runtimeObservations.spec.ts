import {NirvanaTmuxObserver} from '../../src/foundation/observation/index.js';
import {observeHeartbeat} from '../../src/foundation/observation/index.js';
import {latestWorkerEvents, observeRuntimeSessions} from '../../src/foundation/observation/index.js';
import {chmodSync, mkdtempSync, readFileSync, rmSync, writeFileSync} from 'node:fs';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import type {TmuxCommandRequest} from '../../src/foundation/observation/index.js';
import type {WorkerEventRecord} from '../../src/contracts/events.js';

function event(role: 'implementer' | 'reviewer', sequence: number): WorkerEventRecord {
    return {
        schemaVersion: 1,
        eventId: `event:${role}:${sequence}`,
        type: role === 'implementer' ? 'handoff' : 'accept',
        sequence,
        at: '2026-08-01T10:00:00Z',
        laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2',
        producer: `worker:${role}`,
        correlationId: 'cycle:1',
        causationId: null,
        policyVersion: 'v1',
        payload: {role, batch: 'RM-09', session: `session:${role}`}
    };
}

describe('runtime observations', function () {
    it('matches only complete expected tmux names and exposes presence as raw facts', function () {
        const observation = observeRuntimeSessions([
            'wt-lane-implementer', 'wt-lane-reviewer-extra', 'WT-lane-reviewer', 'wt-lane-reviewеr', 'wt-lane-watch', 'wt-lane-reviewer'
        ], {
            watcher: 'wt-lane-watch',
            workers: {implementer: 'wt-lane-implementer', reviewer: 'wt-lane-reviewer'}
        });
        expect(observation).toEqual({
            watcherPresent: true,
            workerPresent: {implementer: true, reviewer: true}
        });
        expect('lifecycle' in observation).toBeFalse();
        expect('health' in observation).toBeFalse();
    });

    it('lists tmux sessions through immutable argv and a sanitized injected command port', async function () {
        let received: TmuxCommandRequest | undefined;
        const observer = new NirvanaTmuxObserver({
            cwd: '/lane', path: '/usr/bin', timeoutMs: 321,
            commandPort: {async listSessions(request) { received = request; return 'first\nsecond\n\n'; }}
        });
        await expectAsync(observer.listSessionNames()).toBeResolvedTo(['first', 'second']);
        expect(received).toEqual({
            command: 'tmux', args: ['list-sessions', '-F', '#{session_name}'], cwd: '/lane',
            environment: {PATH: '/usr/bin'}, timeoutMs: 321, maxOutputBytes: 64 * 1024
        });
    });

    it('uses RM-05 sequence ordering to surface the latest event for each role', function () {
        const events = latestWorkerEvents([event('implementer', 2), event('reviewer', 1), event('implementer', 3)]);
        expect(events.implementer?.eventId).toBe('event:implementer:3');
        expect(events.reviewer?.eventId).toBe('event:reviewer:1');
    });

    it('rejects output beyond the fixed byte limit instead of accepting a partial observation', async function () {
        const observer = new NirvanaTmuxObserver({
            cwd: '/lane', path: '/usr/bin', commandPort: {async listSessions() { return 'x'.repeat(64 * 1024 + 1); }}
        });
        await expectAsync(observer.listSessionNames()).toBeRejectedWithError(RangeError, 'Tmux session output exceeds the observation limit.');
    });

    it('terminates the real fixed-argv tmux process at the configured deadline', async function () {
        const fixture = createTmuxFixture("echo $$ > \"$PWD/pid\"\ntrap 'exit 0' TERM\nwhile :; do :; done");
        try {
            const observer = new NirvanaTmuxObserver({cwd: fixture, path: fixture, timeoutMs: 25});
            const started = Date.now();
            await expectAsync(observer.listSessionNames()).toBeRejectedWithError(Error, 'Tmux session observation timed out.');
            expect(Date.now() - started).toBeLessThan(500);
            await new Promise(resolve => setTimeout(resolve, 50));
            expect(isRunning(Number(readFileSync(join(fixture, 'pid'), 'utf8')))).toBeFalse();
        } finally {
            rmSync(fixture, {recursive: true, force: true});
        }
    });

    it('terminates the real fixed-argv tmux process on live stdout overflow', async function () {
        const fixture = createTmuxFixture("while :; do printf 'xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx'; done");
        try {
            const observer = new NirvanaTmuxObserver({cwd: fixture, path: fixture, timeoutMs: 5_000});
            const started = Date.now();
            await expectAsync(observer.listSessionNames()).toBeRejectedWithError(RangeError, 'Tmux session output exceeds the observation limit.');
            expect(Date.now() - started).toBeLessThan(1_000);
        } finally {
            rmSync(fixture, {recursive: true, force: true});
        }
    });
});

describe('heartbeat observation', function () {
    const now = new Date('2026-08-01T10:05:00Z');

    it('classifies absent, fresh, and stale timestamps with a configurable threshold', function () {
        const absent = observeHeartbeat('/missing', {staleAfterMs: 5_000, now, reader: {readUtf8: () => undefined}});
        const fresh = observeHeartbeat('/fresh', {staleAfterMs: 5_000, now, reader: {readUtf8: () => '2026-08-01T10:04:57Z\n'}});
        const stale = observeHeartbeat('/stale', {staleAfterMs: 5_000, now, reader: {readUtf8: () => '2026-08-01T10:04:00Z'}});
        const longThreshold = observeHeartbeat('/stale', {staleAfterMs: 300_000, now, reader: {readUtf8: () => '2026-08-01T10:04:00Z'}});
        expect(absent.status).toBe('absent');
        expect(fresh.status).toBe('fresh');
        expect(stale).toEqual(jasmine.objectContaining({status: 'stale', lastHeartbeatAt: '2026-08-01T10:04:00Z'}));
        expect(stale.reason).toContain('2026-08-01T10:04:00Z');
        expect(longThreshold.status).toBe('fresh');
    });

    it('does not write through its injected reader and rejects malformed timestamps', function () {
        let reads = 0;
        const reader = {readUtf8: () => { reads += 1; return 'not-a-timestamp'; }};
        expect(observeHeartbeat('/heartbeat', {staleAfterMs: 1, now, reader})).toEqual({
            status: 'invalid', lastHeartbeatAt: null, reason: 'Heartbeat timestamp is not a valid ISO date-time.'
        });
        expect(reads).toBe(1);
    });

    it('does not modify an existing heartbeat file', function () {
        const directory = mkdtempSync(join(tmpdir(), 'watchtower-heartbeat-'));
        const path = join(directory, 'watcher-heartbeat.txt');
        try {
            writeFileSync(path, '2026-08-01T10:04:57Z\n');
            const before = readFileSync(path, 'utf8');
            expect(observeHeartbeat(path, {staleAfterMs: 5_000, now}).status).toBe('fresh');
            expect(readFileSync(path, 'utf8')).toBe(before);
        } finally {
            rmSync(directory, {recursive: true, force: true});
        }
    });
});

function createTmuxFixture(body: string): string {
    const directory = mkdtempSync(join(tmpdir(), 'watchtower-tmux-'));
    const executable = join(directory, 'tmux');
    writeFileSync(executable, `#!/bin/sh\n${body}\n`);
    chmodSync(executable, 0o755);
    return directory;
}

function isRunning(pid: number): boolean {
    try {
        process.kill(pid, 0);
        return true;
    } catch {
        return false;
    }
}
