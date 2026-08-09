/**
 * The `wt:hold:place`/`wt:hold:release` task orchestration (review correction
 * CA27-03: "the effect registry's declared `place-hold`/`release-hold`
 * actions have no source-backed invocation path"). Mirrors `IndexBuildTask.ts`'s
 * shape: a pure, packaging-agnostic function the `runtime-nvb` `TaskHandler`
 * calls after decoding and validating its typed request, assembling the real
 * node adapters `ScopedHoldService` needs from nothing but the request's own
 * `laneDir`/`laneId`. No new mutation path exists here — this is the one place
 * the declared `effect.placeHold`/`effect.releaseHold` actions actually reach
 * `ScopedHoldService`, the sole owner of `coordinator/holds/`.
 */
import {nodeQueueFileSystem} from '../queue/nodeQueueFileSystem.js';
import {nodeLaneMutationLock} from '../queue/laneMutationLock.js';
import {ScopedHoldService} from './ScopedHoldService.js';
import {nodeHoldIdFactory} from './holdIdFactory.js';
import type {ScopedHoldRecord} from './holdContracts.js';
import type {ProposalOrigin} from '../../../../contracts/proposals.js';

export interface PlaceHoldTaskInput {
    readonly schemaVersion: 1;
    readonly operation: 'place';
    readonly laneDir: string;
    readonly laneId: string;
    readonly scope: readonly string[];
    readonly reason: string;
    readonly expiresAt: string;
    readonly origin: ProposalOrigin;
}

export interface ReleaseHoldTaskInput {
    readonly schemaVersion: 1;
    readonly operation: 'release';
    readonly laneDir: string;
    readonly laneId: string;
    readonly holdId: string;
}

export type HoldTaskInput = PlaceHoldTaskInput | ReleaseHoldTaskInput;

export interface HoldTaskResult {
    readonly schemaVersion: 1;
    readonly applied: true;
    readonly holdId: string;
}

function serviceFor(laneDir: string, laneId: string): ScopedHoldService {
    return new ScopedHoldService({
        laneDir, laneId, files: nodeQueueFileSystem, lock: nodeLaneMutationLock(laneDir),
        clock: {now: () => new Date()}, ids: nodeHoldIdFactory
    });
}

export function runHoldEffectTask(input: HoldTaskInput): HoldTaskResult {
    const service = serviceFor(input.laneDir, input.laneId);
    if (input.operation === 'place') {
        const record: ScopedHoldRecord = service.place(
            {scope: input.scope, reason: input.reason, expiresAt: input.expiresAt}, input.origin
        );
        return {schemaVersion: 1, applied: true, holdId: record.holdId};
    }
    service.release({holdId: input.holdId});
    return {schemaVersion: 1, applied: true, holdId: input.holdId};
}
