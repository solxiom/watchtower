/**
 * Closed contracts for the CA-01 pack-index compiler: the typed manifest
 * documents (`docs/spec/coordinator-automation.md §9.3`) and the closed reason
 * vocabulary for a compile rejection. External bytes (the re-read
 * `implementation-pack.json`) enter as `unknown` and validate into these types.
 */

export const PACK_INDEX_REASONS = [
    'PACK_INDEX_SOURCE_MISSING',
    'PACK_INDEX_SOURCE_UNREADABLE',
    'PACK_INDEX_SOURCE_INVALID',
    'PACK_INDEX_DIGEST_MISMATCH',
    'PACK_INDEX_SCHEMA_INVALID',
    'PACK_INDEX_ENTITY_INVALID',
    'PACK_INDEX_PATH_INVALID',
    'PACK_INDEX_INTEGRITY_FAILURE',
    'PACK_INDEX_PUBLISH_FAILED',
    'PACK_INDEX_LOCK_CONFLICT'
] as const;

export type PackIndexReason = typeof PACK_INDEX_REASONS[number];

export interface PackIndexRejection {
    readonly ok: false;
    readonly reason: PackIndexReason;
    readonly target: string;
    readonly detail: string;
}

/** The generic `$defs.derivedStoreManifest` fields plus the pack-specific extensions of §9.3. */
export interface PackIndexManifest {
    readonly schemaVersion: 1;
    readonly backend: 'sqlite';
    readonly storeKind: 'pack';
    readonly databaseSchemaVersion: number;
    readonly compilerVersion: string;
    readonly laneId: string;
    readonly packId: string;
    readonly packSealId: string;
    readonly source: {
        readonly identity: string;
        readonly checkpoint: string;
        readonly repository: string;
        readonly path: string;
        readonly manifestDigest: string;
        readonly lockDigest: string;
    };
    readonly counts: Readonly<Record<string, number>>;
    readonly semanticRoot: string;
    readonly builtAt: string;
}

/** The atomic `current.json` pointer: only index identity, no derived content. */
export interface PackIndexPointer {
    readonly indexId: string;
    readonly packSealId: string;
    readonly databaseSchemaVersion: number;
    readonly compilerVersion: string;
    readonly manifestDigest: string;
}

export interface PackIndexCompileAccepted {
    readonly ok: true;
    readonly indexId: string;
    readonly indexDir: string;
    readonly manifest: PackIndexManifest;
    readonly reused: boolean;
}

export type PackIndexCompileResult = PackIndexCompileAccepted | PackIndexRejection;

export function packIndexRejection(reason: PackIndexReason, target: string, detail: string): PackIndexRejection {
    return {ok: false, reason, target, detail};
}
