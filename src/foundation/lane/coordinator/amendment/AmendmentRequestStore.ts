/**
 * The durable owner of the amendment-request lifecycle (CA-27;
 * `docs/spec/coordinator-automation.md` §11.2 "`request-pack-amendment` is
 * permitted only for an operator-session/amendment envelope and maps to a
 * durable handoff record/event, never a pack edit").
 *
 * `create` is the entire `effect.createAmendmentRequest` effect: a durable
 * pending record and nothing else — no pack file, no seal, no revision
 * pointer is touched here. `recordAcceptance` persists the out-of-band,
 * independently-reviewed acceptance CA-09's `checkSpecResolutionAuthority`
 * checks an `admit-pack-amendment` proposal against; this store re-checks the
 * same independence/authority flags defensively (closed input, never trusted
 * from a caller alone) but never reproduces the seal digest itself — that
 * proof is `checkSpecResolutionAuthority`'s alone. `AmendmentAdmissionService`
 * is the only caller allowed to mark a request `admitted`.
 */
import {
    AmendmentError, type AcceptedAmendmentRecord, type AmendmentRequestDocument, type AmendmentRequestRecord
} from './amendmentContracts.js';
import {readAmendmentDocument} from './amendmentPersistence.js';
import {commitAmendmentDocument} from './amendmentTransaction.js';
import type {AmendmentIdFactory} from './amendmentIdFactory.js';
import type {LaneMutationLock} from '../queue/laneMutationLock.js';
import type {QueueClock, QueueFileSystem} from '../queue/queuePorts.js';
import type {RequestPackAmendmentBody} from '../../../../contracts/proposals.js';

export interface AmendmentRequestStoreOptions {
    readonly laneDir: string;
    readonly laneId: string;
    readonly files: QueueFileSystem;
    readonly lock: LaneMutationLock;
    readonly clock: QueueClock;
    readonly ids: AmendmentIdFactory;
}

export class AmendmentRequestStore {
    constructor(private readonly options: AmendmentRequestStoreOptions) {}

    /** `effect.createAmendmentRequest`. */
    create(body: RequestPackAmendmentBody): AmendmentRequestRecord {
        if (body.packId.trim() === '') {
            throw new AmendmentError('AMENDMENT_PACK_ID_REQUIRED', 'body.packId', 'an amendment request requires a non-empty packId.');
        }
        if (body.reason.trim() === '') {
            throw new AmendmentError('AMENDMENT_REASON_REQUIRED', 'body.reason', 'an amendment request requires a non-empty reason.');
        }
        const record: AmendmentRequestRecord = Object.freeze({
            amendmentRequestId: this.options.ids.nextAmendmentRequestId(), packId: body.packId, reason: body.reason,
            requestedAt: this.options.clock.now().toISOString(), status: 'pending' as const
        });
        commitAmendmentDocument(this.transactionOptions(record.amendmentRequestId), this.load(), (current) => ({
            next: {...current, requests: Object.freeze([...current.requests, record])}, result: null
        }));
        return record;
    }

    /**
     * Persist an independently-reviewed acceptance. Re-admitting the same
     * `amendmentRequestId` with an identical record is idempotent; a *different*
     * record for an already-accepted request is refused rather than silently
     * overwriting reviewed provenance.
     */
    recordAcceptance(record: AcceptedAmendmentRecord): void {
        assertIndependent(record);
        const {amendmentRequestId} = record;
        commitAmendmentDocument(this.transactionOptions(amendmentRequestId), this.load(), (current) => {
            const request = current.requests.find((entry) => entry.amendmentRequestId === amendmentRequestId);
            if (request === undefined) {
                throw new AmendmentError('AMENDMENT_NOT_FOUND', amendmentRequestId, `no amendment request "${amendmentRequestId}" exists to accept.`);
            }
            const existing = current.accepted[amendmentRequestId];
            if (existing !== undefined) {
                if (sameRecord(existing, record)) return {next: null, result: null};
                throw new AmendmentError('AMENDMENT_ALREADY_ACCEPTED', amendmentRequestId,
                    `amendment request "${amendmentRequestId}" already carries a different accepted record.`);
            }
            const requests = current.requests.map((entry) =>
                entry.amendmentRequestId === amendmentRequestId ? {...entry, status: 'accepted' as const} : entry);
            return {
                next: {...current, requests: Object.freeze(requests), accepted: {...current.accepted, [amendmentRequestId]: record}},
                result: null
            };
        });
    }

    get(amendmentRequestId: string): AmendmentRequestRecord | undefined {
        return this.load().requests.find((entry) => entry.amendmentRequestId === amendmentRequestId);
    }

    list(): readonly AmendmentRequestRecord[] {
        return this.load().requests;
    }

    /** `ValidationContext.acceptedAmendments`'s source (CA-09 `checkSpecResolutionAuthority`). */
    acceptedAmendments(): Readonly<Record<string, AcceptedAmendmentRecord>> {
        return this.load().accepted;
    }

    /** `ValidationContext.admittedRevisions`'s source (CA-09 `checkResumePrecondition`). */
    admittedRevisions() {
        return this.load().admitted;
    }

    private load(): AmendmentRequestDocument {
        return readAmendmentDocument(this.options.laneDir, this.options.laneId, this.options.files);
    }

    private transactionOptions(subject: string) {
        return {
            laneDir: this.options.laneDir, laneId: this.options.laneId, files: this.options.files,
            lock: this.options.lock, subject
        };
    }
}

function assertIndependent(record: AcceptedAmendmentRecord): void {
    if (record.committed !== true || record.verdict !== 'accept' || record.reviewerRole !== 'reviewer' || record.independent !== true) {
        throw new AmendmentError('AMENDMENT_INDEPENDENCE_VIOLATION', record.amendmentRequestId,
            'an accepted amendment record must be a committed, independent, reviewer-role acceptance.');
    }
    if (record.reviewerSessionId === record.authorSessionId) {
        throw new AmendmentError('AMENDMENT_INDEPENDENCE_VIOLATION', record.amendmentRequestId,
            'the accepted amendment record has no independent reviewer distinct from its author.');
    }
}

function sameRecord(left: AcceptedAmendmentRecord, right: AcceptedAmendmentRecord): boolean {
    return JSON.stringify(left) === JSON.stringify(right);
}
