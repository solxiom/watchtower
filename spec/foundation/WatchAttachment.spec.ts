import type {DiscoveredLane} from '../../src/foundation/discovery/index.js';
import {
    WatchAttachment, WatchHeartbeat,
    type WatchEventLoopKeepAlive, type WatchHeartbeatStartOptions, type WatchSignalSource, type WatchTerminationSignal
} from '../../src/foundation/task/watch/index.js';
import {createWatchtowerError} from '../../src/contracts/index.js';

function lane(overrides: Partial<DiscoveredLane> = {}): DiscoveredLane {
    return {
        laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', slug: 'demo', initiativeId: 'watchtower-v1',
        kind: 'implementation', controlHome: '/control', laneDir: '/control/.watchtower/lanes/demo',
        lifecycle: 'active',
        manifest: {
            schemaVersion: 1, laneId: '9d0ee3d2-8833-4fb7-b112-8438f04f57d2', kind: 'implementation', slug: 'demo',
            initiativeId: 'watchtower-v1', controlHomeRepository: 'main', laneDir: '.watchtower/lanes/demo', repositories: []
        },
        ...overrides
    };
}

class FakeSignalSource implements WatchSignalSource {
    private handler: ((signal: WatchTerminationSignal) => void) | undefined;

    onSignal(handler: (signal: WatchTerminationSignal) => void): void {
        this.handler = handler;
    }

    offSignal(handler: (signal: WatchTerminationSignal) => void): void {
        if (this.handler === handler) this.handler = undefined;
    }

    fire(signal: WatchTerminationSignal): void {
        this.handler?.(signal);
    }

    get registered(): boolean {
        return this.handler !== undefined;
    }
}

class RecordingSink {
    readonly lines: string[] = [];
    write(line: string): void {
        this.lines.push(line);
    }
}

class RecordingKeepAlive implements WatchEventLoopKeepAlive {
    held = 0;
    released = 0;

    hold(): () => void {
        this.held += 1;
        let releasedOnce = false;
        return () => {
            if (releasedOnce) return;
            releasedOnce = true;
            this.released += 1;
        };
    }
}

function heartbeatWith(options: WatchHeartbeatStartOptions): WatchHeartbeat {
    const inner = new WatchHeartbeat();
    return {start: (lane, sink) => inner.start(lane, sink, options)};
}

function noopHeartbeat(): WatchHeartbeat {
    return heartbeatWith({
        writer: {write: () => undefined},
        timer: {schedule: () => () => undefined}
    });
}

describe('WatchAttachment — direct foreground lifecycle', function () {
    function attachment(options: {
        signals?: WatchSignalSource;
        sink?: RecordingSink;
        keepAlive?: RecordingKeepAlive;
        heartbeat?: WatchHeartbeat;
    } = {}): WatchAttachment {
        return new WatchAttachment({
            signals: options.signals ?? new FakeSignalSource(),
            sink: options.sink ?? new RecordingSink(),
            keepAlive: options.keepAlive ?? new RecordingKeepAlive(),
            heartbeat: options.heartbeat ?? noopHeartbeat()
        });
    }

    it('writes an attach line, blocks until interrupted, then writes a shutdown line and resolves', async function () {
        const signals = new FakeSignalSource();
        const sink = new RecordingSink();
        const keepAlive = new RecordingKeepAlive();
        const attachmentInstance = attachment({signals, sink, keepAlive, heartbeat: heartbeatWith({
            writer: {write: () => undefined},
            timer: {schedule: () => () => undefined},
            clock: {now: () => new Date('2026-08-01T10:04:30.000Z')}
        })});

        const pending = attachmentInstance.attach(lane());
        expect(sink.lines[0]).toBe('Watching lane demo (9d0ee3d2-8833-4fb7-b112-8438f04f57d2). Press Ctrl-C to stop.');
        expect(sink.lines[1]).toBe('AGENT_LOOP_HEARTBEAT_lane {"at":"2026-08-01T10:04:30.000Z","interval":150}');
        expect(signals.registered).toBeTrue();
        expect(keepAlive.held).toBe(1);
        expect(keepAlive.released).toBe(0);

        signals.fire('SIGINT');
        const outcome = await pending;

        expect(outcome).toEqual({outcome: 'interrupted', signal: 'SIGINT'});
        expect(sink.lines).toEqual([
            'Watching lane demo (9d0ee3d2-8833-4fb7-b112-8438f04f57d2). Press Ctrl-C to stop.',
            'AGENT_LOOP_HEARTBEAT_lane {"at":"2026-08-01T10:04:30.000Z","interval":150}',
            'Stopping watch (SIGINT).'
        ]);
        expect(keepAlive.released).toBe(1);
    });

    it('reports SIGTERM distinctly from SIGINT', async function () {
        const signals = new FakeSignalSource();
        const attachmentInstance = attachment({signals, heartbeat: noopHeartbeat()});
        const pending = attachmentInstance.attach(lane());
        signals.fire('SIGTERM');
        expect(await pending).toEqual({outcome: 'interrupted', signal: 'SIGTERM'});
    });

    it('deregisters the signal handler once resolved, never spawning or leaving a second listener behind', async function () {
        const signals = new FakeSignalSource();
        const attachmentInstance = attachment({signals, heartbeat: noopHeartbeat()});
        const pending = attachmentInstance.attach(lane());
        signals.fire('SIGINT');
        await pending;
        expect(signals.registered).toBeFalse();
    });

    it('releases the event-loop keep-alive exactly once even under repeated release calls, and never before interruption', async function () {
        const signals = new FakeSignalSource();
        const keepAlive = new RecordingKeepAlive();
        const attachmentInstance = attachment({signals, keepAlive, heartbeat: noopHeartbeat()});
        const pending = attachmentInstance.attach(lane());
        expect(keepAlive.released).toBe(0);
        signals.fire('SIGINT');
        await pending;
        expect(keepAlive.held).toBe(1);
        expect(keepAlive.released).toBe(1);
    });

    it('never writes to the sink before attach() is called and never touches unrelated lanes', async function () {
        const sink = new RecordingSink();
        new WatchAttachment({
            signals: new FakeSignalSource(), sink, keepAlive: new RecordingKeepAlive(),
            heartbeat: noopHeartbeat()
        });
        expect(sink.lines).toEqual([]);
    });

    it('releases the keep-alive when heartbeat file startup fails before signal registration', async function () {
        const keepAlive = new RecordingKeepAlive();
        const signals = new FakeSignalSource();
        const failing = heartbeatWith({
            writer: {write: () => { throw createWatchtowerError('ERR_UNSAFE_MUTATION', {operation: 'write heartbeat', target: 'lane', remediation: 'restore'}); }},
            timer: {schedule: () => () => undefined}
        });
        await expectAsync(attachment({signals, keepAlive, heartbeat: failing}).attach(lane()))
            .toBeRejectedWith(jasmine.objectContaining({code: 'ERR_UNSAFE_MUTATION'}));
        expect(keepAlive.held).toBe(1);
        expect(keepAlive.released).toBe(1);
        expect(signals.registered).toBeFalse();
    });

    it('releases the keep-alive when timer scheduling fails during heartbeat startup', async function () {
        const keepAlive = new RecordingKeepAlive();
        const failing = heartbeatWith({
            writer: {write: () => undefined},
            timer: {schedule: () => { throw new Error('schedule failed'); }}
        });
        await expectAsync(attachment({keepAlive, heartbeat: failing}).attach(lane())).toBeRejectedWithError('schedule failed');
        expect(keepAlive.held).toBe(1);
        expect(keepAlive.released).toBe(1);
    });
});
