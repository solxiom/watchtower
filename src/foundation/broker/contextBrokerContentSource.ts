/**
 * Brokered content resolution (`docs/spec/coordinator-automation.md` §10.1
 * steps 2-3: resolve logical paths safely, verify expected digests). CA-08's
 * declared predecessors are exactly CA-02, CA-06, CA-07, so only the
 * reference kinds a CA-02 index query can back are resolved with real data
 * here: `batch-brief`, `dependency-neighborhood`, `tracker-projection`, and
 * `repository-state`. `recent-events`/`push-journal` need the CA-03 runtime
 * journal and `review-finding` needs CA-09/CA-12 proposal/review evidence —
 * neither is an accepted CA-08 predecessor, so those kinds fail closed with
 * `BROKER_KIND_UNSUPPORTED` rather than reading an un-owned store. A future
 * batch that owns those predecessors adds its own `BrokerContentSource` and
 * composes it alongside this one; this module never grows into their owner.
 *
 * Every resolved kind reports a closed `BrokerPage`: CA-02's own bounded
 * page/cursor/truncation metadata is forwarded verbatim for `tracker-
 * projection` (never discarded), CA-02's depth-limited dependency-walk
 * metadata is forwarded for `dependency-neighborhood` (both direct and
 * transitive node counts capped to `nodeLimit`, never only one), and
 * `repository-state` is resolved through the same bounded-at-the-port
 * shape — `BrokerIndexPort.getRepositories` itself takes `limit`/`cursor`
 * and returns a closed page — so this module never materializes an
 * unbounded array and slices it after the fact.
 */
import type {
    ArtifactIndexEntry, BatchIndexEntry, BatchQueryPage, BoundedContext, ContextAssemblyOptions,
    DependencyResult, QueryPage, RepositoryIndexEntry
} from '../../contracts/index.js';
import type {BrokerPage, BrokerQueryBounds, BrokerReferenceKind} from '../../contracts/index.js';
import type {EvidenceSource} from '../../contracts/decision.js';
import type {JsonValue} from '../schemaComposition/index.js';
import {brokerFailure} from './contextBrokerErrors.js';

/** The narrow CA-02 read surface this capsule injects; never the concrete `IndexQuery` class. */
export interface BrokerIndexPort {
    getBatch(batchId: string): Promise<BatchIndexEntry | null>;
    getBatches(params?: {readonly limit?: number; readonly cursor?: string}): Promise<BatchQueryPage>;
    getDependencies(batchId: string, depthLimit?: number): Promise<DependencyResult>;
    getRepositories(params?: {readonly limit?: number; readonly cursor?: string}): Promise<QueryPage<RepositoryIndexEntry>>;
    getArtifactsByBatch(batchId: string, limit: number): Promise<readonly ArtifactIndexEntry[]>;
    assembleBatchContext(batchId: string, options?: ContextAssemblyOptions): Promise<BoundedContext>;
}

export interface ResolvedBrokerContent {
    readonly content: JsonValue;
    readonly source: EvidenceSource;
    readonly page: BrokerPage;
}

const DEFAULT_RECORD_LIMIT = 50;
const MAX_RECORD_LIMIT = 200;
const DEFAULT_DEPTH_LIMIT = 10;
const MAX_DEPTH_LIMIT = 10;
const DEFAULT_NODE_LIMIT = 100;
const MAX_NODE_LIMIT = 500;

export interface ResolvedBounds {
    readonly recordLimit: number;
    readonly depthLimit: number;
    readonly nodeLimit: number;
    readonly cursor: string | undefined;
}

function boundedInt(subject: string, field: string, value: number | undefined, fallback: number, max: number): number {
    if (value === undefined) return fallback;
    if (!Number.isSafeInteger(value) || value < 1 || value > max) {
        brokerFailure('BROKER_REFERENCE_INVALID', subject, `bounds.${field} must be an integer between 1 and ${max}`);
    }
    return value;
}

/** Fails closed on a malformed bound rather than silently clamping it to something the caller did not ask for. */
export function resolveBounds(subject: string, bounds: BrokerQueryBounds | undefined): ResolvedBounds {
    return {
        recordLimit: boundedInt(subject, 'recordLimit', bounds?.recordLimit, DEFAULT_RECORD_LIMIT, MAX_RECORD_LIMIT),
        depthLimit: boundedInt(subject, 'depthLimit', bounds?.depthLimit, DEFAULT_DEPTH_LIMIT, MAX_DEPTH_LIMIT),
        nodeLimit: boundedInt(subject, 'nodeLimit', bounds?.nodeLimit, DEFAULT_NODE_LIMIT, MAX_NODE_LIMIT),
        cursor: bounds?.cursor
    };
}

function batchListJson(items: readonly BatchIndexEntry[]): JsonValue {
    return {items: items as unknown as JsonValue};
}

function repositoryListJson(items: readonly RepositoryIndexEntry[]): JsonValue {
    return {items: items as unknown as JsonValue};
}

/**
 * Caps an already-resolved dependency neighborhood to `nodeLimit` total
 * nodes without discarding CA-02's own depth metadata. Direct nodes are
 * capped first (they are the caller's primary interest and always fit
 * within `nodeLimit` on their own budget), then the remaining budget goes
 * to transitive nodes — so a `nodeLimit` smaller than the direct-node count
 * still bounds the direct set instead of returning it in full.
 */
function applyNodeLimit(dependencies: DependencyResult, nodeLimit: number): {dependencies: DependencyResult; truncated: boolean} {
    const direct = dependencies.direct.slice(0, nodeLimit);
    const directTruncated = direct.length < dependencies.direct.length;
    const transitiveBudget = Math.max(0, nodeLimit - direct.length);
    const transitive = dependencies.transitive.slice(0, transitiveBudget);
    const transitiveTruncated = transitive.length < dependencies.transitive.length;
    const truncated = dependencies.truncated || directTruncated || transitiveTruncated;
    if (!directTruncated && !transitiveTruncated) return {dependencies, truncated: dependencies.truncated};
    return {dependencies: {...dependencies, direct, transitive}, truncated};
}

/** Resolves the four index-backed kinds; every other kind is an explicit, typed unsupported refusal. */
export class IndexBackedContentSource {
    constructor(private readonly index: BrokerIndexPort) {}

    async resolve(kind: BrokerReferenceKind, ref: string, bounds: ResolvedBounds): Promise<ResolvedBrokerContent> {
        switch (kind) {
            case 'batch-brief':
                return this.batchBrief(ref, bounds);
            case 'dependency-neighborhood':
                return this.dependencyNeighborhood(ref, bounds);
            case 'tracker-projection':
                return this.trackerProjection(bounds);
            case 'repository-state':
                return this.repositoryState(bounds);
            default:
                brokerFailure('BROKER_KIND_UNSUPPORTED', ref, `reference kind "${kind}" has no content source in this batch's owned boundary`);
        }
    }

    private async batchBrief(batchId: string, bounds: ResolvedBounds): Promise<ResolvedBrokerContent> {
        const batch = await this.index.getBatch(batchId);
        if (batch === null) brokerFailure('BROKER_REFERENCE_INVALID', batchId, `no batch with id "${batchId}" is present in the pack index`);
        const context = await this.index.assembleBatchContext(batchId, {
            dependencyDepth: bounds.depthLimit,
            dependentsLimit: bounds.recordLimit, requirementsLimit: bounds.recordLimit, proofsLimit: bounds.recordLimit
        });
        const {dependencies, truncated: nodeTruncated} = applyNodeLimit(context.dependencies, bounds.nodeLimit);
        const truncated = context.truncated || nodeTruncated;
        const content = {...context, dependencies} as unknown as JsonValue;
        const page: BrokerPage = {
            nextCursor: null, truncated, totalCount: null,
            depthLimit: dependencies.depthLimit, depthReached: dependencies.depthReached, nodeLimit: bounds.nodeLimit
        };
        return {content, source: 'index', page};
    }

    private async dependencyNeighborhood(batchId: string, bounds: ResolvedBounds): Promise<ResolvedBrokerContent> {
        const result = await this.index.getDependencies(batchId, bounds.depthLimit);
        const {dependencies, truncated} = applyNodeLimit(result, bounds.nodeLimit);
        const page: BrokerPage = {
            nextCursor: null, truncated, totalCount: result.direct.length + result.transitive.length,
            depthLimit: dependencies.depthLimit, depthReached: dependencies.depthReached, nodeLimit: bounds.nodeLimit
        };
        return {content: dependencies as unknown as JsonValue, source: 'index', page};
    }

    private async trackerProjection(bounds: ResolvedBounds): Promise<ResolvedBrokerContent> {
        const result = await this.index.getBatches({limit: bounds.recordLimit, cursor: bounds.cursor});
        const page: BrokerPage = {
            nextCursor: result.nextCursor, truncated: result.truncated, totalCount: result.totalCount,
            depthLimit: null, depthReached: null, nodeLimit: null
        };
        return {content: batchListJson(result.items), source: 'index', page};
    }

    /** Bounded at the injected port itself: `BrokerIndexPort.getRepositories` takes `limit`/`cursor` and returns a closed page, never an unbounded array this module then slices. */
    private async repositoryState(bounds: ResolvedBounds): Promise<ResolvedBrokerContent> {
        const result = await this.index.getRepositories({limit: bounds.recordLimit, cursor: bounds.cursor});
        const page: BrokerPage = {
            nextCursor: result.nextCursor, truncated: result.truncated, totalCount: result.totalCount,
            depthLimit: null, depthReached: null, nodeLimit: null
        };
        return {content: repositoryListJson(result.items), source: 'index', page};
    }
}
