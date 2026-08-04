import {join} from 'node:path';
import {canonicalJson} from '../schemaComposition/jsonCanonicalizer.js';
import {hasDuplicateJsonObjectKey} from '../schemaComposition/jsonDuplicateKeyDetector.js';
import {computeDocumentDigest, computeSealId, fileDigest, sortSealedFiles} from './PackSeal.js';
import {validateAcceptance, validateReferences} from './PackAcceptance.js';
import {asArray, asJson, asString, buildConsumedPack, isRecord, isSafeRelativePath, readSealedFiles} from './packJsonReaders.js';
import {
    authorizePackRoot,
    packRejection,
    packRepoPath,
    type PackConsumerContext,
    type PackConsumerDeps,
    type PackRejection,
    type PackRootBinding
} from './packConsumerPorts.js';
import type {PackConsumerResult, SealedFile} from '../../contracts/pack.js';

export type {
    PackAcceptanceEvidence,
    PackConsumerContext,
    PackConsumerDeps,
    PackEntry,
    PackEntryKind,
    PackEvidenceInspector,
    PackFileSystem,
    PackGitInspector,
    PackRootBinding,
    PackSchemaValidators,
    PackSessionIdentity,
    PackSessionRole,
    PackTreeEntry,
    PathAuthorization,
    PathKind,
    SourceRepositoryFacts
} from './packConsumerPorts.js';
export {packRepoPath} from './packConsumerPorts.js';

const MANIFEST_FILE = 'implementation-pack.json';
const LOCK_FILE = 'implementation-pack.lock.json';
const ACCEPTANCE_FILE = 'pack-acceptance.json';
const REQUIRED_FILES = [MANIFEST_FILE, LOCK_FILE, ACCEPTANCE_FILE, 'requirements-traceability.md',
    'implementation-map.md', 'implementation-quality-and-agent-rules.md', 'implementation-roadmap.md',
    'implementation-tracker.md'] as const;
const REQUIRED_DIRECTORIES = ['work-batches', 'review-batches'] as const;

interface PackDocuments {readonly manifest: Record<string, unknown>; readonly lock: Record<string, unknown>;
    readonly acceptance: Record<string, unknown>;}

/**
 * Validates a committed implementation pack against v1-contracts.md §3.1–§3.4 plus
 * §3.3 acceptance and returns the sealed pack view or the first stable typed
 * rejection. Reads only; no authoritative bytes change and no drift (§3.5) here.
 * The pack repository and pack root are canonically authorized before any read.
 */
export async function consumePack(context: PackConsumerContext, deps: PackConsumerDeps): Promise<PackConsumerResult> {
    const binding = authorizePackRoot(context, deps.fs);
    if ('reason' in binding) return binding;
    const documents = readDocuments(context, deps);
    if ('reason' in documents) return documents;
    const identity = validateIdentity(documents, context);
    if (identity !== null) return identity;
    const structure = validateStructure(context, deps);
    if (structure !== null) return structure;
    const sealed = await buildSealedFiles(context, deps, binding);
    if ('reason' in sealed) return sealed;
    const seal = reproduceSeal(documents, sealed.files);
    if (seal !== null) return seal;
    const references = await validateReferences(documents, sealed.files, context, deps, binding);
    if (references !== null) return references;
    const acceptance = await validateAcceptance(documents, sealed.files, context, deps, binding);
    if (acceptance !== null) return acceptance;
    return {ok: true, pack: buildConsumedPack(documents.manifest, documents.lock, documents.acceptance, sealed.files)};
}

function readDocuments(context: PackConsumerContext, deps: PackConsumerDeps): PackDocuments | PackRejection {
    const manifest = readJsonDocument(join(context.packRoot, MANIFEST_FILE), deps);
    if ('reason' in manifest) return manifest;
    const lock = readJsonDocument(join(context.packRoot, LOCK_FILE), deps);
    if ('reason' in lock) return lock;
    const acceptance = readJsonDocument(join(context.packRoot, ACCEPTANCE_FILE), deps);
    if ('reason' in acceptance) return acceptance;
    if (!deps.validators.manifest(manifest.value)) return reject('PACK_SCHEMA_INVALID', MANIFEST_FILE, 'manifest schema');
    if (!deps.validators.lock(lock.value)) return reject('PACK_SCHEMA_INVALID', LOCK_FILE, 'lock schema');
    if (!deps.validators.acceptance(acceptance.value)) return reject('PACK_SCHEMA_INVALID', ACCEPTANCE_FILE, 'acceptance schema');
    return {manifest: manifest.value, lock: lock.value, acceptance: acceptance.value};
}

function readJsonDocument(absolutePath: string, deps: PackConsumerDeps): {value: Record<string, unknown>} | PackRejection {
    let bytes: Uint8Array;
    try {
        bytes = deps.fs.readFile(absolutePath);
    } catch (error: unknown) {
        return isMissing(error) ? reject('PACK_FILE_MISSING', absolutePath, 'document is absent')
            : reject('PACK_IO_FAILED', absolutePath, 'document is unreadable');
    }
    let text: string;
    try {
        text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    } catch {
        return reject('PACK_DOCUMENT_INVALID', absolutePath, 'document is not valid UTF-8');
    }
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return reject('PACK_DOCUMENT_INVALID', absolutePath, 'malformed JSON');
    }
    if (hasDuplicateJsonObjectKey(text)) return reject('PACK_DOCUMENT_INVALID', absolutePath, 'duplicate object key');
    return isRecord(value) ? {value} : reject('PACK_DOCUMENT_INVALID', absolutePath, 'root is not an object');
}

function validateStructure(context: PackConsumerContext, deps: PackConsumerDeps): PackRejection | null {
    const entries = listEntries(context, deps);
    if ('reason' in entries) return entries;
    const files = new Set(entries.value.filter((entry) => entry.kind === 'file').map((entry) => entry.path));
    const directories = new Set(entries.value.filter((entry) => entry.kind === 'directory').map((entry) => entry.path));
    for (const required of REQUIRED_FILES) {
        if (!files.has(required)) return reject('PACK_FILE_MISSING', required, 'required pack document');
    }
    for (const required of REQUIRED_DIRECTORIES) {
        if (!directories.has(required)) return reject('PACK_FILE_MISSING', required, 'required pack directory');
    }
    return null;
}

async function buildSealedFiles(
    context: PackConsumerContext, deps: PackConsumerDeps, binding: PackRootBinding
): Promise<{files: readonly SealedFile[]} | PackRejection> {
    const entries = listEntries(context, deps);
    if ('reason' in entries) return entries;
    const files: SealedFile[] = [];
    for (const entry of entries.value) {
        if (entry.kind === 'directory') continue;
        if (entry.kind !== 'file') return reject('PACK_FILESET_INVALID', entry.path, `non-regular entry (${entry.kind})`);
        if (entry.path === LOCK_FILE) continue;
        if (!isSafeRelativePath(entry.path)) return reject('PACK_PATH_INVALID', entry.path, 'unsafe pack-relative path');
        const relative = packRepoPath(binding.prefix, entry.path);
        const tracked = await deps.git.isTracked(context.packRepositoryRoot, relative);
        if (!tracked.ok) return reject('PACK_IO_FAILED', entry.path, 'git tracking state is unavailable');
        const ignored = await deps.git.isIgnored(context.packRepositoryRoot, relative);
        if (!ignored.ok) return reject('PACK_IO_FAILED', entry.path, 'git ignore state is unavailable');
        if (!tracked.value || ignored.value) {
            return reject('PACK_FILESET_INVALID', entry.path, 'untracked or ignored sealed file');
        }
        let bytes: Uint8Array;
        try {
            bytes = deps.fs.readFile(join(context.packRoot, entry.path));
        } catch {
            return reject('PACK_IO_FAILED', entry.path, 'sealed file is unreadable');
        }
        files.push({path: entry.path, sha256: fileDigest(bytes), bytes: bytes.byteLength});
    }
    return {files: sortSealedFiles(files)};
}

function listEntries(context: PackConsumerContext, deps: PackConsumerDeps): {value: ReturnType<PackConsumerDeps['fs']['listEntries']>} | PackRejection {
    try {
        return {value: deps.fs.listEntries(context.packRoot)};
    } catch {
        return reject('PACK_IO_FAILED', context.packRoot, 'pack root enumeration failed');
    }
}

function validateIdentity(documents: PackDocuments, context: PackConsumerContext): PackRejection | null {
    const packId = asString(documents.manifest.packId);
    if (packId === null || packId !== asString(documents.lock.packId) || packId !== asString(documents.acceptance.packId)) {
        return reject('PACK_IDENTITY_MISMATCH', packId ?? MANIFEST_FILE, 'packId differs across pack documents');
    }
    const repositoryIds = asArray(documents.manifest.repositories)
        .map((repository) => (isRecord(repository) ? asString(repository.id) : null));
    if (new Set(repositoryIds).size !== repositoryIds.length) {
        return reject('PACK_IDENTITY_MISMATCH', packId, 'duplicate manifest repository ids');
    }
    const packRepository = asString(documents.manifest.packRepository);
    if (!repositoryIds.includes(packRepository)) {
        return reject('PACK_IDENTITY_MISMATCH', packId, 'packRepository is not a declared repository');
    }
    return validateRepositoryFacts(context, repositoryIds, packRepository ?? '');
}

/** Requires an exact one-to-one mapping between declared repository ids and context facts. */
function validateRepositoryFacts(
    context: PackConsumerContext, declaredIds: readonly (string | null)[], packRepository: string
): PackRejection | null {
    const factIds = context.sources.map((source) => source.repository);
    if (new Set(factIds).size !== factIds.length) {
        return reject('PACK_IDENTITY_MISMATCH', 'sources', 'duplicate repository facts');
    }
    const declared = new Set(declaredIds);
    const facts = new Set(factIds);
    if (declared.size !== facts.size || ![...declared].every((id) => id !== null && facts.has(id))) {
        return reject('PACK_IDENTITY_MISMATCH', 'sources', 'declared repositories and context facts are not an exact set');
    }
    const packFacts = context.sources.filter((source) => source.repository === packRepository);
    if (packFacts.length !== 1 || packFacts[0].repositoryRoot !== context.packRepositoryRoot) {
        return reject('PACK_IDENTITY_MISMATCH', packRepository, 'packRepository is not bound to exactly one repository fact');
    }
    return null;
}

function reproduceSeal(documents: PackDocuments, sealedFiles: readonly SealedFile[]): PackRejection | null {
    const lockFiles = readSealedFiles(documents.lock.files);
    if (!isSortedUnique(lockFiles)) return reject('PACK_SEAL_MISMATCH', LOCK_FILE, 'lock files are not sorted and unique');
    if (!sealedFileSetsEqual(sealedFiles, lockFiles)) return reject('PACK_SEAL_MISMATCH', LOCK_FILE, 'sealed file set differs from lock');
    if (canonicalJson(asJson(documents.manifest.sourceBaselines)) !== canonicalJson(asJson(documents.lock.sourceBaselines))) {
        return reject('PACK_SEAL_MISMATCH', LOCK_FILE, 'source baselines differ from manifest');
    }
    const manifestDigest = computeDocumentDigest(documents.manifest);
    const acceptanceDigest = computeDocumentDigest(documents.acceptance);
    if (manifestDigest !== asString(documents.lock.manifestDigest)) return reject('PACK_SEAL_MISMATCH', LOCK_FILE, 'manifest digest');
    if (acceptanceDigest !== asString(documents.lock.acceptanceDigest)) return reject('PACK_SEAL_MISMATCH', LOCK_FILE, 'acceptance digest');
    const sealId = computeSealId({packId: asString(documents.manifest.packId) ?? '', manifestDigest, acceptanceDigest,
        sourceBaselines: asJson(documents.lock.sourceBaselines), files: sealedFiles});
    return sealId === asString(documents.lock.sealId) ? null : reject('PACK_SEAL_MISMATCH', LOCK_FILE, 'sealId');
}

function isSortedUnique(files: readonly SealedFile[]): boolean {
    return files.every((file, index) => index === 0 || files[index - 1].path < file.path);
}

function sealedFileSetsEqual(left: readonly SealedFile[], right: readonly SealedFile[]): boolean {
    return left.length === right.length && left.every((file, index) =>
        file.path === right[index].path && file.sha256 === right[index].sha256 && file.bytes === right[index].bytes);
}

function isMissing(error: unknown): boolean {
    return isRecord(error) && (error.code === 'ENOENT' || error.code === 'ENOTDIR');
}

function reject(reason: Parameters<typeof packRejection>[0], target: string, detail: string): PackRejection {
    return packRejection(reason, target, detail);
}
