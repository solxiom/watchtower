/**
 * Context-broker query allowlisting (`docs/spec/coordinator-automation.md`
 * §10.1 step 1). This capsule is the sole owner of which brokered reference
 * kinds a decision class may request; nothing else in this pack recomputes
 * that truth (pack quality rules, one-owner rejection list).
 *
 * The normative spec names the eight reference kinds (§10.1) and states only
 * that D3 may request a wider affected subgraph while every request stays
 * bounded (§9.8) — it does not enumerate a kind-by-class table. This capsule
 * makes that assignment explicit and auditable: each class's allowed set is
 * a strict superset of the narrower class's, and only D3 (the widest,
 * architect-advisor-eligible class, `docs/spec/v1-contracts.md` §5) may
 * request review findings, repository state, or the push journal.
 */
import type {BrokerReferenceKind, DecisionClass} from '../../contracts/index.js';
import {BROKER_REFERENCE_KINDS} from '../../contracts/index.js';
import {brokerFailure} from './contextBrokerErrors.js';

const D1_KINDS: readonly BrokerReferenceKind[] = Object.freeze(['batch-brief', 'tracker-projection']);
const D2_KINDS: readonly BrokerReferenceKind[] = Object.freeze([...D1_KINDS, 'dependency-neighborhood', 'recent-events', 'policy-fragment']);
const D3_KINDS: readonly BrokerReferenceKind[] = Object.freeze([...D2_KINDS, 'review-finding', 'repository-state', 'push-journal']);

const ALLOWED_KINDS_BY_CLASS: Readonly<Record<DecisionClass, readonly BrokerReferenceKind[]>> = Object.freeze({
    D1: D1_KINDS,
    D2: D2_KINDS,
    D3: D3_KINDS
});

function isKnownKind(kind: string): kind is BrokerReferenceKind {
    return (BROKER_REFERENCE_KINDS as readonly string[]).includes(kind);
}

/** Every kind D3 is permitted; `D3_KINDS.length` equals `BROKER_REFERENCE_KINDS.length`, kept in sync by a spec assertion. */
export function allowedKindsForClass(decisionClass: DecisionClass): readonly BrokerReferenceKind[] {
    return ALLOWED_KINDS_BY_CLASS[decisionClass];
}

/** Fails closed with `BROKER_KIND_NOT_ALLOWLISTED` — never a silent downgrade or partial grant. */
export function checkAllowlisted(decisionClass: DecisionClass, kind: string, subject: string): BrokerReferenceKind {
    if (!isKnownKind(kind)) brokerFailure('BROKER_KIND_UNSUPPORTED', subject, `"${kind}" is not a recognized broker reference kind`);
    if (!allowedKindsForClass(decisionClass).includes(kind)) {
        brokerFailure('BROKER_KIND_NOT_ALLOWLISTED', subject, `decision class "${decisionClass}" is not permitted to request reference kind "${kind}"`);
    }
    return kind;
}
