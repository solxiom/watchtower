import {join} from 'node:path';
import {RuntimeCatalog} from '../../runtime/index.js';
import {LaneInstallIdentityReader} from '../../read/LaneInstallIdentityReader.js';
import {NirvanaLaneTaskRunner} from '../../task/runtime/index.js';
import {resolveAcceptedPack} from './LaneAcceptedPackReader.js';
import type {AcceptedPackSource, IndexBuildRequestSource, LaneIndexBuildContextOptions} from './LaneIndexBuildContextSource.js';
import {LaneIndexBuildContextSource} from './LaneIndexBuildContextSource.js';
import {CoordinatorIndexBuildService, type IndexBuildCurrentStateReader} from './IndexBuildService.js';
import {Ca10IndexBuildEffectAuthority, pinnedTarget} from './IndexBuildEffectAuthority.js';
import {DurableIndexBuildAuthorizationSource} from './IndexBuildAuthorizationSource.js';

/** Normal CLI composition: pinned runtime runner, read-only lane context, and current-state fence. */
export function createDefaultIndexBuildComposition(): {readonly operation: CoordinatorIndexBuildService; readonly requestSource: IndexBuildRequestSource} {
    const catalog = new RuntimeCatalog();
    const runner = new NirvanaLaneTaskRunner({runtimeRoots: {resolveRuntimeRoot: (version) => catalog.getRuntimeRoot(version)}});
    const acceptedPack: AcceptedPackSource = {resolve: resolveAcceptedPack};
    const contextOptions: LaneIndexBuildContextOptions = {
        acceptedPack, baseEnvironment: {path: process.env.PATH ?? '', home: process.env.HOME ?? ''},
        runtimeIndexes: (lane) => [{databasePath: join(lane.laneDir, 'coordinator/index/runtime.sqlite'), journalPath: join(lane.laneDir, 'state/worker-events.jsonl')}]
    };
    const currentState: IndexBuildCurrentStateReader = {read: (request) => {
        const install = new LaneInstallIdentityReader().read(request.context.laneDir);
        const runtimeRoot = catalog.getRuntimeRoot(install.runtimeVersion);
        const input = request.taskInput as Record<string, unknown>;
        return {laneId: request.context.laneId, laneDir: request.context.laneDir, runtimeVersion: install.runtimeVersion,
            runtimeRoot, indexRoot: typeof input.indexRoot === 'string' ? input.indexRoot : ''};
    }};
    const effect = new Ca10IndexBuildEffectAuthority(runner, (request) => pinnedTarget(request.context.laneDir, request.context.runtimeRoot));
    return {operation: new CoordinatorIndexBuildService(runner, currentState, effect), requestSource: new LaneIndexBuildContextSource({...contextOptions,
        authorization: new DurableIndexBuildAuthorizationSource()})};
}
