import {randomUUID} from 'node:crypto';
import {closeSync, fsyncSync, mkdirSync, openSync, renameSync, rmSync, writeSync} from 'node:fs';
import {dirname} from 'node:path';
import {buildLaneFilePath} from '../../paths/index.js';
import {
    renderWatchHeartbeatFileContent,
    WATCH_HEARTBEAT_RELATIVE_PATH,
    type WatchHeartbeatWriter
} from './watchHeartbeatContracts.js';

export interface NodeWatchHeartbeatWriterDeps {
    readonly mkdirSync: typeof mkdirSync;
    readonly openSync: typeof openSync;
    readonly writeSync: typeof writeSync;
    readonly fsyncSync: typeof fsyncSync;
    readonly closeSync: typeof closeSync;
    readonly renameSync: typeof renameSync;
    readonly rmSync: typeof rmSync;
    readonly fsyncDirectory: (directory: string) => void;
    readonly pid: () => number;
    readonly now: () => number;
    readonly uniqueSuffix: () => string;
}

function fsyncDirectory(directory: string): void {
    const fd = openSync(directory, 'r');
    try {
        fsyncSync(fd);
    } finally {
        closeSync(fd);
    }
}

function isExistError(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error &&
        (error as NodeJS.ErrnoException).code === 'EEXIST';
}

function buildTemporaryPath(target: string, deps: NodeWatchHeartbeatWriterDeps): string {
    return `${target}.tmp-${deps.pid().toString(16)}-${deps.now().toString(16)}-${deps.uniqueSuffix()}`;
}

function openOwnedTemporary(deps: NodeWatchHeartbeatWriterDeps, target: string): {temporary: string; fd: number} {
    for (;;) {
        const temporary = buildTemporaryPath(target, deps);
        try {
            return {temporary, fd: deps.openSync(temporary, 'wx', 0o644)};
        } catch (error) {
            if (isExistError(error)) continue;
            throw error;
        }
    }
}

export const defaultNodeWatchHeartbeatWriterDeps: NodeWatchHeartbeatWriterDeps = {
    mkdirSync,
    openSync,
    writeSync,
    fsyncSync,
    closeSync,
    renameSync,
    rmSync,
    fsyncDirectory,
    pid: () => process.pid,
    now: () => Date.now(),
    uniqueSuffix: () => randomUUID()
};

/** Atomic lane-state heartbeat persistence — the only place this batch writes the file. */
export function createNodeWatchHeartbeatWriter(
    deps: NodeWatchHeartbeatWriterDeps = defaultNodeWatchHeartbeatWriterDeps
): WatchHeartbeatWriter {
    return {
        write(laneDir: string, timestamp: string): void {
            const target = buildLaneFilePath(laneDir, WATCH_HEARTBEAT_RELATIVE_PATH);
            deps.mkdirSync(dirname(target), {recursive: true});
            const content = renderWatchHeartbeatFileContent(timestamp);
            let ownedTemporary: string | undefined;
            let renamed = false;
            try {
                const opened = openOwnedTemporary(deps, target);
                ownedTemporary = opened.temporary;
                try {
                    deps.writeSync(opened.fd, content);
                    deps.fsyncSync(opened.fd);
                } finally {
                    deps.closeSync(opened.fd);
                }
                deps.renameSync(opened.temporary, target);
                renamed = true;
                ownedTemporary = undefined;
                deps.fsyncDirectory(dirname(target));
            } catch (error) {
                if (ownedTemporary !== undefined && !renamed) {
                    deps.rmSync(ownedTemporary, {force: true});
                }
                throw error;
            }
        }
    };
}

export const nodeWatchHeartbeatWriter: WatchHeartbeatWriter = createNodeWatchHeartbeatWriter();
