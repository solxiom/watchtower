/**
 * Builds the closed `PACK_INDEX_SCHEMA` typed rows from a validated manifest
 * document, proving every identifier cross-reference before a row reaches the
 * SQLite writer. LC-02 proves file-path references are sealed and the seal
 * reproduces; it does not prove batch/requirement/repository identifier graph
 * consistency, so that closed adversarial matrix is this module's own.
 *
 * Every lookup is a `Map`/`Set` membership test, so validation and row
 * construction are `O(entities)`, never quadratic in pack size (the "linear
 * build" proof).
 */
import type {TypedRow} from '../storage/index.js';
import {packIndexRejection, type PackIndexRejection} from '../../contracts/packIndex.js';
import type {ConsumedPack} from '../../contracts/pack.js';
import type {PackIndexManifestDocument} from './packIndexJsonReaders.js';

export interface PackIndexRows {
    readonly repository: readonly TypedRow[];
    readonly batch: readonly TypedRow[];
    readonly dependency: readonly TypedRow[];
    readonly requirement: readonly TypedRow[];
    readonly batch_requirement: readonly TypedRow[];
    readonly batch_repository: readonly TypedRow[];
    readonly proof: readonly TypedRow[];
    readonly artifact: readonly TypedRow[];
}

function invalid(target: string, detail: string): PackIndexRejection {
    return packIndexRejection('PACK_INDEX_ENTITY_INVALID', target, detail);
}

function uniqueIds<T>(items: readonly T[], key: (item: T) => string, kind: string): Set<string> | PackIndexRejection {
    const seen = new Set<string>();
    for (const item of items) {
        const id = key(item);
        if (seen.has(id)) return invalid(id, `duplicate ${kind} id`);
        seen.add(id);
    }
    return seen;
}

function sealedFileFor(pack: ConsumedPack, path: string): {sha256: string; bytes: number} | null {
    const file = pack.sealedFiles.find((entry) => entry.path === path);
    return file === undefined ? null : {sha256: file.sha256, bytes: file.bytes};
}

function briefArtifacts(batch: PackIndexManifestDocument['batches'][number], seen: Set<string>, pack: ConsumedPack): TypedRow[] {
    const rows: TypedRow[] = [];
    for (const [path, role] of [[batch.workBrief, 'work-brief'], [batch.reviewBrief, 'review-brief']] as const) {
        const ref = `${pack.packRepository}:${path}`;
        if (seen.has(ref)) continue;
        const sealed = sealedFileFor(pack, path);
        if (sealed === null) continue;
        seen.add(ref);
        rows.push({ref, repository: pack.packRepository, path, sha256: sealed.sha256, bytes: BigInt(sealed.bytes), role, owning_batch_id: batch.id});
    }
    return rows;
}

/** Every remaining sealed file becomes an artifact row; a pack-level named artifact keeps its logical role. */
function sealedFileArtifacts(document: PackIndexManifestDocument, pack: ConsumedPack, seen: Set<string>): TypedRow[] {
    const namedRoles = new Map(Object.entries(document.artifacts).map(([role, path]) => [path, role]));
    const rows: TypedRow[] = [];
    for (const file of pack.sealedFiles) {
        const ref = `${pack.packRepository}:${file.path}`;
        if (seen.has(ref)) continue;
        seen.add(ref);
        rows.push({
            ref, repository: pack.packRepository, path: file.path, sha256: file.sha256, bytes: BigInt(file.bytes),
            role: namedRoles.get(file.path) ?? 'sealed-file', owning_batch_id: null
        });
    }
    return rows;
}

function flattenRelations(relations: ReadonlyMap<string, ReadonlySet<string>>): TypedRow[] {
    const rows: TypedRow[] = [];
    for (const [key, values] of relations) {
        const [batchId, requirementId] = key.split(' ');
        for (const relation of values) rows.push({batch_id: batchId, requirement_id: requirementId, relation});
    }
    return rows.sort((left, right) => `${left.batch_id} ${left.requirement_id} ${left.relation}`
        .localeCompare(`${right.batch_id} ${right.requirement_id} ${right.relation}`));
}

interface RequirementPass {
    readonly rows: readonly TypedRow[];
    readonly relations: ReadonlyMap<string, ReadonlySet<string>>;
}

function buildRequirements(
    document: PackIndexManifestDocument, requireRepository: (id: string) => PackIndexRejection | null,
    requireBatch: (id: string) => PackIndexRejection | null
): RequirementPass | PackIndexRejection {
    const rows: TypedRow[] = [];
    const relations = new Map<string, Set<string>>();
    for (const req of document.requirements) {
        const repositoryFailure = requireRepository(req.repository);
        if (repositoryFailure !== null) return repositoryFailure;
        rows.push({id: req.id, repository: req.repository, source: req.source});
        for (const [batches, relation] of [[req.workBatches, 'work'], [req.reviewBatches, 'review']] as const) {
            for (const batchId of batches) {
                const batchFailure = requireBatch(batchId);
                if (batchFailure !== null) return batchFailure;
                const key = `${batchId} ${req.id}`;
                const set = relations.get(key) ?? new Set<string>();
                set.add(relation);
                relations.set(key, set);
            }
        }
    }
    return {rows, relations};
}

interface BatchPass {
    readonly batch: readonly TypedRow[];
    readonly dependency: readonly TypedRow[];
    readonly batchRepository: readonly TypedRow[];
    readonly proof: readonly TypedRow[];
    readonly artifact: readonly TypedRow[];
}

function buildBatches(
    document: PackIndexManifestDocument, pack: ConsumedPack, requirementIds: ReadonlySet<string>,
    relations: ReadonlyMap<string, ReadonlySet<string>>,
    requireRepository: (id: string) => PackIndexRejection | null, requireBatch: (id: string) => PackIndexRejection | null
): BatchPass | PackIndexRejection {
    const batch: TypedRow[] = [];
    const dependency: TypedRow[] = [];
    const batchRepository: TypedRow[] = [];
    const proof: TypedRow[] = [];
    const artifact: TypedRow[] = [];
    const artifactRefs = new Set<string>();

    for (const b of document.batches) {
        const primaryFailure = requireRepository(b.primaryRepository);
        if (primaryFailure !== null) return primaryFailure;
        batch.push({
            id: b.id, title: b.title, primary_repository: b.primaryRepository, work_brief: b.workBrief,
            review_brief: b.reviewBrief, implementation_reasoning: b.implementationReasoning,
            review_reasoning: b.reviewReasoning, workload: b.workload
        });

        for (const dependsOn of b.dependsOn) {
            const dependencyFailure = requireBatch(dependsOn);
            if (dependencyFailure !== null) return dependencyFailure;
            dependency.push({batch_id: b.id, depends_on_batch_id: dependsOn});
        }

        for (const reqId of b.requirements) {
            if (!requirementIds.has(reqId)) return invalid(reqId, 'undeclared requirement reference');
            const linked = relations.get(`${b.id} ${reqId}`);
            if (linked === undefined || linked.size === 0) {
                return invalid(`${b.id}:${reqId}`, 'requirement does not declare this batch as a work or review batch');
            }
        }

        const seenRepositoryIds = new Set<string>();
        for (const repo of b.repositories) {
            const repoFailure = requireRepository(repo.id);
            if (repoFailure !== null) return repoFailure;
            if (seenRepositoryIds.has(repo.id)) return invalid(`${b.id}:${repo.id}`, 'duplicate batch repository claim');
            seenRepositoryIds.add(repo.id);
            batchRepository.push({batch_id: b.id, repository_id: repo.id, access: repo.access, claim_mode: repo.claimMode, paths: JSON.stringify(repo.paths)});
        }

        b.proofClasses.forEach((proofClass, index) => {
            proof.push({id: `${b.id}::class::${index}`, batch_id: b.id, kind: 'class', proof_class: proofClass, repository: null, path: null, optional: null});
        });
        for (let index = 0; index < b.proofInputs.length; index += 1) {
            const input = b.proofInputs[index];
            const inputRepositoryFailure = requireRepository(input.repository);
            if (inputRepositoryFailure !== null) return inputRepositoryFailure;
            proof.push({id: `${b.id}::input::${index}`, batch_id: b.id, kind: 'input', proof_class: null, repository: input.repository, path: input.path, optional: input.optional ? 1n : 0n});
        }

        artifact.push(...briefArtifacts(b, artifactRefs, pack));
    }

    return {batch, dependency, batchRepository, proof, artifact: [...artifact, ...sealedFileArtifacts(document, pack, artifactRefs)]};
}

export function buildPackIndexRows(document: PackIndexManifestDocument, pack: ConsumedPack): PackIndexRows | PackIndexRejection {
    const repositoryIds = uniqueIds(document.repositories, (r) => r.id, 'repository');
    if (!(repositoryIds instanceof Set)) return repositoryIds;
    const batchIds = uniqueIds(document.batches, (b) => b.id, 'batch');
    if (!(batchIds instanceof Set)) return batchIds;
    const requirementIds = uniqueIds(document.requirements, (r) => r.id, 'requirement');
    if (!(requirementIds instanceof Set)) return requirementIds;

    const requireRepository = (id: string): PackIndexRejection | null => (repositoryIds.has(id) ? null : invalid(id, 'undeclared repository reference'));
    const requireBatch = (id: string): PackIndexRejection | null => (batchIds.has(id) ? null : invalid(id, 'undeclared batch reference'));

    const requirements = buildRequirements(document, requireRepository, requireBatch);
    if (!('rows' in requirements)) return requirements;

    const batches = buildBatches(document, pack, requirementIds, requirements.relations, requireRepository, requireBatch);
    if (!('batch' in batches)) return batches;

    return {
        repository: document.repositories.map((r) => ({id: r.id, role: r.role, access: r.access})),
        batch: batches.batch, dependency: batches.dependency, requirement: requirements.rows,
        batch_requirement: flattenRelations(requirements.relations), batch_repository: batches.batchRepository,
        proof: batches.proof, artifact: batches.artifact
    };
}
