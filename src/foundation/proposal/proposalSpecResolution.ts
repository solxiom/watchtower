/**
 * Specification-resolution admission and resume authority — the
 * `admit-pack-amendment` and `resume-specification-blocked-session` fences
 * (`specification-resolution.md` §6-§8, `specification-resolution-batch-amendment.md`
 * §6). Extracted from `proposalPreconditions.ts` because this is a distinct
 * reason to change from ordinary lane-state/claim/budget/confirmation
 * preconditions: it enforces accepted-review provenance, replacement-seal
 * reproduction, and the original durable worker/operator-session identity a
 * resume must run under. Every function is pure — it reads
 * `DecisionProposal`/`ValidationContext` and returns `ValidationError | null`,
 * never throwing and never mutating either argument — and narrows on
 * `proposal.body.type` so each case's typed body fields are read without a cast.
 */
import type {DecisionProposal, ValidationError} from '../../contracts/index.js';
import type {ActiveHold, ValidationContext} from './proposalValidatorContracts.js';
import {semanticDigest} from '../schemaComposition/jsonCanonicalizer.js';

function error(code: ValidationError['code'], subject: string, message: string): ValidationError {
    return Object.freeze({code, subject, message});
}

/**
 * §7-§8: resume requires an admitted revision for the blocker, explicit
 * worktree-sync evidence that has ancestry to that revision — never inferred
 * from the proposal's own `syncedRevision` claim — and binding to the original
 * durable worker/operator-session/worktree/claim assignment (batch amendment §6:
 * "resume ... the same durable worker and operator-session identities", never
 * an arbitrary session target). The proposal's named `operatorSessionId` is
 * authoritatively bound to the assignment record, and any operator session
 * actually driving this resume (`context.operatorSession`) must itself be that
 * original identity — a substituted operator session is rejected. §8 permits a
 * *missing* original session to be recovered separately, so an absent driving
 * session is not itself a failure; a *different* one is.
 */
export function checkResumePrecondition(body: Extract<DecisionProposal['body'], {readonly type: 'resume-specification-blocked-session'}>, context: ValidationContext): ValidationError | null {
    if (holdActiveFor(context.activeHolds, body.blockerId)) {
        return error('PROPOSAL_PRECONDITION_FAILED', 'body.blockerId', 'blocker hold must be released by explicit worktree synchronization before resume');
    }
    const revision = context.admittedRevisions[body.blockerId];
    if (revision === undefined) {
        return error('PROPOSAL_PRECONDITION_FAILED', 'body.blockerId', 'no specification revision has been admitted for this blocker');
    }
    const sync = context.worktreeSyncRecords[body.worktreeId];
    if (sync === undefined || sync.status !== 'synchronized') {
        return error('PROPOSAL_PRECONDITION_FAILED', 'body.worktreeId', 'worktree must be explicitly synchronized before resume');
    }
    if (sync.syncedRevision !== body.syncedRevision || sync.syncedRevision !== revision.requiredCommit) {
        return error('PROPOSAL_PRECONDITION_FAILED', 'body.syncedRevision', 'synchronized revision does not have ancestry to the admitted specification revision');
    }
    const assignment = context.originalAssignments[body.blockerId];
    if (assignment === undefined || assignment.workerSessionId !== body.workerSessionId || assignment.worktreeId !== body.worktreeId) {
        return error('PROPOSAL_PRECONDITION_FAILED', 'body.workerSessionId', 'resume must target the original durable worker/session/worktree assignment for this blocker');
    }
    if (assignment.operatorSessionId !== body.operatorSessionId) {
        return error('PROPOSAL_PRECONDITION_FAILED', 'body.operatorSessionId', 'resume must name the original operator-session identity recorded for this blocker, not a substituted one');
    }
    if (context.operatorSession !== undefined && context.operatorSession.sessionId !== assignment.operatorSessionId) {
        return error('PROPOSAL_PRECONDITION_FAILED', 'operatorSession.sessionId', 'resume may only run under the original operator-session identity, never a substituted operator session');
    }
    if (!assignment.claimIds.every((claimId) => context.activeClaims.some((claim) => claim.claimId === claimId))) {
        return error('PROPOSAL_PRECONDITION_FAILED', 'body.blockerId', 'original assignment claims are no longer active — resume must preserve prior claims');
    }
    return null;
}

function holdActiveFor(holds: readonly ActiveHold[], scopeId: string): boolean {
    return holds.some((hold) => hold.status === 'active' && hold.scope.includes(scopeId));
}

/**
 * `specification-resolution.md` §6-§7: `admit-pack-amendment` is checked
 * against the accepted, independently-reviewed amendment record — never the
 * proposal body's own claims — before the confirming spec-authority session
 * and its independence from the pack author are checked. A candidate seal
 * equal to the current active seal is not a replacement and is rejected
 * outright; the record itself must be a committed, independent, `reviewer`
 * -role acceptance whose `candidateSeal` reproduces under its own declared
 * seal algorithm/version from its parent/new commits, changed paths/
 * requirements, and impact digest — never trusted as an opaque string.
 */
export function checkSpecResolutionAuthority(proposal: DecisionProposal, context: ValidationContext): ValidationError | null {
    if (proposal.body.type !== 'admit-pack-amendment') return null;
    const body = proposal.body;
    if (body.candidateSeal === context.packIndex.activeSeal) {
        return error('PROPOSAL_SEAL_INVALID', 'body.candidateSeal', 'candidate seal equals the current active seal — not a replacement');
    }
    const record = context.acceptedAmendments[body.amendmentRequestId];
    if (record === undefined) {
        return error('PROPOSAL_AUTHORITY_REQUIRED', 'body.amendmentRequestId', 'no accepted, independently-reviewed amendment record exists for this admission');
    }
    if (record.blockerId !== body.blockerId || record.resolutionId !== body.resolutionId || record.supersedesSeal !== body.supersedesSeal
        || record.candidateSeal !== body.candidateSeal || record.newReviewedCommit !== body.reviewedCommit || record.packAcceptanceRef !== body.packAcceptanceRef) {
        return error('PROPOSAL_SEAL_INVALID', 'body', 'admission does not match the accepted amendment record — forged or stale binding');
    }
    if (record.committed !== true || record.verdict !== 'accept' || record.reviewerRole !== 'reviewer' || record.independent !== true) {
        return error('PROPOSAL_AUTHORITY_REQUIRED', 'body.amendmentRequestId', 'accepted amendment record is not a committed independent reviewer acceptance');
    }
    if (record.reviewerSessionId === record.authorSessionId) {
        return error('PROPOSAL_INDEPENDENCE_VIOLATION', 'body.amendmentRequestId', 'the accepted amendment record has no independent reviewer distinct from its author');
    }
    const reproducedSeal = semanticDigest({
        sealAlgorithm: record.sealAlgorithm, sealVersion: record.sealVersion,
        parentReviewedCommit: record.parentReviewedCommit, newReviewedCommit: record.newReviewedCommit,
        changedPaths: [...record.changedPaths], changedRequirementIds: [...record.changedRequirementIds],
        impactDigest: record.impactDigest
    });
    if (reproducedSeal !== record.candidateSeal) {
        return error('PROPOSAL_SEAL_INVALID', 'body.candidateSeal', 'candidate seal does not reproduce from the accepted record\'s declared algorithm/version and provenance');
    }
    const session = context.operatorSession;
    if (session === undefined || session.role !== 'pack-spec-authority') {
        return error('PROPOSAL_AUTHORITY_REQUIRED', 'operatorSession.role', 'admit-pack-amendment requires the recorded pack/spec-authority role');
    }
    if (body.specAuthoritySessionId !== session.sessionId) {
        return error('PROPOSAL_AUTHORITY_REQUIRED', 'body.specAuthoritySessionId', 'confirming session must be the recorded spec-authority session');
    }
    if (context.packAuthorSessionId !== undefined && context.packAuthorSessionId === session.sessionId) {
        return error('PROPOSAL_INDEPENDENCE_VIOLATION', 'body.specAuthoritySessionId', 'spec-authority session must differ from the pack-author session');
    }
    return null;
}
