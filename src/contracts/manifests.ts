/**
 * Closed public contracts for the managed-asset/task-profile foundation
 * (`docs/spec/v1.md` §7.5, `docs/spec/implementation/wt-runtime-distribution`
 * RT-06). `install.json` bytes are validated into `InstallManifestV1` by their
 * owning lane-lifecycle reader; this module only declares the closed shape and
 * the managed-link outcome/error surface that `ManagedAssets` produces.
 */
import type {PinnedTaskRuntimeTarget} from './taskRuntime.js';

/**
 * Stable reason codes for every managed-link refusal (RT-06). `LINK_TARGET_MISSING`
 * and `LINK_IO_UNAVAILABLE` were added in Correction 01: the accepted work brief's
 * original six conflated "target not a declared runtime-manifest asset" and
 * "permission/unexpected I/O failure" into escape/collision, which the
 * independent review found let a caller-supplied digest authorize an
 * unmanaged file. Both are distinct, stable, typed outcomes now.
 */
export const MANAGED_ASSETS_REASONS = [
    'LINK_TARGET_CHECKSUM_MISMATCH',
    'LINK_TARGET_ESCAPE',
    'LINK_TARGET_MISSING',
    'LINK_SOURCE_COLLISION',
    'LINK_SOURCE_ESCAPE',
    'LINK_NOT_MANAGED',
    'LINK_IO_UNAVAILABLE',
    'COMPATIBILITY_NAME_UNKNOWN',
    'INSTALL_MANIFEST_INVALID'
] as const;

export type ManagedAssetsReason = typeof MANAGED_ASSETS_REASONS[number];

/** Refusal raised only when a caller demands a link/compatibility guarantee. */
export class ManagedAssetsError extends Error {
    constructor(readonly reason: ManagedAssetsReason, readonly subject: string, message: string) {
        super(message);
        this.name = 'ManagedAssetsError';
    }
}

/** One `install.json.managedAssets` entry: the immutable runtime-store claim. */
export interface ManagedAssetDeclaration {
    readonly target: string;
    readonly sha256: `sha256:${string}`;
}

/**
 * The closed `install.json` shape (`docs/spec/v1.md` §7.5). v1 supports only
 * the `linked` install mode; copied runtimes and lane import are unsupported.
 */
export interface InstallManifestV1 {
    readonly schemaVersion: 1;
    readonly cliVersion: string;
    readonly runtimeVersion: string;
    readonly knowledgeVersion: string;
    readonly mode: 'linked';
    readonly taskRuntime: PinnedTaskRuntimeTarget;
    readonly managedAssets: Readonly<Record<string, ManagedAssetDeclaration>>;
}

/**
 * `'blocked'` (Correction 01, finding 4) reports an asset that planned
 * successfully on its own but was not applied because a sibling asset in the
 * same call failed planning — the whole requested set is validated before any
 * mutation, so a `'blocked'` entry is never mutated and never misleadingly
 * reported as `'created'`.
 */
export type ManagedLinkOutcome = 'created' | 'already-linked' | 'removed' | 'absent' | 'blocked' | 'error';

/** One `createLinks`/`removeLinks` per-asset result; `reason` is set only for `'error'`. */
export interface ManagedLinkResult {
    readonly assetPath: string;
    readonly outcome: ManagedLinkOutcome;
    readonly reason: ManagedAssetsReason | null;
    readonly target: string | null;
}

export type ManagedLinkFindingStatus = 'valid' | 'missing' | 'broken' | 'wrong-target' | 'checksum-mismatch';

/** One `validateLinks` per-asset finding; never mutates the inspected link. */
export interface ManagedLinkFinding {
    readonly assetPath: string;
    readonly status: ManagedLinkFindingStatus;
}

export interface ValidationResult {
    readonly ok: boolean;
    readonly findings: readonly ManagedLinkFinding[];
}
