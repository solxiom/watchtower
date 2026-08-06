import type {BoundedContext as IndexBoundedContext, CycleProjection, BatchProjection, DurableEvent, LaneEventSummary} from '../../../contracts/index.js';
import type {
    BoundedContext, DecisionClass, DecisionEnvelope, EndpointAvailability, EnvelopeDigest,
    EnvelopeTrigger, EvidenceReference, IndexBatchSummary, JournalContextSection, JournalEventReference,
    ProjectionSummary, RoutingContextSection, UntrustedContentEntry
} from '../../../contracts/decision.js';
import {compareRfc3339DateTimes, isRfc3339DateTime, semanticDigest} from '../../schemaComposition/index.js';
import type {JsonObject, JsonValue} from '../../schemaComposition/index.js';
import {envelopeFailure} from './decisionEnvelopeErrors.js';
import type {EnvelopeRouteDecision} from './DecisionEnvelope.js';

const MAX_JOURNAL_ENTRIES = 200;
const DIGEST = /^sha256:[0-9a-f]{64}$/u;

export interface ValidRoute {
    readonly routingRuleId: string;
    readonly decisionClass: DecisionClass;
    readonly minimumCapability: 'C2' | 'C3' | 'C5';
    readonly permittedProposalTypes: readonly string[];
    readonly policyVersion: string;
    readonly policyDigest: EnvelopeDigest;
    readonly endpointAvailability: EndpointAvailability;
    readonly evidenceRefs: readonly string[];
    readonly impactScope: readonly string[];
    readonly packSealId?: string;
    readonly context: RoutingContextSection;
}

export function validateTrigger(trigger: EnvelopeTrigger): EnvelopeTrigger {
    if (!trigger || requiredText(trigger.eventId, 'trigger.eventId') === '' || requiredText(trigger.event, 'trigger.event') === '' ||
        requiredText(trigger.batchId, 'trigger.batchId') === '' || (trigger.causationId !== undefined && trigger.causationId !== null && typeof trigger.causationId !== 'string')) {
        envelopeFailure('ENVELOPE_BUILD_FAILED', 'trigger', 'trigger is incomplete');
    }
    return trigger;
}

export function validateRoute(route: EnvelopeRouteDecision): ValidRoute {
    const decisionClass = route?.decisionClass;
    const capability = route?.minimumCapability;
    if (!route || !['D1', 'D2', 'D3'].includes(decisionClass) || !['C2', 'C3', 'C5'].includes(capability ?? '') ||
        !Array.isArray(route.permittedProposalTypes) || route.permittedProposalTypes.some((item) => typeof item !== 'string') || !DIGEST.test(route.policyDigest)) {
        envelopeFailure('ENVELOPE_BUILD_FAILED', route?.routingRuleId ?? 'route', 'route decision is incomplete or has an invalid digest');
    }
    const endpointAvailability: EndpointAvailability = {
        available: route.endpointAvailability?.available ?? true, eligibleCount: route.endpointAvailability?.eligibleCount ?? 1,
        capacityPoolId: route.endpointAvailability?.capacityPoolId ?? route.capacityPoolId ?? null
    };
    if (!Number.isSafeInteger(endpointAvailability.eligibleCount) || endpointAvailability.eligibleCount < 0) {
        envelopeFailure('ENVELOPE_BUILD_FAILED', route.routingRuleId, 'endpoint availability count is invalid');
    }
    const context: RoutingContextSection = {
        matchedRuleId: requiredText(route.routingRuleId, 'route.routingRuleId'), decisionClass: decisionClass as DecisionClass,
        minimumCapability: capability as ValidRoute['minimumCapability'], permittedProposalTypes: Object.freeze([...route.permittedProposalTypes]),
        policyVersion: requiredText(route.policyVersion, 'route.policyVersion'), policyDigest: route.policyDigest as EnvelopeDigest,
        endpointAvailability: freezeDeep(endpointAvailability), evidenceRefs: [], impactScope: []
    };
    return {
        routingRuleId: requiredText(route.routingRuleId, 'route.routingRuleId'), decisionClass: decisionClass as DecisionClass,
        minimumCapability: capability as ValidRoute['minimumCapability'], permittedProposalTypes: [...route.permittedProposalTypes],
        policyVersion: requiredText(route.policyVersion, 'route.policyVersion'), policyDigest: route.policyDigest as EnvelopeDigest,
        endpointAvailability, evidenceRefs: [...route.evidenceRefs ?? []], impactScope: [...route.impactScope ?? []], packSealId: route.packSealId, context
    };
}

export function validateProjection(projection: DecisionEnvelope['laneProjection']): DecisionEnvelope['laneProjection'] {
    if (!projection || requiredText(projection.status, 'laneProjection.status') === '' ||
        (projection.activeBatch !== null && typeof projection.activeBatch !== 'string') ||
        !stringArray(projection.accepted) || !stringArray(projection.ready) || !stringArray(projection.blocked)) {
        envelopeFailure('ENVELOPE_BUILD_FAILED', 'laneProjection', 'lane projection is incomplete');
    }
    return projection;
}

export function indexSection(index: IndexBoundedContext, packSealId: string, evidenceRefs: readonly EvidenceReference[], impactScope: readonly string[]): BoundedContext['indexContext'] {
    const dependencyIds = unique([...index.dependencies.direct, ...index.dependencies.transitive].map((batch) => batch.id));
    const batch: IndexBatchSummary = {
        batchId: index.batch.id, title: index.batch.title, primaryRepository: index.batch.primaryRepository,
        reasoningClass: index.batch.implementationReasoning, workload: index.batch.workload,
        workBriefRef: index.batch.workBrief, reviewBriefRef: index.batch.reviewBrief,
        dependencyIds, requirementIds: index.requirements.map((requirement) => requirement.id)
    };
    return {packSealId: requiredText(packSealId, 'packIndex.packSealId'), relevantBatches: Object.freeze([freezeDeep(batch)]), evidenceRefs: Object.freeze([...evidenceRefs]), impactScope: Object.freeze([...impactScope]), truncated: index.truncated};
}

export function journalSection(cycle: CycleProjection, batch: BatchProjection, lane: LaneEventSummary, limit: number): JournalContextSection {
    const recentEvents = lane.recent.slice(0, limit).map(eventReference);
    return {
        recentEvents: Object.freeze(recentEvents), cycle: projection(cycle),
        batch: {state: batch.state, lastEventType: batch.lastEventType, eventCount: batch.handoffs.length + batch.blocked.length + batch.accepts.length + batch.rejects.length},
        eventRefs: Object.freeze(references(recentEvents.map((event) => event.eventId), 'journal')), impactScope: Object.freeze([]),
        maxJournalEntries: limit, truncated: lane.recent.length > limit
    };
}

function eventReference(event: DurableEvent): JournalEventReference {
    return {eventId: event.eventId, type: event.type, sequence: event.sequence, at: event.at, batchId: event.batchId ?? null, cycleId: event.cycleId ?? null, causationId: event.causationId};
}

function projection(value: CycleProjection): ProjectionSummary { return {state: value.state, lastEventType: null, eventCount: value.eventCount}; }

export function untrusted(operatorMessage?: string) {
    const entries: UntrustedContentEntry[] = operatorMessage === undefined ? [] : [{source: 'operator', content: operatorMessage}];
    if (entries.some((entry) => entry.content.length > 16_384)) envelopeFailure('ENVELOPE_BUILD_FAILED', 'operatorMessage', 'untrusted content exceeds the bounded message limit');
    return {trust: 'untrusted' as const, beginMarker: 'BEGIN UNTRUSTED CONTENT' as const, entries: Object.freeze(entries), endMarker: 'END UNTRUSTED CONTENT' as const};
}

export function snapshotBasis(context: BoundedContext, packSealId: string): JsonValue {
    return {packSealId, index: context.indexContext as unknown as JsonValue, journal: context.journalContext as unknown as JsonValue, routing: context.routingContext as unknown as JsonValue};
}

export function digestValue(value: string | undefined, fallback: JsonValue): EnvelopeDigest {
    if (value !== undefined && !DIGEST.test(value)) envelopeFailure('ENVELOPE_BUILD_FAILED', 'snapshotDigest', 'snapshot digest is not sha256:<64 hex>');
    return (value ?? semanticDigest(fallback)) as EnvelopeDigest;
}

export function computeEnvelopeDigest(envelope: Omit<DecisionEnvelope, 'semanticDigest'> | DecisionEnvelope): EnvelopeDigest {
    return semanticDigest({
        schemaVersion: envelope.schemaVersion, laneId: envelope.laneId, initiativeId: envelope.initiativeId,
        decisionClass: envelope.decisionClass, routingRuleId: envelope.routingRuleId, packIndex: envelope.packIndex,
        trigger: envelope.trigger, laneProjection: envelope.laneProjection, batch: envelope.batch,
        findingRefs: envelope.findingRefs, permittedProposalTypes: envelope.permittedProposalTypes, budget: envelope.budget,
        boundedContext: contextJson(envelope.boundedContext), expiresAt: envelope.expiresAt
    } as unknown as JsonValue);
}

export type EnvelopeVerificationInput = string | Readonly<{currentSnapshotDigest?: string; now?: string}>;

export function verifyEnvelopeDigest(envelope: DecisionEnvelope, options?: EnvelopeVerificationInput): boolean {
    const currentSnapshotDigest = typeof options === 'string' ? options : options?.currentSnapshotDigest;
    const now = typeof options === 'object' && options?.now !== undefined ? options.now : new Date().toISOString();
    if (!isRfc3339DateTime(now) || compareRfc3339DateTimes(envelope.expiresAt, now) !== 1) envelopeFailure('ENVELOPE_EXPIRED', envelope.cycleId, 'decision envelope is expired');
    if (currentSnapshotDigest !== undefined && currentSnapshotDigest !== envelope.packIndex.manifestDigest) envelopeFailure('ENVELOPE_STALE_SNAPSHOT', envelope.cycleId, 'pack-index snapshot digest no longer matches current state');
    if (!DIGEST.test(envelope.semanticDigest) || computeEnvelopeDigest(envelope) !== envelope.semanticDigest) envelopeFailure('ENVELOPE_DIGEST_MISMATCH', envelope.cycleId, 'stored semantic digest differs from recomputed digest');
    return true;
}

function contextJson(context: BoundedContext): JsonObject {
    return {indexContext: context.indexContext as unknown as JsonValue, journalContext: context.journalContext as unknown as JsonValue, routingContext: context.routingContext as unknown as JsonValue, untrustedContent: context.untrustedContent as unknown as JsonValue};
}

export function requiredText(value: unknown, subject: string): string {
    if (typeof value !== 'string' || value.length === 0 || value.length > 512 || /[\u0000-\u001f\u007f]/u.test(value)) envelopeFailure('ENVELOPE_BUILD_FAILED', subject, 'required text is invalid');
    return value;
}

export function validDate(value: string, subject: string): string {
    if (!isRfc3339DateTime(value)) envelopeFailure('ENVELOPE_BUILD_FAILED', subject, 'timestamp is not RFC 3339');
    return value;
}

export function boundedLimit(value: number, subject: string): number {
    if (!Number.isSafeInteger(value) || value < 1 || value > MAX_JOURNAL_ENTRIES) envelopeFailure('ENVELOPE_BUILD_FAILED', subject, `limit must be in 1..${MAX_JOURNAL_ENTRIES}`);
    return value;
}

function stringArray(value: unknown): value is readonly string[] {
    return Array.isArray(value) && value.every((item) => typeof item === 'string' && item.length > 0) && unique(value).length === value.length;
}

export function unique(values: readonly string[]): readonly string[] { return [...new Set(values)].sort(); }
export function references(values: readonly string[] | undefined, source: EvidenceReference['source']): EvidenceReference[] { return unique(values ?? []).map((reference) => ({reference, source})); }
export function freezeDeep<T>(value: T): T {
    if (typeof value === 'object' && value !== null && !Object.isFrozen(value)) { for (const child of Object.values(value as Record<string, unknown>)) freezeDeep(child); Object.freeze(value); }
    return value;
}
