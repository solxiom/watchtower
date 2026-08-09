/**
 * Admission-time authority/independence/seal-reproduction proof (review
 * correction CA27-02).
 *
 * CA-09's accepted `checkSpecResolutionAuthority` (`proposalSpecResolution.ts`)
 * proves this exact invariant set during proposal validation, but it is wired
 * to the full per-cycle `ValidationContext` (envelope, routing policy, budget
 * state, predecessor evidence, …) that has no meaning at the narrower
 * admission boundary this service owns. Fabricating a placeholder
 * `ValidationContext` just to reach that function would be worse than a
 * focused reproduction: it would hide which fields are actually load-bearing
 * behind ~20 unused ones.
 *
 * This function instead re-applies the *same* substantive proof — binding
 * between the admission request and the accepted record, the committed/
 * independent/reviewer-role/seal-reproduction record shape, and the
 * spec-authority/independence session check — using the same shared
 * `semanticDigest` utility `checkSpecResolutionAuthority` reproduces the seal
 * with. `AmendmentRequestStore.recordAcceptance` already refuses a
 * non-independent/non-committed record at write time (defense at the write
 * boundary); this is the second, mandatory fence at the read/activation
 * boundary, because a call site that skipped `recordAcceptance`'s own checks
 * — or a record that passed those checks with a seal that does not actually
 * reproduce from its own declared provenance — must never reach
 * `activatePackRevision`.
 */
import {semanticDigest} from '../../../schemaComposition/jsonCanonicalizer.js';
import type {AdmitPackAmendmentBody} from '../../../../contracts/proposals.js';
import type {OperatorSessionRole} from '../../../proposal/proposalValidatorContracts.js';
import {AmendmentError, type AcceptedAmendmentRecord} from './amendmentContracts.js';

export interface AdmissionAuthorityContext {
    readonly operatorSession?: {
        readonly sessionId: string;
        readonly role: OperatorSessionRole;
    };
    readonly packAuthorSessionId?: string;
    /** The lane's currently active pack seal (`ValidationContext.packIndex.activeSeal`). */
    readonly packActiveSeal: string;
}

export interface AssertAdmissionAuthorityOptions {
    /**
     * Review correction CA27-06: the recovery-repair path (an admission whose
     * pack revision is *already* live, per CA-10's own pointer, and whose
     * projection write is merely catching up) legitimately re-derives a
     * `packActiveSeal` equal to `body.candidateSeal` — that is the definition
     * of "already activated", not a forged non-replacement. Every other check
     * in this function still runs unconditionally on that path: full
     * request-body binding to the accepted record, committed/independent/
     * reviewer-role shape, seal reproduction, and the spec-authority session
     * chain. Only the caller that already proved liveness from CA-10's own
     * pointer — never a caller merely claiming it — may set this.
     */
    readonly allowAlreadyActiveSeal?: boolean;
}

/**
 * Throws `AmendmentError` on any authority, binding, independence, or
 * seal-reproduction failure. A pass proves the *exact* invariant set
 * `checkSpecResolutionAuthority` proves for `admit-pack-amendment`, narrowed
 * to the fields this admission boundary actually has.
 */
export function assertAdmissionAuthority(
    record: AcceptedAmendmentRecord, body: AdmitPackAmendmentBody, context: AdmissionAuthorityContext,
    options: AssertAdmissionAuthorityOptions = {}
): void {
    if (!options.allowAlreadyActiveSeal && body.candidateSeal === context.packActiveSeal) {
        throw new AmendmentError('AMENDMENT_NOT_ACCEPTED', body.amendmentRequestId,
            'candidate seal equals the current active seal — not a replacement.');
    }
    if (record.blockerId !== body.blockerId || record.resolutionId !== body.resolutionId
        || record.supersedesSeal !== body.supersedesSeal || record.candidateSeal !== body.candidateSeal
        || record.newReviewedCommit !== body.reviewedCommit || record.packAcceptanceRef !== body.packAcceptanceRef) {
        throw new AmendmentError('AMENDMENT_NOT_ACCEPTED', body.amendmentRequestId,
            'admission does not match the accepted amendment record — forged or stale binding.');
    }
    if (record.committed !== true || record.verdict !== 'accept' || record.reviewerRole !== 'reviewer' || record.independent !== true) {
        throw new AmendmentError('AMENDMENT_NOT_ACCEPTED', body.amendmentRequestId,
            'accepted amendment record is not a committed independent reviewer acceptance.');
    }
    if (record.reviewerSessionId === record.authorSessionId) {
        throw new AmendmentError('AMENDMENT_INDEPENDENCE_VIOLATION', body.amendmentRequestId,
            'the accepted amendment record has no independent reviewer distinct from its author.');
    }
    const reproducedSeal = semanticDigest({
        sealAlgorithm: record.sealAlgorithm, sealVersion: record.sealVersion,
        parentReviewedCommit: record.parentReviewedCommit, newReviewedCommit: record.newReviewedCommit,
        changedPaths: [...record.changedPaths], changedRequirementIds: [...record.changedRequirementIds],
        impactDigest: record.impactDigest
    });
    if (reproducedSeal !== record.candidateSeal) {
        throw new AmendmentError('AMENDMENT_NOT_ACCEPTED', body.amendmentRequestId,
            'candidate seal does not reproduce from the accepted record\'s declared algorithm/version and provenance.');
    }
    const session = context.operatorSession;
    if (session === undefined || session.role !== 'pack-spec-authority') {
        throw new AmendmentError('AMENDMENT_INDEPENDENCE_VIOLATION', body.amendmentRequestId,
            'admission requires the recorded pack/spec-authority role.');
    }
    if (body.specAuthoritySessionId !== session.sessionId) {
        throw new AmendmentError('AMENDMENT_INDEPENDENCE_VIOLATION', body.amendmentRequestId,
            'confirming session must be the recorded spec-authority session.');
    }
    if (context.packAuthorSessionId !== undefined && context.packAuthorSessionId === session.sessionId) {
        throw new AmendmentError('AMENDMENT_INDEPENDENCE_VIOLATION', body.amendmentRequestId,
            'spec-authority session must differ from the pack-author session.');
    }
}
