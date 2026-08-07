/**
 * Closed contracts for CA-17 turn classification and session route selection
 * (`docs/spec/operator-session.md` §10.3/§10.4/§14, `docs/spec/v1-contracts.md`
 * §4). The batch's third owned concern — grants, reserves, and accounting —
 * lives in `sessionBudget.ts` so neither module carries two vocabularies.
 *
 * It deliberately owns none of the following. Session persistence and the
 * lifecycle state machine are CA-15 (`contracts/operatorSession.ts`); the
 * derived session index and capsules are CA-16R (`contracts/sessionIndex.ts`);
 * endpoint eligibility, capacity pools, and reservations are CA-06
 * (`contracts/endpointEligibility.ts`); cycle budgets and brokered context are
 * CA-08 (`contracts/contextBroker.ts`); the automated-cycle routing rule table
 * is CA-05 (`contracts/routing.ts`). Proposal confirmation/apply is CA-26 and
 * holds/amendments are CA-27, so nothing here produces a proposal, an effect,
 * or a mutation — every decision below is a side-effect-free plan.
 */
import type {EndpointCapabilityClass, EndpointContextClass} from './endpointEligibility.js';
import type {SessionBudgetAdmission} from './sessionBudget.js';
import type {SessionDecisionClass} from './sessionIndex.js';

/**
 * `docs/spec/operator-session.md` §10.3/§10.4 — M0 is model-free by
 * construction. The class vocabulary itself stays owned by CA-16R
 * (`SESSION_DECISION_CLASSES`); this batch only narrows it to the model-backed
 * subset that has a route.
 */
export type SessionModelDecisionClass = Exclude<SessionDecisionClass, 'M0'>;

/** The `docs/spec/v1-contracts.md` §4 operator rule IDs this batch may assign; no rule is invented here. */
export const SESSION_ROUTING_RULE_IDS = [
    'projection-query-v1', 'operator-bounded-v1', 'operator-default-v1', 'operator-complex-v1'
] as const;
export type SessionRoutingRuleId = typeof SESSION_ROUTING_RULE_IDS[number];

/** `docs/spec/operator-session.md` §10.4 hard guards; any match raises the minimum to D3. */
export const SESSION_HARD_GUARDS = [
    'safety-escalation', 'integrity-conflict', 'normative-contradiction', 'pack-scope-drift',
    'cross-repository', 'structural-redesign', 'repeated-failure'
] as const;
export type SessionHardGuard = typeof SESSION_HARD_GUARDS[number];

/** Closed refusal vocabulary. Consumers branch on `reason`, never on message text. */
export const SESSION_ROUTING_REASONS = [
    'SESSION_ROUTING_REQUEST_INVALID',
    'SESSION_ROUTING_POLICY_INVALID',
    'SESSION_ROUTING_CLASS_UNSUPPORTED',
    'SESSION_ROUTING_UNDER_ROUTE_REFUSED',
    'SESSION_ROUTE_UNAVAILABLE',
    'SESSION_ROUTE_CAPABILITY_FLOOR',
    'SESSION_ROUTE_CAPACITY_EXHAUSTED',
    'SESSION_ROUTE_RESERVE_PROTECTED',
    'SESSION_ROUTE_ESCALATION_UNAVAILABLE',
    'SESSION_BUDGET_LIMITS_INVALID',
    'SESSION_BUDGET_STATE_INVALID',
    'SESSION_BUDGET_HARD_LIMIT',
    'SESSION_BUDGET_LANE_HARD_LIMIT',
    'SESSION_BUDGET_TELEMETRY_UNKNOWN',
    'SESSION_GRANT_REQUEST_INVALID',
    'SESSION_GRANT_EXCEEDS_LANE_CEILING',
    'SESSION_GRANT_RESERVE_PROTECTED',
    'SESSION_GRANT_UNKNOWN_CAPACITY',
    'SESSION_GRANT_EXPIRED',
    'SESSION_GRANT_DUPLICATE_REPLAY',
    'SESSION_GRANT_LEDGER_MISMATCH',
    'SESSION_GRANT_ALLOWANCE_EXHAUSTED',
    'SESSION_CONCURRENCY_EXHAUSTED'
] as const;
export type SessionRoutingReason = typeof SESSION_ROUTING_REASONS[number];

/**
 * The exact request form a turn presents. External operator input never
 * reaches this batch as prose alone: CA-15/CA-16R resolve references first and
 * the caller declares which closed form matched, so classification is a
 * deterministic table lookup rather than semantic interpretation.
 */
export type SessionRequestForm =
    | {readonly kind: 'structured-query'; readonly queryFormId: string}
    | {readonly kind: 'registered-bounded'; readonly boundedFormId: string; readonly subjectCount: number}
    | {readonly kind: 'natural-language'};

export interface SessionClassificationRequest {
    readonly operatorSessionId: string;
    readonly turnId: string;
    readonly form: SessionRequestForm;
    /** `--class`; may escalate the matched rule's class and may never lower it. */
    readonly requestedClass?: SessionModelDecisionClass;
    readonly guards: readonly SessionHardGuard[];
    /** Policy-registered exact forms. An unregistered id can never reach M0 or D1. */
    readonly registeredQueryFormIds: readonly string[];
    readonly registeredBoundedFormIds: readonly string[];
}

export interface SessionTurnClassification {
    readonly operatorSessionId: string;
    readonly turnId: string;
    readonly ruleId: SessionRoutingRuleId;
    readonly decisionClass: SessionDecisionClass;
    /** `null` only for M0, which has no model route and therefore no capability floor. */
    readonly minimumCapability: EndpointCapabilityClass | null;
    readonly modelRequired: boolean;
    readonly matchedGuards: readonly SessionHardGuard[];
    readonly requestedClass: SessionModelDecisionClass | null;
    /** The class the rule table produced before an operator escalation was applied. */
    readonly ruleDecisionClass: SessionDecisionClass;
    readonly escalatedByOperator: boolean;
    /** Set when a D1/D2 endpoint returned a typed escalation instead of an answer (§10.4). */
    readonly escalatedByEndpoint: boolean;
    readonly escalatedFromEndpointId: string | null;
}

/** A typed escalation returned by a D1/D2 endpoint instead of an answer (§10.4). */
export interface SessionEndpointEscalation {
    readonly fromDecisionClass: Exclude<SessionModelDecisionClass, 'D3'>;
    readonly requestedDecisionClass: SessionModelDecisionClass;
    readonly endpointId: string;
    readonly reasonText: string;
}

/** One class's primary/fallback pool in the lane's session routing plan (§14). */
export interface SessionClassRoute {
    readonly primary: string;
    readonly fallbacks: readonly string[];
    readonly minimumCapability: EndpointCapabilityClass;
    readonly minimumContext: EndpointContextClass;
    readonly maxConcurrentTurns: number;
}

/**
 * The lane-owned session routing plan. `reserveId` values name the automated
 * coordinator-cycle reserves this plan may never draw from, keeping operator
 * discussion off reject/recovery capacity (§14).
 */
export interface SessionRoutingPlan {
    readonly schemaVersion: 1;
    readonly policyVersion: string;
    readonly allocationSlotPrefix: 'coordinator:operator-session';
    readonly classes: Readonly<Record<SessionModelDecisionClass, SessionClassRoute>>;
    readonly protectedReserveIds: readonly string[];
}

/** One candidate endpoint, already classified by CA-06; this batch never recomputes eligibility. */
export interface SessionEndpointCandidate {
    readonly endpointId: string;
    readonly capacityPoolId: string;
    readonly capabilityClass: EndpointCapabilityClass;
    readonly contextClass: EndpointContextClass;
    readonly eligibilityStatus: 'eligible' | 'ineligible' | 'unknown';
    readonly availableSlots: number;
    /** Reserve this endpoint's capacity belongs to, when it is reserved capacity at all. */
    readonly reserveId: string | null;
    readonly economicsRank: number | null;
    readonly independencePass: boolean;
}

/** The prior turn's endpoint, offered for the §14 reuse test. */
export interface SessionReuseCandidate {
    readonly endpointId: string;
    readonly continuityBenefit: number;
    readonly switchCost: number;
    readonly requiresExternalProviderHistory: boolean;
}

export interface SessionRouteRequest {
    readonly classification: SessionTurnClassification;
    readonly plan: SessionRoutingPlan;
    readonly candidates: readonly SessionEndpointCandidate[];
    readonly activeSessionTurns: number;
    readonly budgetAdmission: SessionBudgetAdmission;
    readonly reuse?: SessionReuseCandidate;
}

export const SESSION_REUSE_REJECTIONS = [
    'capability-floor', 'not-eligible', 'continuity-not-worth-switch', 'budget-or-independence',
    'external-provider-history-required', 'not-in-class-pool'
] as const;
export type SessionReuseRejection = typeof SESSION_REUSE_REJECTIONS[number];

export interface SessionRouteSelection {
    readonly allocationSlot: `coordinator:operator-session:${SessionModelDecisionClass}`;
    readonly decisionClass: SessionModelDecisionClass;
    readonly endpointId: string;
    readonly capacityPoolId: string;
    readonly minimumCapability: EndpointCapabilityClass;
    readonly minimumContext: EndpointContextClass;
    readonly economicsRank: number | null;
    readonly reused: boolean;
    readonly reuseRejection: SessionReuseRejection | null;
    readonly consideredEndpointIds: readonly string[];
}
