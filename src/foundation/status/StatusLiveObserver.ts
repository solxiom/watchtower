import type {StatusWarningCode} from '../../contracts/index.js';
import {buildLaneFilePath} from '../paths/index.js';
import {observeHeartbeat, type HeartbeatObservation} from '../heartbeatObservation.js';
import {nodeLaneDiscoveryFileSystem, type LaneDiscoveryFileSystem} from '../discovery/index.js';
import {ContainedLaneReadFileStore, type LaneReadFileStore} from '../read/index.js';
import {NirvanaTmuxObserver} from '../NirvanaTmuxObserver.js';
import {observeRuntimeSessions, type RuntimeSessionNames} from '../runtimeObservations.js';

const MAX_HEARTBEAT_BYTES = 8 * 1024;
const STALE_HEARTBEAT_MS = 60_000;

export interface StatusTmuxObserver {listSessionNames(): Promise<string[]>;}
export interface StatusSessionObservation {
    readonly watcherPresent: boolean;
    readonly workerPresent: Readonly<{implementer: boolean; reviewer: boolean}>;
    readonly expected: RuntimeSessionNames | undefined;
}

export interface StatusLiveObserverOptions {
    readonly files?: LaneReadFileStore;
    readonly fileSystem?: LaneDiscoveryFileSystem;
    readonly tmuxObserver?: (cwd: string, path: string) => StatusTmuxObserver;
    readonly now?: () => Date;
}

export class StatusLiveObserver {
    private readonly files: LaneReadFileStore;
    private readonly fileSystem: LaneDiscoveryFileSystem;
    private readonly tmuxObserver: (cwd: string, path: string) => StatusTmuxObserver;
    private readonly now: () => Date;

    constructor(options: StatusLiveObserverOptions = {}) {
        this.files = options.files ?? new ContainedLaneReadFileStore();
        this.fileSystem = options.fileSystem ?? nodeLaneDiscoveryFileSystem;
        this.tmuxObserver = options.tmuxObserver ?? ((cwd, path) => new NirvanaTmuxObserver({cwd, path}));
        this.now = options.now ?? (() => new Date());
    }

    sessionNames(prefix: string | null, slug: string): RuntimeSessionNames | undefined {
        if (prefix === null) return undefined;
        const base = `${prefix}-${slug}`;
        return {watcher: `${base}-watch`, workers: {
            implementer: `${base}-implementer`, reviewer: `${base}-reviewer`
        }};
    }

    async observeSessions(cwd: string, path: string | undefined, expected: RuntimeSessionNames | undefined,
        warnings: StatusWarningCode[]): Promise<StatusSessionObservation> {
        if (path === undefined || expected === undefined) return emptySessions(expected);
        try {
            const observed = observeRuntimeSessions(await this.tmuxObserver(cwd, path).listSessionNames(), expected);
            return {...observed, expected};
        } catch {
            warnings.push('TMUX_UNAVAILABLE');
            return emptySessions(expected);
        }
    }

    observeHeartbeat(laneDir: string): HeartbeatObservation {
        return observeHeartbeat(buildLaneFilePath(laneDir, 'state/watcher-heartbeat.txt'), {
            staleAfterMs: STALE_HEARTBEAT_MS,
            now: this.now(),
            reader: {readUtf8: () => this.files.readOptional(
                laneDir, 'state/watcher-heartbeat.txt', MAX_HEARTBEAT_BYTES)}
        });
    }

    isLaneBusy(laneDir: string): boolean {
        return this.fileSystem.inspect(buildLaneFilePath(laneDir, 'state/lane.lock')) !== undefined;
    }
}

function emptySessions(expected: RuntimeSessionNames | undefined): StatusSessionObservation {
    return {watcherPresent: false, workerPresent: {implementer: false, reviewer: false}, expected};
}
