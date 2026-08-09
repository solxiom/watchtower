/**
 * The `wt:amendment:create-request`/`wt:amendment:admit` task orchestration
 * (review correction CA27-03: "the effect registry's declared
 * `create-amendment-request`/`activate-pack-revision` actions have no
 * source-backed invocation path"). Mirrors `holdEffectTask.ts`/`IndexBuildTask.ts`:
 * a pure function the `runtime-nvb` `TaskHandler` calls after decoding and
 * validating its typed request, assembling the real node adapters
 * `AmendmentRequestStore`/`AmendmentAdmissionService` need from the request's
 * own `laneDir`/`laneId`. This is the one place the declared
 * `effect.createAmendmentRequest`/`effect.activatePackRevision` actions
 * actually reach their owning services.
 */
import {nodeQueueFileSystem} from '../queue/nodeQueueFileSystem.js';
import {nodeLaneMutationLock} from '../queue/laneMutationLock.js';
import {nodeEffectFileSystem} from '../../../effect/nodeEffectFileSystem.js';
import {AmendmentRequestStore} from './AmendmentRequestStore.js';
import {AmendmentAdmissionService} from './AmendmentAdmissionService.js';
import {nodeAmendmentIdFactory} from './amendmentIdFactory.js';
import type {AdmissionAuthorityContext} from './amendmentAuthority.js';
import type {AdmitPackAmendmentBody} from '../../../../contracts/proposals.js';

export interface CreateAmendmentRequestTaskInput {
    readonly schemaVersion: 1;
    readonly operation: 'create-request';
    readonly laneDir: string;
    readonly laneId: string;
    readonly packId: string;
    readonly reason: string;
}

export interface AdmitAmendmentTaskInput {
    readonly schemaVersion: 1;
    readonly operation: 'admit';
    readonly laneDir: string;
    readonly laneId: string;
    readonly affectedWorktreeIds: readonly string[];
    readonly body: AdmitPackAmendmentBody;
    readonly authority: AdmissionAuthorityContext;
}

export type AmendmentTaskInput = CreateAmendmentRequestTaskInput | AdmitAmendmentTaskInput;

export interface CreateAmendmentRequestTaskResult {
    readonly schemaVersion: 1;
    readonly applied: true;
    readonly amendmentRequestId: string;
}

export interface AdmitAmendmentTaskResult {
    readonly schemaVersion: 1;
    readonly applied: true;
    readonly activeSeal: string;
    readonly supersedesSeal: string | null;
    readonly requiredCommit: string;
}

export type AmendmentTaskResult = CreateAmendmentRequestTaskResult | AdmitAmendmentTaskResult;

function storeFor(laneDir: string, laneId: string): AmendmentRequestStore {
    return new AmendmentRequestStore({
        laneDir, laneId, files: nodeQueueFileSystem, lock: nodeLaneMutationLock(laneDir),
        clock: {now: () => new Date()}, ids: nodeAmendmentIdFactory
    });
}

function admissionServiceFor(laneDir: string, laneId: string): AmendmentAdmissionService {
    return new AmendmentAdmissionService({
        laneDir, laneId, files: nodeEffectFileSystem, clock: {now: () => new Date()}, lock: nodeLaneMutationLock(laneDir)
    });
}

export function runAmendmentEffectTask(input: AmendmentTaskInput): AmendmentTaskResult {
    if (input.operation === 'create-request') {
        const record = storeFor(input.laneDir, input.laneId).create({packId: input.packId, reason: input.reason});
        return {schemaVersion: 1, applied: true, amendmentRequestId: record.amendmentRequestId};
    }
    const activated = admissionServiceFor(input.laneDir, input.laneId).admit({
        amendmentRequestId: input.body.amendmentRequestId, blockerId: input.body.blockerId,
        affectedWorktreeIds: input.affectedWorktreeIds, body: input.body, authority: input.authority
    });
    return {
        schemaVersion: 1, applied: true, activeSeal: activated.activeSeal,
        supersedesSeal: activated.supersedesSeal, requiredCommit: activated.requiredCommit
    };
}
