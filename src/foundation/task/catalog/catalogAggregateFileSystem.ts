import {lstat, open, rename, unlink} from 'node:fs/promises';

export interface CatalogAggregateFileInfo {
    readonly mode: number;
    isFile(): boolean;
    isSymbolicLink(): boolean;
}

export interface CatalogAggregateFileHandle {
    writeFile(bytes: Uint8Array): Promise<void>;
    chmod(mode: number): Promise<void>;
    sync(): Promise<void>;
    close(): Promise<void>;
}

export interface CatalogAggregateFileSystem {
    lstat(path: string): Promise<CatalogAggregateFileInfo>;
    open(path: string, flags: string, mode?: number): Promise<CatalogAggregateFileHandle>;
    rename(source: string, target: string): Promise<void>;
    unlink(path: string): Promise<void>;
}

export const nodeCatalogAggregateFileSystem: CatalogAggregateFileSystem = {
    lstat,
    open,
    rename,
    unlink
};
