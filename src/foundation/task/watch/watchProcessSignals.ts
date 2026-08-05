/**
 * The single injected process-signal port `WatchAttachment` uses to end
 * foreground attachment. Node delivers signal events with no arguments, so
 * this port is the one place that maps a raw `process.on('SIGINT', …)`
 * registration back to a typed signal and the one place a handler is later
 * removed by the exact same reference — the idempotent-owner pattern
 * `docs/spec/cli-session.md` §13 already documents for foreground attachments.
 *
 * A signal listener alone is a real, ref'd libuv handle, but the pinned
 * runtime's own "detected unsettled top-level await" diagnostic still exits
 * a process whose only remaining work is that listener plus a pending
 * top-level `await` (reproduced with a bare `process.on('SIGINT', …)` and no
 * `WatchAttachment` code involved). `WatchEventLoopKeepAlive` is the single
 * owner of the one explicit, cleared-on-shutdown ref'd handle that keeps the
 * process attached until interrupted — never a second daemonizing effect.
 */

export type WatchTerminationSignal = 'SIGINT' | 'SIGTERM';

export interface WatchSignalSource {
    onSignal(handler: (signal: WatchTerminationSignal) => void): void;
    offSignal(handler: (signal: WatchTerminationSignal) => void): void;
}

export interface WatchEventLoopKeepAlive {
    /** Holds the process open; call the returned release function exactly once to let it exit. */
    hold(): () => void;
}

const KEEP_ALIVE_INTERVAL_MS = 0x40000000;

/** The production singleton: one no-op `setInterval` for the attachment's lifetime, released on shutdown. */
export const nodeEventLoopKeepAlive: WatchEventLoopKeepAlive = {
    hold(): () => void {
        const timer = setInterval(() => undefined, KEEP_ALIVE_INTERVAL_MS);
        return () => clearInterval(timer);
    }
};

const TERMINATION_SIGNALS: readonly WatchTerminationSignal[] = ['SIGINT', 'SIGTERM'];

interface SignalEmitter {
    on(signal: WatchTerminationSignal, listener: () => void): unknown;
    off(signal: WatchTerminationSignal, listener: () => void): unknown;
}

/** Builds a fresh port over any Node-shaped signal emitter; production uses `process`. */
export function createNodeWatchSignalSource(target: SignalEmitter = process): WatchSignalSource {
    const registrations = new Map<(signal: WatchTerminationSignal) => void, ReadonlyMap<WatchTerminationSignal, () => void>>();
    return {
        onSignal(handler): void {
            const wrapped = new Map(TERMINATION_SIGNALS.map((signal) => [signal, () => handler(signal)] as const));
            for (const [signal, listener] of wrapped) target.on(signal, listener);
            registrations.set(handler, wrapped);
        },
        offSignal(handler): void {
            const wrapped = registrations.get(handler);
            if (wrapped === undefined) return;
            for (const [signal, listener] of wrapped) target.off(signal, listener);
            registrations.delete(handler);
        }
    };
}

/** The production singleton over the real process; mirrors `nodeRuntimeFileSystem`-style shared ports. */
export const nodeWatchSignalSource: WatchSignalSource = createNodeWatchSignalSource();
