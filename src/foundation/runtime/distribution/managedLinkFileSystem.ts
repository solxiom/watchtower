/**
 * The single lane-side mutation port for managed `bin/` symlinks. Every
 * `ManagedAssets` write reaches the filesystem only through here, so no other
 * module needs `fs.symlink`/`fs.unlink` and specs never need a real lane tree.
 *
 * `NIRVANA_API_GAP:MANAGED_SYMLINK_ADAPTER` — no pinned `@nirvana/*` package
 * exposes symlink creation, reading, or removal; the pinned storage facade is
 * root-scoped file/text I/O only (the same documented gap class as
 * `runtimeFileSystem.ts`'s realpath/containment adapter). This narrow `node:fs`
 * adapter is the sole accepted bypass for that missing capability.
 *
 * Correction 01, finding 7: a missing path (`ENOENT`) and a permission/other
 * I/O failure are no longer conflated. Only `ENOENT` (and `ENOTDIR`, a missing
 * path through a non-directory component) report `'missing'`; every other
 * error rethrows the raw Node error so the planner can classify it as
 * `LINK_IO_UNAVAILABLE` rather than silently reporting an unmanaged path as
 * merely absent.
 */
import {lstatSync, mkdirSync, readlinkSync, symlinkSync, unlinkSync} from 'node:fs';
import {dirname} from 'node:path';

export type ManagedLinkSourceKind = 'missing' | 'symlink' | 'file' | 'directory' | 'other';

export interface ManagedLinkSourceObservation {
    readonly kind: ManagedLinkSourceKind;
    /** The raw (unresolved) symlink target, or `null` when not a symlink. */
    readonly linkTarget: string | null;
}

export interface ManagedLinkFileSystem {
    observeSource(path: string): ManagedLinkSourceObservation;
    ensureContainingDirectory(path: string): void;
    createSymlink(target: string, source: string): void;
    removeSymlink(path: string): void;
}

const MISSING: ManagedLinkSourceObservation = {kind: 'missing', linkTarget: null};

export const nodeManagedLinkFileSystem: ManagedLinkFileSystem = {
    observeSource(path: string): ManagedLinkSourceObservation {
        let stat;
        try {
            stat = lstatSync(path);
        } catch (error) {
            if (isMissingPath(error)) return MISSING;
            throw error;
        }
        if (stat.isSymbolicLink()) return {kind: 'symlink', linkTarget: readlinkSync(path)};
        if (stat.isFile()) return {kind: 'file', linkTarget: null};
        if (stat.isDirectory()) return {kind: 'directory', linkTarget: null};
        return {kind: 'other', linkTarget: null};
    },
    ensureContainingDirectory(path: string): void {
        mkdirSync(dirname(path), {recursive: true});
    },
    createSymlink(target: string, source: string): void {
        symlinkSync(target, source);
    },
    removeSymlink(path: string): void {
        unlinkSync(path);
    }
};

export function isMissingPath(error: unknown): boolean {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === 'ENOENT' || code === 'ENOTDIR';
}
