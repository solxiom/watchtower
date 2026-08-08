import type {DiscoveredLane} from '../discovery/index.js';
import type {LaneDiscoveryFileSystem} from '../discovery/index.js';
import type {RepositoryBindingInspector} from '../bindings/index.js';
import type {RepositoryBinding, WatchtowerError} from '../../contracts/index.js';
import type {DoctorCheck} from '../../contracts/index.js';

/** Full observed (schema + access/worktree/branch) bindings outcome. */
export type DoctorBindingsResult =
    | {readonly ok: true; readonly bindings: readonly RepositoryBinding[]}
    | {readonly ok: false; readonly error: WatchtowerError};

/**
 * Bindings resolution, computed exactly once per run from one file read and
 * shared read-only by dependent checks. `identity` is the closed
 * schema/manifest-identity projection (`readRepositoryBindingIdentity`) —
 * `null` only when the file itself fails that validation. `observed` layers
 * real access/worktree/branch observation on the same parsed array, never a
 * second parse, so the two can never diverge under changed/stale input.
 */
export interface DoctorBindingsResolution {
    readonly identity: readonly RepositoryBinding[] | null;
    readonly observed: DoctorBindingsResult;
}

/** Injected, read-only boundary shared by every lane-local doctor check. */
export interface DoctorLaneContext {
    readonly lane: DiscoveredLane;
    readonly markerPath: string;
    readonly configPath: string;
    readonly statePath: string;
    readonly bindingsPath: string;
    readonly bindings: DoctorBindingsResolution;
    readonly fileSystem: LaneDiscoveryFileSystem;
    readonly bindingInspector: RepositoryBindingInspector;
    readonly gitIgnored: (controlHome: string) => boolean;
    /** The doctor query's normalized environment boundary — never ambient `process.env` read inside a check. */
    readonly environment: NodeJS.ProcessEnv;
}

/**
 * One immutable, independently testable diagnostic. Most lane-local checks
 * are synchronous; the LC-10 runtime/index providers perform real async I/O
 * (installed-runtime catalog reads, pack-index SQLite verification) and
 * honestly declare that with a `Promise<DoctorCheck>` return instead of a
 * cosmetic sync wrapper.
 */
export interface DoctorCheckProvider {
    readonly id: DoctorCheck['id'];
    run(context: DoctorLaneContext): DoctorCheck | Promise<DoctorCheck>;
}
