import {computeDocumentDigest} from './PackSeal.js';
import {asArray, asString, isRecord} from './packJsonReaders.js';
import {isJsonObject} from '../schemaComposition/jsonCanonicalizer.js';
import {StatusPackAcceptanceAuthority} from '../status/index.js';
import {projectPackRecords} from '../status/index.js';
import type {WorkerEventRecord} from '../../contracts/events.js';
import {
    packRejection,
    packRepoPath,
    type PackAcceptanceEvidence,
    type PackConsumerContext,
    type PackConsumerDeps,
    type PackRejection,
    type PackRootBinding,
    type PackSessionIdentity
} from './packConsumerPorts.js';
import type {SealedFile} from '../../contracts/pack.js';
const LOCK_FILE = 'implementation-pack.lock.json';
const ACCEPTANCE_FILE = 'pack-acceptance.json';

type Resolved<T> = {readonly rejection: PackRejection} | {readonly value: T};

/** Calls the durable session store, mapping a synchronous store failure to a typed I/O rejection. */
function safeSession(deps: PackConsumerDeps, sessionId: string, target: string): Resolved<PackSessionIdentity | null> {
    try {
        return {value: deps.evidence.resolveSession(sessionId)};
    } catch {
        return {rejection: packRejection('PACK_IO_FAILED', target, 'session evidence store failed')};
    }
}

/** Calls the durable acceptance-evidence store, mapping a store failure to a typed I/O rejection. */
function safeAcceptanceEvidence(deps: PackConsumerDeps, root: string, reference: string): Resolved<PackAcceptanceEvidence | null> {
    try {
        return {value: deps.evidence.resolveAcceptanceEvidence(root, reference)};
    } catch {
        return {rejection: packRejection('PACK_IO_FAILED', reference, 'accepted-review evidence store failed')};
    }
}

function safeReviewEvents(deps: PackConsumerDeps, laneId: string): Resolved<readonly WorkerEventRecord[] | null> {
    try {
        return {value: deps.evidence.resolveReviewEvents(laneId)};
    } catch {
        return {rejection: packRejection('PACK_IO_FAILED', laneId, 'pack-review event store failed')};
    }
}

interface PackDocuments {readonly manifest: Record<string, unknown>; readonly lock: Record<string, unknown>;
    readonly acceptance: Record<string, unknown>;}

/**
 * Validates that every stored reference resolves within its declared repository
 * with exact containment and Git identity (§3.2/§3.3). Pack-relative references
 * must be sealed files; each accepted input and its `acceptanceRef` must resolve,
 * under the input's declared repository, to committed accepted-review evidence.
 */
export async function validateReferences(
    documents: PackDocuments, sealed: readonly SealedFile[],
    context: PackConsumerContext, deps: PackConsumerDeps, binding: PackRootBinding
): Promise<PackRejection | null> {
    const sealedPaths = new Set(sealed.map((file) => file.path));
    for (const reference of packRelativeReferences(documents)) {
        if (!sealedPaths.has(reference)) return packRejection('PACK_PATH_INVALID', reference, 'reference is not a sealed file');
    }
    if (asString(readArtifacts(documents.manifest).seal) !== LOCK_FILE) {
        return packRejection('PACK_PATH_INVALID', 'artifacts.seal', 'seal artifact must reference the pack lock');
    }
    return validateAcceptedEvidence(documents, context, deps);
}

async function validateAcceptedEvidence(
    documents: PackDocuments, context: PackConsumerContext, deps: PackConsumerDeps
): Promise<PackRejection | null> {
    const packRepository = asString(documents.manifest.packRepository) ?? '';
    for (const input of asArray(documents.manifest.acceptedInputs)) {
        if (!isRecord(input)) continue;
        const root = resolveInputRoot(context, packRepository, asString(input.repository) ?? '');
        if (root === null) return packRejection('PACK_IDENTITY_MISMATCH', asString(input.repository) ?? '',
            'accepted-input repository is unresolved or ambiguous');
        const inputFailure = await validateEvidenceFile(root, asString(input.path) ?? '', deps);
        if (inputFailure !== null) return inputFailure;
        const reference = asString(input.acceptanceRef) ?? '';
        const evidenceFileFailure = await validateEvidenceFile(root, reference, deps);
        if (evidenceFileFailure !== null) return evidenceFileFailure;
        const evidenceFailure = validateAcceptanceEvidenceContract(root, reference, input, deps);
        if (evidenceFailure !== null) return evidenceFailure;
    }
    return null;
}

/** Full filesystem/Git contract for one committed file under a declared repository root. */
async function validateEvidenceFile(
    repositoryRoot: string, relativePath: string, deps: PackConsumerDeps
): Promise<PackRejection | null> {
    const authorization = deps.fs.authorizeContained(repositoryRoot, relativePath, 'file');
    if (authorization === 'missing') return packRejection('PACK_FILE_MISSING', relativePath, 'accepted evidence is absent');
    if (authorization !== 'ok') return packRejection('PACK_PATH_INVALID', relativePath, 'accepted evidence escapes or is not a regular file');
    const tracked = await deps.git.isTracked(repositoryRoot, relativePath);
    if (!tracked.ok) return packRejection('PACK_IO_FAILED', relativePath, 'git tracking state is unavailable');
    const ignored = await deps.git.isIgnored(repositoryRoot, relativePath);
    if (!ignored.ok) return packRejection('PACK_IO_FAILED', relativePath, 'git ignore state is unavailable');
    if (!tracked.value || ignored.value) {
        return packRejection('PACK_FILESET_INVALID', relativePath, 'accepted evidence is untracked or ignored');
    }
    const committed = await deps.git.committedMatches(repositoryRoot, relativePath);
    if (!committed.ok) return packRejection('PACK_IO_FAILED', relativePath, 'git committed state is unavailable');
    return committed.value ? null
        : packRejection('PACK_ACCEPTANCE_INVALID', relativePath, 'accepted evidence is not committed');
}

/**
 * The closed accepted-review evidence contract: the durable evidence for an
 * `acceptanceRef`, resolved under the accepted input's declared repository, must
 * record an `accept` verdict, be bound to this exact input (repository, path, and
 * accepted digest — so a reused reference cannot authorize a different input),
 * and name a review session whose durable `reviewer` role and bound identity are
 * proven through `resolveSession`. An arbitrary committed file resolves no record.
 */
function validateAcceptanceEvidenceContract(
    repositoryRoot: string, reference: string, input: Record<string, unknown>, deps: PackConsumerDeps
): PackRejection | null {
    const resolvedEvidence = safeAcceptanceEvidence(deps, repositoryRoot, reference);
    if ('rejection' in resolvedEvidence) return resolvedEvidence.rejection;
    const evidence = resolvedEvidence.value;
    if (evidence === null) return packRejection('PACK_ACCEPTANCE_INVALID', reference, 'acceptanceRef is not accepted-review evidence');
    if (evidence.verdict !== 'accept') return packRejection('PACK_ACCEPTANCE_INVALID', reference, 'accepted-review evidence verdict is not accept');
    if (evidence.repository !== asString(input.repository) || evidence.inputPath !== asString(input.path) ||
        evidence.inputSha256 !== asString(input.sha256)) {
        return packRejection('PACK_ACCEPTANCE_INVALID', reference, 'accepted-review evidence is not bound to this accepted input');
    }
    const resolvedSession = safeSession(deps, evidence.reviewSessionId, reference);
    if ('rejection' in resolvedSession) return resolvedSession.rejection;
    const session = resolvedSession.value;
    if (session === null || session.sessionId !== evidence.reviewSessionId || session.role !== 'reviewer') {
        return packRejection('PACK_ACCEPTANCE_INVALID', reference, 'accepted-review evidence session is unbound or not a reviewer');
    }
    return null;
}

function resolveInputRoot(context: PackConsumerContext, packRepository: string, repository: string): string | null {
    if (repository === packRepository) return context.packRepositoryRoot;
    const facts = context.sources.filter((source) => source.repository === repository);
    return facts.length === 1 ? facts[0].repositoryRoot : null;
}

/**
 * Validates §3.3 acceptance: verdict, critical-finding disposition, the accepted
 * manifest digest, strict `reviewedCommit` ancestry, the exact reviewed candidate
 * tree/blob bytes, and the current-main durable author/reviewer event authority.
 */
export async function validateAcceptance(
    documents: PackDocuments, sealed: readonly SealedFile[],
    context: PackConsumerContext, deps: PackConsumerDeps, binding: PackRootBinding
): Promise<PackRejection | null> {
    const acceptance = documents.acceptance;
    if (asString(acceptance.verdict) !== 'accept') return reject('verdict is not accept', ACCEPTANCE_FILE);
    for (const finding of asArray(acceptance.findings)) {
        if (isRecord(finding) && asString(finding.severity) === 'critical' &&
            !['closed', 'superseded'].includes(asString(finding.disposition) ?? '')) {
            return reject('open critical finding', asString(finding.id) ?? ACCEPTANCE_FILE);
        }
    }
    if (asString(acceptance.acceptedManifestDigest) !== computeDocumentDigest(documents.manifest)) {
        return reject('acceptedManifestDigest differs from manifest', ACCEPTANCE_FILE);
    }
    return (await validateReviewedCandidate(documents, sealed, context, deps, binding)) ?? validateIndependence(documents, deps);
}

async function validateReviewedCandidate(
    documents: PackDocuments, sealed: readonly SealedFile[],
    context: PackConsumerContext, deps: PackConsumerDeps, binding: PackRootBinding
): Promise<PackRejection | null> {
    const reviewed = asString(documents.acceptance.reviewedCommit) ?? '';
    const forward = await deps.git.isAncestor(context.packRepositoryRoot, reviewed, context.headCommit);
    if (!forward.ok) return reject('reviewed ancestry query is unavailable', reviewed);
    const reverse = await deps.git.isAncestor(context.packRepositoryRoot, context.headCommit, reviewed);
    if (!reverse.ok) return reject('reviewed ancestry query is unavailable', reviewed);
    if (!forward.value || reverse.value) {
        return reject('reviewedCommit is not a strict ancestor of HEAD', reviewed);
    }
    const tree = await deps.git.treeFiles(context.packRepositoryRoot, reviewed, packRepoPath(binding.prefix, '').replace(/\/$/u, ''));
    if (tree === null) return reject('reviewed candidate tree is unavailable', reviewed);
    return compareCandidate(candidateFiles(sealed, binding), tree, context, deps, reviewed);
}

async function compareCandidate(
    candidates: ReadonlyMap<string, string>, tree: readonly {path: string; symlink: boolean}[],
    context: PackConsumerContext, deps: PackConsumerDeps, reviewed: string
): Promise<PackRejection | null> {
    const reviewedPaths = new Set(tree.map((entry) => entry.path));
    for (const entry of tree) {
        if (entry.symlink) return reject('reviewed candidate contains a symlink', entry.path);
        if (!candidates.has(entry.path)) return reject('reviewed candidate has an extra file', entry.path);
    }
    for (const [repoPath] of candidates) {
        if (!reviewedPaths.has(repoPath)) return reject('candidate file is absent at review', repoPath);
        const reviewedBlob = await deps.git.blobId(context.packRepositoryRoot, reviewed, repoPath);
        const headBlob = await deps.git.blobId(context.packRepositoryRoot, context.headCommit, repoPath);
        if (reviewedBlob === null || headBlob === null) return reject('reviewed candidate blob is unavailable', repoPath);
        if (reviewedBlob !== headBlob) return reject('candidate bytes changed after review', repoPath);
    }
    return null;
}

/**
 * Uses current main's accepted event-chain owner: one author handoff, a causally
 * linked acceptance, and unique, ordered, independent superseding reviews.
 */
function validateIndependence(documents: PackDocuments, deps: PackConsumerDeps): PackRejection | null {
    const laneId = asString(documents.manifest.authoredByLaneId);
    if (laneId === null) return reject('pack-author lane is not recorded', 'authoredByLaneId');
    const resolved = safeReviewEvents(deps, laneId);
    if ('rejection' in resolved) return resolved.rejection;
    if (resolved.value === null) return reject('pack-review event evidence is unavailable', ACCEPTANCE_FILE);
    if (!isJsonObject(documents.manifest) || !isJsonObject(documents.acceptance) || !isJsonObject(documents.lock)) {
        return reject('pack documents cannot be projected for event authority', ACCEPTANCE_FILE);
    }
    try {
        const projected = projectPackRecords(documents.manifest, documents.acceptance, documents.lock);
        return new StatusPackAcceptanceAuthority().valid(projected.manifest, projected.acceptance, resolved.value)
            ? null : reject('pack-review event authority is invalid', ACCEPTANCE_FILE);
    } catch {
        return reject('pack-review event authority projection failed', ACCEPTANCE_FILE);
    }
}

/** The reviewed candidate set: sealed files except the acceptance record, keyed by repo path. */
function candidateFiles(sealed: readonly SealedFile[], binding: PackRootBinding): ReadonlyMap<string, string> {
    const candidates = new Map<string, string>();
    for (const file of sealed) {
        if (file.path === ACCEPTANCE_FILE) continue;
        candidates.set(packRepoPath(binding.prefix, file.path), file.path);
    }
    return candidates;
}

function packRelativeReferences(documents: PackDocuments): readonly string[] {
    const artifacts = readArtifacts(documents.manifest);
    const references = ['readme', 'traceability', 'implementationMap', 'qualityRules', 'roadmap', 'tracker', 'acceptance']
        .flatMap((key) => (asString(artifacts[key]) === null ? [] : [asString(artifacts[key]) as string]));
    for (const requirement of asArray(documents.manifest.requirements)) {
        if (isRecord(requirement) && asString(requirement.source) !== null) references.push(asString(requirement.source) as string);
    }
    for (const batch of asArray(documents.manifest.batches)) {
        if (!isRecord(batch)) continue;
        for (const key of ['workBrief', 'reviewBrief']) {
            if (asString(batch[key]) !== null) references.push(asString(batch[key]) as string);
        }
    }
    return references;
}

function readArtifacts(manifest: Record<string, unknown>): Record<string, unknown> {
    return isRecord(manifest.artifacts) ? manifest.artifacts : {};
}

function reject(detail: string, target: string): PackRejection {
    return packRejection('PACK_ACCEPTANCE_INVALID', target, detail);
}
