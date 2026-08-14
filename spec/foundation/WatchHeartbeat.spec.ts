import {mkdirSync, mkdtempSync, readFileSync, readdirSync, rmSync, writeFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {observeHeartbeat} from '../../src/foundation/observation/index.js';
import {buildLaneFilePath} from '../../src/foundation/paths/index.js';
import {
    createNodeWatchHeartbeatWriter,
    defaultNodeWatchHeartbeatWriterDeps,
    nodeWatchHeartbeatWriter,
    renderWatchHeartbeatFileContent,
    renderWatchHeartbeatStdoutLine,
    WatchHeartbeat,
    WATCH_HEARTBEAT_INTERVAL_SEC,
    WATCH_HEARTBEAT_RELATIVE_PATH,
    type NodeWatchHeartbeatWriterDeps
} from '../../src/foundation/task/watch/index.js';
import type {DiscoveredLane} from '../../src/foundation/discovery/index.js';

function lane(laneDir: string): DiscoveredLane {
    return {
        laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', slug: 'demo', initiativeId: 'watchtower-v1',
        kind: 'implementation', controlHome: '/control', laneDir,
        lifecycle: 'active',
        manifest: {
            schemaVersion: 1, laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', kind: 'implementation', slug: 'demo',
            initiativeId: 'watchtower-v1', controlHomeRepository: 'main', laneDir: '.watchtower/lanes/demo', repositories: []
        }
    };
}

class RecordingSink {
    readonly lines: string[] = [];
    write(line: string): void {
        this.lines.push(line);
    }
}

describe('watch heartbeat contracts', function () {
    it('renders the stdout line and file bytes the status/doctor readers expect', function () {
        expect(renderWatchHeartbeatStdoutLine('2026-08-01T10:04:30.000Z', 150))
            .toBe('AGENT_LOOP_HEARTBEAT_lane {"at":"2026-08-01T10:04:30.000Z","interval":150}');
        expect(renderWatchHeartbeatFileContent('2026-08-01T10:04:30.000Z')).toBe('2026-08-01T10:04:30.000Z\n');
        expect(WATCH_HEARTBEAT_INTERVAL_SEC).toBe(150);
        expect(WATCH_HEARTBEAT_RELATIVE_PATH).toBe('state/watcher-heartbeat.txt');
    });
});

describe('nodeWatchHeartbeatWriter', function () {
    function writerWith(override: Partial<NodeWatchHeartbeatWriterDeps>) {
        return createNodeWatchHeartbeatWriter({...defaultNodeWatchHeartbeatWriterDeps, ...override});
    }

    function tempLane(prefix: string): string {
        return mkdtempSync(join(tmpdir(), prefix));
    }

    function stateDir(laneDir: string): string {
        return join(laneDir, 'state');
    }

    function hasTempArtifact(directory: string): boolean {
        return readdirSync(directory).some((name) => name.includes('.tmp-'));
    }

    it('writes a fresh ISO timestamp atomically and leaves it readable after stop', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-');
        try {
            nodeWatchHeartbeatWriter.write(laneDir, '2026-08-01T10:04:30.000Z');
            const path = join(laneDir, WATCH_HEARTBEAT_RELATIVE_PATH);
            expect(readFileSync(path, 'utf8')).toBe('2026-08-01T10:04:30.000Z\n');
            expect(observeHeartbeat(path, {staleAfterMs: 60_000, now: new Date('2026-08-01T10:04:45.000Z')}).status)
                .toBe('fresh');
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('removes the temporary file when writeSync fails', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-write-');
        const directory = stateDir(laneDir);
        try {
            expect(() => writerWith({writeSync: () => { throw new Error('write failed'); }}).write(laneDir, '2026-08-01T10:04:30.000Z'))
                .toThrowError('write failed');
            expect(hasTempArtifact(directory)).toBeFalse();
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('removes the temporary file when file fsync fails', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-fsync-');
        const directory = stateDir(laneDir);
        try {
            expect(() => writerWith({fsyncSync: () => { throw new Error('fsync failed'); }}).write(laneDir, '2026-08-01T10:04:30.000Z'))
                .toThrowError('fsync failed');
            expect(hasTempArtifact(directory)).toBeFalse();
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('removes the temporary file when closeSync fails', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-close-');
        const directory = stateDir(laneDir);
        try {
            expect(() => writerWith({closeSync: () => { throw new Error('close failed'); }}).write(laneDir, '2026-08-01T10:04:30.000Z'))
                .toThrowError('close failed');
            expect(hasTempArtifact(directory)).toBeFalse();
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('removes the temporary file when rename fails and never leaves a stray temp artifact', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-rename-');
        const directory = stateDir(laneDir);
        mkdirSync(directory, {recursive: true});
        mkdirSync(join(directory, 'watcher-heartbeat.txt'));
        try {
            expect(() => nodeWatchHeartbeatWriter.write(laneDir, '2026-08-01T10:04:30.000Z')).toThrow();
            expect(hasTempArtifact(directory)).toBeFalse();
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('leaves no temporary artifact when directory fsync fails after rename', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-dir-fsync-');
        const directory = stateDir(laneDir);
        try {
            expect(() => writerWith({fsyncDirectory: () => { throw new Error('directory fsync failed'); }}).write(laneDir, '2026-08-01T10:04:30.000Z'))
                .toThrowError('directory fsync failed');
            expect(hasTempArtifact(directory)).toBeFalse();
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('retries with a new temporary path on open collision and never removes another writer artifact', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-collision-');
        const directory = stateDir(laneDir);
        const target = buildLaneFilePath(laneDir, WATCH_HEARTBEAT_RELATIVE_PATH);
        mkdirSync(directory, {recursive: true});
        const fixedNow = 1_700_000_000_000;
        const fixedPid = 42;
        const collisionPath = `${target}.tmp-${fixedPid.toString(16)}-${fixedNow.toString(16)}-forced-collision`;
        writeFileSync(collisionPath, 'in-flight\n');
        const rmCalls: string[] = [];
        let suffixAttempt = 0;
        const writer = writerWith({
            now: () => fixedNow,
            pid: () => fixedPid,
            uniqueSuffix: () => {
                suffixAttempt += 1;
                return suffixAttempt === 1 ? 'forced-collision' : 'retry-safe';
            },
            rmSync: (path, options) => {
                rmCalls.push(String(path));
                return defaultNodeWatchHeartbeatWriterDeps.rmSync(path, options);
            }
        });
        try {
            writer.write(laneDir, '2026-08-01T10:04:31.000Z');
            expect(readFileSync(join(laneDir, WATCH_HEARTBEAT_RELATIVE_PATH), 'utf8')).toBe('2026-08-01T10:04:31.000Z\n');
            expect(readFileSync(collisionPath, 'utf8')).toBe('in-flight\n');
            expect(rmCalls).not.toContain(collisionPath);
            expect(hasTempArtifact(directory)).toBeTrue();
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('completes two overlapping writes when pid and now collide', function () {
        const laneDir = tempLane('watchtower-watch-heartbeat-overlap-');
        const directory = stateDir(laneDir);
        let suffixCount = 0;
        const writer = writerWith({
            now: () => 1_700_000_000_000,
            pid: () => 42,
            uniqueSuffix: () => {
                suffixCount += 1;
                return `suffix-${suffixCount.toString()}`;
            }
        });
        try {
            writer.write(laneDir, '2026-08-01T10:04:30.000Z');
            writer.write(laneDir, '2026-08-01T10:04:31.000Z');
            expect(readFileSync(join(laneDir, WATCH_HEARTBEAT_RELATIVE_PATH), 'utf8')).toBe('2026-08-01T10:04:31.000Z\n');
            expect(hasTempArtifact(directory)).toBeFalse();
        } finally {
            rmSync(laneDir, {recursive: true, force: true});
        }
    });

    it('fails closed when the lane directory cannot be canonicalized', function () {
        expect(() => nodeWatchHeartbeatWriter.write('/tmp/definitely-not-a-lane-root', '2026-08-01T10:04:30.000Z'))
            .toThrow(jasmine.objectContaining({code: 'ERR_PATH_ESCAPE'}));
    });
});

describe('WatchHeartbeat', function () {
    it('emits one immediate stdout/file heartbeat and schedules periodic stdout/file ticks', function () {
        const sink = new RecordingSink();
        const writes: string[] = [];
        let tick: (() => void) | undefined;
        const heartbeat = new WatchHeartbeat();
        const stop = heartbeat.start(lane('/lane/demo'), sink, {
            intervalSec: 2,
            clock: {now: () => new Date('2026-08-01T10:04:30.000Z')},
            writer: {write: (_laneDir, timestamp) => { writes.push(timestamp); }},
            timer: {schedule: (_intervalMs, callback) => { tick = callback; return () => { tick = undefined; }; }}
        });

        expect(writes).toEqual(['2026-08-01T10:04:30.000Z']);
        expect(sink.lines).toEqual([
            'AGENT_LOOP_HEARTBEAT_lane {"at":"2026-08-01T10:04:30.000Z","interval":2}'
        ]);

        tick?.();
        expect(writes).toEqual(['2026-08-01T10:04:30.000Z', '2026-08-01T10:04:30.000Z']);
        expect(sink.lines.length).toBe(2);

        stop();
        tick?.();
        expect(writes.length).toBe(2);
        expect(sink.lines.length).toBe(2);
    });

    it('throws when timer scheduling fails after the first emit without scheduling a periodic callback', function () {
        const sink = new RecordingSink();
        const heartbeat = new WatchHeartbeat();
        expect(() => heartbeat.start(lane('/lane/demo'), sink, {
            writer: {write: () => undefined},
            timer: {schedule: () => { throw new Error('schedule failed'); }}
        })).toThrowError('schedule failed');
        expect(sink.lines.length).toBe(1);
    });
});
