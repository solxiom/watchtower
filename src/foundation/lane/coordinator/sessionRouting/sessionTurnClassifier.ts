/**
 * CA-17 operator-turn classification (`docs/spec/operator-session.md`
 * §10.3/§10.4, `docs/spec/v1-contracts.md` §4). This is the sole owner of the
 * M0/D1–D3 decision for an operator-session turn; CA-05's `classifyRoute`
 * remains the sole owner of the automated coordinator-cycle rule table and is
 * deliberately not reused here — the two tables share no rule ID and the
 * operator table has its own guard semantics.
 *
 * Every decision is a first-match table lookup over closed inputs. Nothing in
 * this module reads a file, invokes a model, or produces a proposal or effect:
 * an M0 classification is model-free by construction because it never yields a
 * route (see `sessionRouteSelector.ts`).
 */
import type {
    EndpointCapabilityClass, SessionClassificationRequest, SessionDecisionClass, SessionEndpointEscalation,
    SessionHardGuard, SessionModelDecisionClass, SessionRoutingRuleId, SessionTurnClassification
} from '../../../../contracts/index.js';
import {SESSION_HARD_GUARDS} from '../../../../contracts/index.js';
import {sessionRoutingFailure} from './sessionRoutingErrors.js';

/** `docs/spec/v1-contracts.md` §4: floors are D1→C2, D2→C3, D3→C5 and policy may never lower them. */
const CAPABILITY_FLOOR: Readonly<Record<SessionModelDecisionClass, EndpointCapabilityClass>> =
    Object.freeze({D1: 'C2', D2: 'C3', D3: 'C5'});

const CLASS_ORDER: readonly SessionDecisionClass[] = Object.freeze(['M0', 'D1', 'D2', 'D3']);

const GUARD_SET: ReadonlySet<string> = new Set(SESSION_HARD_GUARDS);

/**
 * Classifies one operator turn. Order is fixed and safety-first: a hard guard
 * raises the minimum to D3 even for an otherwise exact registered form
 * (§10.4), so no guarded turn can be answered at M0 or D1.
 */
export function classifySessionTurn(request: SessionClassificationRequest): SessionTurnClassification {
    validateRequest(request);
    const matchedGuards = normalizeGuards(request.guards);
    const ruleId = matchRule(request, matchedGuards);
    const ruleDecisionClass = RULE_CLASS[ruleId];
    const decisionClass = applyOperatorClass(request, ruleDecisionClass);
    return buildClassification(request, matchedGuards, ruleId, ruleDecisionClass, decisionClass);
}

/**
 * Re-routes after a D1/D2 endpoint returns a typed escalation instead of an
 * answer (§10.4). The result never drops below the original class and the
 * caller must still prove an eligible higher-class endpoint and budget exist
 * before the turn runs — that proof belongs to `selectSessionRoute`.
 */
export function reclassifyAfterEndpointEscalation(
    classification: SessionTurnClassification, escalation: SessionEndpointEscalation
): SessionTurnClassification {
    if (classification.decisionClass !== escalation.fromDecisionClass) {
        sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', classification.turnId,
            `escalation declares fromDecisionClass ${escalation.fromDecisionClass} but the turn is ${classification.decisionClass}`);
    }
    if (rank(escalation.requestedDecisionClass) <= rank(escalation.fromDecisionClass)) {
        sessionRoutingFailure('SESSION_ROUTING_UNDER_ROUTE_REFUSED', classification.turnId,
            `endpoint escalation must request a higher class than ${escalation.fromDecisionClass}`);
    }
    const decisionClass = escalation.requestedDecisionClass;
    return Object.freeze({
        ...classification, decisionClass, minimumCapability: CAPABILITY_FLOOR[decisionClass],
        modelRequired: true, escalatedByEndpoint: true, escalatedFromEndpointId: escalation.endpointId
    });
}

const RULE_CLASS: Readonly<Record<SessionRoutingRuleId, SessionDecisionClass>> = Object.freeze({
    'operator-complex-v1': 'D3', 'projection-query-v1': 'M0', 'operator-bounded-v1': 'D1', 'operator-default-v1': 'D2'
});

function matchRule(request: SessionClassificationRequest, guards: readonly SessionHardGuard[]): SessionRoutingRuleId {
    if (guards.length > 0) return 'operator-complex-v1';
    const form = request.form;
    if (form.kind === 'structured-query' && request.registeredQueryFormIds.includes(form.queryFormId)) return 'projection-query-v1';
    if (form.kind === 'registered-bounded' && form.subjectCount === 1 && request.registeredBoundedFormIds.includes(form.boundedFormId)) {
        return 'operator-bounded-v1';
    }
    return 'operator-default-v1';
}

/** `--class` may escalate and may never lower; an attempted under-route is refused, not ignored. */
function applyOperatorClass(request: SessionClassificationRequest, ruleClass: SessionDecisionClass): SessionDecisionClass {
    const requested = request.requestedClass;
    if (requested === undefined) return ruleClass;
    if (rank(requested) < rank(ruleClass)) {
        sessionRoutingFailure('SESSION_ROUTING_UNDER_ROUTE_REFUSED', request.turnId,
            `--class=${requested} cannot lower the ${ruleClass} class this turn matched`);
    }
    return requested;
}

function buildClassification(
    request: SessionClassificationRequest, matchedGuards: readonly SessionHardGuard[],
    ruleId: SessionRoutingRuleId, ruleDecisionClass: SessionDecisionClass, decisionClass: SessionDecisionClass
): SessionTurnClassification {
    return Object.freeze({
        operatorSessionId: request.operatorSessionId, turnId: request.turnId, ruleId, decisionClass,
        minimumCapability: decisionClass === 'M0' ? null : CAPABILITY_FLOOR[decisionClass],
        modelRequired: decisionClass !== 'M0', matchedGuards, requestedClass: request.requestedClass ?? null,
        ruleDecisionClass, escalatedByOperator: decisionClass !== ruleDecisionClass,
        escalatedByEndpoint: false, escalatedFromEndpointId: null
    });
}

function normalizeGuards(guards: readonly SessionHardGuard[]): readonly SessionHardGuard[] {
    for (const guard of guards) {
        if (!GUARD_SET.has(guard)) {
            sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', String(guard), `unsupported hard guard "${String(guard)}"`);
        }
    }
    return Object.freeze([...new Set(guards)].sort());
}

function validateRequest(request: SessionClassificationRequest): void {
    requireText('operatorSessionId', request.operatorSessionId);
    requireText('turnId', request.turnId);
    if (!Array.isArray(request.guards)) sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', 'guards', 'guards must be an array');
    validateForm(request);
    if (request.requestedClass !== undefined && !isModelClass(request.requestedClass)) {
        sessionRoutingFailure('SESSION_ROUTING_CLASS_UNSUPPORTED', 'requestedClass',
            `--class must be D1, D2, or D3; received "${String(request.requestedClass)}"`);
    }
}

function validateForm(request: SessionClassificationRequest): void {
    const form = request.form;
    if (form === null || typeof form !== 'object') sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', 'form', 'form must be a closed request form');
    if (form.kind === 'structured-query') { requireText('form.queryFormId', form.queryFormId); return; }
    if (form.kind === 'registered-bounded') {
        requireText('form.boundedFormId', form.boundedFormId);
        if (!Number.isSafeInteger(form.subjectCount) || form.subjectCount < 0) {
            sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', 'form.subjectCount', 'subjectCount must be a non-negative safe integer');
        }
        return;
    }
    if (form.kind !== 'natural-language') {
        sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', 'form.kind', `unsupported request form "${String((form as {kind: unknown}).kind)}"`);
    }
}

function requireText(subject: string, value: string): void {
    if (typeof value !== 'string' || value.trim() === '') {
        sessionRoutingFailure('SESSION_ROUTING_REQUEST_INVALID', subject, `${subject} must be a non-empty string`);
    }
}

function isModelClass(value: SessionModelDecisionClass): boolean { return value === 'D1' || value === 'D2' || value === 'D3'; }

function rank(value: SessionDecisionClass): number { return CLASS_ORDER.indexOf(value); }
