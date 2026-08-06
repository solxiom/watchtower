/**
 * Closed v1 typed-proposal contracts (`docs/spec/v1-contracts.md` §5,
 * `docs/spec/coordinator-automation.md` §11, `docs/spec/specification-resolution.md`).
 * Fourteen proposal types are closed and versioned; adding, removing, or
 * renaming one requires a knowledge-policy update, validator, effect mapping,
 * fixtures, and spec update (§11.2) — this module is not that surface.
 */

export const PROPOSAL_TYPES = [
    'select-ready-batch',
    'classify-reject',
    'open-correction',
    'select-correction-route',
    'request-reroute',
    'propose-reconciliation',
    'request-pack-amendment',
    'propose-specification-resolution',
    'admit-pack-amendment',
    'resume-specification-blocked-session',
    'grant-session-budget',
    'place-hold',
    'release-hold',
    'escalate'
] as const;
export type ProposalType = typeof PROPOSAL_TYPES[number];

/** `select-ready-batch` and `admit-pack-amendment` may also originate from an operator with confirmation. */
export const PROPOSAL_ORIGINS = [
    'operator',
    'coordinator-D1',
    'coordinator-D2',
    'coordinator-D3',
    'architect-advisor',
    'M0-safety',
    'M0-system'
] as const;
export type ProposalOrigin = typeof PROPOSAL_ORIGINS[number];

/** `classify-reject` and `propose-specification-resolution` map to no direct effect (journal/advisory only). */
export const EFFECT_TYPES = [
    'dispatch-batch',
    'open-correction',
    'route-correction',
    'reroute-endpoint',
    'reconcile-projection',
    'create-amendment-request',
    'activate-pack-revision',
    'resume-blocked-session',
    'grant-session-budget',
    'place-hold',
    'release-hold',
    'open-escalation'
] as const;
export type EffectType = typeof EFFECT_TYPES[number];

export const PROPOSAL_REASONS = [
    'PROPOSAL_SCHEMA_INVALID',
    'PROPOSAL_STALE_SNAPSHOT',
    'PROPOSAL_EXPIRED',
    'PROPOSAL_ORIGIN_MISMATCH',
    'PROPOSAL_CLASS_INSUFFICIENT',
    'PROPOSAL_EFFECT_ILLEGAL',
    'PROPOSAL_DUPLICATE',
    'PROPOSAL_PRECONDITION_FAILED',
    'PROPOSAL_CLAIM_CONFLICT',
    'PROPOSAL_BUDGET_OVER_LIMIT',
    'PROPOSAL_CONFIRMATION_REQUIRED',
    'PROPOSAL_REROUTE_INVALID',
    'PROPOSAL_AUTHORITY_REQUIRED',
    'PROPOSAL_SEAL_INVALID',
    'PROPOSAL_INDEPENDENCE_VIOLATION',
    'PROPOSAL_TYPE_NOT_PERMITTED',
    'PROPOSAL_EVIDENCE_DRIFT',
    'PROPOSAL_CAPABILITY_INSUFFICIENT'
] as const;
export type ProposalReason = typeof PROPOSAL_REASONS[number];

export interface RequestedEffect {
    readonly effect: EffectType;
    readonly [field: string]: unknown;
}

export interface SelectReadyBatchBody { readonly batchId: string; }
export interface ClassifyRejectBody {
    readonly classification: string;
    readonly findingIds: readonly string[];
    readonly strategy: string;
    readonly targetBatch: string;
}
export interface OpenCorrectionBody { readonly batchId: string; readonly findingIds: readonly string[]; }
export interface SelectCorrectionRouteBody { readonly batchId: string; readonly route: string; }
export interface RequestRerouteBody { readonly fromEndpointId: string; readonly toEndpointId: string; }
export interface ProposeReconciliationBody { readonly projectionId: string; readonly plan: string; }
export interface RequestPackAmendmentBody { readonly packId: string; readonly reason: string; }

/** `docs/spec/schemas/v1.schema.json#/$defs/specificationResolution` body fields, minus proposal-level `evidenceRefs`. */
export interface ProposeSpecificationResolutionBody {
    readonly resolutionId: string;
    readonly blockerId: string;
    readonly recommendedDecision: string;
    readonly affectedPaths: readonly string[];
    readonly affectedRequirementIds?: readonly string[];
    readonly alternatives?: readonly string[];
    readonly rationale?: string;
    readonly impactDigest?: string;
    readonly requiresSpecAuthority: true;
}

export interface AdmitPackAmendmentBody {
    readonly amendmentRequestId: string;
    readonly blockerId: string;
    readonly resolutionId: string;
    readonly supersedesSeal: string;
    readonly candidateSeal: string;
    readonly reviewedCommit: string;
    readonly packAcceptanceRef: string;
    readonly specAuthoritySessionId: string;
}

export interface ResumeSpecificationBlockedSessionBody {
    readonly blockerId: string;
    readonly workerSessionId: string;
    /** The durable operator-session identity being resumed (`specification-resolution-batch-amendment.md` §6: "the same durable worker and operator-session identities"). Bound to the original assignment; a substituted identity is rejected. */
    readonly operatorSessionId: string;
    readonly worktreeId: string;
    readonly syncedRevision: string;
}

export interface GrantSessionBudgetBody { readonly sessionId: string; readonly grantTokens: number; readonly reason: string; }
export interface PlaceHoldBody { readonly scope: readonly string[]; readonly reason: string; readonly expiresAt: string; }
export interface ReleaseHoldBody { readonly holdId: string; }
export interface EscalateBody { readonly reason: string; readonly profile: string; }

export type ProposalBody =
    | ({readonly type: 'select-ready-batch'} & SelectReadyBatchBody)
    | ({readonly type: 'classify-reject'} & ClassifyRejectBody)
    | ({readonly type: 'open-correction'} & OpenCorrectionBody)
    | ({readonly type: 'select-correction-route'} & SelectCorrectionRouteBody)
    | ({readonly type: 'request-reroute'} & RequestRerouteBody)
    | ({readonly type: 'propose-reconciliation'} & ProposeReconciliationBody)
    | ({readonly type: 'request-pack-amendment'} & RequestPackAmendmentBody)
    | ({readonly type: 'propose-specification-resolution'} & ProposeSpecificationResolutionBody)
    | ({readonly type: 'admit-pack-amendment'} & AdmitPackAmendmentBody)
    | ({readonly type: 'resume-specification-blocked-session'} & ResumeSpecificationBlockedSessionBody)
    | ({readonly type: 'grant-session-budget'} & GrantSessionBudgetBody)
    | ({readonly type: 'place-hold'} & PlaceHoldBody)
    | ({readonly type: 'release-hold'} & ReleaseHoldBody)
    | ({readonly type: 'escalate'} & EscalateBody);

/**
 * A proposal's `type` and `body` are locked together at the type level: this
 * mapped-then-indexed union (keyed by `ProposalBody['type']`) makes it a
 * compile error to pair, say, `type: 'release-hold'` with a `place-hold` body
 * — there is no unchecked cast in this contract that could erase that pairing.
 */
export type DecisionProposal = {
    readonly [Type in ProposalBody['type']]: {
        readonly schemaVersion: 1;
        readonly cycleId: string;
        readonly proposalId: string;
        readonly type: Type;
        readonly snapshotDigest: string;
        readonly expiresAt: string;
        readonly evidenceRefs: readonly string[];
        readonly body: Extract<ProposalBody, {readonly type: Type}>;
        readonly requestedEffects: readonly RequestedEffect[];
    };
}[ProposalBody['type']];

export interface ValidationError {
    readonly code: ProposalReason;
    readonly subject: string;
    readonly message: string;
}

export interface ValidationWarning {
    readonly code: string;
    readonly subject: string;
    readonly message: string;
}

export interface ProposalValidationResult {
    readonly valid: boolean;
    readonly errors: readonly ValidationError[];
    readonly warnings: readonly ValidationWarning[];
}
