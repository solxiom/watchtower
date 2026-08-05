/**
 * The single low-level mutation/observation port for `UpgradeApply` and
 * `UpgradeRecovery`. Every temp-write, fsync, atomic rename, and directory
 * scan the atomic apply/recovery sequence performs reaches the filesystem
 * only through here, so the crash-point sequencing lives in one place and
 * specs can inject a fault at an exact step without a real crash.
 *
 * `NIRVANA_API_GAP:UPGRADE_ATOMIC_STAGING_ADAPTER` — no pinned `@nirvana/*`
 * package exposes fsync or atomic rename; the pinned storage facade is
 * root-scoped file/text I/O only (the same documented gap class as
 * `runtimeFileSystem.ts` and `managedLinkFileSystem.ts`). This narrow
 * `node:fs` adapter is the sole accepted bypass for that missing capability,
 * scoped to the install-pointer/store boundary this batch owns. Symlink
 * creation itself is never duplicated here: the managed-asset architecture
 * gate confines every low-level link-creation call in `src/` to RT-06's
 * link-filesystem adapter, so this port delegates staging's link write to
 * `nodeManagedLinkFileSystem.createSymlink`, passing the staging temp path
 * as its `source` argument — that primitive is generic over any source path,
 * not only a managed lane `bin/` target.
 */
import {createHash} from 'node:crypto';
import {
    closeSync, existsSync, fsyncSync, lstatSync, mkdirSync, openSync, readdirSync, readFileSync,
    readlinkSync, renameSync, unlinkSync, writeSync
} from 'node:fs';
import {basename, dirname, join} from 'node:path';
import {nodeManagedLinkFileSystem} from '../runtime/index.js';

/** Predictable staging suffix a crash-recovery scan can glob for (Recovery owns detection, not this module). */
export const STAGING_SUFFIX = '.wt-upgrade.tmp';
export const INSTALL_STAGING_SUFFIX = '.wt-upgrade-install.tmp';

/** Temp path adjacent to a managed `bin/` link's target, same directory for atomic rename. */
export function stagingTempPath(sourcePath: string): string {
    return join(dirname(sourcePath), `.${basename(sourcePath)}${STAGING_SUFFIX}`);
}

/** Temp path adjacent to `install.json`, same directory for atomic rename. */
export function installStagingTempPath(installJsonPath: string): string {
    return join(dirname(installJsonPath), `.${basename(installJsonPath)}${INSTALL_STAGING_SUFFIX}`);
}

export type UpgradeLinkKind = 'missing' | 'symlink' | 'file' | 'directory' | 'other';

export interface UpgradeLinkObservation {
    readonly kind: UpgradeLinkKind;
    readonly target: string | null;
}

export interface UpgradeApplyFileSystem {
    inspectLink(path: string): UpgradeLinkObservation;
    digestFile(path: string): `sha256:${string}` | null;
    ensureDirectory(dir: string): void;
    createSymlinkAt(target: string, linkPath: string): void;
    renameAtomic(fromPath: string, toPath: string): void;
    removeIfExists(path: string): void;
    fsyncDirectory(dir: string): void;
    writeFileExclusive(path: string, text: string): void;
    listDirectory(dir: string): readonly string[];
}

const MISSING: UpgradeLinkObservation = {kind: 'missing', target: null};

export const nodeUpgradeApplyFileSystem: UpgradeApplyFileSystem = Object.freeze({
    inspectLink(path: string): UpgradeLinkObservation {
        let stat;
        try {
            stat = lstatSync(path);
        } catch (error) {
            if (isMissing(error)) return MISSING;
            throw error;
        }
        if (stat.isSymbolicLink()) return {kind: 'symlink', target: readlinkSync(path)};
        if (stat.isFile()) return {kind: 'file', target: null};
        if (stat.isDirectory()) return {kind: 'directory', target: null};
        return {kind: 'other', target: null};
    },
    digestFile(path: string): `sha256:${string}` | null {
        try {
            return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
        } catch {
            return null;
        }
    },
    ensureDirectory(dir: string): void {
        mkdirSync(dir, {recursive: true});
    },
    createSymlinkAt(target: string, linkPath: string): void {
        nodeManagedLinkFileSystem.createSymlink(target, linkPath);
    },
    renameAtomic(fromPath: string, toPath: string): void {
        renameSync(fromPath, toPath);
    },
    removeIfExists(path: string): void {
        try { unlinkSync(path); } catch (error) { if (!isMissing(error)) throw error; }
    },
    fsyncDirectory(dir: string): void {
        const fd = openSync(dir, 'r');
        try { fsyncSync(fd); } finally { closeSync(fd); }
    },
    writeFileExclusive(path: string, text: string): void {
        const fd = openSync(path, 'wx', 0o644);
        try {
            writeSync(fd, text);
            fsyncSync(fd);
        } finally {
            closeSync(fd);
        }
    },
    listDirectory(dir: string): readonly string[] {
        if (!existsSync(dir)) return [];
        try { return readdirSync(dir); } catch { return []; }
    }
});

function isMissing(error: unknown): boolean {
    const code = (error as NodeJS.ErrnoException | undefined)?.code;
    return code === 'ENOENT' || code === 'ENOTDIR';
}
