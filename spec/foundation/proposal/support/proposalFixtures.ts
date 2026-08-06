import {PROPOSAL_TYPES} from '../../../../src/contracts/index.js';
import type {DecisionProposal, ProposalOrigin, ProposalType, RequestedEffect} from '../../../../src/contracts/index.js';
import type {AcceptedAmendmentRecord, CycleRoutingClass, ValidationContext} from '../../../../src/foundation/proposal/proposalValidatorContracts.js';
import {semanticDigest} from '../../../../src/foundation/schemaComposition/jsonCanonicalizer.js';

export const SNAPSHOT_DIGEST = `sha256:${'a'.repeat(64)}`;
export const ACTIVE_SEAL = `sha256:${'b'.repeat(64)}`;
export const MANIFEST_DIGEST = `sha256:${'d'.repeat(64)}`;
export const COMMIT_SHA = '0'.repeat(40);
export const PARENT_COMMIT_SHA = '1'.repeat(40);
export const NOW = '2026-08-06T12:00:00Z';
export const FUTURE = '2026-08-06T13:00:00Z';
export const PAST = '2026-08-06T11:00:00Z';

export const SEAL_ALGORITHM = 'watchtower-pack-seal-v1';
export const SEAL_VERSION = '1';
export const CHANGED_PATHS = Object.freeze(['docs/spec/v1.md']);
export const CHANGED_REQUIREMENT_IDS = Object.freeze(['REQ-1']);
export const IMPACT_DIGEST = `sha256:${'7'.repeat(64)}`;

/** Reproduces the same seal-algorithm digest `checkSpecResolutionAuthority` recomputes — never a bare literal, so a fixture cannot silently drift from the check it exercises. */
export function reproducedCandidateSeal(overrides: Partial<Pick<AcceptedAmendmentRecord,
    'sealAlgorithm' | 'sealVersion' | 'parentReviewedCommit' | 'newReviewedCommit' | 'changedPaths' | 'changedRequirementIds' | 'impactDigest'>> = {}): string {
    return semanticDigest({
        sealAlgorithm: overrides.sealAlgorithm ?? SEAL_ALGORITHM, sealVersion: overrides.sealVersion ?? SEAL_VERSION,
        parentReviewedCommit: overrides.parentReviewedCommit ?? PARENT_COMMIT_SHA, newReviewedCommit: overrides.newReviewedCommit ?? COMMIT_SHA,
        changedPaths: [...(overrides.changedPaths ?? CHANGED_PATHS)], changedRequirementIds: [...(overrides.changedRequirementIds ?? CHANGED_REQUIREMENT_IDS)],
        impactDigest: overrides.impactDigest ?? IMPACT_DIGEST
    });
}

export const CANDIDATE_SEAL = reproducedCandidateSeal();

const ACCEPTANCE_DIGEST = `sha256:${'e'.repeat(64)}`;
const PREDECESSOR_INDEX_ID = 'index-1';
const PREDECESSOR_JOURNAL_IDENTITY = 'journal-1';

/** A valid CA-02/CA-03 predecessor-evidence document — the shape `decisionPredecessor.ts#validatePredecessorEvidence` (CA-07's owned validator, reused by CA-09) accepts. */
export function predecessorEvidenceDocument() {
    return {
        index: {state: 'accepted', indexId: PREDECESSOR_INDEX_ID, laneId: 'lane-1', revision: 4, packIndex: {packSealId: 'seal-1', manifestDigest: MANIFEST_DIGEST, compilerVersion: '1.0.0'}, acceptance: {repository: 'repo', path: 'acceptance/CA-02.json', digest: ACCEPTANCE_DIGEST, verdict: 'accept', reviewerSessionId: 'review-session-1'}},
        projections: {state: 'accepted', laneId: 'lane-1', revision: 7, journalIdentity: PREDECESSOR_JOURNAL_IDENTITY, checkpointDigest: ACCEPTANCE_DIGEST, acceptance: {repository: 'repo', path: 'acceptance/CA-03.json', digest: ACCEPTANCE_DIGEST, verdict: 'accept', reviewerSessionId: 'review-session-1'}}
    };
}

export function predecessorCurrentStateDocument() {
    return {
        index: {state: 'accepted', indexId: PREDECESSOR_INDEX_ID, laneId: 'lane-1', revision: 4, packIndex: {packSealId: 'seal-1', manifestDigest: MANIFEST_DIGEST, compilerVersion: '1.0.0'}, acceptance: {repository: 'repo', path: 'acceptance/CA-02.json', digest: ACCEPTANCE_DIGEST}},
        projections: {state: 'accepted', laneId: 'lane-1', revision: 7, journalIdentity: PREDECESSOR_JOURNAL_IDENTITY, checkpointDigest: ACCEPTANCE_DIGEST, acceptance: {repository: 'repo', path: 'acceptance/CA-03.json', digest: ACCEPTANCE_DIGEST}}
    };
}

export function predecessorAcceptanceRecord(reference: {readonly repository: string; readonly path: string; readonly digest: string}): unknown {
    const isIndex = reference.path.endsWith('CA-02.json');
    return {
        schemaVersion: 1, ...reference, committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true, reviewerSessionId: 'review-session-1',
        subjectKind: isIndex ? 'index' : 'projection', subjectId: isIndex ? PREDECESSOR_INDEX_ID : PREDECESSOR_JOURNAL_IDENTITY,
        subjectRevision: isIndex ? 4 : 7, subjectDigest: isIndex ? MANIFEST_DIGEST : ACCEPTANCE_DIGEST, packSealId: 'seal-1',
        journalIdentity: isIndex ? null : PREDECESSOR_JOURNAL_IDENTITY
    };
}

export function predecessorAcceptanceRecords(): readonly [unknown, unknown] {
    return [
        predecessorAcceptanceRecord({repository: 'repo', path: 'acceptance/CA-02.json', digest: ACCEPTANCE_DIGEST}),
        predecessorAcceptanceRecord({repository: 'repo', path: 'acceptance/CA-03.json', digest: ACCEPTANCE_DIGEST})
    ];
}

export interface FixtureDefinition {
    readonly type: ProposalType;
    readonly body: Record<string, unknown>;
    readonly effects: readonly RequestedEffect[];
    readonly origin: ProposalOrigin;
    readonly decisionClass: CycleRoutingClass;
    readonly contextOverrides?: Partial<ValidationContext>;
}

export const FIXTURES: readonly FixtureDefinition[] = Object.freeze([
    {type: 'select-ready-batch', body: {batchId: 'B1'}, effects: [{effect: 'dispatch-batch'}], origin: 'coordinator-D1', decisionClass: 'D1'},
    {type: 'classify-reject', body: {classification: 'MISSED_REQUIREMENT', findingIds: ['R-1'], strategy: 'preserve-session-correction', targetBatch: 'B1'}, effects: [], origin: 'coordinator-D2', decisionClass: 'D2'},
    {type: 'open-correction', body: {batchId: 'B1', findingIds: ['R-1']}, effects: [{effect: 'open-correction'}], origin: 'coordinator-D2', decisionClass: 'D2'},
    {type: 'select-correction-route', body: {batchId: 'B1', route: 'reassign'}, effects: [{effect: 'route-correction'}], origin: 'coordinator-D2', decisionClass: 'D2'},
    {type: 'request-reroute', body: {fromEndpointId: 'ep-1', toEndpointId: 'ep-2'}, effects: [{effect: 'reroute-endpoint'}], origin: 'coordinator-D1', decisionClass: 'D1'},
    {
        type: 'propose-reconciliation', body: {projectionId: 'proj-1', plan: 'reconcile drift'}, effects: [{effect: 'reconcile-projection'}], origin: 'coordinator-D3', decisionClass: 'D3',
        contextOverrides: {operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['prop-propose-reconciliation'])}}
    },
    {
        type: 'request-pack-amendment', body: {packId: 'pack-1', reason: 'drift'}, effects: [{effect: 'create-amendment-request'}], origin: 'coordinator-D2', decisionClass: 'D2',
        contextOverrides: {operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['prop-request-pack-amendment'])}}
    },
    {type: 'propose-specification-resolution', body: {resolutionId: 'res-1', blockerId: 'blocker-1', recommendedDecision: 'use approach X', affectedPaths: ['docs/spec/v1.md'], requiresSpecAuthority: true}, effects: [], origin: 'architect-advisor', decisionClass: 'D3'},
    {
        type: 'admit-pack-amendment',
        body: {amendmentRequestId: 'amend-1', blockerId: 'blocker-1', resolutionId: 'res-1', supersedesSeal: ACTIVE_SEAL, candidateSeal: CANDIDATE_SEAL, reviewedCommit: COMMIT_SHA, packAcceptanceRef: 'pack-acceptance.json', specAuthoritySessionId: 'authority-1'},
        effects: [{effect: 'activate-pack-revision'}], origin: 'operator', decisionClass: 'M0',
        contextOverrides: {
            operatorSession: {sessionId: 'authority-1', role: 'pack-spec-authority', confirmedProposalIds: new Set(['prop-admit-pack-amendment'])},
            packAuthorSessionId: 'author-session-1',
            acceptedAmendments: {
                'amend-1': {
                    amendmentRequestId: 'amend-1', blockerId: 'blocker-1', resolutionId: 'res-1', supersedesSeal: ACTIVE_SEAL,
                    candidateSeal: CANDIDATE_SEAL, parentReviewedCommit: PARENT_COMMIT_SHA, newReviewedCommit: COMMIT_SHA, packAcceptanceRef: 'pack-acceptance.json',
                    reviewerSessionId: 'reviewer-1', authorSessionId: 'author-session-1', committed: true, verdict: 'accept', reviewerRole: 'reviewer', independent: true,
                    changedPaths: CHANGED_PATHS, changedRequirementIds: CHANGED_REQUIREMENT_IDS, impactDigest: IMPACT_DIGEST, sealAlgorithm: SEAL_ALGORITHM, sealVersion: SEAL_VERSION
                }
            }
        }
    },
    {
        type: 'resume-specification-blocked-session', body: {blockerId: 'blocker-1', workerSessionId: 'worker-1', operatorSessionId: 'opsess-1', worktreeId: 'wt-1', syncedRevision: COMMIT_SHA},
        effects: [{effect: 'resume-blocked-session'}], origin: 'M0-system', decisionClass: 'M0',
        contextOverrides: {
            admittedRevisions: {'blocker-1': {blockerId: 'blocker-1', activeSeal: CANDIDATE_SEAL, requiredCommit: COMMIT_SHA}},
            worktreeSyncRecords: {'wt-1': {worktreeId: 'wt-1', status: 'synchronized', syncedRevision: COMMIT_SHA}},
            originalAssignments: {'blocker-1': {blockerId: 'blocker-1', workerSessionId: 'worker-1', operatorSessionId: 'opsess-1', worktreeId: 'wt-1', claimIds: []}}
        }
    },
    {
        type: 'grant-session-budget', body: {sessionId: 'session-1', grantTokens: 100, reason: 'extra context'}, effects: [{effect: 'grant-session-budget'}], origin: 'operator', decisionClass: 'M0',
        contextOverrides: {operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['prop-grant-session-budget'])}}
    },
    {
        type: 'place-hold', body: {scope: ['B1'], reason: 'safety', expiresAt: FUTURE}, effects: [{effect: 'place-hold'}], origin: 'operator', decisionClass: 'M0',
        contextOverrides: {operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['prop-place-hold'])}}
    },
    {
        type: 'release-hold', body: {holdId: 'hold-1'}, effects: [{effect: 'release-hold'}], origin: 'operator', decisionClass: 'M0',
        contextOverrides: {
            operatorSession: {sessionId: 'op-1', role: 'operator', confirmedProposalIds: new Set(['prop-release-hold'])},
            activeHolds: [{holdId: 'hold-1', scope: ['B1'], status: 'active'}]
        }
    },
    {type: 'escalate', body: {reason: 'blocked', profile: 'default'}, effects: [{effect: 'open-escalation'}], origin: 'coordinator-D1', decisionClass: 'D1'}
]);

export function fixtureFor(type: ProposalType): FixtureDefinition {
    const fixture = FIXTURES.find((entry) => entry.type === type);
    if (fixture === undefined) throw new Error(`no fixture for ${type}`);
    return fixture;
}

export function baseContext(overrides: Partial<ValidationContext> = {}): ValidationContext {
    return Object.freeze({
        laneId: 'lane-1',
        policyVersion: 'shipping-v1',
        now: NOW,
        origin: 'coordinator-D1',
        decisionClass: 'D1',
        envelope: Object.freeze({
            permittedProposalTypes: Object.freeze([...PROPOSAL_TYPES]),
            evidenceRefs: Object.freeze(['finding:F1']),
            packSealId: 'seal-1',
            manifestDigest: MANIFEST_DIGEST,
            endpointCapabilityClass: 'C5'
        }),
        laneState: Object.freeze({
            snapshotDigest: SNAPSHOT_DIGEST,
            batches: Object.freeze({B1: Object.freeze({batchId: 'B1', status: 'pending'}), B2: Object.freeze({batchId: 'B2', status: 'accepted'})})
        }),
        packIndex: Object.freeze({packSealId: 'seal-1', activeSeal: ACTIVE_SEAL, manifestDigest: MANIFEST_DIGEST}),
        journalState: Object.freeze({completedIdempotencyKeys: new Set<string>()}),
        routingPolicy: Object.freeze({activeEndpointPool: Object.freeze(['ep-1', 'ep-2'])}),
        activeClaims: Object.freeze([]),
        activeHolds: Object.freeze([]),
        budgetState: Object.freeze({laneWideGrantedTokens: 1000, laneWideCeilingTokens: 5000, protectedReserveTokens: 500}),
        endpointState: Object.freeze([Object.freeze({endpointId: 'ep-1', capacityPoolId: 'pool-1'}), Object.freeze({endpointId: 'ep-2', capacityPoolId: 'pool-1'})]),
        acceptedAmendments: Object.freeze({}),
        admittedRevisions: Object.freeze({}),
        worktreeSyncRecords: Object.freeze({}),
        originalAssignments: Object.freeze({}),
        predecessorEvidence: predecessorEvidenceDocument(),
        predecessorCurrentState: predecessorCurrentStateDocument(),
        predecessorAcceptanceRecords: predecessorAcceptanceRecords(),
        ...overrides
    });
}

/** Loosely typed — these fixtures build *wire-shaped* JSON (the actual `validateProposalShape` input, exercised via `unknown`), including deliberately malformed/adversarial values a real `DecisionProposal` could never hold. */
export interface ProposalOverrides {
    readonly schemaVersion?: unknown;
    readonly cycleId?: unknown;
    readonly proposalId?: unknown;
    readonly type?: unknown;
    readonly snapshotDigest?: unknown;
    readonly expiresAt?: unknown;
    readonly evidenceRefs?: unknown;
    readonly body?: Record<string, unknown>;
    readonly requestedEffects?: unknown;
}

export function proposalFor(fixture: FixtureDefinition, overrides: ProposalOverrides = {}): DecisionProposal {
    return Object.freeze({
        schemaVersion: 1,
        cycleId: 'cycle-1',
        proposalId: `prop-${fixture.type}`,
        type: fixture.type,
        snapshotDigest: SNAPSHOT_DIGEST,
        expiresAt: FUTURE,
        evidenceRefs: Object.freeze(['finding:F1']),
        body: Object.freeze({...fixture.body}),
        requestedEffects: Object.freeze([...fixture.effects]),
        ...overrides
    }) as unknown as DecisionProposal;
}

/**
 * A genuinely typed `DecisionProposal` — unlike `proposalFor`'s wire-shaped
 * object (whose `body` deliberately omits the `type` discriminant, matching
 * the raw `$defs.decisionProposal` JSON the public `validateProposal(unknown, …)`
 * boundary accepts and internally reshapes via `buildProposal`), this carries
 * `body.type` so it is safe to pass directly into an already-shaped-only
 * internal method such as `isProposalDuplicate`, which reads `body.type`
 * without first calling `validateProposalShape`.
 */
export function typedProposalFor(fixture: FixtureDefinition): DecisionProposal {
    return Object.freeze({
        schemaVersion: 1,
        cycleId: 'cycle-1',
        proposalId: `prop-${fixture.type}`,
        type: fixture.type,
        snapshotDigest: SNAPSHOT_DIGEST,
        expiresAt: FUTURE,
        evidenceRefs: Object.freeze(['finding:F1']),
        body: Object.freeze({type: fixture.type, ...fixture.body}),
        requestedEffects: Object.freeze([...fixture.effects])
    }) as unknown as DecisionProposal;
}

export function contextFor(fixture: FixtureDefinition, overrides: Partial<ValidationContext> = {}): ValidationContext {
    return baseContext({origin: fixture.origin, decisionClass: fixture.decisionClass, ...fixture.contextOverrides, ...overrides});
}
