/**
 * The context broker orchestrator (`docs/spec/coordinator-automation.md`
 * §10.1's seven-step algorithm). Sequences its owned collaborators —
 * allowlist, admission/budget ledger, content source, redaction/provenance,
 * event port — without absorbing their algorithms (pack quality rules,
 * front-door rejection rules). Every path is read-only-or-pure: the only
 * effectful collaborator is the injected `BrokerEventPort`; `requestContext`
 * never writes to disk or holds a lock itself, and it returns the next
 * `CycleBudgetState`/`CapacityPoolLedgerState` for the caller to persist.
 *
 * Step order: (1) allowlist; (2) a side-effect-free budget-admission
 * precondition, including an exact context-request-ceiling check that needs
 * no resolved content; (3) resolve content; (4) verify an expected digest;
 * (5) redact and enforce the byte ceiling; (6) compute the cycle-budget
 * debit — the accepted owner's one authoritative "apply" step, which is the
 * first point a content-dependent hard breach (actual token cost) can be
 * known; (7) publish the durable `coordinator-context-requested` event only
 * once that debit has been computed without throwing; (8) build the
 * response. This ordering (compute-then-publish, not publish-then-compute)
 * is deliberate: it guarantees the event port is never called for a request
 * whose debit fails, at any dimension, for any reason — including the exact
 * ceiling case and every content-dependent hard breach. Any failure at
 * (1)-(6) touches no durable/effectful collaborator at all, so a retry after
 * such a failure recomputes and fails identically rather than ever seeing a
 * stale `duplicate` from an event that was never recorded. Only a request
 * whose debit already succeeded can ever reach the event port, so a `duplicate`
 * result there is safe to treat as "already accounted for, do not re-debit" —
 * the false-duplicate-success failure mode (a retry after a genuine debit
 * failure silently returning content without ever having debited) is
 * structurally impossible under this order.
 */
import type {
    BrokerReferenceRequest, BrokerResponse, ContextRequestedAppendResult, CycleBudgetDebit, CycleBudgetLimits,
    CycleBudgetResult, CycleBudgetState, DecisionClass, JsonValue as ContractJsonValue
} from '../../contracts/index.js';
import {checkAllowlisted} from './contextBrokerAllowlist.js';
import {debitCycleBudget, evaluateCycleBudget, validateCycleBudgetLimits, validateCycleBudgetState} from './contextBrokerBudget.js';
import type {BrokerIndexPort} from './contextBrokerContentSource.js';
import {IndexBackedContentSource, resolveBounds} from './contextBrokerContentSource.js';
import {brokerFailure} from './contextBrokerErrors.js';
import type {BrokerEventPort} from './contextBrokerEventPort.js';
import {appendContextRequestedEvent, buildContextRequestedEvent} from './contextBrokerEventPort.js';
import {digestContent, enforceByteLimit, estimateTokens, redactJsonValue, verifyExpectedDigest} from './contextBrokerRedaction.js';

export interface ContextBrokerRequestParams {
    readonly decisionClass: DecisionClass;
    readonly request: BrokerReferenceRequest;
    readonly budgetState: CycleBudgetState;
    readonly budgetLimits: CycleBudgetLimits;
}

export interface ContextBrokerRequestResult {
    readonly response: BrokerResponse;
    readonly budget: CycleBudgetResult;
    readonly event: ContextRequestedAppendResult;
}

export interface ContextBrokerOptions {
    readonly clock?: () => string;
}

export class ContextBroker {
    private readonly contentSource: IndexBackedContentSource;
    private readonly clock: () => string;

    constructor(index: BrokerIndexPort, private readonly eventPort: BrokerEventPort, options: ContextBrokerOptions = {}) {
        this.contentSource = new IndexBackedContentSource(index);
        this.clock = options.clock ?? (() => new Date().toISOString());
    }

    async requestContext(params: ContextBrokerRequestParams): Promise<ContextBrokerRequestResult> {
        const kind = checkAllowlisted(params.decisionClass, params.request.kind, params.request.ref);
        const limits = validateCycleBudgetLimits(params.budgetLimits);
        this.enforceAdmission(params.budgetState, limits, params.request.justification);

        const bounds = resolveBounds(params.request.ref, params.request.bounds);
        const resolved = await this.contentSource.resolve(kind, params.request.ref, bounds);
        const redaction = redactJsonValue(resolved.content);
        const {digest, byteLength} = digestContent(redaction.content);
        verifyExpectedDigest(params.request.ref, params.request.expectedDigest, digest);
        enforceByteLimit(params.request.ref, byteLength, params.request.maxBytes);

        const estimatedTokens = estimateTokens(byteLength);
        const debit: CycleBudgetDebit = {estimatedInputTokens: estimatedTokens, brokerBytes: byteLength, contextRequests: 1};
        const budget = debitCycleBudget(params.budgetState, limits, debit);

        const event = buildContextRequestedEvent({
            cycleId: params.budgetState.cycleId, laneId: params.budgetState.laneId, batchId: params.budgetState.batchId,
            kind, ref: params.request.ref, digest, byteLength, requestedAt: this.clock()
        });
        const eventResult = await appendContextRequestedEvent(this.eventPort, event);

        const response: BrokerResponse = {
            kind, content: redaction.content as unknown as ContractJsonValue,
            provenance: {source: resolved.source, digest, ref: params.request.ref},
            byteLength, truncated: resolved.page.truncated, estimatedTokens, tokenEstimateQuality: 'estimated',
            page: resolved.page, redacted: redaction.redacted, redactedKeys: redaction.redactedKeys
        };

        if (eventResult.status === 'duplicate') {
            return {response, budget: {state: params.budgetState, check: evaluateCycleBudget(params.budgetState, limits)}, event: eventResult};
        }
        return {response, budget, event: eventResult};
    }

    /**
     * A pure, zero-side-effect precondition: refuses before touching the
     * content source or event port. The context-request ceiling gets its own
     * exact `>=` check here — independent of `evaluateCycleBudget`'s `>`
     * comparison over the *already-debited* state — because it is the one
     * dimension whose next debit (`contextRequests: 1`) is always known in
     * advance, so this batch can and must refuse the request that would
     * cross it before ever resolving content, not only after computing the
     * real (content-dependent) cost of input/output/wall-clock/cumulative
     * dimensions.
     */
    private enforceAdmission(state: CycleBudgetState, limits: CycleBudgetLimits, justification: string | undefined): void {
        validateCycleBudgetState(state);
        if (state.contextRequestCount >= limits.contextRequestsHard) {
            brokerFailure('BROKER_REQUEST_LIMIT_EXCEEDED', state.cycleId, `cycle already reached its hard context-request limit of ${limits.contextRequestsHard}`);
        }
        const prior = evaluateCycleBudget(state, limits);
        if (prior.level === 'hard') {
            brokerFailure('BROKER_HARD_LIMIT_EXCEEDED', state.cycleId, `cycle is already past its hard limit on: ${prior.exceededDimensions.join(', ')}`);
        }
        if (prior.level === 'soft' && (justification === undefined || justification.trim().length === 0)) {
            brokerFailure('BROKER_SOFT_LIMIT_JUSTIFICATION_REQUIRED', state.cycleId, `cycle is past its soft limit on: ${prior.exceededDimensions.join(', ')}; a non-empty justification is required to request more context`);
        }
    }
}
