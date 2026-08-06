/**
 * Injected current-state shapes for `ProposalValidator` (`docs/spec/v1-contracts.md`
 * §5, `docs/spec/coordinator-automation.md` §12.1). Every field is a caller-supplied
 * projection of already-verified state; this capsule never reads storage, a clock,
 * or a model, and never mutates its arguments.
 */
import type {DecisionCapabilityClass, ProposalOrigin, ProposalType} from '../../contracts/index.js';

export interface LaneBatchState {
    readonly batchId: string;
    readonly status: string;
}

/** The lane projection a proposal's `snapshotDigest` is checked against (§5 "stale snapshot"). */
export interface LaneCurrentState {
    readonly snapshotDigest: string;
    readonly batches: Readonly<Record<string, LaneBatchState>>;
}

/** Current active pack identity — `admit-pack-amendment`'s seal check target (`specification-resolution.md` §7). */
export interface PackIndexState {
    readonly packSealId: string;
    readonly activeSeal: string;
    readonly manifestDigest: string;
}

export interface JournalState {
    readonly completedIdempotencyKeys: ReadonlySet<string>;
}

/** The active routing policy's endpoint pool — `request-reroute`'s legal-target boundary. */
export interface RoutingPolicyState {
    readonly activeEndpointPool: readonly string[];
}

export type OperatorSessionRole = 'operator' | 'pack-spec-authority';

export interface OperatorSessionState {
    readonly sessionId: string;
    readonly role: OperatorSessionRole;
    readonly confirmedProposalIds: ReadonlySet<string>;
}

export interface ActiveClaim {
    readonly claimId: string;
    readonly targetIds: readonly string[];
}

export type ActiveHoldStatus = 'active' | 'expired';

export interface ActiveHold {
    readonly holdId: string;
    readonly scope: readonly string[];
    readonly status: ActiveHoldStatus;
}

/** Lane-wide session-budget ceiling and protected reserve (`coordinatorBaselineContracts.ts#OperatorSessionPolicy.laneWide`). */
export interface BudgetState {
    readonly laneWideGrantedTokens: number;
    readonly laneWideCeilingTokens: number;
    readonly protectedReserveTokens: number;
}

export interface EndpointState {
    readonly endpointId: string;
    readonly capacityPoolId: string;
}

export type CycleRoutingClass = 'M0' | 'D1' | 'D2' | 'D3';

/**
 * The immutable CA-07 decision envelope's authorization binding (`DecisionEnvelope.permittedProposalTypes`,
 * `.packIndex`, `.boundedContext.routingContext.evidenceRefs`/`.minimumCapability`).
 * A proposal is only as trustworthy as the envelope that authorized it: this
 * is that envelope's projection, checked before origin/class/effect legality.
 */
export interface EnvelopeBinding {
    readonly permittedProposalTypes: readonly ProposalType[];
    readonly evidenceRefs: readonly string[];
    readonly packSealId: string;
    readonly manifestDigest: string;
    readonly endpointCapabilityClass: DecisionCapabilityClass;
}

/**
 * The accepted, independently-reviewed `pack-amendment-accepted` artifact
 * (`specification-resolution.md` §6) an `admit-pack-amendment` proposal is
 * checked against — never trusted from the proposal body alone. Mirrors the
 * rigor of CA-07's `decisionPredecessor.ts` acceptance-record shape: a
 * committed, independent, `reviewer`-role acceptance naming parent/new
 * commits, changed paths/requirements, impact digest, and the canonical seal
 * algorithm/version the candidate seal must reproduce under.
 */
export interface AcceptedAmendmentRecord {
    readonly amendmentRequestId: string;
    readonly blockerId: string;
    readonly resolutionId: string;
    readonly supersedesSeal: string;
    readonly candidateSeal: string;
    readonly parentReviewedCommit: string;
    readonly newReviewedCommit: string;
    readonly packAcceptanceRef: string;
    readonly reviewerSessionId: string;
    readonly authorSessionId: string;
    readonly committed: true;
    readonly verdict: 'accept';
    readonly reviewerRole: 'reviewer';
    readonly independent: true;
    readonly changedPaths: readonly string[];
    readonly changedRequirementIds: readonly string[];
    readonly impactDigest: string;
    readonly sealAlgorithm: string;
    readonly sealVersion: string;
}

/** The original durable worker/operator-session/worktree assignment a blocked session is bound to — `resume-specification-blocked-session`'s identity anchor (`specification-resolution.md` §8: "resume ... the same durable worker and operator-session identities"). Both the resumed operator-session identity named in the proposal and any operator session actually driving the resume are bound to this record. */
export interface OriginalAssignmentRecord {
    readonly blockerId: string;
    readonly workerSessionId: string;
    readonly operatorSessionId: string;
    readonly worktreeId: string;
    readonly claimIds: readonly string[];
}

/** The pack revision admitted for a blocker (`specification-revision-activated`) — `resume-specification-blocked-session`'s ancestry target (§7-§8). */
export interface AdmittedRevisionState {
    readonly blockerId: string;
    readonly activeSeal: string;
    readonly requiredCommit: string;
}

export type WorktreeSyncStatus = 'synchronized' | 'stale';

/** Explicit worktree-synchronization evidence (§8) — never inferred from the resume proposal's own claim. */
export interface WorktreeSyncRecord {
    readonly worktreeId: string;
    readonly status: WorktreeSyncStatus;
    readonly syncedRevision: string;
}

export interface ValidationContext {
    readonly laneId: string;
    readonly policyVersion: string;
    readonly now: string;
    /** Who is submitting this proposal instance — the wire `decisionProposal` schema carries no origin field, so the caller (the boundary that knows which endpoint/session produced it) supplies it alongside state, mirroring how a decision envelope's `decisionClass` accompanies rather than embeds in a proposal. */
    readonly origin: ProposalOrigin;
    readonly decisionClass: CycleRoutingClass;
    readonly envelope: EnvelopeBinding;
    readonly laneState: LaneCurrentState;
    readonly packIndex: PackIndexState;
    readonly journalState: JournalState;
    readonly routingPolicy: RoutingPolicyState;
    readonly operatorSession?: OperatorSessionState;
    /** The distinct session that authored the amendment/resolution content being admitted — independence anchor for `admit-pack-amendment`. */
    readonly packAuthorSessionId?: string;
    readonly activeClaims: readonly ActiveClaim[];
    readonly activeHolds: readonly ActiveHold[];
    readonly budgetState: BudgetState;
    readonly endpointState: readonly EndpointState[];
    /** Accepted amendment artifacts, keyed by `amendmentRequestId` — the fail-closed admission anchor (F-01). */
    readonly acceptedAmendments: Readonly<Record<string, AcceptedAmendmentRecord>>;
    /** Admitted pack revisions, keyed by `blockerId`. */
    readonly admittedRevisions: Readonly<Record<string, AdmittedRevisionState>>;
    /** Explicit worktree-synchronization evidence, keyed by `worktreeId`. */
    readonly worktreeSyncRecords: Readonly<Record<string, WorktreeSyncRecord>>;
    /** The original durable worker/session/worktree/claim assignment per blocker, keyed by `blockerId` — resume must target this exact identity, never an arbitrary session (F-01). */
    readonly originalAssignments: Readonly<Record<string, OriginalAssignmentRecord>>;
    /**
     * Raw not-yet-validated CA-02/CA-03 predecessor evidence, current state,
     * and the two acceptance records they resolve to — the caller-supplied
     * `unknown` inputs CA-07's own `decisionPredecessor.ts` validators
     * consume. The validator proves current state rests on accepted,
     * independently-reviewed predecessor authority before trusting any of
     * `laneState`/`packIndex`/`journalState` derived from it (F-05); this
     * capsule never re-implements that proof, only reuses CA-07's owned one.
     */
    readonly predecessorEvidence: unknown;
    readonly predecessorCurrentState: unknown;
    readonly predecessorAcceptanceRecords: readonly [unknown, unknown];
}
