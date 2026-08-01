import {join} from 'node:path';
import {classifyDrift, fileDigest} from './PackSeal.js';
import {
    authorizePackRoot,
    packRepoPath,
    repositoryRootFor,
    type PackConsumerContext,
    type PackConsumerDeps
} from './packConsumerPorts.js';
import type {
    ConsumedPack,
    DriftObservations,
    PackAcceptedInput,
    PackDriftResult,
    SealedFile,
    SealedFileObservation,
    Sha256Digest,
    SourceBaselineObservation
} from '../contracts/pack.js';

const LOCK_FILE = 'implementation-pack.lock.json';

/**
 * Classifies init-time drift (§3.5) for an already-consumed pack by gathering
 * side-effect-free Git/filesystem observations and delegating the closed-code
 * decision to the mechanical classifier. No model and no mutation participate.
 */
export async function observePackDrift(
    pack: ConsumedPack, context: PackConsumerContext, deps: PackConsumerDeps
): Promise<PackDriftResult> {
    // Reject duplicate, unknown, or pack-misbound facts before touching any root.
    const facts = validateDriftRepositoryFacts(pack, context);
    if (facts !== null) return facts;
    const binding = authorizePackRoot(context, deps.fs);
    // Fail closed without touching the unsafe root: no list or read occurs.
    if ('reason' in binding) return driftFailClosed(pack.packRepository, '<pack-root-unauthorized>');
    return classifyDrift(await gatherDriftObservations(pack, context, deps, binding.prefix));
}

function driftFailClosed(repository: string, path: string): PackDriftResult {
    return {ok: false, findings: Object.freeze([{code: 'PACK_FILESET_CHANGED', severity: 'fail', repository, path}])};
}

/**
 * Validates the drift context's repository facts before any secondary or baseline
 * root is touched: duplicate, unknown (undeclared), or pack-repository-misbound
 * facts fail closed with zero I/O. A declared repository that simply has no fact
 * is left to the normative unavailable-baseline classification.
 */
function validateDriftRepositoryFacts(pack: ConsumedPack, context: PackConsumerContext): PackDriftResult | null {
    const factIds = context.sources.map((source) => source.repository);
    if (new Set(factIds).size !== factIds.length) return driftFailClosed(pack.packRepository, '<repository-facts-duplicate>');
    const declared = new Set(pack.repositories);
    if (factIds.some((id) => !declared.has(id))) return driftFailClosed(pack.packRepository, '<repository-fact-unknown>');
    const packFacts = context.sources.filter((source) => source.repository === pack.packRepository);
    if (packFacts.length !== 1 || packFacts[0].repositoryRoot !== context.packRepositoryRoot) {
        return driftFailClosed(pack.packRepository, '<pack-repository-misbound>');
    }
    return null;
}

async function gatherDriftObservations(
    pack: ConsumedPack, context: PackConsumerContext, deps: PackConsumerDeps, prefix: string
): Promise<DriftObservations> {
    const sealedPaths = new Set(pack.sealedFiles.map((file) => file.path));
    const enumeration = listPackEntries(context, deps);
    const extraEntries = enumeration.entries
        .filter((entry) => entry.kind !== 'directory' && entry.path !== LOCK_FILE && !sealedPaths.has(entry.path))
        .map((entry) => ({path: entry.path}));
    const sealed = await Promise.all(pack.sealedFiles.map((file) => observeSealedFile(file, prefix, context, deps)));
    return {
        packRepository: pack.packRepository,
        enumerationFailed: enumeration.failed,
        gitUnavailable: sealed.some((entry) => !entry.available),
        sealedFiles: sealed.map((entry) => entry.observation),
        extraEntries,
        acceptedInputs: await Promise.all(pack.acceptedInputs.map(async (input) =>
            ({input, currentSha256: await observeAcceptedInput(input, pack.packRepository, context, deps)}))),
        claimPaths: pack.claimPaths,
        baselines: await Promise.all(pack.sourceBaselines.map((baseline) => observeBaseline(baseline, context, deps)))
    };
}

async function observeAcceptedInput(
    input: PackAcceptedInput, packRepository: string, context: PackConsumerContext, deps: PackConsumerDeps
): Promise<Sha256Digest | null> {
    const root = input.repository === packRepository ? context.packRepositoryRoot
        : repositoryRootFor(context, input.repository);
    if (root === null || deps.fs.authorizeContained(root, input.path, 'file') !== 'ok') return null;
    return readOptionalDigest(join(root, input.path), deps);
}

async function observeSealedFile(
    file: SealedFile, prefix: string, context: PackConsumerContext, deps: PackConsumerDeps
): Promise<{observation: SealedFileObservation; available: boolean}> {
    const relative = packRepoPath(prefix, file.path);
    const current = readOptionalDigest(join(context.packRoot, file.path), deps);
    const ignored = await deps.git.isIgnored(context.packRepositoryRoot, relative);
    const tracked = await deps.git.isTracked(context.packRepositoryRoot, relative);
    const committed = await deps.git.committedMatches(context.packRepositoryRoot, relative);
    // An unavailable Git query is never read as a negative; it fails the drift closed.
    if (!ignored.ok || !tracked.ok || !committed.ok) {
        return {observation: {file, presence: 'untracked', currentSha256: current, committedMatches: false}, available: false};
    }
    const presence: SealedFileObservation['presence'] = current === null ? 'absent'
        : ignored.value ? 'ignored' : tracked.value ? 'tracked' : 'untracked';
    return {observation: {file, presence, currentSha256: current, committedMatches: committed.value}, available: true};
}

async function observeBaseline(
    baseline: ConsumedPack['sourceBaselines'][number], context: PackConsumerContext, deps: PackConsumerDeps
): Promise<SourceBaselineObservation> {
    const source = context.sources.find((candidate) => candidate.repository === baseline.repository);
    const changed = source === undefined ? null : await deps.git.changedPathsSince(source.repositoryRoot, baseline.revision);
    return {repository: baseline.repository, available: changed !== null, changedPaths: changed ?? [],
        readOnly: source?.readOnly === true, proofOptional: source?.proofOptional === true};
}

function listPackEntries(
    context: PackConsumerContext, deps: PackConsumerDeps
): {entries: ReturnType<PackConsumerDeps['fs']['listEntries']>; failed: boolean} {
    try {
        return {entries: deps.fs.listEntries(context.packRoot), failed: false};
    } catch {
        return {entries: [], failed: true};
    }
}

function readOptionalDigest(absolutePath: string, deps: PackConsumerDeps): Sha256Digest | null {
    try {
        return fileDigest(deps.fs.readFile(absolutePath));
    } catch {
        return null;
    }
}
