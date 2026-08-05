import type {DiscoveredLane} from '../../src/foundation/discovery/index.js';
import {
    WatchAttachment, type WatchEventLoopKeepAlive, type WatchSignalSource, type WatchTerminationSignal
} from '../../src/foundation/task/watch/index.js';

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

describe('WatchAttachment — direct foreground lifecycle', function () {
    it('writes an attach line, blocks until interrupted, then writes a shutdown line and resolves', async function () {
        const signals = new FakeSignalSource();
        const sink = new RecordingSink();
        const keepAlive = new RecordingKeepAlive();
        const attachment = new WatchAttachment({signals, sink, keepAlive});

        const pending = attachment.attach(lane());
        expect(sink.lines).toEqual(['Watching lane demo (9d0ee3d2-8833-4fb7-b112-8438f04f57d2). Press Ctrl-C to stop.']);
        expect(signals.registered).toBeTrue();
        expect(keepAlive.held).toBe(1);
        expect(keepAlive.released).toBe(0);

        signals.fire('SIGINT');
        const outcome = await pending;

        expect(outcome).toEqual({outcome: 'interrupted', signal: 'SIGINT'});
        expect(sink.lines).toEqual([
            'Watching lane demo (9d0ee3d2-8833-4fb7-b112-8438f04f57d2). Press Ctrl-C to stop.',
            'Stopping watch (SIGINT).'
        ]);
        expect(keepAlive.released).toBe(1);
    });

    it('reports SIGTERM distinctly from SIGINT', async function () {
        const signals = new FakeSignalSource();
        const attachment = new WatchAttachment({signals, sink: new RecordingSink(), keepAlive: new RecordingKeepAlive()});
        const pending = attachment.attach(lane());
        signals.fire('SIGTERM');
        expect(await pending).toEqual({outcome: 'interrupted', signal: 'SIGTERM'});
    });

    it('deregisters the signal handler once resolved, never spawning or leaving a second listener behind', async function () {
        const signals = new FakeSignalSource();
        const attachment = new WatchAttachment({signals, sink: new RecordingSink(), keepAlive: new RecordingKeepAlive()});
        const pending = attachment.attach(lane());
        signals.fire('SIGINT');
        await pending;
        expect(signals.registered).toBeFalse();
    });

    it('releases the event-loop keep-alive exactly once even under repeated release calls, and never before interruption', async function () {
        const signals = new FakeSignalSource();
        const keepAlive = new RecordingKeepAlive();
        const attachment = new WatchAttachment({signals, sink: new RecordingSink(), keepAlive});
        const pending = attachment.attach(lane());
        expect(keepAlive.released).toBe(0);
        signals.fire('SIGINT');
        await pending;
        expect(keepAlive.held).toBe(1);
        expect(keepAlive.released).toBe(1);
    });

    it('never writes to the sink before attach() is called and never touches unrelated lanes', async function () {
        const sink = new RecordingSink();
        new WatchAttachment({signals: new FakeSignalSource(), sink, keepAlive: new RecordingKeepAlive()});
        expect(sink.lines).toEqual([]);
    });
});
