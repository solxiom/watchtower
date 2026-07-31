/**
 * Composition root for the derived read-model substrate.
 *
 * `openDerivedStorage` is the single authorized owner of filesystem-location and
 * lock-path selection: it is rooted once at an already-authorized lane index
 * directory (mirroring the Nirvana storage composition-root pattern in
 * `nirvana-integration-architecture.md §4.3`). Domain consumers then address the
 * three §8A stores by kind and receive only the typed `DerivedStore` /
 * `RebuildResult` capabilities — never a filesystem path, lock path, driver, or
 * SQL surface.
 */
import {createSqliteConfig} from './SqliteConfig.js';
import {openDerivedStore} from './derivedSqliteStore.js';
import {rebuildStore} from './SqliteRebuilder.js';
import type {
    DerivedStorage,
    DerivedStorageOpenOptions,
    DerivedStore,
    DerivedStoreKind,
    DerivedStoreSchema,
    DerivedStoreWriter,
    RebuildResult
} from './sqlitePorts.js';

class DerivedStorageRoot implements DerivedStorage {
    constructor(private readonly root: string) {}

    open(kind: DerivedStoreKind, schema: DerivedStoreSchema, options: DerivedStorageOpenOptions = {}): Promise<DerivedStore> {
        return openDerivedStore(
            {root: this.root, name: kind},
            schema,
            createSqliteConfig({readOnly: options.readOnly === true}),
            {create: options.create === true, lockTimeoutMs: options.lockTimeoutMs}
        );
    }

    rebuild(
        kind: DerivedStoreKind,
        schema: DerivedStoreSchema,
        populate: (writer: DerivedStoreWriter) => Promise<void>,
        lockTimeoutMs?: number
    ): Promise<RebuildResult> {
        return rebuildStore({location: {root: this.root, name: kind}, schema, populate, lockTimeoutMs});
    }
}

/** Create a derived-storage composition root at an authorized lane index root. */
export function openDerivedStorage(root: string): DerivedStorage {
    return new DerivedStorageRoot(root);
}
