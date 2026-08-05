/**
 * Initialization adapter over CA-01's accepted `PackIndexCompiler`
 * (`docs/spec/v1-contracts.md §8A.1/§8A.3`, `docs/spec/coordinator-automation.md
 * §9`). `InitPlanner`'s (LC-01, accepted) `deferred` list marks the
 * `'seal-bound pack index'` artifact as LC-09-owned: init planning never adds
 * `coordinator/index/` to its materialized directory list, and LC-05's
 * `buildCoordinatorBaseline` stops at `coordinator/cycles/` and the journal
 * files — it never touches the index tree either. This capsule is the sole
 * owner of the canonical `coordinator/index/pack/` path (the one place that
 * path is computed) and the sole caller of `PackIndexCompiler.compile`. It
 * holds no compile logic of its own and no independent pointer/manifest JSON
 * authority; the one effect is entirely delegated to the accepted compiler.
 */
import {join} from 'node:path';
import type {ConsumedPack} from '../../../contracts/pack.js';
import {packIndexRejection, type PackIndexCompileResult, type PackIndexRejection} from '../../../contracts/packIndex.js';
import {buildLaneFilePath} from '../../paths/index.js';
import {isUuid} from '../packSchemaFormats.js';
import {PackIndexCompiler, type PackIndexCompileDeps} from './PackIndexCompiler.js';

/** The single computed relative path every activation call resolves against `laneDir`. */
const INDEX_ROOT_RELATIVE_PATH = join('coordinator', 'index', 'pack');

export interface PackIndexActivationRequest {
    /** LC-02's accepted, sealed pack view; re-verified fresh by the compiler, not by this adapter. */
    readonly pack: ConsumedPack;
    /** Canonically authorized absolute path to the pack root. */
    readonly packRoot: string;
    /** The pack's repository-relative path, recorded as the manifest's `source.path`. */
    readonly packPath: string;
    /** The v1 lane UUID (`InitPlan.lane.id`). */
    readonly laneId: string;
    /** The lane's already-materialized directory (must already exist on disk). */
    readonly laneDir: string;
}

/**
 * The single owner of the canonical `coordinator/index/pack/` root and its
 * activation call. Resolves that root from `laneDir` through the shared
 * canonical/symlink-safe path authority (`foundation/paths/`) and delegates
 * the entire compile/verify/atomic-activation effect to the injected
 * `PackIndexCompiler`.
 */
export class InitialPackIndexActivation {
    private readonly compiler: PackIndexCompiler;

    constructor(deps: PackIndexCompileDeps) {
        this.compiler = new PackIndexCompiler(deps);
    }

    async activate(request: PackIndexActivationRequest): Promise<PackIndexCompileResult> {
        if (!isUuid(request.laneId)) {
            return packIndexRejection('PACK_INDEX_ENTITY_INVALID', request.laneId, 'The lane id must be a v1 lane UUID.');
        }
        const indexRoot = this.resolveIndexRoot(request.laneDir);
        if ('reason' in indexRoot) return indexRoot;

        return this.compiler.compile({
            pack: request.pack, packRoot: request.packRoot, packPath: request.packPath,
            laneId: request.laneId, indexRoot: indexRoot.path
        });
    }

    private resolveIndexRoot(laneDir: string): {readonly path: string} | PackIndexRejection {
        try {
            return {path: buildLaneFilePath(laneDir, INDEX_ROOT_RELATIVE_PATH)};
        } catch (error) {
            return packIndexRejection('PACK_INDEX_PATH_INVALID', laneDir,
                error instanceof Error ? error.message : 'the lane directory could not be canonicalized');
        }
    }
}
