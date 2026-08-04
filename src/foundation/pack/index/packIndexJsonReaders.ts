/**
 * Unknown-to-typed narrowing for the re-read `implementation-pack.json` manifest
 * (`docs/spec/schemas/v1.schema.json#/$defs/implementationPack`). Schema-shape
 * validity is proven separately by the AJV validator compiled in
 * `loadPackSchemaValidators`; these readers extract only the entity fields the
 * compiler's row builder consumes, dropping any field it does not own.
 */

export interface PackIndexRepository {
    readonly id: string;
    readonly role: string;
    readonly access: string;
}

export interface PackIndexRequirement {
    readonly id: string;
    readonly repository: string;
    readonly source: string;
    readonly workBatches: readonly string[];
    readonly reviewBatches: readonly string[];
}

export interface PackIndexBatchRepository {
    readonly id: string;
    readonly access: string;
    readonly claimMode: string;
    readonly paths: readonly string[];
}

export interface PackIndexProofInput {
    readonly repository: string;
    readonly path: string;
    readonly optional: boolean;
}

export interface PackIndexBatch {
    readonly id: string;
    readonly title: string;
    readonly dependsOn: readonly string[];
    readonly primaryRepository: string;
    readonly workBrief: string;
    readonly reviewBrief: string;
    readonly requirements: readonly string[];
    readonly repositories: readonly PackIndexBatchRepository[];
    readonly implementationReasoning: string;
    readonly reviewReasoning: string;
    readonly workload: string;
    readonly proofClasses: readonly string[];
    readonly proofInputs: readonly PackIndexProofInput[];
}

export interface PackIndexManifestArtifacts {
    readonly readme: string;
    readonly traceability: string;
    readonly implementationMap: string;
    readonly qualityRules: string;
    readonly roadmap: string;
    readonly tracker: string;
    readonly acceptance: string;
    readonly seal: string;
}

export interface PackIndexManifestDocument {
    readonly packId: string;
    readonly packRepository: string;
    readonly artifacts: PackIndexManifestArtifacts;
    readonly repositories: readonly PackIndexRepository[];
    readonly requirements: readonly PackIndexRequirement[];
    readonly batches: readonly PackIndexBatch[];
}

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

function asBoolean(value: unknown): boolean {
    return value === true;
}

function asArray(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
}

function asStringArray(value: unknown): readonly string[] {
    return asArray(value).flatMap((entry) => (typeof entry === 'string' ? [entry] : []));
}

function readRepository(value: unknown): PackIndexRepository | null {
    if (!isRecord(value)) return null;
    const id = asString(value.id);
    const role = asString(value.role);
    const access = asString(value.access);
    return id === null || role === null || access === null ? null : {id, role, access};
}

function readRequirement(value: unknown): PackIndexRequirement | null {
    if (!isRecord(value)) return null;
    const id = asString(value.id);
    const repository = asString(value.repository);
    const source = asString(value.source);
    if (id === null || repository === null || source === null) return null;
    return {id, repository, source, workBatches: asStringArray(value.workBatches), reviewBatches: asStringArray(value.reviewBatches)};
}

function readBatchRepository(value: unknown): PackIndexBatchRepository | null {
    if (!isRecord(value)) return null;
    const id = asString(value.id);
    const access = asString(value.access);
    const claimMode = asString(value.claimMode);
    if (id === null || access === null || claimMode === null) return null;
    return {id, access, claimMode, paths: asStringArray(value.paths)};
}

function readProofInput(value: unknown): PackIndexProofInput | null {
    if (!isRecord(value)) return null;
    const repository = asString(value.repository);
    const path = asString(value.path);
    return repository === null || path === null ? null : {repository, path, optional: asBoolean(value.optional)};
}

/** Reads one batch entity; a malformed nested repository/proof-input entry invalidates the whole batch. */
function readBatch(value: unknown): PackIndexBatch | null {
    if (!isRecord(value)) return null;
    const id = asString(value.id);
    const title = asString(value.title);
    const primaryRepository = asString(value.primaryRepository);
    const workBrief = asString(value.workBrief);
    const reviewBrief = asString(value.reviewBrief);
    const implementationReasoning = asString(value.implementationReasoning);
    const reviewReasoning = asString(value.reviewReasoning);
    const workload = asString(value.workload);
    if (id === null || title === null || primaryRepository === null || workBrief === null || reviewBrief === null
        || implementationReasoning === null || reviewReasoning === null || workload === null) return null;
    const repositoryEntries = asArray(value.repositories).map(readBatchRepository);
    if (repositoryEntries.some((entry) => entry === null)) return null;
    const proofInputEntries = asArray(value.proofInputs).map(readProofInput);
    if (proofInputEntries.some((entry) => entry === null)) return null;
    return {
        id, title, dependsOn: asStringArray(value.dependsOn), primaryRepository, workBrief, reviewBrief,
        requirements: asStringArray(value.requirements),
        repositories: repositoryEntries as readonly PackIndexBatchRepository[],
        implementationReasoning, reviewReasoning, workload,
        proofClasses: asStringArray(value.proofClasses),
        proofInputs: proofInputEntries as readonly PackIndexProofInput[]
    };
}

function readArtifacts(value: unknown): PackIndexManifestArtifacts | null {
    if (!isRecord(value)) return null;
    const readme = asString(value.readme);
    const traceability = asString(value.traceability);
    const implementationMap = asString(value.implementationMap);
    const qualityRules = asString(value.qualityRules);
    const roadmap = asString(value.roadmap);
    const tracker = asString(value.tracker);
    const acceptance = asString(value.acceptance);
    const seal = asString(value.seal);
    if (readme === null || traceability === null || implementationMap === null || qualityRules === null
        || roadmap === null || tracker === null || acceptance === null || seal === null) return null;
    return {readme, traceability, implementationMap, qualityRules, roadmap, tracker, acceptance, seal};
}

/**
 * Reads the closed entity set the compiler owns from an AJV-validated manifest
 * document. Returns `null` on any malformed nested entity even though the outer
 * schema passed, since the schema keeps `additionalProperties: true` and does
 * not itself close every nested shape the row builder depends on.
 */
export function readManifestDocument(manifest: Record<string, unknown>): PackIndexManifestDocument | null {
    const packId = asString(manifest.packId);
    const packRepository = asString(manifest.packRepository);
    const artifacts = readArtifacts(manifest.artifacts);
    if (packId === null || packRepository === null || artifacts === null) return null;
    const repositories = asArray(manifest.repositories).map(readRepository);
    if (repositories.some((entry) => entry === null)) return null;
    const requirements = asArray(manifest.requirements).map(readRequirement);
    if (requirements.some((entry) => entry === null)) return null;
    const batches = asArray(manifest.batches).map(readBatch);
    if (batches.some((entry) => entry === null)) return null;
    return {
        packId, packRepository, artifacts,
        repositories: repositories as readonly PackIndexRepository[],
        requirements: requirements as readonly PackIndexRequirement[],
        batches: batches as readonly PackIndexBatch[]
    };
}
