/**
 * The read-only half of the specification-resolution command group (CA-25;
 * `docs/spec/specification-resolution.md` §9 "`show` and `sync-check` are
 * read-only").
 *
 * `show` projects the durable blocker record, bounded to its declared members
 * — never the conflicting documents' prose, which stays with the context
 * broker. `sync-check` answers from the accepted CA-10 active pack-revision
 * pointer, which already records `requiredCommit` and the worktrees still
 * awaiting synchronization; nothing here runs Git, rebases a worktree, or
 * changes a hold, and "synchronized" is read from that pointer rather than
 * decided locally.
 */
import type {JsonObject, JsonValue} from '../../../../contracts/index.js';
import {RelevantLaneDiscovery, selectLane} from '../../../discovery/index.js';
import type {DiscoveredLane, RelevantLaneQuery} from '../../../discovery/index.js';
import {readActiveRevision} from '../../../effect/packRevisionActivation.js';
import {nodeEffectFileSystem} from '../../../effect/nodeEffectFileSystem.js';
import type {EffectFileSystem} from '../../../effect/effectPorts.js';
import {isRfc3339DateTime} from '../../../schemaComposition/index.js';
import {NodeCoordinatorReadFileStore, type CoordinatorReadFileStore} from '../CoordinatorReadFileStore.js';
import {failure, hasExactShape, stringField} from '../coordinatorReadContracts.js';
import type {CoordinatorReadQuery} from '../CoordinatorReadService.js';

const REQUIRED = ['schemaVersion', 'blockerId', 'laneId', 'packId', 'packSeal', 'batchId', 'classification',
    'blockerKind', 'status', 'conflicts', 'affectedBatchIds', 'reportedAt'] as const;
const ALLOWED = [...REQUIRED, 'workerSessionId', 'impactDigest'] as const;
const KINDS = new Set(['contradiction', 'missing-decision']);
const STATUSES = new Set(['detected', 'held', 'advising', 'proposed', 'authority-review', 'amendment-in-progress',
    'amendment-accepted', 'activating', 'worktree-sync-required', 'revalidated', 'resumed', 'closed', 'rejected',
    'superseded', 'unresolved']);
const ID = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/u;
/** The v1 digest contract (`docs/spec/v1-contracts.md` §5): `sha256:` and 64 lowercase hex. */
const DIGEST = /^sha256:[0-9a-f]{64}$/u;

/**
 * The narrow lane-lookup surface this projection needs. `RelevantLaneDiscovery`
 * satisfies it structurally, so the accepted owner stays the only real
 * implementation while a spec can supply an exact lane set.
 */
export interface LaneLookupPort {
    discover(query: RelevantLaneQuery): {readonly lanes: readonly DiscoveredLane[]};
}

export interface SpecificationResolutionReadOptions {
    readonly discovery?: LaneLookupPort;
    readonly fileStore?: CoordinatorReadFileStore;
    readonly effectFiles?: EffectFileSystem;
}

export class SpecificationResolutionReadService {
    private readonly discovery: LaneLookupPort;
    private readonly files: CoordinatorReadFileStore;
    private readonly effectFiles: EffectFileSystem;

    constructor(options: SpecificationResolutionReadOptions = {}) {
        this.discovery = options.discovery ?? new RelevantLaneDiscovery();
        this.files = options.fileStore ?? new NodeCoordinatorReadFileStore();
        this.effectFiles = options.effectFiles ?? nodeEffectFileSystem;
    }

    /** The bounded durable blocker record for one blocker ID. */
    show(query: CoordinatorReadQuery, blockerId: string): JsonValue {
        if (!ID.test(blockerId)) return failure('COORDINATOR_ARGUMENT_INVALID', blockerId);
        const lane = this.lane(query);
        const path = `coordinator/specification-blockers/${blockerId}.json`;
        const read = this.files.readJson(lane.laneDir, path);
        if (!read.ok) return failure(read.reason, path, read.line);
        const record = blockerRecord(read.value, path, lane.laneId);
        if ('rejected' in record) return record.rejected;
        if (record.projection.blockerId !== blockerId) return failure('COORDINATOR_SCHEMA_MISMATCH', path);
        return envelope(lane.laneId, 'coordinator.resolution.show', record.projection);
    }

    /**
     * Whether one worktree still owes the operator an explicit synchronization
     * to the admitted specification revision.
     */
    syncCheck(query: CoordinatorReadQuery, blockerId: string, worktreeId: string): JsonValue {
        if (!ID.test(blockerId)) return failure('COORDINATOR_ARGUMENT_INVALID', blockerId);
        if (!ID.test(worktreeId)) return failure('COORDINATOR_ARGUMENT_INVALID', worktreeId);
        const lane = this.lane(query);
        let revision;
        try {
            revision = readActiveRevision(lane.laneDir, this.effectFiles);
        } catch (error) {
            return failure('COORDINATOR_SCHEMA_MISMATCH', error instanceof Error ? error.message : 'active-pack-revision');
        }
        // Named logically, not by path: CA-10 owns where the active-revision
        // pointer lives, and repeating that path here would be a second copy of
        // its layout.
        if (revision === null) return failure('COORDINATOR_CYCLE_UNAVAILABLE', 'active-pack-revision');
        // A pointer naming another lane is not this lane's evidence; answering
        // from it would report a synchronization state nobody admitted here.
        if (revision.laneId !== lane.laneId) return failure('COORDINATOR_SCHEMA_MISMATCH', 'active-pack-revision');
        if (revision.blockerId !== blockerId) return failure('COORDINATOR_ARGUMENT_INVALID', blockerId);
        const stale = revision.worktreeSyncRequired.includes(worktreeId);
        return envelope(lane.laneId, 'coordinator.resolution.sync-check', {
            blockerId, worktreeId, status: stale ? 'stale' : 'synchronized', satisfied: !stale,
            activeSeal: revision.activeSeal, requiredCommit: revision.requiredCommit,
            pendingWorktreeIds: [...revision.worktreeSyncRequired]
        });
    }

    private lane(query: CoordinatorReadQuery) {
        return selectLane(this.discovery.discover(query).lanes, query);
    }
}

type BlockerResult = {readonly rejected: JsonObject} | {readonly projection: JsonObject};

function blockerRecord(value: JsonValue, path: string, laneId: string): BlockerResult {
    if (!hasExactShape(value, REQUIRED, ALLOWED)) return {rejected: failure('COORDINATOR_SCHEMA_MISMATCH', path)};
    const conflicts = conflictList(value.conflicts);
    const batches = idList(value.affectedBatchIds);
    const blockerKind = stringField(value, 'blockerKind');
    const status = stringField(value, 'status');
    if (value.schemaVersion !== 1 || value.classification !== 'NORMATIVE_CONTRADICTION' || conflicts === null
        || batches === null || batches.length === 0 || blockerKind === null || !KINDS.has(blockerKind)
        || status === null || !STATUSES.has(status)
        || (blockerKind === 'contradiction' && conflicts.length < 2)) {
        return {rejected: failure('COORDINATOR_SCHEMA_MISMATCH', path)};
    }
    const strings = ['blockerId', 'laneId', 'packId', 'packSeal', 'batchId', 'reportedAt'] as const;
    const projected: Record<string, JsonValue> = {schemaVersion: 1, classification: 'NORMATIVE_CONTRADICTION', blockerKind, status};
    for (const key of strings) {
        const field = stringField(value, key);
        if (field === null) return {rejected: failure('COORDINATOR_SCHEMA_MISMATCH', path)};
        projected[key] = field;
    }
    // The record must belong to the lane the operator selected, and its declared
    // digest and timestamp members must satisfy the contract they claim; a
    // projection that relaxed either would present unverified bytes as fact.
    if (projected.laneId !== laneId || !DIGEST.test(projected.packSeal as string)
        || !isRfc3339DateTime(projected.reportedAt as string)) {
        return {rejected: failure('COORDINATOR_SCHEMA_MISMATCH', path)};
    }
    for (const key of ['workerSessionId', 'impactDigest'] as const) {
        const field = stringField(value, key);
        if (field === null) { if (key in value) return {rejected: failure('COORDINATOR_SCHEMA_MISMATCH', path)}; continue; }
        if (key === 'impactDigest' && !DIGEST.test(field)) return {rejected: failure('COORDINATOR_SCHEMA_MISMATCH', path)};
        projected[key] = field;
    }
    return {projection: {...projected, conflicts, affectedBatchIds: batches}};
}

function conflictList(value: JsonValue): JsonValue[] | null {
    if (!Array.isArray(value) || value.length === 0) return null;
    const conflicts: JsonValue[] = [];
    for (const item of value) {
        if (!hasExactShape(item, ['reference', 'digest', 'authorityRank'], ['reference', 'digest', 'authorityRank', 'evidenceRef'])) return null;
        const reference = stringField(item, 'reference');
        const digest = stringField(item, 'digest');
        const rank = item.authorityRank;
        if (reference === null || digest === null || !DIGEST.test(digest) || typeof rank !== 'number' || !Number.isSafeInteger(rank) || rank < 1) return null;
        const evidenceRef = stringField(item, 'evidenceRef');
        conflicts.push({reference, digest, authorityRank: rank, ...(evidenceRef === null ? {} : {evidenceRef})});
    }
    return conflicts;
}

function idList(value: JsonValue): string[] | null {
    if (!Array.isArray(value)) return null;
    const ids: string[] = [];
    for (const item of value) {
        if (typeof item !== 'string' || !ID.test(item) || ids.includes(item)) return null;
        ids.push(item);
    }
    return ids;
}

function envelope(laneId: string, operation: string, data: JsonValue): JsonObject {
    return {schemaVersion: 1, laneId, operation, ok: true, data};
}
