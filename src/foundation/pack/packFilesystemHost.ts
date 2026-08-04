import {readdirSync, realpathSync} from 'node:fs';
import {basename, dirname, join} from 'node:path';
import {BasicStorage, DefaultDisk} from '@nirvana/commons/foundation/storage/basic';
import {authorizePath} from '../paths/index.js';
import type {PackEntry, PackFileSystem, PathAuthorization, PathKind} from './packConsumerPorts.js';

/**
 * The narrow, read-only slice of the commons `Storage` contract this adapter uses.
 * Predicate results are typed `unknown`: they are external boundary values and are
 * validated to exact booleans at every call site rather than trusted by signature.
 */
export interface PackStorage {
    readSync(fileName: string, encoding: 'buffer'): unknown;
    pathExistsSync(pathName: string): unknown;
    isSymbolicLinkSync(pathName: string): unknown;
    lStatSync(pathName: string): unknown;
}

/** Constructs a fresh root-scoped storage for one operation; no shared mutable state. */
export type PackStorageFactory = (root: string) => PackStorage;

/**
 * Default operation-scoped storage: the public `@nirvana/commons` disk facade
 * resolves against a single globally configured storage directory, so read-only
 * inspection of an arbitrary repository root uses the pinned root-scoped
 * `DefaultDisk({storagePath})` + `BasicStorage`, constructed per operation. The
 * public `BasicStorage` is adapted structurally to the narrow read-only slice —
 * no trust-boundary cast — and its outputs are validated at each call site.
 */
const defaultStorageFactory: PackStorageFactory = (root: string) => {
    const storage = new BasicStorage({name: '.', disk: new DefaultDisk({storagePath: root})});
    return {
        readSync: (fileName, encoding) => storage.readSync(fileName, encoding),
        pathExistsSync: (pathName) => storage.pathExistsSync(pathName),
        isSymbolicLinkSync: (pathName) => storage.isSymbolicLinkSync(pathName),
        lStatSync: (pathName) => storage.lStatSync(pathName)
    };
};

/** Requires an external predicate output to be an exact boolean; otherwise `null`. */
function asBoolean(value: unknown): boolean | null {
    return typeof value === 'boolean' ? value : null;
}

/** Invokes an external `lStat` predicate, requiring a callable member and an exact boolean result. */
function statBoolean(stat: unknown, method: 'isDirectory' | 'isFile'): boolean | null {
    if (typeof stat !== 'object' || stat === null) return null;
    const predicate: unknown = Reflect.get(stat, method);
    if (typeof predicate !== 'function') return null;
    const result: unknown = predicate.call(stat);
    return typeof result === 'boolean' ? result : null;
}

/**
 * Builds the filesystem adapter over an operation-scoped storage factory. Raw
 * bytes and stat/symlink come from commons `Storage` sync APIs; exact-case
 * canonical containment and typed recursive enumeration — absent from the commons
 * contract — stay in a narrow `node:fs` adapter. No module-level mutable registry
 * exists: each operation constructs its own root-scoped storage.
 */
export function createNodePackFileSystem(makeStorage: PackStorageFactory = defaultStorageFactory): PackFileSystem {
    return Object.freeze({
        readFile(absolutePath: string): Uint8Array {
            const bytes = makeStorage(dirname(absolutePath)).readSync(basename(absolutePath), 'buffer');
            if (!(bytes instanceof Uint8Array)) throw new Error('storage read returned a non-binary value');
            return bytes;
        },
        listEntries(packRoot: string): readonly PackEntry[] {
            const entries: PackEntry[] = [];
            collectEntries(packRoot, '', entries);
            return entries;
        },
        authorizeContained(repositoryRoot: string, relativePath: string, kind: PathKind): PathAuthorization {
            let resolved: string;
            try {
                resolved = authorizePath(repositoryRoot, relativePath);
            } catch {
                return 'unsafe';
            }
            // The factory, existence, symlink, realpath, and stat are external
            // boundaries: any throwing, non-boolean, or malformed value fails closed.
            try {
                const storage = makeStorage(repositoryRoot);
                const exists = asBoolean(storage.pathExistsSync(relativePath));
                if (exists === null) return 'unsafe';
                if (!exists) return 'missing';
                const symlink = asBoolean(storage.isSymbolicLinkSync(relativePath));
                if (symlink === null) return 'unsafe';
                // Narrow exact-case/canonical-containment: no commons API rejects a case
                // mismatch or a symlinked path component by canonical identity.
                if (symlink || realpathSync(resolved) !== resolved) return 'unsafe';
                const kindMatches = statBoolean(storage.lStatSync(relativePath), kind === 'directory' ? 'isDirectory' : 'isFile');
                if (kindMatches === null) return 'unsafe';
                return kindMatches ? 'ok' : 'unsafe';
            } catch {
                return 'unsafe';
            }
        }
    });
}

/** The default Node/commons filesystem adapter used by the CLI integrator. */
export const nodePackFileSystem: PackFileSystem = createNodePackFileSystem();

function collectEntries(root: string, prefix: string, entries: PackEntry[]): void {
    for (const child of readdirSync(join(root, prefix), {withFileTypes: true})) {
        const path = prefix === '' ? child.name : `${prefix}/${child.name}`;
        if (child.isSymbolicLink()) {
            entries.push({path, kind: 'symlink'});
        } else if (child.isDirectory()) {
            entries.push({path, kind: 'directory'});
            collectEntries(root, path, entries);
        } else if (child.isFile()) {
            entries.push({path, kind: 'file'});
        } else {
            entries.push({path, kind: 'other'});
        }
    }
}
