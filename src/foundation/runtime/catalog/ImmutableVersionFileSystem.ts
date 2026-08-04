import * as fs from 'node:fs';
import type {Dirent, Stats} from 'node:fs';

/** Narrow filesystem boundary for immutable catalog publication. */
export interface ImmutableVersionFileSystem {
    chmod(path: string, mode: number): void;
    close(descriptor: number): void;
    copyFile(source: string, destination: string): void;
    exists(path: string): boolean;
    fsync(descriptor: number): void;
    lstat(path: string): Stats;
    mkdir(path: string, options?: {recursive?: boolean; mode?: number}): string | undefined;
    open(path: string, flags: string): number;
    readdir(path: string): Dirent[];
    realpath(path: string): string;
    rename(source: string, destination: string): void;
    rmdir(path: string): void;
    stat(path: string): Stats;
    unlink(path: string): void;
    writeFile(target: string | number, data: string, options?: {flag?: string; mode?: number}): void;
}

export const nodeImmutableVersionFileSystem: ImmutableVersionFileSystem = {
    chmod: fs.chmodSync,
    close: fs.closeSync,
    copyFile: fs.copyFileSync,
    exists: fs.existsSync,
    fsync: fs.fsyncSync,
    lstat: fs.lstatSync,
    mkdir: fs.mkdirSync,
    open: fs.openSync,
    readdir: (path) => fs.readdirSync(path, {withFileTypes: true}),
    realpath: fs.realpathSync,
    rename: fs.renameSync,
    rmdir: fs.rmdirSync,
    stat: fs.statSync,
    unlink: fs.unlinkSync,
    writeFile: fs.writeFileSync
};
