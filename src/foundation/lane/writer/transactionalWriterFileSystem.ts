/**
 * The single async filesystem port `TransactionalWriter` uses for every
 * staging mutation. Every method performs real `node:fs/promises` I/O — no
 * method here is a synchronous call wrapped in a resolved promise — so the
 * public `commitLane`/`rollbackStaging` contracts stay honestly async.
 */
import {
    lstat as fsLstat,
    mkdir as fsMkdir,
    mkdtemp as fsMkdtemp,
    open as fsOpen,
    readFile as fsReadFile,
    rename as fsRename,
    rm as fsRm,
    symlink as fsSymlink
} from 'node:fs/promises';

export interface TransactionalWriterFileHandle {
    write(content: string | Buffer): Promise<void>;
    sync(): Promise<void>;
    close(): Promise<void>;
}

export interface TransactionalWriterFileSystem {
    mkdtemp(prefix: string): Promise<string>;
    mkdir(path: string): Promise<void>;
    open(path: string, mode: number): Promise<TransactionalWriterFileHandle>;
    readFile(path: string): Promise<Buffer>;
    symlink(target: string, path: string): Promise<void>;
    rename(source: string, destination: string): Promise<void>;
    rm(path: string): Promise<void>;
    syncDirectory(path: string): Promise<void>;
    exists(path: string): Promise<boolean>;
}

export const nodeTransactionalWriterFileSystem: TransactionalWriterFileSystem = {
    mkdtemp: (prefix) => fsMkdtemp(prefix),
    mkdir: (path) => fsMkdir(path, {recursive: true}).then(() => undefined),
    async open(path, mode) {
        const handle = await fsOpen(path, 'wx', mode);
        return {
            write: (content) => handle.writeFile(content).then(() => undefined),
            sync: () => handle.sync(),
            close: () => handle.close()
        };
    },
    readFile: (path) => fsReadFile(path),
    symlink: (target, path) => fsSymlink(target, path),
    rename: (source, destination) => fsRename(source, destination),
    rm: (path) => fsRm(path, {recursive: true, force: true}),
    async syncDirectory(path) {
        const handle = await fsOpen(path, 'r');
        try {
            await handle.sync();
        } finally {
            await handle.close();
        }
    },
    async exists(path) {
        try {
            await fsLstat(path);
            return true;
        } catch {
            return false;
        }
    }
};
