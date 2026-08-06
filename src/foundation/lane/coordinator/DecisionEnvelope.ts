import {IndexQueryError} from '../../../contracts/index.js';
import type {BoundedContext as IndexBoundedContext, ContextAssemblyOptions, CycleProjection, BatchProjection, LaneEventSummary} from '../../../contracts/index.js';
import type {
    BoundedContext, DecisionEnvelope, EnvelopeBatch, EnvelopeBudget, EnvelopeDigest, EnvelopeReference,
    EnvelopeTrigger, LaneProjection, PackIndexProvenance
} from '../../../contracts/decision.js';
import {compareRfc3339DateTimes} from '../../schemaComposition/index.js';
import {
    boundedLimit, computeEnvelopeDigest, freezeDeep, indexSection, journalSection, verifyEnvelopeDigest as verifyDigest,
    references, requiredText, untrusted, validateProjection, validateRoute, validateTrigger, validDate,
    unique, type EnvelopeVerificationInput, type ValidRoute
} from './decisionEnvelopeValues.js';
import {validateDecisionEnvelope} from './decisionEnvelopeSchema.js';
import {validateAuthoritativePredecessors, validateCurrentState, validatePredecessorEvidence, type AcceptanceReference} from './decisionPredecessor.js';
import {DecisionEnvelopeError, envelopeFailure, normalizeEnvelopeBuildError, type EnvelopeReason} from './decisionEnvelopeErrors.js';

export interface EnvelopeIndexQuery {
    assembleBatchContext(batchId: string, options?: ContextAssemblyOptions): Promise<IndexBoundedContext>;
    readonly packSealId?: string;
}

export interface EnvelopeJournalProjection {
    projectCycleStatus(cycleId: string): Promise<CycleProjection>;
    projectBatchStatus(batchId: string): Promise<BatchProjection>;
    projectLaneSummary(): Promise<LaneEventSummary>;
}

export interface EnvelopeRouteDecision {
    readonly routingRuleId: string;
    readonly decisionClass: string;
    readonly minimumCapability?: string | null;
    readonly permittedProposalTypes: readonly string[];
    readonly policyVersion: string;
    readonly policyDigest: string;
    readonly endpointAvailability?: Partial<{available: boolean; eligibleCount: number; capacityPoolId: string | null}>;
    readonly capacityPoolId?: string | null;
    readonly evidenceRefs?: readonly string[];
    readonly impactScope?: readonly string[];
    readonly packSealId?: string;
}

export interface PredecessorEvidenceResolver {
    resolvePredecessors(): Promise<unknown>;
    resolveCurrentState(): Promise<unknown>;
    resolveAcceptanceRecord(reference: AcceptanceReference): Promise<unknown>;
}

export interface EnvelopeParams {
    readonly cycleId: string;
    readonly laneId: string;
    readonly initiativeId: string;
    readonly trigger: EnvelopeTrigger;
    readonly laneProjection: LaneProjection;
    readonly batch: EnvelopeBatch;
    readonly findingRefs: readonly EnvelopeReference[];
    readonly budget: EnvelopeBudget;
    readonly predecessorEvidence: PredecessorEvidenceResolver;
    readonly routeDecision: EnvelopeRouteDecision;
    readonly indexQuery: EnvelopeIndexQuery;
    readonly journalProjection: EnvelopeJournalProjection;
    readonly operatorMessage?: string;
    readonly createdAt?: string;
    readonly expiresAt?: string;
    readonly maxJournalEntries?: number;
}

export interface DecisionEnvelopeBuilderOptions {
    readonly clock?: () => Date;
    readonly defaultTtlMs?: number;
    readonly maxJournalEntries?: number;
}

const DEFAULT_JOURNAL_ENTRIES = 50;
const DEFAULT_TTL_MS = 15 * 60 * 1000;

export class DecisionEnvelopeBuilder {
    private readonly clock: () => Date;
    private readonly defaultTtlMs: number;
    private readonly maxJournalEntries: number;

    constructor(options: DecisionEnvelopeBuilderOptions = {}) {
        this.clock = options.clock ?? (() => new Date());
        this.defaultTtlMs = options.defaultTtlMs ?? DEFAULT_TTL_MS;
        this.maxJournalEntries = boundedLimit(options.maxJournalEntries ?? DEFAULT_JOURNAL_ENTRIES, 'maxJournalEntries');
        if (!Number.isSafeInteger(this.defaultTtlMs) || this.defaultTtlMs < 1) envelopeFailure('ENVELOPE_BUILD_FAILED', 'builder', 'default TTL must be a positive safe integer');
    }

    async buildEnvelope(params: EnvelopeParams): Promise<DecisionEnvelope> {
        try {
            const predecessors = await this.resolvePredecessors(params.predecessorEvidence, params.laneId);
            const trigger = validateTrigger(params.trigger);
            const route = validateRoute(params.routeDecision);
            const index = await this.readIndex(params.indexQuery, trigger.batchId, predecessors.packIndex);
            if (index.batch.id !== trigger.batchId || params.batch.id !== trigger.batchId) envelopeFailure('ENVELOPE_BUILD_FAILED', trigger.batchId, 'batch references do not describe the triggering batch');
            const journal = await this.readJournal(params.journalProjection, params.cycleId, trigger.batchId, params.maxJournalEntries);
            const context = this.context(index, journal, route, trigger, params.operatorMessage, predecessors.packIndex.packSealId);
            const createdAt = validDate(params.createdAt ?? this.clock().toISOString(), 'createdAt');
            const expiresAt = validDate(params.expiresAt ?? new Date(Date.parse(createdAt) + this.defaultTtlMs).toISOString(), 'expiresAt');
            if (compareRfc3339DateTimes(createdAt, expiresAt) !== -1) envelopeFailure('ENVELOPE_BUILD_FAILED', params.cycleId, 'expiresAt must be after createdAt');
            const base: Omit<DecisionEnvelope, 'semanticDigest'> = {
                schemaVersion: 1, cycleId: requiredText(params.cycleId, 'cycleId'), laneId: requiredText(params.laneId, 'laneId'),
                initiativeId: requiredText(params.initiativeId, 'initiativeId'), decisionClass: route.decisionClass,
                routingRuleId: route.routingRuleId, packIndex: freezeDeep({...predecessors.packIndex}),
                trigger: freezeDeep({eventId: trigger.eventId, event: trigger.event, batchId: trigger.batchId}),
                laneProjection: freezeDeep(validateProjection(params.laneProjection)), batch: freezeDeep({...params.batch}),
                findingRefs: freezeDeep([...params.findingRefs]), permittedProposalTypes: freezeDeep([...route.permittedProposalTypes]),
                budget: freezeDeep({...params.budget}), boundedContext: context, createdAt, expiresAt
            };
            const envelope = freezeDeep({...base, semanticDigest: computeEnvelopeDigest(base)});
            return validateDecisionEnvelope(envelope);
        } catch (error) {
            throw normalizeEnvelopeBuildError(error, params.cycleId);
        }
    }

    computeEnvelopeDigest(envelope: DecisionEnvelope): EnvelopeDigest { return computeEnvelopeDigest(envelope); }
    verifyEnvelopeDigest(envelope: DecisionEnvelope, options?: EnvelopeVerificationInput): boolean { return verifyDigest(envelope, options); }

    private async resolvePredecessors(resolver: PredecessorEvidenceResolver, laneId: string): Promise<{packIndex: PackIndexProvenance}> {
        try {
            const value = await resolver.resolvePredecessors();
            const evidence = validatePredecessorEvidence(value, laneId);
            const current = validateCurrentState(await resolver.resolveCurrentState(), laneId);
            const records = await Promise.all([
                resolver.resolveAcceptanceRecord(evidence.index.acceptance),
                resolver.resolveAcceptanceRecord(evidence.projections.acceptance)
            ]);
            validateAuthoritativePredecessors(evidence, current, records, laneId);
            return {packIndex: evidence.index.packIndex};
        } catch (error) {
            if (error instanceof DecisionEnvelopeError) throw error;
            envelopeFailure('ENVELOPE_BUILD_FAILED', 'predecessorEvidence', 'accepted CA-02/CA-03 predecessor evidence is unavailable');
        }
    }

    private async readIndex(query: EnvelopeIndexQuery, batchId: string, packIndex: PackIndexProvenance): Promise<IndexBoundedContext> {
        try {
            if (query.packSealId !== undefined && query.packSealId !== packIndex.packSealId) envelopeFailure('ENVELOPE_BUILD_FAILED', 'predecessorEvidence.index.packIndex.packSealId', 'resolved index identity does not match the accepted pack seal');
            return await query.assembleBatchContext(batchId, {dependencyDepth: 10, dependentsLimit: 50, requirementsLimit: 50, proofsLimit: 50});
        } catch (error) {
            if (error instanceof IndexQueryError) envelopeFailure('ENVELOPE_INDEX_UNAVAILABLE', batchId, error.reason);
            throw error;
        }
    }

    private async readJournal(projection: EnvelopeJournalProjection, cycleId: string, batchId: string, requestedLimit?: number) {
        const limit = boundedLimit(requestedLimit ?? this.maxJournalEntries, 'maxJournalEntries');
        try {
            const [cycle, batch, lane] = await Promise.all([projection.projectCycleStatus(cycleId), projection.projectBatchStatus(batchId), projection.projectLaneSummary()]);
            return journalSection(cycle, batch, lane, limit);
        } catch (error) {
            throw error;
        }
    }

    private context(index: IndexBoundedContext, journal: ReturnType<typeof journalSection>, route: ValidRoute, trigger: EnvelopeTrigger, operatorMessage: string | undefined, packSealId: string): BoundedContext {
        const impactScope = unique([...trigger.impactScope ?? [], ...route.impactScope, trigger.batchId]);
        const indexEvidence = index.proofs.map((proof) => proof.repository !== null && proof.path !== null ? `${proof.repository}:${proof.path}` : proof.id);
        return freezeDeep({
            indexContext: indexSection(index, packSealId, references(indexEvidence, 'index'), impactScope),
            journalContext: {...journal, eventRefs: [...journal.eventRefs, ...references(trigger.evidenceRefs, 'journal')], impactScope},
            routingContext: {...route.context, evidenceRefs: references(route.evidenceRefs, 'routing'), impactScope}, untrustedContent: untrusted(operatorMessage)
        });
    }
}

export {DecisionEnvelopeError, ENVELOPE_REASONS, type EnvelopeReason} from './decisionEnvelopeErrors.js';
export {computeEnvelopeDigest, verifyEnvelopeDigest} from './decisionEnvelopeValues.js';
export {parseDecisionEnvelope, validateDecisionEnvelope} from './decisionEnvelopeSchema.js';
export type {EnvelopeVerificationInput} from './decisionEnvelopeValues.js';
