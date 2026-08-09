/**
 * Atomic amendment admission (CA-27; `docs/spec/specification-resolution.md`
 * §6-§7, `docs/spec/coordinator-automation.md` §11.2 "`admit-pack-amendment`
 * requires recorded spec authority and independent acceptance and maps to
 * atomic pack-revision activation").
 *
 * Review correction CA27-02: a proposal-cycle's `ProposalValidator` (CA-09)
 * proves authority/independence/seal reproduction before an `admit-pack-amendment`
 * proposal is ever validated, but this service is a public admission boundary
 * in its own right, reachable independently of that cycle. It must not trust
 * that CA-09 necessarily ran; it re-proves the identical invariant set itself
 * via `assertAdmissionAuthority` (binding, committed/independent/reviewer-role
 * shape, seal reproduction, spec-authority/independence session) before ever
 * calling CA-10's accepted `activatePackRevision`, exactly once under a single
 * held lane lock, and durably records the result — so a repeated admission of
 * the same request is a no-op read of the first outcome, never a second
 * activation, and a forged-but-flag-valid candidate seal is refused before any
 * byte changes.
 *
 * Both the revision-pointer write and the amendment-request write happen
 * inside one `withLaneLock` call, because "atomic admission" means the pack
 * revision cannot switch without the request that authorized it being
 * recorded as admitted in the same commit window; splitting them would leave
 * a window where the revision is live but no durable record says why.
 *
 * Review correction CA27-05: `activatePackRevision` (CA-10) is itself an
 * atomic single-file replace — a failure there provably leaves the old
 * revision live, per its own accepted contract — but the *amendment
 * projection* write that follows it is a second, separate authoritative file.
 * If that second write fails after activation genuinely succeeded, the pack
 * is correctly live but this batch's own durable record of *why* has not
 * caught up. Rather than accept that as an untested, silently-thrown defect,
 * `admitUnderLock` first asks CA-10's own pointer — never this batch's
 * possibly-stale projection — whether this exact admission is already live
 * (`alreadyActivated`). When it is, admission skips re-invoking
 * `activatePackRevision` (redundant: CA-10's own idempotency check would
 * simply no-op it) and only repairs the owed projection write.
 *
 * Review correction CA27-06: the recovery path above still authorizes the
 * *exact request it received* — it does not treat "a pack revision matching
 * this blocker happens to be live" as authority for whatever body a caller
 * supplies. `assertAdmissionAuthority` still runs unconditionally on the
 * recovery path, with `allowAlreadyActiveSeal: true` to skip only the single
 * check that would otherwise be a false positive on a legitimate repair (the
 * candidate seal is expected to already equal the active one — that is the
 * definition of "already activated"). Every other check — full request-body
 * binding to the accepted record, committed/independent/reviewer-role shape,
 * seal reproduction, and the spec-authority session chain — still runs and
 * still refuses a tampered retry before any projection repair, exactly as it
 * does on the first-ever admission.
 */
import {activatePackRevision, readActiveRevision, type ActivePackRevision} from '../../../effect/packRevisionActivation.js';
import type {EffectClock, EffectFileSystem} from '../../../effect/effectPorts.js';
import type {AdmitPackAmendmentBody} from '../../../../contracts/proposals.js';
import {
    AmendmentError, type AcceptedAmendmentRecord, type AdmittedRevisionState, type AmendmentRequestDocument,
    type AmendmentRequestRecord
} from './amendmentContracts.js';
import {assertAdmissionAuthority, type AdmissionAuthorityContext} from './amendmentAuthority.js';
import {readAmendmentDocument, writeAmendmentDocument} from './amendmentPersistence.js';
import {queueFileSystemOver} from '../queue/nodeQueueFileSystem.js';
import type {LaneMutationLock} from '../queue/laneMutationLock.js';
import type {QueueFileSystem} from '../queue/queuePorts.js';

export interface AmendmentAdmissionServiceOptions {
    readonly laneDir: string;
    readonly laneId: string;
    readonly files: EffectFileSystem;
    readonly clock: EffectClock;
    readonly lock: LaneMutationLock;
}

export interface AdmissionRequest {
    readonly amendmentRequestId: string;
    readonly blockerId: string;
    readonly affectedWorktreeIds: readonly string[];
    /** The exact `admit-pack-amendment` proposal body — checked against the accepted record's own binding, never trusted alone. */
    readonly body: AdmitPackAmendmentBody;
    /** The narrow authority context `assertAdmissionAuthority` proves against (spec-authority session, pack-author independence, current active seal). */
    readonly authority: AdmissionAuthorityContext;
}

export class AmendmentAdmissionService {
    private readonly amendmentFiles: QueueFileSystem;

    constructor(private readonly options: AmendmentAdmissionServiceOptions) {
        this.amendmentFiles = queueFileSystemOver(options.files);
    }

    admit(request: AdmissionRequest): ActivePackRevision {
        return this.options.lock.withLaneLock(() => this.admitUnderLock(request));
    }

    private admitUnderLock(request: AdmissionRequest): ActivePackRevision {
        const {laneDir, laneId} = this.options;
        const document = readAmendmentDocument(laneDir, laneId, this.amendmentFiles);
        const found = document.requests.find((entry) => entry.amendmentRequestId === request.amendmentRequestId);
        if (found === undefined) {
            throw new AmendmentError('AMENDMENT_NOT_FOUND', request.amendmentRequestId,
                `no amendment request "${request.amendmentRequestId}" exists to admit.`);
        }
        const accepted = document.accepted[request.amendmentRequestId];
        if (accepted === undefined) {
            throw new AmendmentError('AMENDMENT_NOT_ACCEPTED', request.amendmentRequestId,
                `amendment request "${request.amendmentRequestId}" has no independently-reviewed accepted record.`);
        }
        if (accepted.blockerId !== request.blockerId || request.body.amendmentRequestId !== request.amendmentRequestId
            || request.body.blockerId !== request.blockerId) {
            throw new AmendmentError('AMENDMENT_NOT_ACCEPTED', request.amendmentRequestId,
                'the accepted amendment record or proposal body is bound to a different blocker/request.');
        }

        const alreadyActivated = readActiveRevision(laneDir, this.options.files);
        if (alreadyActivated !== null && alreadyActivated.activeSeal === accepted.candidateSeal
            && alreadyActivated.blockerId === request.blockerId) {
            // CA27-06: liveness alone is never sufficient authority for *this*
            // request — the full binding/authority chain still runs, just
            // without the now-expected already-active-seal refusal.
            assertAdmissionAuthority(accepted, request.body, request.authority, {allowAlreadyActiveSeal: true});
            if (found.status !== 'admitted') {
                this.settleProjection(document, found, request.blockerId, accepted);
            }
            return alreadyActivated;
        }

        assertAdmissionAuthority(accepted, request.body, request.authority);
        const admittedState: AdmittedRevisionState = Object.freeze({
            blockerId: request.blockerId, activeSeal: accepted.candidateSeal, requiredCommit: accepted.newReviewedCommit
        });
        const activated = activatePackRevision(
            {
                laneDir, laneId, blockerId: request.blockerId, admitted: admittedState,
                supersedesSeal: accepted.supersedesSeal, affectedWorktreeIds: request.affectedWorktreeIds
            },
            {files: this.options.files, clock: this.options.clock}
        );
        if (found.status !== 'admitted') {
            this.settleProjection(document, found, request.blockerId, accepted);
        }
        return activated;
    }

    /**
     * The owed projection write only — never re-derives `admittedState` from
     * anything but the already-accepted record, and never touches the active
     * pointer. Safe to retry indefinitely: a caller sees the identical typed
     * `AMENDMENT_STATE_WRITE_FAILED` refusal on every attempt until the
     * durable write itself succeeds, and neither `assertAdmissionAuthority`
     * nor `activatePackRevision` runs again in the meantime.
     */
    private settleProjection(
        document: AmendmentRequestDocument, found: AmendmentRequestRecord, blockerId: string, accepted: AcceptedAmendmentRecord
    ): void {
        const admittedState: AdmittedRevisionState = Object.freeze({
            blockerId, activeSeal: accepted.candidateSeal, requiredCommit: accepted.newReviewedCommit
        });
        const requests = document.requests.map((entry) =>
            entry.amendmentRequestId === found.amendmentRequestId ? {...entry, status: 'admitted' as const} : entry);
        writeAmendmentDocument(this.options.laneDir, {
            ...document, requests: Object.freeze(requests),
            admitted: {...document.admitted, [blockerId]: admittedState},
            projectionRevision: document.projectionRevision + 1
        }, this.amendmentFiles);
    }
}
