/** CA-12: minimal packaged-compile type stub mirroring `LaneTaskCatalog.ts`'s public surface. */
import type {PinnedTaskRuntimeTarget} from '../../../contracts/taskRuntime.js';

export declare class LaneTaskCatalog {
    private constructor();
    static open(pin: PinnedTaskRuntimeTarget, runtimeRoot: string, files: unknown): LaneTaskCatalog;
    readonly root: string;
}
