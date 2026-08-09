/**
 * The normal CLI composition for the mutating coordinator commands (CA-25).
 *
 * Every collaborator is an accepted owner: `LaneTaskCatalog` resolves the
 * declared action from the lane's own pinned immutable runtime,
 * `NirvanaLaneTaskRunner` is the one invocation boundary, and `pinnedTarget`
 * reads the lane's runtime pin. Nothing here selects a task, relaxes a profile,
 * or substitutes a fallback when one is unavailable — the catalog's own typed
 * refusal is what an operator sees.
 *
 * The catalog is opened inside `resolveAction`, per request, so an unreadable
 * or mismatched catalog surfaces through CA-10's `resolveEffectBinding` as a
 * typed effect refusal instead of an unclassified throw, and so no catalog is
 * ever cached across lanes.
 */
import {RuntimeCatalog} from '../../../runtime/index.js';
import {LaneTaskCatalog, NirvanaLaneTaskRunner, nodeRuntimeFileSystem} from '../../../task/runtime/index.js';
import {pinnedTarget} from '../../../index/assembly/IndexBuildEffectAuthority.js';
import type {CoordinatorMutationRequest} from '../../../../contracts/coordinatorMutation.js';
import type {PinnedTaskRuntimeTarget} from '../../../../contracts/taskRuntime.js';
import {Ca10CoordinatorEffectAuthority, type CoordinatorEffectAuthority} from './CoordinatorEffectAuthority.js';
import {
    LaneCoordinatorMutationContextSource, type CoordinatorMutationRequestSource
} from './LaneCoordinatorMutationContextSource.js';

export interface CoordinatorMutationComposition {
    readonly authority: CoordinatorEffectAuthority;
    readonly requestSource: CoordinatorMutationRequestSource;
}

export function createDefaultCoordinatorMutationComposition(): CoordinatorMutationComposition {
    const catalog = new RuntimeCatalog();
    const runner = new NirvanaLaneTaskRunner({
        runtimeRoots: {resolveRuntimeRoot: (version) => catalog.getRuntimeRoot(version)}
    });
    const target = (request: CoordinatorMutationRequest): PinnedTaskRuntimeTarget =>
        pinnedTarget(request.context.laneDir, request.context.runtimeRoot);
    return {
        authority: new Ca10CoordinatorEffectAuthority({
            runner, target,
            actions: (request) => ({
                resolveAction: (actionId) => LaneTaskCatalog
                    .open(target(request), request.context.runtimeRoot, nodeRuntimeFileSystem)
                    .resolveAction(actionId)
            })
        }),
        requestSource: new LaneCoordinatorMutationContextSource({
            baseEnvironment: {path: process.env.PATH ?? '', home: process.env.HOME ?? ''}
        })
    };
}
