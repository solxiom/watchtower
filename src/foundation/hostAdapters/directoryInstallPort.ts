import {randomUUID as nodeRandomUUID} from 'node:crypto';
import {closeSync, fsyncSync, openSync, renameSync as nodeRenameSync, rmSync as nodeRmSync} from 'node:fs';

/** Injectable filesystem boundary for directory-install transaction/recovery proof. */
export interface DirectoryInstallPort {
    renameSync(from: string, to: string): void;
    rmSync(path: string, options?: {recursive?: boolean; force?: boolean}): void;
    syncDirectory(directory: string): void;
    randomUUID(): string;
}

const nodePort: DirectoryInstallPort = {
    renameSync: nodeRenameSync,
    rmSync: nodeRmSync,
    syncDirectory(directory: string): void {
        const fd = openSync(directory, 'r');
        try {
            fsyncSync(fd);
        } finally {
            closeSync(fd);
        }
    },
    randomUUID: () => nodeRandomUUID()
};

let activePort: DirectoryInstallPort = nodePort;

export function directoryInstallPort(): DirectoryInstallPort {
    return activePort;
}

export function setDirectoryInstallPortForTests(next: DirectoryInstallPort | null): void {
    activePort = next ?? nodePort;
}
