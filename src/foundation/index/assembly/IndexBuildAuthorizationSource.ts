import {readFileSync} from 'node:fs';
import {join} from 'node:path';
import type {IndexBuildAuthorization} from '../../../contracts/indexBuild.js';
import type {ProposalOrigin, ProposalType} from '../../../contracts/proposals.js';
import {PROPOSAL_ORIGINS, PROPOSAL_TYPES} from '../../../contracts/proposals.js';
import {validateProposalShape} from '../../proposal/index.js';
import type {
    AcceptedAmendmentRecord, ActiveClaim, ActiveHold, AdmittedRevisionState, BudgetState, CycleRoutingClass,
    EndpointState, EnvelopeBinding, JournalState, LaneBatchState, LaneCurrentState, OperatorSessionState,
    OriginalAssignmentRecord, PackIndexState, RoutingPolicyState, ValidationContext, WorktreeSyncRecord
} from '../../proposal/proposalValidatorContracts.js';
import {validateAuthoritativePredecessors, validateCurrentState, validatePredecessorEvidence} from '../../lane/coordinator/decisionPredecessor.js';

const CAPSULE_SCHEMA_VERSION = 1;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const DATE = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d{3})?Z$/u;
const CLASSES = ['M0', 'D1', 'D2', 'D3'] as const;

/** Durable coordinator-owned authorization input for a mutating index build. */
export interface IndexBuildAuthorizationSource { read(laneDir: string): IndexBuildAuthorization; }

/** Closed parser for the coordinator-owned capsule, including CA-10 lock-time rereads. */
export class DurableIndexBuildAuthorizationSource implements IndexBuildAuthorizationSource {
    constructor(private readonly relativePath = 'coordinator/index/index-build-authorization.json') {}

    read(laneDir: string): IndexBuildAuthorization {
        const path = join(laneDir, this.relativePath);
        return this.parse(path, readFileSync(path, 'utf8'));
    }

    private parse(path: string, text: string): IndexBuildAuthorization {
        const value = parseJson(text, path);
        const capsule = exact(value, ['schemaVersion', 'proposal', 'currentState'], 'capsule');
        number(capsule.schemaVersion, 'capsule.schemaVersion', CAPSULE_SCHEMA_VERSION);
        const proposal = validateProposalShape(capsule.proposal);
        const state = validationContext(capsule.currentState, path);
        return {proposal, currentState: state, revalidate: () => this.readFromPath(path)};
    }

    private readFromPath(path: string): {readonly proposal: unknown; readonly state: ValidationContext} {
        const capsule = exact(parseJson(readFileSync(path, 'utf8'), path), ['schemaVersion', 'proposal', 'currentState'], 'capsule');
        number(capsule.schemaVersion, 'capsule.schemaVersion', CAPSULE_SCHEMA_VERSION);
        return {proposal: validateProposalShape(capsule.proposal), state: validationContext(capsule.currentState, path)};
    }
}

function validationContext(value: unknown, path: string): ValidationContext {
    const root = exact(value, ['laneId', 'policyVersion', 'now', 'origin', 'decisionClass', 'envelope', 'laneState', 'packIndex',
        'journalState', 'routingPolicy', 'operatorSession', 'packAuthorSessionId', 'activeClaims', 'activeHolds', 'budgetState',
        'endpointState', 'acceptedAmendments', 'admittedRevisions', 'worktreeSyncRecords', 'originalAssignments',
        'predecessorEvidence', 'predecessorCurrentState', 'predecessorAcceptanceRecords'], 'currentState');
    const records = array(root.predecessorAcceptanceRecords, 'currentState.predecessorAcceptanceRecords');
    if (records.length !== 2) fail('currentState.predecessorAcceptanceRecords', 'must contain exactly two acceptance records');
    const predecessorEvidence = validatePredecessorEvidence(root.predecessorEvidence, string(root.laneId, 'currentState.laneId'));
    const predecessorCurrentState = validateCurrentState(root.predecessorCurrentState, predecessorEvidence.index.laneId);
    validateAuthoritativePredecessors(predecessorEvidence, predecessorCurrentState, records, predecessorEvidence.index.laneId);
    const state: ValidationContext = {
        laneId: string(root.laneId, 'currentState.laneId'), policyVersion: string(root.policyVersion, 'currentState.policyVersion'),
        now: date(root.now, 'currentState.now'), origin: origin(root.origin), decisionClass: routingClass(root.decisionClass),
        envelope: envelope(root.envelope), laneState: laneState(root.laneState), packIndex: packIndex(root.packIndex), journalState: journal(root.journalState),
        routingPolicy: routing(root.routingPolicy), activeClaims: claims(root.activeClaims), activeHolds: holds(root.activeHolds), budgetState: budget(root.budgetState),
        endpointState: endpoints(root.endpointState), acceptedAmendments: amendments(root.acceptedAmendments), admittedRevisions: revisions(root.admittedRevisions),
        worktreeSyncRecords: syncRecords(root.worktreeSyncRecords), originalAssignments: assignments(root.originalAssignments),
        predecessorEvidence: root.predecessorEvidence, predecessorCurrentState: root.predecessorCurrentState,
        predecessorAcceptanceRecords: [records[0], records[1]]
    };
    return {...state, ...(root.operatorSession === undefined || root.operatorSession === null ? {} : {operatorSession: operator(root.operatorSession)}),
        ...(root.packAuthorSessionId === undefined || root.packAuthorSessionId === null ? {} : {packAuthorSessionId: string(root.packAuthorSessionId, 'currentState.packAuthorSessionId')})};
}

function envelope(value: unknown): EnvelopeBinding {
    const root = exact(value, ['permittedProposalTypes', 'evidenceRefs', 'packSealId', 'manifestDigest', 'endpointCapabilityClass'], 'envelope');
    return {permittedProposalTypes: proposalTypes(root.permittedProposalTypes), evidenceRefs: strings(root.evidenceRefs, 'envelope.evidenceRefs'), packSealId: string(root.packSealId, 'envelope.packSealId'), manifestDigest: digest(root.manifestDigest, 'envelope.manifestDigest'), endpointCapabilityClass: capability(root.endpointCapabilityClass)};
}
function laneState(value: unknown): LaneCurrentState { const root = exact(value, ['snapshotDigest', 'batches'], 'laneState'); return {snapshotDigest: digest(root.snapshotDigest, 'laneState.snapshotDigest'), batches: map(root.batches, 'laneState.batches', batch)}; }
function batch(value: unknown, subject: string): LaneBatchState { const root = exact(value, ['batchId', 'status'], subject); return {batchId: string(root.batchId, `${subject}.batchId`), status: string(root.status, `${subject}.status`)}; }
function packIndex(value: unknown): PackIndexState { const root = exact(value, ['packSealId', 'activeSeal', 'manifestDigest'], 'packIndex'); return {packSealId: string(root.packSealId, 'packIndex.packSealId'), activeSeal: string(root.activeSeal, 'packIndex.activeSeal'), manifestDigest: digest(root.manifestDigest, 'packIndex.manifestDigest')}; }
function journal(value: unknown): JournalState { const root = exact(value, ['completedIdempotencyKeys'], 'journalState'); const values = strings(root.completedIdempotencyKeys, 'journalState.completedIdempotencyKeys'); if (new Set(values).size !== values.length) fail('journalState.completedIdempotencyKeys', 'must not contain duplicates'); return {completedIdempotencyKeys: new Set(values)}; }
function routing(value: unknown): RoutingPolicyState { const root = exact(value, ['activeEndpointPool'], 'routingPolicy'); return {activeEndpointPool: strings(root.activeEndpointPool, 'routingPolicy.activeEndpointPool')}; }
function operator(value: unknown): OperatorSessionState { const root = exact(value, ['sessionId', 'role', 'confirmedProposalIds'], 'operatorSession'); const role = string(root.role, 'operatorSession.role'); if (role !== 'operator' && role !== 'pack-spec-authority') fail('operatorSession.role', 'unsupported role'); return {sessionId: string(root.sessionId, 'operatorSession.sessionId'), role, confirmedProposalIds: new Set(strings(root.confirmedProposalIds, 'operatorSession.confirmedProposalIds'))}; }
function claims(value: unknown): ActiveClaim[] { return array(value, 'activeClaims').map((item, i) => { const root = exact(item, ['claimId', 'targetIds'], `activeClaims[${i}]`); return {claimId: string(root.claimId, `activeClaims[${i}].claimId`), targetIds: strings(root.targetIds, `activeClaims[${i}].targetIds`)}; }); }
function holds(value: unknown): ActiveHold[] { return array(value, 'activeHolds').map((item, i) => { const root = exact(item, ['holdId', 'scope', 'status'], `activeHolds[${i}]`); const status = string(root.status, `activeHolds[${i}].status`); if (status !== 'active' && status !== 'expired') fail(`activeHolds[${i}].status`, 'unsupported status'); return {holdId: string(root.holdId, `activeHolds[${i}].holdId`), scope: strings(root.scope, `activeHolds[${i}].scope`), status}; }); }
function budget(value: unknown): BudgetState { const root = exact(value, ['laneWideGrantedTokens', 'laneWideCeilingTokens', 'protectedReserveTokens'], 'budgetState'); return {laneWideGrantedTokens: nonnegative(root.laneWideGrantedTokens, 'budgetState.laneWideGrantedTokens'), laneWideCeilingTokens: nonnegative(root.laneWideCeilingTokens, 'budgetState.laneWideCeilingTokens'), protectedReserveTokens: nonnegative(root.protectedReserveTokens, 'budgetState.protectedReserveTokens')}; }
function endpoints(value: unknown): EndpointState[] { return array(value, 'endpointState').map((item, i) => { const root = exact(item, ['endpointId', 'capacityPoolId'], `endpointState[${i}]`); return {endpointId: string(root.endpointId, `endpointState[${i}].endpointId`), capacityPoolId: string(root.capacityPoolId, `endpointState[${i}].capacityPoolId`)}; }); }
function amendments(value: unknown): Record<string, AcceptedAmendmentRecord> { return map(value, 'acceptedAmendments', (item, subject) => { const root = exact(item, ['amendmentRequestId', 'blockerId', 'resolutionId', 'supersedesSeal', 'candidateSeal', 'parentReviewedCommit', 'newReviewedCommit', 'packAcceptanceRef', 'reviewerSessionId', 'authorSessionId', 'committed', 'verdict', 'reviewerRole', 'independent', 'changedPaths', 'changedRequirementIds', 'impactDigest', 'sealAlgorithm', 'sealVersion'], subject); if (root.committed !== true || root.verdict !== 'accept' || root.reviewerRole !== 'reviewer' || root.independent !== true) fail(subject, 'acceptance flags are invalid'); return {amendmentRequestId: string(root.amendmentRequestId, `${subject}.amendmentRequestId`), blockerId: string(root.blockerId, `${subject}.blockerId`), resolutionId: string(root.resolutionId, `${subject}.resolutionId`), supersedesSeal: string(root.supersedesSeal, `${subject}.supersedesSeal`), candidateSeal: string(root.candidateSeal, `${subject}.candidateSeal`), parentReviewedCommit: string(root.parentReviewedCommit, `${subject}.parentReviewedCommit`), newReviewedCommit: string(root.newReviewedCommit, `${subject}.newReviewedCommit`), packAcceptanceRef: string(root.packAcceptanceRef, `${subject}.packAcceptanceRef`), reviewerSessionId: string(root.reviewerSessionId, `${subject}.reviewerSessionId`), authorSessionId: string(root.authorSessionId, `${subject}.authorSessionId`), committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true, changedPaths: strings(root.changedPaths, `${subject}.changedPaths`), changedRequirementIds: strings(root.changedRequirementIds, `${subject}.changedRequirementIds`), impactDigest: string(root.impactDigest, `${subject}.impactDigest`), sealAlgorithm: string(root.sealAlgorithm, `${subject}.sealAlgorithm`), sealVersion: string(root.sealVersion, `${subject}.sealVersion`)}; }); }
function revisions(value: unknown): Record<string, AdmittedRevisionState> { return map(value, 'admittedRevisions', (item, subject) => { const root = exact(item, ['blockerId', 'activeSeal', 'requiredCommit'], subject); return {blockerId: string(root.blockerId, `${subject}.blockerId`), activeSeal: string(root.activeSeal, `${subject}.activeSeal`), requiredCommit: string(root.requiredCommit, `${subject}.requiredCommit`)}; }); }
function syncRecords(value: unknown): Record<string, WorktreeSyncRecord> { return map(value, 'worktreeSyncRecords', (item, subject) => { const root = exact(item, ['worktreeId', 'status', 'syncedRevision'], subject); const status = string(root.status, `${subject}.status`); if (status !== 'synchronized' && status !== 'stale') fail(`${subject}.status`, 'unsupported status'); return {worktreeId: string(root.worktreeId, `${subject}.worktreeId`), status, syncedRevision: string(root.syncedRevision, `${subject}.syncedRevision`)}; }); }
function assignments(value: unknown): Record<string, OriginalAssignmentRecord> { return map(value, 'originalAssignments', (item, subject) => { const root = exact(item, ['blockerId', 'workerSessionId', 'operatorSessionId', 'worktreeId', 'claimIds'], subject); return {blockerId: string(root.blockerId, `${subject}.blockerId`), workerSessionId: string(root.workerSessionId, `${subject}.workerSessionId`), operatorSessionId: string(root.operatorSessionId, `${subject}.operatorSessionId`), worktreeId: string(root.worktreeId, `${subject}.worktreeId`), claimIds: strings(root.claimIds, `${subject}.claimIds`)}; }); }

function parseJson(text: string, path: string): unknown { try { return JSON.parse(text); } catch { fail('capsule', `invalid JSON: ${path}`); } }
function exact(value: unknown, keys: readonly string[], subject: string): Record<string, unknown> { const root = record(value, subject); const actual = Object.keys(root).sort(); const expected = [...keys].sort(); if (actual.length !== expected.length || actual.some((key, i) => key !== expected[i])) fail(subject, 'contains missing, extra, or unsupported members'); return root; }
function record(value: unknown, subject: string): Record<string, unknown> { if (!isRecord(value)) fail(subject, 'must be an object'); return value; }
function array(value: unknown, subject: string): unknown[] { if (!Array.isArray(value)) fail(subject, 'must be an array'); return value; }
function map<T>(value: unknown, subject: string, parse: (value: unknown, subject: string) => T): Record<string, T> { const root = record(value, subject); const result: Record<string, T> = {}; for (const [key, item] of Object.entries(root)) result[key] = parse(item, `${subject}.${key}`); return result; }
function strings(value: unknown, subject: string): string[] { return array(value, subject).map((item, i) => string(item, `${subject}[${i}]`)); }
function string(value: unknown, subject: string): string { if (typeof value !== 'string' || value.length === 0) fail(subject, 'must be a non-empty string'); return value; }
function date(value: unknown, subject: string): string { const result = string(value, subject); if (!DATE.test(result) || Number.isNaN(Date.parse(result))) fail(subject, 'must be an RFC3339 UTC timestamp'); return result; }
type Digest = `sha256:${string}`;
function digest(value: unknown, subject: string): Digest { const result = string(value, subject); if (!isDigest(result)) fail(subject, 'must be a sha256 digest'); return result; }
function number(value: unknown, subject: string, expected?: number): number { if (typeof value !== 'number' || !Number.isSafeInteger(value)) fail(subject, 'must be a safe integer'); if (expected !== undefined && value !== expected) fail(subject, `must equal ${expected}`); return value; }
function nonnegative(value: unknown, subject: string): number { const result = number(value, subject); if (result < 0) fail(subject, 'must be non-negative'); return result; }
function proposalTypes(value: unknown): ProposalType[] { return strings(value, 'envelope.permittedProposalTypes').map((item, i) => { if (!isProposalType(item)) fail(`envelope.permittedProposalTypes[${i}]`, 'unsupported proposal type'); return item; }); }
function origin(value: unknown): ProposalOrigin { const result = string(value, 'currentState.origin'); if (!isProposalOrigin(result)) fail('currentState.origin', 'unsupported proposal origin'); return result; }
function routingClass(value: unknown): CycleRoutingClass { const result = string(value, 'currentState.decisionClass'); if (!isRoutingClass(result)) fail('currentState.decisionClass', 'unsupported decision class'); return result; }
function capability(value: unknown): EnvelopeBinding['endpointCapabilityClass'] { const result = string(value, 'envelope.endpointCapabilityClass'); if (!isCapability(result)) fail('envelope.endpointCapabilityClass', 'unsupported capability class'); return result; }
function isRecord(value: unknown): value is Record<string, unknown> { return typeof value === 'object' && value !== null && !Array.isArray(value); }
function isDigest(value: string): value is Digest { return DIGEST.test(value); }
function isProposalType(value: string): value is ProposalType { return PROPOSAL_TYPES.some(item => item === value); }
function isProposalOrigin(value: string): value is ProposalOrigin { return PROPOSAL_ORIGINS.some(item => item === value); }
function isRoutingClass(value: string): value is CycleRoutingClass { return CLASSES.some(item => item === value); }
function isCapability(value: string): value is EnvelopeBinding['endpointCapabilityClass'] { return /^C[1-5]$/u.test(value); }
function fail(subject: string, message: string): never { throw new Error(`invalid index-build authorization ${subject}: ${message}`); }
