/**
 * The foreground `watch` runtime adapter (`docs/spec/v1.md` §11.4,
 * `docs/spec/nirvana-integration-architecture.md` §9): "the foreground watcher
 * … remain[s] direct application lifecycle[] rather than long-running NVB
 * task[s]." This class owns exactly that direct lifecycle — one status write,
 * one blocking wait on the injected signal port, one shutdown write — and
 * never spawns, forks, or detaches a process. Bounded mechanical sub-operations
 * (CA-13's cataloged watcher task) attach to this same lifecycle later; this
 * batch does not fabricate that behavior ahead of its owning batch.
 */
import type {DiscoveredLane} from '../../discovery/index.js';
import {
    nodeEventLoopKeepAlive, nodeWatchSignalSource,
    type WatchEventLoopKeepAlive, type WatchSignalSource, type WatchTerminationSignal
} from './watchProcessSignals.js';

export interface WatchAttachmentOutcome {
    readonly outcome: 'interrupted';
    readonly signal: WatchTerminationSignal;
}

/**
 * The one presentation port this lifecycle writes through. Foundation owns
 * only this typed interface, never a concrete writer: `docs/development/
 * engineering-and-review-standard.md` §3.1 forbids direct `process.stdout`/
 * `console.*` writes in commands and domain/foundation modules alike, and
 * requires routing through one presentation boundary using the Nirvana
 * pretty/view APIs. The concrete implementation is command-owned
 * (`src/commands/watch/watchCommandSink.ts`) and is always injected by the
 * caller; this module never falls back to a default writer.
 */
export interface WatchSink {
    write(line: string): void;
}

export interface WatchAttachmentOptions {
    readonly sink: WatchSink;
    readonly signals?: WatchSignalSource;
    readonly keepAlive?: WatchEventLoopKeepAlive;
}

export class WatchAttachment {
    private readonly signals: WatchSignalSource;
    private readonly sink: WatchSink;
    private readonly keepAlive: WatchEventLoopKeepAlive;

    constructor(options: WatchAttachmentOptions) {
        this.signals = options.signals ?? nodeWatchSignalSource;
        this.sink = options.sink;
        this.keepAlive = options.keepAlive ?? nodeEventLoopKeepAlive;
    }

    /** Attaches to the foreground for exactly one preflight-validated lane and resolves once interrupted. */
    async attach(lane: DiscoveredLane): Promise<WatchAttachmentOutcome> {
        this.sink.write(`Watching lane ${lane.slug} (${lane.laneId}). Press Ctrl-C to stop.`);
        const release = this.keepAlive.hold();
        try {
            const signal = await this.awaitTermination();
            this.sink.write(`Stopping watch (${signal}).`);
            return {outcome: 'interrupted', signal};
        } finally {
            release();
        }
    }

    private awaitTermination(): Promise<WatchTerminationSignal> {
        return new Promise((resolve) => {
            const handler = (signal: WatchTerminationSignal): void => {
                this.signals.offSignal(handler);
                resolve(signal);
            };
            this.signals.onSignal(handler);
        });
    }
}
