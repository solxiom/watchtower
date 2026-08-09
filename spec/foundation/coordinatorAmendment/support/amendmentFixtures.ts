import {mkdtempSync, rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {nodeQueueFileSystem} from '../../../../src/foundation/lane/coordinator/queue/nodeQueueFileSystem.js';
import {nodeLaneMutationLock, type LaneMutationLock} from '../../../../src/foundation/lane/coordinator/queue/laneMutationLock.js';
import type {QueueClock, QueueFileSystem} from '../../../../src/foundation/lane/coordinator/queue/queuePorts.js';
import {nodeEffectFileSystem} from '../../../../src/foundation/effect/nodeEffectFileSystem.js';
import type {EffectClock, EffectFileSystem} from '../../../../src/foundation/effect/effectPorts.js';
import {AmendmentRequestStore} from '../../../../src/foundation/lane/coordinator/amendment/AmendmentRequestStore.js';
import {AmendmentAdmissionService} from '../../../../src/foundation/lane/coordinator/amendment/AmendmentAdmissionService.js';
import type {AmendmentIdFactory} from '../../../../src/foundation/lane/coordinator/amendment/amendmentIdFactory.js';
import type {AcceptedAmendmentRecord} from '../../../../src/foundation/lane/coordinator/amendment/amendmentContracts.js';
import type {AdmissionAuthorityContext} from '../../../../src/foundation/lane/coordinator/amendment/amendmentAuthority.js';
import type {AdmitPackAmendmentBody} from '../../../../src/contracts/proposals.js';
import {
    ACTIVE_SEAL, CANDIDATE_SEAL, CHANGED_PATHS, CHANGED_REQUIREMENT_IDS, COMMIT_SHA, IMPACT_DIGEST,
    PARENT_COMMIT_SHA, SEAL_ALGORITHM, SEAL_VERSION
} from '../../proposal/support/proposalFixtures.js';

export const LANE_ID = '11111111-2222-4333-8444-555555555557';
export const NOW = '2026-08-08T00:00:00.000Z';

export function makeLaneDir(): string {
    return mkdtempSync(join(tmpdir(), 'wt-ca27-amendment-'));
}

export function removeLaneDir(laneDir: string): void {
    rmSync(laneDir, {recursive: true, force: true});
}

export const queueFiles: QueueFileSystem = nodeQueueFileSystem;
export const effectFiles: EffectFileSystem = nodeEffectFileSystem;

export function lockFor(laneDir: string): LaneMutationLock {
    return nodeLaneMutationLock(laneDir);
}

export function fixedQueueClock(at = NOW): QueueClock {
    return {now: () => new Date(at)};
}

export function fixedEffectClock(at = NOW): EffectClock {
    return {now: () => new Date(at)};
}

export function countingAmendmentIds(prefix = 'amend'): AmendmentIdFactory {
    let count = 0;
    return {nextAmendmentRequestId: () => `${prefix}-${++count}`};
}

export function storeFor(laneDir: string, at = NOW, ids: AmendmentIdFactory = countingAmendmentIds()): AmendmentRequestStore {
    return new AmendmentRequestStore({laneDir, laneId: LANE_ID, files: queueFiles, lock: lockFor(laneDir), clock: fixedQueueClock(at), ids});
}

export function admissionServiceFor(laneDir: string, at = NOW): AmendmentAdmissionService {
    return new AmendmentAdmissionService({laneDir, laneId: LANE_ID, files: effectFiles, clock: fixedEffectClock(at), lock: lockFor(laneDir)});
}

/**
 * A committed, independent, reviewer-role accepted amendment — the exact shape
 * CA-09's `checkSpecResolutionAuthority` requires. `supersedesSeal` defaults to
 * `''` because `activatePackRevision`'s own pointer file starts absent in a
 * fresh lane (`readActiveRevision` returns `null`), and its first-ever
 * activation requires exactly that supersede value (`packRevisionActivation.ts`
 * "current === null ? input.supersedesSeal !== ''"); this is a distinct
 * invariant from CA-09's own `body.supersedesSeal === context.packIndex.activeSeal`
 * precondition, which this fixture is not exercising.
 */
export function acceptedRecordFor(overrides: Partial<AcceptedAmendmentRecord> = {}): AcceptedAmendmentRecord {
    return Object.freeze({
        amendmentRequestId: 'amend-1', blockerId: 'blocker-1', resolutionId: 'res-1', supersedesSeal: '',
        candidateSeal: CANDIDATE_SEAL, parentReviewedCommit: PARENT_COMMIT_SHA, newReviewedCommit: COMMIT_SHA,
        packAcceptanceRef: 'pack-acceptance.json', reviewerSessionId: 'reviewer-1', authorSessionId: 'author-1',
        committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true,
        changedPaths: CHANGED_PATHS, changedRequirementIds: CHANGED_REQUIREMENT_IDS, impactDigest: IMPACT_DIGEST,
        sealAlgorithm: SEAL_ALGORITHM, sealVersion: SEAL_VERSION, ...overrides
    });
}

/** The `admit-pack-amendment` proposal body bound to `acceptedRecordFor()`'s defaults. */
export function admitBodyFor(overrides: Partial<AdmitPackAmendmentBody> = {}): AdmitPackAmendmentBody {
    return Object.freeze({
        amendmentRequestId: 'amend-1', blockerId: 'blocker-1', resolutionId: 'res-1', supersedesSeal: '',
        candidateSeal: CANDIDATE_SEAL, reviewedCommit: COMMIT_SHA, packAcceptanceRef: 'pack-acceptance.json',
        specAuthoritySessionId: 'authority-1', ...overrides
    });
}

/** The narrow admission-authority context `assertAdmissionAuthority` checks against, matching `acceptedRecordFor()`/`admitBodyFor()`'s defaults. */
export function authorityFor(overrides: Partial<AdmissionAuthorityContext> = {}): AdmissionAuthorityContext {
    return Object.freeze({
        operatorSession: {sessionId: 'authority-1', role: 'pack-spec-authority' as const},
        packAuthorSessionId: 'author-1', packActiveSeal: ACTIVE_SEAL, ...overrides
    });
}
