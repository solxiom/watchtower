import {createNodeWatchSignalSource, nodeEventLoopKeepAlive, type WatchTerminationSignal} from '../../src/foundation/task/watch/index.js';

class FakeSignalEmitter {
    readonly listeners = new Map<WatchTerminationSignal, Set<() => void>>([['SIGINT', new Set()], ['SIGTERM', new Set()]]);

    on(signal: WatchTerminationSignal, listener: () => void): void {
        this.listeners.get(signal)!.add(listener);
    }

    off(signal: WatchTerminationSignal, listener: () => void): void {
        this.listeners.get(signal)!.delete(listener);
    }

    emit(signal: WatchTerminationSignal): void {
        for (const listener of [...this.listeners.get(signal)!]) listener();
    }

    totalListeners(): number {
        return [...this.listeners.values()].reduce((sum, set) => sum + set.size, 0);
    }
}

describe('createNodeWatchSignalSource', function () {
    it('registers both SIGINT and SIGTERM for one handler and delivers the exact typed signal', function () {
        const emitter = new FakeSignalEmitter();
        const source = createNodeWatchSignalSource(emitter);
        const received: WatchTerminationSignal[] = [];
        source.onSignal((signal) => received.push(signal));

        expect(emitter.totalListeners()).toBe(2);
        emitter.emit('SIGINT');
        expect(received).toEqual(['SIGINT']);
    });

    it('removes exactly the registered handler on offSignal, leaving no listeners behind', function () {
        const emitter = new FakeSignalEmitter();
        const source = createNodeWatchSignalSource(emitter);
        const handler = (): void => undefined;
        source.onSignal(handler);
        expect(emitter.totalListeners()).toBe(2);

        source.offSignal(handler);
        expect(emitter.totalListeners()).toBe(0);
    });

    it('is a no-op when offSignal is called for a handler that was never registered', function () {
        const emitter = new FakeSignalEmitter();
        const source = createNodeWatchSignalSource(emitter);
        expect(() => source.offSignal(() => undefined)).not.toThrow();
        expect(emitter.totalListeners()).toBe(0);
    });

    it('keeps two independently registered handlers from clobbering each other', function () {
        const emitter = new FakeSignalEmitter();
        const source = createNodeWatchSignalSource(emitter);
        const first: WatchTerminationSignal[] = [];
        const second: WatchTerminationSignal[] = [];
        const handlerA = (signal: WatchTerminationSignal): void => { first.push(signal); };
        const handlerB = (signal: WatchTerminationSignal): void => { second.push(signal); };
        source.onSignal(handlerA);
        source.onSignal(handlerB);
        source.offSignal(handlerA);
        emitter.emit('SIGTERM');

        expect(first).toEqual([]);
        expect(second).toEqual(['SIGTERM']);
        expect(emitter.totalListeners()).toBe(2);
    });
});

describe('nodeEventLoopKeepAlive', function () {
    it('returns a release function that is safe to call more than once', function () {
        const release = nodeEventLoopKeepAlive.hold();
        expect(() => { release(); release(); }).not.toThrow();
    });

    it('holds an independent handle per call, each released by its own returned function', function () {
        const releaseFirst = nodeEventLoopKeepAlive.hold();
        const releaseSecond = nodeEventLoopKeepAlive.hold();
        expect(() => { releaseFirst(); releaseSecond(); }).not.toThrow();
    });
});
