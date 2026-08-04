/**
 * Admission-time identity for one open pack-index generation: the sidecar
 * (`index-manifest.json`) identity fields `IndexStore.openIndex` records, and
 * the exact `index_meta` row set CA-01's compiler writes for that identity
 * (`PackIndexCompiler.ts`'s `metaRows`), used to prove the stored rows still
 * agree with the sidecar that describes them before any query is queryable.
 */
import type {PackIndexManifest} from '../../../contracts/index.js';
import type {TypedRow} from '../../storage/index.js';

/** Identity facts recorded for the open generation; never a filesystem path or handle. */
export interface IndexIdentity {
    readonly indexId: string;
    readonly laneId: string;
    readonly packId: string;
    readonly packSealId: string;
    readonly manifestDigest: string;
    readonly databaseSchemaVersion: number;
    readonly compilerVersion: string;
    readonly semanticRoot: string;
    readonly builtAt: string;
}

/** The exact `index_meta` rows CA-01 writes for one manifest identity — see `PackIndexCompiler.ts`'s `metaRows`. */
export function expectedMetaRows(manifest: PackIndexManifest): ReadonlyArray<readonly [string, string]> {
    return [
        ['schemaVersion', '1'], ['backend', 'sqlite'], ['storeKind', 'pack'],
        ['databaseSchemaVersion', String(manifest.databaseSchemaVersion)], ['compilerVersion', manifest.compilerVersion],
        ['laneId', manifest.laneId], ['packId', manifest.packId], ['packSealId', manifest.packSealId],
        ['packRepository', manifest.source.repository], ['packPath', manifest.source.path],
        ['manifestDigest', manifest.source.manifestDigest], ['lockDigest', manifest.source.lockDigest]
    ];
}

export function metaRowsMatch(stored: readonly TypedRow[], expected: ReadonlyArray<readonly [string, string]>): boolean {
    if (stored.length !== expected.length) return false;
    const byKey = new Map(stored.map((row) => [row.key, row.value]));
    return expected.every(([key, value]) => byKey.get(key) === value);
}

/** Basename with no dependency on `node:path` — the index directory never carries a trailing separator. */
export function basename(path: string): string {
    const normalized = path.replace(/[/\\]+$/u, '');
    const slash = Math.max(normalized.lastIndexOf('/'), normalized.lastIndexOf('\\'));
    return slash === -1 ? normalized : normalized.slice(slash + 1);
}
