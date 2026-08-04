import {lstatSync} from 'node:fs';

export type UpgradePathKind = 'missing' | 'regular' | 'directory' | 'symlink' | 'other';
export interface UpgradeFileSystem { readonly inspect: (path: string) => UpgradePathKind; }

export const nodeUpgradeFileSystem: UpgradeFileSystem = Object.freeze({
    inspect(path: string): UpgradePathKind {
        try {
            const stat = lstatSync(path);
            if (stat.isSymbolicLink()) return 'symlink';
            if (stat.isFile()) return 'regular';
            if (stat.isDirectory()) return 'directory';
            return 'other';
        } catch (error) {
            if (isMissing(error)) return 'missing';
            throw error;
        }
    }
});

function isMissing(error: unknown): boolean {
    return typeof error === 'object' && error !== null && 'code' in error && error.code === 'ENOENT';
}
