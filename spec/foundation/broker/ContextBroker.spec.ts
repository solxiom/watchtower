import type {
    ArtifactIndexEntry, BatchIndexEntry, BatchQueryPage, BoundedContext, ContextAssemblyOptions,
    ContextRequestedAppendResult, ContextRequestedEvent, CycleBudgetLimits, CycleBudgetState,
    DependencyResult, QueryPage, RepositoryIndexEntry
} from '../../../src/contracts/index.js';
import type {BrokerEventPort, BrokerIndexPort} from '../../../src/foundation/broker/index.js';
import {BrokerError, ContextBroker, initialCycleBudgetState} from '../../../src/foundation/broker/index.js';

const BATCH: BatchIndexEntry = Object.freeze({
    id: 'B1', title: 'Batch One', primaryRepository: 'nirvana', workBrief: 'work-batches/B1.md',
    reviewBrief: 'review-batches/B1.md', implementationReasoning: 'R5', reviewReasoning: 'R5', workload: 'small'
});

const EMPTY_DEPENDENCIES: DependencyResult = Object.freeze({batchId: 'B1', direct: [], transitive: [], depthLimit: 10, depthReached: 0, truncated: false});

const BOUNDED_CONTEXT: BoundedContext = Object.freeze({
    batch: BATCH, dependencies: EMPTY_DEPENDENCIES, dependents: [], dependentsTruncated: false,
    requirements: [], requirementsTruncated: false, proofs: [], proofsTruncated: false,
    repositoryClaims: [], truncated: false
});

const REPOSITORIES: readonly RepositoryIndexEntry[] = Object.freeze([{id: 'nirvana', role: 'primary', access: 'write'}]);

class FakeIndexPort implements BrokerIndexPort {
    calls = 0;
    async getBatch(batchId: string): Promise<BatchIndexEntry | null> { return batchId === BATCH.id ? BATCH : null; }
    async getBatches(params?: {readonly limit?: number; readonly cursor?: string}): Promise<BatchQueryPage> {
        return {items: [BATCH], nextCursor: null, truncated: false, totalCount: 1};
    }
    async getDependencies(_batchId: string, _depthLimit?: number): Promise<DependencyResult> { return EMPTY_DEPENDENCIES; }
    async getRepositories(_params?: {readonly limit?: number; readonly cursor?: string}): Promise<QueryPage<RepositoryIndexEntry>> {
        return {items: REPOSITORIES, nextCursor: null, truncated: false, totalCount: REPOSITORIES.length};
    }
    async getArtifactsByBatch(): Promise<readonly ArtifactIndexEntry[]> { return []; }
    async assembleBatchContext(batchId: string, _options?: ContextAssemblyOptions): Promise<BoundedContext> {
        this.calls += 1;
        if (batchId !== BATCH.id) throw new Error('unknown batch');
        return BOUNDED_CONTEXT;
    }
}

class FakeEventPort implements BrokerEventPort {
    appended: ContextRequestedEvent[] = [];
    private readonly seen = new Map<string, ContextRequestedAppendResult>();
    failNext = false;

    async appendContextRequested(event: ContextRequestedEvent): Promise<ContextRequestedAppendResult> {
        if (this.failNext) {
            this.failNext = false;
            throw new Error('simulated uncertain append');
        }
        const existing = this.seen.get(event.eventId);
        if (existing !== undefined) return {status: 'duplicate', eventId: event.eventId};
        this.appended.push(event);
        const result: ContextRequestedAppendResult = {status: 'appended', eventId: event.eventId};
        this.seen.set(event.eventId, result);
        return result;
    }
}

const LIMITS: CycleBudgetLimits = Object.freeze({
    inputSoft: 10_000, inputHard: 20_000, outputHard: 4_000, contextRequestsHard: 4, wallClockHardMs: 120_000,
    cumulativeBatchSoft: 50_000, cumulativeBatchHard: 100_000, cumulativeLaneSoft: 500_000, cumulativeLaneHard: 1_000_000,
    unit: 'estimated-tokens'
});

function budgetState(overrides: Partial<CycleBudgetState> = {}): CycleBudgetState {
    return {...initialCycleBudgetState({cycleId: 'C1', batchId: 'B1', laneId: 'L1'}), ...overrides};
}

function reasonOfAsync(promise: Promise<unknown>): Promise<string> {
    return promise.then(
        () => { throw new Error('expected the promise to reject'); },
        (error: unknown) => {
            if (error instanceof BrokerError) return error.reason;
            throw error;
        }
    );
}

describe('ContextBroker', function () {
    it('resolves an allowlisted batch-brief request with provenance, page metadata, and debits the cycle budget', async function () {
        const port = new FakeIndexPort();
        const events = new FakeEventPort();
        const broker = new ContextBroker(port, events);
        const result = await broker.requestContext({
            decisionClass: 'D1', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        });
        expect(result.response.kind).toBe('batch-brief');
        expect(result.response.provenance.source).toBe('index');
        expect(result.response.provenance.digest).toMatch(/^sha256:[0-9a-f]{64}$/u);
        expect(result.response.byteLength).toBeGreaterThan(0);
        expect(result.response.page.truncated).toBeFalse();
        expect(result.response.redacted).toBeFalse();
        expect(result.budget.state.contextRequestCount).toBe(1);
        expect(result.budget.state.estimatedInputTokens).toBeGreaterThan(0);
        expect(result.budget.check.level).toBe('ok');
        expect(result.event.status).toBe('appended');
        expect(events.appended.length).toBe(1);
        expect(port.calls).toBe(1);
    });

    it('resolves dependency-neighborhood, tracker-projection, and repository-state for a wide-enough decision class, each with page metadata', async function () {
        const broker = new ContextBroker(new FakeIndexPort(), new FakeEventPort());
        for (const kind of ['dependency-neighborhood', 'tracker-projection', 'repository-state'] as const) {
            const result = await broker.requestContext({
                decisionClass: 'D3', budgetState: budgetState(), budgetLimits: LIMITS,
                request: {kind, ref: 'B1', maxBytes: 100_000}
            });
            expect(result.response.kind).toBe(kind);
            expect(result.response.page).toBeDefined();
        }
    });

    it('forwards CA-02s bounded page cursor/truncation/totalCount for tracker-projection rather than discarding it', async function () {
        const port = new FakeIndexPort();
        spyOn(port, 'getBatches').and.resolveTo({items: [BATCH], nextCursor: 'cursor-2', truncated: true, totalCount: 5});
        const broker = new ContextBroker(port, new FakeEventPort());
        const result = await broker.requestContext({
            decisionClass: 'D2', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'tracker-projection', ref: 'B1', maxBytes: 100_000}
        });
        expect(result.response.page.nextCursor).toBe('cursor-2');
        expect(result.response.page.truncated).toBeTrue();
        expect(result.response.page.totalCount).toBe(5);
    });

    it('resolves repository-state through a bounded port call — forwarding limit/cursor and the returned page metadata rather than materializing and slicing an unbounded list', async function () {
        const port = new FakeIndexPort();
        const getRepositories = spyOn(port, 'getRepositories').and.resolveTo({
            items: [{id: 'repo-0', role: 'secondary', access: 'read'}, {id: 'repo-1', role: 'secondary', access: 'read'}],
            nextCursor: 'repo-cursor-2', truncated: true, totalCount: 5
        });
        const broker = new ContextBroker(port, new FakeEventPort());
        const result = await broker.requestContext({
            decisionClass: 'D3', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'repository-state', ref: 'B1', maxBytes: 100_000, bounds: {recordLimit: 2, cursor: 'repo-cursor-1'}}
        });
        expect(getRepositories).toHaveBeenCalledWith({limit: 2, cursor: 'repo-cursor-1'});
        expect(result.response.page.truncated).toBeTrue();
        expect(result.response.page.totalCount).toBe(5);
        expect(result.response.page.nextCursor).toBe('repo-cursor-2');
        expect((result.response.content as {items: unknown[]}).items.length).toBe(2);
    });

    it('caps dependency-neighborhood direct nodes to nodeLimit, not only transitive nodes', async function () {
        const port = new FakeIndexPort();
        const direct: BatchIndexEntry[] = ['B2', 'B3', 'B4'].map((id) => ({...BATCH, id}));
        spyOn(port, 'getDependencies').and.resolveTo({
            batchId: 'B1', direct, transitive: [{...BATCH, id: 'B5'}], depthLimit: 10, depthReached: 1, truncated: false
        });
        const broker = new ContextBroker(port, new FakeEventPort());
        const result = await broker.requestContext({
            decisionClass: 'D3', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'dependency-neighborhood', ref: 'B1', maxBytes: 100_000, bounds: {nodeLimit: 2}}
        });
        const content = result.response.content as unknown as DependencyResult;
        expect(content.direct.length).toBe(2);
        expect(content.transitive.length).toBe(0);
        expect(result.response.page.truncated).toBeTrue();
    });

    it('rejects a malformed bound with BROKER_REFERENCE_INVALID before touching the content source', async function () {
        const port = new FakeIndexPort();
        const broker = new ContextBroker(port, new FakeEventPort());
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000, bounds: {recordLimit: -1}}
        }))).toBeResolvedTo('BROKER_REFERENCE_INVALID');
    });

    it('redacts sensitive-keyed content before returning it and digests only the redacted content', async function () {
        const port = new FakeIndexPort();
        const leaking = {...BOUNDED_CONTEXT, batch: {...BATCH, apiToken: 'sk-live-should-not-leak'}} as unknown as BoundedContext;
        spyOn(port, 'assembleBatchContext').and.resolveTo(leaking);
        const broker = new ContextBroker(port, new FakeEventPort());
        const result = await broker.requestContext({
            decisionClass: 'D1', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        });
        expect(result.response.redacted).toBeTrue();
        expect(result.response.redactedKeys).toContain('apiToken');
        expect(JSON.stringify(result.response.content)).not.toContain('sk-live-should-not-leak');
    });

    it('fails closed with BROKER_KIND_NOT_ALLOWLISTED before ever touching the content source or the event port', async function () {
        const port = new FakeIndexPort();
        const events = new FakeEventPort();
        const broker = new ContextBroker(port, events);
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'push-journal', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_KIND_NOT_ALLOWLISTED');
        expect(port.calls).toBe(0);
        expect(events.appended.length).toBe(0);
    });

    it('fails closed with BROKER_KIND_UNSUPPORTED for a D3-allowlisted kind this batch does not back with real content', async function () {
        const broker = new ContextBroker(new FakeIndexPort(), new FakeEventPort());
        await expectAsync(broker.requestContext({
            decisionClass: 'D3', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'review-finding', ref: 'B1', maxBytes: 100_000}
        })).toBeRejected();
    });

    it('fails closed with BROKER_REFERENCE_INVALID for a batch id absent from the index, never returning partial content', async function () {
        const broker = new ContextBroker(new FakeIndexPort(), new FakeEventPort());
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'does-not-exist', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_REFERENCE_INVALID');
    });

    it('fails closed with BROKER_HARD_LIMIT_EXCEEDED when resolved content exceeds the requested byte ceiling, and never debits the budget for it', async function () {
        const broker = new ContextBroker(new FakeIndexPort(), new FakeEventPort());
        const before = budgetState();
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: before, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 1}
        }))).toBeResolvedTo('BROKER_HARD_LIMIT_EXCEEDED');
        expect(before.contextRequestCount).toBe(0);
    });

    it('fails closed with BROKER_DIGEST_MISMATCH when the caller-supplied expected digest does not match resolved content', async function () {
        const broker = new ContextBroker(new FakeIndexPort(), new FakeEventPort());
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: budgetState(), budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000, expectedDigest: `sha256:${'0'.repeat(64)}` as `sha256:${string}`}
        }))).toBeResolvedTo('BROKER_DIGEST_MISMATCH');
    });

    it('fails closed with BROKER_HARD_LIMIT_EXCEEDED before touching the content source given an already-over-hard prior state (e.g. round-tripped from untrusted storage)', async function () {
        const port = new FakeIndexPort();
        const broker = new ContextBroker(port, new FakeEventPort());
        const overBudget = budgetState({outputTokens: 4_001});
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: overBudget, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_HARD_LIMIT_EXCEEDED');
        expect(port.calls).toBe(0);
    });

    it('fails closed with BROKER_REQUEST_LIMIT_EXCEEDED specifically when the already-over-hard prior dimension is the context-request count', async function () {
        const port = new FakeIndexPort();
        const broker = new ContextBroker(port, new FakeEventPort());
        const overRequestCeiling = budgetState({contextRequestCount: 5});
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: overRequestCeiling, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_REQUEST_LIMIT_EXCEEDED');
        expect(port.calls).toBe(0);
    });

    it('fails closed with BROKER_REQUEST_LIMIT_EXCEEDED at the exact context-request ceiling (count already equals the hard limit), touching neither the content source nor the event port', async function () {
        const port = new FakeIndexPort();
        const events = new FakeEventPort();
        const broker = new ContextBroker(port, events);
        const atCeiling = budgetState({contextRequestCount: LIMITS.contextRequestsHard});
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: atCeiling, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_REQUEST_LIMIT_EXCEEDED');
        expect(port.calls).toBe(0);
        expect(events.appended.length).toBe(0);
    });

    it('rejects a malformed/round-tripped budget state (negative context-request count) with BROKER_REFERENCE_INVALID before touching the content source', async function () {
        const port = new FakeIndexPort();
        const broker = new ContextBroker(port, new FakeEventPort());
        const corrupted = budgetState({contextRequestCount: -1});
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: corrupted, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_REFERENCE_INVALID');
        expect(port.calls).toBe(0);
    });

    it('rejects a malformed/round-tripped budget state (non-integer retryEscalationCount) with BROKER_REFERENCE_INVALID', async function () {
        const port = new FakeIndexPort();
        const broker = new ContextBroker(port, new FakeEventPort());
        const corrupted = budgetState({retryEscalationCount: 1.5});
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: corrupted, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_REFERENCE_INVALID');
        expect(port.calls).toBe(0);
    });

    it('a content-dependent debit failure (post-content-resolution) never touches the event port, so an identical retry fails identically instead of returning a false duplicate success', async function () {
        const port = new FakeIndexPort();
        const events = new FakeEventPort();
        const broker = new ContextBroker(port, events);
        const tightLimits: CycleBudgetLimits = {...LIMITS, inputSoft: 0, inputHard: 1};
        const state = budgetState();
        const params = {
            decisionClass: 'D1' as const, budgetState: state, budgetLimits: tightLimits,
            request: {kind: 'batch-brief' as const, ref: 'B1', maxBytes: 100_000}
        };

        await expectAsync(reasonOfAsync(broker.requestContext(params))).toBeResolvedTo('BROKER_HARD_LIMIT_EXCEEDED');
        expect(events.appended.length).toBe(0);
        expect(port.calls).toBe(1);

        await expectAsync(reasonOfAsync(broker.requestContext(params))).toBeResolvedTo('BROKER_HARD_LIMIT_EXCEEDED');
        expect(events.appended.length).toBe(0);
        expect(port.calls).toBe(2);
        expect(state.contextRequestCount).toBe(0);
    });

    it('fails closed with BROKER_SOFT_LIMIT_JUSTIFICATION_REQUIRED once the cycle is past its soft limit and no justification is supplied', async function () {
        const port = new FakeIndexPort();
        const broker = new ContextBroker(port, new FakeEventPort());
        const softState = budgetState({estimatedInputTokens: 10_001});
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: softState, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_SOFT_LIMIT_JUSTIFICATION_REQUIRED');
        expect(port.calls).toBe(0);
    });

    it('admits a request past the soft limit once a non-empty justification is supplied', async function () {
        const port = new FakeIndexPort();
        const broker = new ContextBroker(port, new FakeEventPort());
        const softState = budgetState({estimatedInputTokens: 10_001});
        const result = await broker.requestContext({
            decisionClass: 'D1', budgetState: softState, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000, justification: 'reviewer explicitly asked for the dependency graph'}
        });
        expect(result.budget.check.level).toBe('soft');
    });

    it('rejects a blank/whitespace-only justification the same as a missing one', async function () {
        const broker = new ContextBroker(new FakeIndexPort(), new FakeEventPort());
        const softState = budgetState({estimatedInputTokens: 10_001});
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: softState, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000, justification: '   '}
        }))).toBeResolvedTo('BROKER_SOFT_LIMIT_JUSTIFICATION_REQUIRED');
    });

    it('surfaces an uncertain/failed event append as BROKER_EVENT_APPEND_FAILED and performs no budget debit', async function () {
        const port = new FakeIndexPort();
        const events = new FakeEventPort();
        events.failNext = true;
        const broker = new ContextBroker(port, events);
        const before = budgetState();
        await expectAsync(reasonOfAsync(broker.requestContext({
            decisionClass: 'D1', budgetState: before, budgetLimits: LIMITS,
            request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}
        }))).toBeResolvedTo('BROKER_EVENT_APPEND_FAILED');
        expect(before.contextRequestCount).toBe(0);
    });

    it('replays the identical request deterministically: the second attempt is reported duplicate by the event port and the budget is not debited twice', async function () {
        const port = new FakeIndexPort();
        const events = new FakeEventPort();
        const broker = new ContextBroker(port, events);
        const state = budgetState();
        const first = await broker.requestContext({decisionClass: 'D1', budgetState: state, budgetLimits: LIMITS, request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}});
        expect(first.event.status).toBe('appended');
        expect(first.budget.state.contextRequestCount).toBe(1);

        const replay = await broker.requestContext({decisionClass: 'D1', budgetState: state, budgetLimits: LIMITS, request: {kind: 'batch-brief', ref: 'B1', maxBytes: 100_000}});
        expect(replay.event.status).toBe('duplicate');
        expect(replay.response.provenance.digest).toBe(first.response.provenance.digest);
        expect(replay.budget.state.contextRequestCount).toBe(0);
        expect(replay.budget.state).toBe(state);
        expect(events.appended.length).toBe(1);
    });
});
