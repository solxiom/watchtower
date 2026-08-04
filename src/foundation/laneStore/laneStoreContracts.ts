/**
 * Closed public shapes for the lane store foundation (`docs/spec/v1.md` §7.2,
 * LC-03). `InitPlan` (LC-01, accepted) carries no `initiativeId`, no
 * `cliVersion`/`knowledgeVersion`, and no verified task-runtime pin — those
 * are `ConsumedPack` (LC-02), release, and RT-06 `LaneTaskProfileInstaller`
 * facts respectively, so every generator that needs them takes an explicit
 * caller-supplied input instead of reading it ambiently. This keeps every
 * function in this capsule a pure, side-effect-free planning step.
 */
import type {ConsumedPack} from '../../contracts/pack.js';
import type {InitPlan} from '../init/index.js';
import type {PinnedTaskRuntimeTarget} from '../../contracts/taskRuntime.js';

/** One regular file to materialize inside the lane directory. */
export interface LaneFile {
    readonly path: string;
    readonly content: string | Buffer;
    readonly mode?: number;
}

/** One managed symlink from a lane-relative `bin/` entrypoint to the immutable runtime store. */
export interface LaneManagedLink {
    readonly path: string;
    readonly target: string;
    readonly sha256?: `sha256:${string}`;
}

/** The complete, side-effect-free plan `TransactionalWriter.commitLane` materializes atomically. */
export interface LaneLayout {
    readonly laneDir: string;
    readonly dirs: readonly string[];
    readonly files: readonly LaneFile[];
    readonly links: readonly LaneManagedLink[];
}

/** One declared managed asset from the packaged, checksum-verified runtime store. */
export interface RuntimeAssetRef {
    readonly path: string;
    readonly sha256: `sha256:${string}`;
}

/** Release/runtime facts `install.json` requires that `InitPlan` does not carry. */
export interface InstallManifestInputs {
    readonly cliVersion: string;
    readonly knowledgeVersion: string;
    readonly taskRuntime: PinnedTaskRuntimeTarget;
}

/** The complete input set `buildLaneLayout` needs to assemble every owned lane file. */
export interface LaneLayoutInputs {
    readonly plan: InitPlan;
    readonly pack: ConsumedPack;
    readonly runtimeRefs: readonly RuntimeAssetRef[];
    readonly install: InstallManifestInputs;
}
