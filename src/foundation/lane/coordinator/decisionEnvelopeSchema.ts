import type {DecisionEnvelope, EnvelopeReference} from '../../../contracts/decision.js';
import {isRfc3339DateTime} from '../../schemaComposition/index.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import {DecisionEnvelopeError, envelopeFailure} from './decisionEnvelopeErrors.js';

const DIGEST = /^sha256:[0-9a-f]{64}$/u;
const DECISION_CLASSES = ['D1', 'D2', 'D3'];

/** Closed, pre-effect validation boundary for serialized coordinator envelopes. */
export function parseDecisionEnvelope(text: string): DecisionEnvelope {
    if (typeof text !== 'string' || hasDuplicateJsonObjectKey(text)) {
        envelopeFailure('ENVELOPE_SCHEMA_INVALID', 'json', 'malformed or duplicate JSON member');
    }
    try {
        return validateDecisionEnvelope(JSON.parse(text) as unknown);
    } catch (error) {
        if (error instanceof DecisionEnvelopeError) throw error;
        envelopeFailure('ENVELOPE_SCHEMA_INVALID', 'json', 'invalid JSON');
    }
}

export function validateDecisionEnvelope(value: unknown): DecisionEnvelope {
    const envelope = object(value, 'envelope');
    exact(envelope, ['schemaVersion', 'cycleId', 'laneId', 'initiativeId', 'decisionClass', 'routingRuleId', 'packIndex', 'trigger', 'laneProjection', 'batch', 'findingRefs', 'permittedProposalTypes', 'budget', 'boundedContext', 'createdAt', 'expiresAt', 'semanticDigest'], 'envelope');
    if (envelope.schemaVersion !== 1 || !DECISION_CLASSES.includes(String(envelope.decisionClass))) fail('envelope', 'unsupported schema version or decision class');
    text(envelope.cycleId, 'cycleId'); text(envelope.laneId, 'laneId'); text(envelope.initiativeId, 'initiativeId'); text(envelope.routingRuleId, 'routingRuleId');
    date(envelope.createdAt, 'createdAt'); date(envelope.expiresAt, 'expiresAt'); digest(envelope.semanticDigest, 'semanticDigest');
    validatePackIndex(envelope.packIndex); validateTrigger(envelope.trigger); validateProjection(envelope.laneProjection); validateBatch(envelope.batch);
    refs(envelope.findingRefs, 'findingRefs'); strings(envelope.permittedProposalTypes, 'permittedProposalTypes'); validateBudget(envelope.budget); validateContext(envelope.boundedContext);
    return envelope as unknown as DecisionEnvelope;
}

function validatePackIndex(value: unknown): void {
    const pack = object(value, 'packIndex'); exact(pack, ['packSealId', 'manifestDigest', 'compilerVersion'], 'packIndex');
    text(pack.packSealId, 'packIndex.packSealId'); digest(pack.manifestDigest, 'packIndex.manifestDigest'); text(pack.compilerVersion, 'packIndex.compilerVersion');
}

function validateTrigger(value: unknown): void {
    const trigger = object(value, 'trigger'); exact(trigger, ['eventId', 'event', 'batchId'], 'trigger');
    text(trigger.eventId, 'trigger.eventId'); text(trigger.event, 'trigger.event'); text(trigger.batchId, 'trigger.batchId');
}

function validateProjection(value: unknown): void {
    const projection = object(value, 'laneProjection'); exact(projection, ['status', 'activeBatch', 'accepted', 'ready', 'blocked'], 'laneProjection');
    text(projection.status, 'laneProjection.status'); if (projection.activeBatch !== null) text(projection.activeBatch, 'laneProjection.activeBatch');
    strings(projection.accepted, 'laneProjection.accepted'); strings(projection.ready, 'laneProjection.ready'); strings(projection.blocked, 'laneProjection.blocked');
}

function validateBatch(value: unknown): void {
    const batch = object(value, 'batch'); exact(batch, ['id', 'briefRef', 'reasoningClass', 'repositories'], 'batch');
    text(batch.id, 'batch.id'); validateReference(batch.briefRef, 'batch.briefRef'); text(batch.reasoningClass, 'batch.reasoningClass'); strings(batch.repositories, 'batch.repositories');
}

function validateBudget(value: unknown): void {
    const budget = object(value, 'budget'); exact(budget, ['inputSoft', 'inputHard', 'outputHard', 'unit'], 'budget');
    for (const field of ['inputSoft', 'inputHard', 'outputHard']) {
        if (!Number.isSafeInteger(budget[field]) || Number(budget[field]) < 1) fail(`budget.${field}`, 'budget must be a positive safe integer');
    }
    if (Number(budget.inputSoft) > Number(budget.inputHard) || budget.unit !== 'estimated-tokens') fail('budget', 'budget bounds or unit are unsupported');
}

function validateContext(value: unknown): void {
    const context = object(value, 'boundedContext'); exact(context, ['indexContext', 'journalContext', 'routingContext', 'untrustedContent'], 'boundedContext');
    const index = object(context.indexContext, 'boundedContext.indexContext'); exact(index, ['packSealId', 'relevantBatches', 'evidenceRefs', 'impactScope', 'truncated'], 'indexContext');
    text(index.packSealId, 'indexContext.packSealId'); if (!Array.isArray(index.relevantBatches)) fail('indexContext.relevantBatches', 'must be an array'); index.relevantBatches.forEach((item, position) => validateIndexBatch(item, `indexContext.relevantBatches[${position}]`)); evidenceRefs(index.evidenceRefs, 'indexContext.evidenceRefs'); strings(index.impactScope, 'indexContext.impactScope'); boolean(index.truncated, 'indexContext.truncated');
    const journal = object(context.journalContext, 'boundedContext.journalContext'); exact(journal, ['recentEvents', 'cycle', 'batch', 'eventRefs', 'impactScope', 'maxJournalEntries', 'truncated'], 'journalContext');
    if (!Array.isArray(journal.recentEvents)) fail('journalContext.recentEvents', 'must be an array'); journal.recentEvents.forEach((item, position) => validateJournalEvent(item, `journalContext.recentEvents[${position}]`)); validateProjectionSummary(journal.cycle, 'journalContext.cycle'); validateProjectionSummary(journal.batch, 'journalContext.batch'); evidenceRefs(journal.eventRefs, 'journalContext.eventRefs'); strings(journal.impactScope, 'journalContext.impactScope');
    if (!Number.isSafeInteger(journal.maxJournalEntries) || Number(journal.maxJournalEntries) < 1 || Number(journal.maxJournalEntries) > 200) fail('journalContext.maxJournalEntries', 'journal bound is invalid'); boolean(journal.truncated, 'journalContext.truncated');
    const routing = object(context.routingContext, 'boundedContext.routingContext'); exact(routing, ['matchedRuleId', 'decisionClass', 'minimumCapability', 'permittedProposalTypes', 'policyVersion', 'policyDigest', 'endpointAvailability', 'evidenceRefs', 'impactScope'], 'routingContext');
    text(routing.matchedRuleId, 'routingContext.matchedRuleId'); if (!DECISION_CLASSES.includes(String(routing.decisionClass)) || !['C2', 'C3', 'C5'].includes(String(routing.minimumCapability))) fail('routingContext', 'unsupported routing class'); strings(routing.permittedProposalTypes, 'routingContext.permittedProposalTypes'); text(routing.policyVersion, 'routingContext.policyVersion'); digest(routing.policyDigest, 'routingContext.policyDigest'); validateEndpoint(routing.endpointAvailability); evidenceRefs(routing.evidenceRefs, 'routingContext.evidenceRefs'); strings(routing.impactScope, 'routingContext.impactScope');
    const untrusted = object(context.untrustedContent, 'untrustedContent'); exact(untrusted, ['trust', 'beginMarker', 'entries', 'endMarker'], 'untrustedContent');
    if (untrusted.trust !== 'untrusted' || untrusted.beginMarker !== 'BEGIN UNTRUSTED CONTENT' || untrusted.endMarker !== 'END UNTRUSTED CONTENT' || !Array.isArray(untrusted.entries)) fail('untrustedContent', 'trust delimiters are invalid');
    untrusted.entries.forEach((item, position) => { const entry = object(item, `untrustedContent.entries[${position}]`); exact(entry, ['source', 'content'], `untrustedContent.entries[${position}]`); if (!['operator', 'coordinator-response', 'external'].includes(String(entry.source))) fail(`untrustedContent.entries[${position}].source`, 'unsupported trust source'); text(entry.content, `untrustedContent.entries[${position}].content`); });
}

function validateReference(value: unknown, subject: string): void { const ref = object(value, subject); exact(ref, ['repository', 'path', 'digest'], subject); text(ref.repository, `${subject}.repository`); text(ref.path, `${subject}.path`); digest(ref.digest, `${subject}.digest`); }
function refs(value: unknown, subject: string): void { if (!Array.isArray(value)) fail(subject, 'must be an array'); value.forEach((item, index) => validateReference(item, `${subject}[${index}]`)); uniqueValues(value, subject); }
function evidenceRefs(value: unknown, subject: string): void { if (!Array.isArray(value)) fail(subject, 'must be an array'); value.forEach((item, index) => { const ref = object(item, `${subject}[${index}]`); exact(ref, ['reference', 'source'], `${subject}[${index}]`); text(ref.reference, `${subject}[${index}].reference`); if (!['index', 'journal', 'routing', 'untrusted'].includes(String(ref.source))) fail(`${subject}[${index}].source`, 'unsupported evidence source'); }); uniqueValues(value, subject); }
function strings(value: unknown, subject: string): void { if (!Array.isArray(value) || value.some((item) => typeof item !== 'string' || item.length === 0 || item.length > 512 || /[\u0000-\u001f\u007f]/u.test(item))) fail(subject, 'must be a bounded string array'); uniqueValues(value, subject); }
function uniqueValues(value: readonly unknown[], subject: string): void { const keys = value.map((item) => JSON.stringify(item)); if (new Set(keys).size !== keys.length) fail(subject, 'contains duplicate members'); }
function validateIndexBatch(value: unknown, subject: string): void { const batch = object(value, subject); exact(batch, ['batchId', 'title', 'primaryRepository', 'reasoningClass', 'workload', 'workBriefRef', 'reviewBriefRef', 'dependencyIds', 'requirementIds'], subject); text(batch.batchId, `${subject}.batchId`); text(batch.title, `${subject}.title`); text(batch.primaryRepository, `${subject}.primaryRepository`); text(batch.reasoningClass, `${subject}.reasoningClass`); text(batch.workload, `${subject}.workload`); text(batch.workBriefRef, `${subject}.workBriefRef`); text(batch.reviewBriefRef, `${subject}.reviewBriefRef`); strings(batch.dependencyIds, `${subject}.dependencyIds`); strings(batch.requirementIds, `${subject}.requirementIds`); }
function validateJournalEvent(value: unknown, subject: string): void { const event = object(value, subject); exact(event, ['eventId', 'type', 'sequence', 'at', 'batchId', 'cycleId', 'causationId'], subject); text(event.eventId, `${subject}.eventId`); text(event.type, `${subject}.type`); if (!Number.isSafeInteger(event.sequence) || Number(event.sequence) < 0) fail(`${subject}.sequence`, 'must be a non-negative integer'); date(event.at, `${subject}.at`); for (const field of ['batchId', 'cycleId', 'causationId']) if (event[field] !== null) text(event[field], `${subject}.${field}`); }
function validateProjectionSummary(value: unknown, subject: string): void { const projection = object(value, subject); exact(projection, ['state', 'lastEventType', 'eventCount'], subject); text(projection.state, `${subject}.state`); if (projection.lastEventType !== null) text(projection.lastEventType, `${subject}.lastEventType`); if (!Number.isSafeInteger(projection.eventCount) || Number(projection.eventCount) < 0) fail(`${subject}.eventCount`, 'must be a non-negative integer'); }
function validateEndpoint(value: unknown): void { const endpoint = object(value, 'routingContext.endpointAvailability'); exact(endpoint, ['available', 'eligibleCount', 'capacityPoolId'], 'endpointAvailability'); boolean(endpoint.available, 'endpointAvailability.available'); if (!Number.isSafeInteger(endpoint.eligibleCount) || Number(endpoint.eligibleCount) < 0) fail('endpointAvailability.eligibleCount', 'must be a non-negative integer'); if (endpoint.capacityPoolId !== null) text(endpoint.capacityPoolId, 'endpointAvailability.capacityPoolId'); }
function object(value: unknown, subject: string): Record<string, unknown> { if (typeof value !== 'object' || value === null || Array.isArray(value)) fail(subject, 'must be an object'); return value as Record<string, unknown>; }
function exact(value: Record<string, unknown>, keys: readonly string[], subject: string): void { const actual = Object.keys(value).sort(); const expected = [...keys].sort(); if (actual.length !== expected.length || actual.some((key, index) => key !== expected[index])) fail(subject, 'contains missing, extra, or unsupported members'); }
function text(value: unknown, subject: string): void { if (typeof value !== 'string' || value.length === 0 || value.length > 512 || /[\u0000-\u001f\u007f]/u.test(value)) fail(subject, 'must be bounded text'); }
function digest(value: unknown, subject: string): void { if (typeof value !== 'string' || !DIGEST.test(value)) fail(subject, 'must be a sha256 digest'); }
function date(value: unknown, subject: string): void { if (typeof value !== 'string' || !isRfc3339DateTime(value)) fail(subject, 'must be RFC 3339 date-time'); }
function boolean(value: unknown, subject: string): void { if (typeof value !== 'boolean') fail(subject, 'must be boolean'); }
function fail(subject: string, message: string): never { throw new DecisionEnvelopeError('ENVELOPE_SCHEMA_INVALID', subject, message); }
