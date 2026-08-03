/**
 * The single read-only observation port for packaged runtime bytes and the
 * effective OS account. Every lane task runtime decision that depends on a
 * filesystem fact — canonical identity, kind, permission, digest — asks this
 * port, so no runtime module reaches for `node:fs` on its own and specs never
 * need real permission bits or a real installed runtime.
 *
 * The node implementation uses `node:fs` directly: the pinned Nirvana storage
 * facade is root-scoped and exposes neither effective-account access probing
 * nor `realpath`-based containment (`nirvana-integration-architecture.md` §4.3
 * names canonicalization/containment and exact mode preservation as adapter
 * work). That is a documented, already-accepted adapter boundary, not license
 * to spread filesystem calls through the capability.
 */
import {createHash} from 'node:crypto';
import {accessSync, constants, lstatSync, readFileSync, realpathSync} from 'node:fs';

export type RuntimePathKind = 'file' | 'directory' | 'other' | 'missing';

export interface RuntimePathObservation {
    readonly kind: RuntimePathKind;
    /** Fully resolved path, or `''` when the path does not resolve. */
    readonly canonicalPath: string;
    /** Whether any executable bit is set on the resolved entry. */
    readonly executable: boolean;
    /** Permission bits of the resolved entry, or `null` when unresolved. */
    readonly mode: number | null;
    /** Owning OS account of the resolved entry, or `null` when unresolved. */
    readonly owner: RuntimeAccount | null;
}

export interface RuntimeAccount {
    readonly uid: number;
    readonly gid: number;
}

export interface RuntimeFileSystem {
    observe(path: string): RuntimePathObservation;
    isReadable(path: string): boolean;
    isWritable(path: string): boolean;
    isTraversable(path: string): boolean;
    /** Bounded text read; `null` when unreadable or larger than `maxBytes`. */
    readText(path: string, maxBytes: number): string | null;
    digest(path: string): `sha256:${string}` | null;
    account(): RuntimeAccount;
}

const MISSING: RuntimePathObservation = {
    kind: 'missing', canonicalPath: '', executable: false, mode: null, owner: null
};

export const nodeRuntimeFileSystem: RuntimeFileSystem = {
    observe(path: string): RuntimePathObservation {
        try {
            const canonicalPath = realpathSync(path);
            const stat = lstatSync(canonicalPath);
            const mode = stat.mode & 0o7777;
            return {
                kind: stat.isFile() ? 'file' : stat.isDirectory() ? 'directory' : 'other',
                canonicalPath,
                executable: (mode & 0o111) !== 0,
                mode,
                owner: {uid: stat.uid, gid: stat.gid}
            };
        } catch {
            return MISSING;
        }
    },
    isReadable: (path) => permitted(path, constants.R_OK),
    isWritable: (path) => permitted(path, constants.W_OK),
    isTraversable: (path) => permitted(path, constants.X_OK),
    readText(path: string, maxBytes: number): string | null {
        try {
            const bytes = readFileSync(path);
            return bytes.byteLength > maxBytes ? null : bytes.toString('utf8');
        } catch {
            return null;
        }
    },
    digest(path: string): `sha256:${string}` | null {
        try {
            return `sha256:${createHash('sha256').update(readFileSync(path)).digest('hex')}`;
        } catch {
            return null;
        }
    },
    account: () => ({uid: process.getuid?.() ?? -1, gid: process.getgid?.() ?? -1})
};

function permitted(path: string, mode: number): boolean {
    try {
        accessSync(path, mode);
        return true;
    } catch {
        return false;
    }
}
