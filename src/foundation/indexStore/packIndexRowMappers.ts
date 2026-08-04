/**
 * Pure typed-row → domain-entry translation for the closed `PACK_INDEX_SCHEMA`
 * table registry. `IndexStore` owns opening/verifying/indexing; this sibling
 * owns only the row shape each of the nine tables decodes into. No SQL, no
 * database handle — every function is a total, side-effect-free mapping over
 * an already-read `TypedRow`.
 */
import type {TypedRow} from '../storage/index.js';
import type {
    ArtifactIndexEntry, BatchIndexEntry, BatchRepositoryClaim, BatchRequirementRelation,
    DependencyEdge, ProofIndexEntry, RepositoryIndexEntry, RequirementIndexEntry
} from '../../contracts/index.js';

export function asText(row: TypedRow, key: string): string {
    const value = row[key];
    if (typeof value !== 'string') throw new TypeError(`pack-index row is missing required text column "${key}"`);
    return value;
}

export function asOptionalText(row: TypedRow, key: string): string | null {
    const value = row[key];
    return typeof value === 'string' ? value : null;
}

export function asByteCount(row: TypedRow, key: string): number {
    const value = row[key];
    if (typeof value !== 'bigint' && typeof value !== 'number') throw new TypeError(`pack-index row is missing required integer column "${key}"`);
    const asNumber = typeof value === 'bigint' ? Number(value) : value;
    if (!Number.isSafeInteger(asNumber) || asNumber < 0) throw new RangeError(`pack-index integer column "${key}" is out of range`);
    return asNumber;
}

export function asOptionalBoolean(row: TypedRow, key: string): boolean | null {
    const value = row[key];
    if (value === null || value === undefined) return null;
    if (typeof value === 'bigint') return value !== 0n;
    if (typeof value === 'number') return value !== 0;
    throw new TypeError(`pack-index row column "${key}" is not a boolean-shaped integer`);
}

export function toRepository(row: TypedRow): RepositoryIndexEntry {
    return {id: asText(row, 'id'), role: asText(row, 'role'), access: asText(row, 'access')};
}

export function toBatch(row: TypedRow): BatchIndexEntry {
    return {
        id: asText(row, 'id'), title: asText(row, 'title'), primaryRepository: asText(row, 'primary_repository'),
        workBrief: asText(row, 'work_brief'), reviewBrief: asText(row, 'review_brief'),
        implementationReasoning: asText(row, 'implementation_reasoning'), reviewReasoning: asText(row, 'review_reasoning'),
        workload: asText(row, 'workload')
    };
}

export function toDependency(row: TypedRow): DependencyEdge {
    return {batchId: asText(row, 'batch_id'), dependsOnBatchId: asText(row, 'depends_on_batch_id')};
}

export function toRequirement(row: TypedRow): RequirementIndexEntry {
    return {id: asText(row, 'id'), repository: asText(row, 'repository'), source: asText(row, 'source')};
}

export function toBatchRequirement(row: TypedRow): BatchRequirementRelation {
    return {batchId: asText(row, 'batch_id'), requirementId: asText(row, 'requirement_id'), relation: asText(row, 'relation')};
}

export function toBatchRepository(row: TypedRow): BatchRepositoryClaim {
    const rawPaths: unknown = JSON.parse(asText(row, 'paths'));
    const paths = Array.isArray(rawPaths) && rawPaths.every((entry) => typeof entry === 'string') ? rawPaths : [];
    return {
        batchId: asText(row, 'batch_id'), repositoryId: asText(row, 'repository_id'), access: asText(row, 'access'),
        claimMode: asText(row, 'claim_mode'), paths
    };
}

export function toProof(row: TypedRow): ProofIndexEntry {
    return {
        id: asText(row, 'id'), batchId: asText(row, 'batch_id'), kind: asText(row, 'kind'),
        proofClass: asOptionalText(row, 'proof_class'), repository: asOptionalText(row, 'repository'),
        path: asOptionalText(row, 'path'), optional: asOptionalBoolean(row, 'optional')
    };
}

export function toArtifact(row: TypedRow): ArtifactIndexEntry {
    return {
        ref: asText(row, 'ref'), repository: asText(row, 'repository'), path: asText(row, 'path'),
        sha256: asText(row, 'sha256'), bytes: asByteCount(row, 'bytes'), role: asText(row, 'role'),
        owningBatchId: asOptionalText(row, 'owning_batch_id')
    };
}
