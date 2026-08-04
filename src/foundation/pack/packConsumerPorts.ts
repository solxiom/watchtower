import {isAbsolute, relative, sep} from 'node:path';
import type {PackConsumerResult, PackRejectionReason} from '../../contracts/pack.js';
import type {WorkerEventRecord} from '../../contracts/events.js';

export type PackEntryKind = 'file' | 'directory' | 'symlink' | 'other';
export interface PackEntry {readonly path: string; readonly kind: PackEntryKind;}

/** One tree entry at a specific commit; `symlink` marks a `120000` mode blob. */
export interface PackTreeEntry {readonly path: string; readonly symlink: boolean;}

/** Result of authorizing a stored path beneath a declared repository root. */
export type PathAuthorization = 'ok' | 'unsafe' | 'missing';

/** The expected entry kind when authorizing a contained path. */
export type PathKind = 'file' | 'directory';

/** Facts about one participating repository, resolved by init before consumption. */
export interface SourceRepositoryFacts {
    readonly repository: string;
    readonly repositoryRoot: string;
    readonly readOnly: boolean;
    readonly proofOptional: boolean;
}

/** Narrow, read-only filesystem boundary for pack bytes, structure, and containment. */
export interface PackFileSystem {
    readFile(absolutePath: string): Uint8Array;
    listEntries(packRoot: string): readonly PackEntry[];
    authorizeContained(repositoryRoot: string, relativePath: string, kind: PathKind): PathAuthorization;
}

/**
 * A Git predicate outcome: a legitimate `true`/`false` answer, or `ok: false`
 * meaning the command/repository was unavailable and no answer exists. Callers
 * must never treat an unavailable outcome as a negative predicate result.
 */
export type GitOutcome<T> = {readonly ok: true; readonly value: T} | {readonly ok: false};

/**
 * Builds an available Git outcome carrying a definite value. Each call returns a
 * fresh frozen object, so `readonly` is backed by runtime immutability and no
 * shared instance can be mutated into different evidence.
 */
export function gitValue<T>(value: T): GitOutcome<T> {
    return Object.freeze({ok: true, value});
}

/**
 * Builds an unavailable Git outcome (command or repository could not answer).
 * Each call returns a fresh frozen object; there is no shared singleton that a
 * caller could mutate to turn every unavailable result into positive evidence.
 */
export function gitUnavailable(): GitOutcome<never> {
    return Object.freeze({ok: false});
}

/**
 * Narrow, read-only Git boundary; every method is side-effect-free and asynchronous.
 * Boolean predicates return a {@link GitOutcome} so unavailability is representable
 * distinctly from a legitimate negative; tree/blob/changed-path use `null`.
 */
export interface PackGitInspector {
    isTracked(repositoryRoot: string, relativePath: string): Promise<GitOutcome<boolean>>;
    isIgnored(repositoryRoot: string, relativePath: string): Promise<GitOutcome<boolean>>;
    committedMatches(repositoryRoot: string, relativePath: string): Promise<GitOutcome<boolean>>;
    isAncestor(repositoryRoot: string, ancestor: string, descendant: string): Promise<GitOutcome<boolean>>;
    changedPathsSince(repositoryRoot: string, revision: string): Promise<readonly string[] | null>;
    treeFiles(repositoryRoot: string, commit: string, pathPrefix: string): Promise<readonly PackTreeEntry[] | null>;
    blobId(repositoryRoot: string, ref: string, relativePath: string): Promise<string | null>;
}

/** A durable role/session identity resolved from a session event. */
export type PackSessionRole = 'author' | 'reviewer';
export interface PackSessionIdentity {
    readonly sessionId: string;
    readonly laneId: string;
    readonly role: PackSessionRole;
}

/**
 * Durable accepted-review evidence resolved from an `acceptanceRef` record. It is
 * bound to the exact accepted input (repository, path, digest) so one record can
 * never authorize a different input, and names the review session whose durable
 * role is proven independently through {@link PackEvidenceInspector.resolveSession}.
 */
export interface PackAcceptanceEvidence {
    readonly verdict: string;
    readonly repository: string;
    readonly inputPath: string;
    readonly inputSha256: string;
    readonly reviewSessionId: string;
}

/** Durable event/session/evidence boundary for §3.3 acceptance authority and accepted-input evidence. */
export interface PackEvidenceInspector {
    resolveSession(sessionId: string): PackSessionIdentity | null;
    resolveAcceptanceEvidence(repositoryRoot: string, relativePath: string): PackAcceptanceEvidence | null;
    /** Returns the complete, valid pack-review journal for the author lane; unavailable/corrupt input returns `null`. */
    resolveReviewEvents(authoredByLaneId: string): readonly WorkerEventRecord[] | null;
}

/** Compiled JSON Schema validators for the three closed pack documents (§3.1). */
export interface PackSchemaValidators {
    manifest(value: unknown): boolean;
    lock(value: unknown): boolean;
    acceptance(value: unknown): boolean;
}

export interface PackConsumerDeps {
    readonly fs: PackFileSystem;
    readonly git: PackGitInspector;
    readonly validators: PackSchemaValidators;
    readonly evidence: PackEvidenceInspector;
}

export interface PackConsumerContext {
    readonly packRoot: string;
    readonly packRepositoryRoot: string;
    readonly headCommit: string;
    readonly sources: readonly SourceRepositoryFacts[];
}

/** The canonically authorized pack-root binding: a validated repository-relative prefix. */
export interface PackRootBinding {
    readonly prefix: string;
}

export type PackRejection = Extract<PackConsumerResult, {ok: false}>;

export function packRejection(reason: PackRejectionReason, target: string, detail: string): PackRejection {
    return {ok: false, reason, target, detail};
}

/**
 * The pack root as a repository-relative prefix, computed with `path.relative`
 * (not string slicing). Returns `null` when the pack root escapes the repository.
 */
export function packRootPrefix(context: PackConsumerContext): string | null {
    const prefix = relative(context.packRepositoryRoot, context.packRoot);
    if (isAbsolute(prefix) || prefix === '..' || prefix.startsWith(`..${sep}`)) return null;
    return prefix.split(sep).join('/');
}

/** Maps a pack-relative path to its repository-relative path using a validated prefix. */
export function packRepoPath(prefix: string, relativePath: string): string {
    return prefix === '' ? relativePath : `${prefix}/${relativePath}`;
}

/** Resolves the validated repository root for a declared repository id, if known. */
export function repositoryRootFor(context: PackConsumerContext, repository: string): string | null {
    const source = context.sources.find((candidate) => candidate.repository === repository);
    return source?.repositoryRoot ?? null;
}

/**
 * Canonically authorizes the pack repository root and pack root before any read
 * or enumeration, returning the validated repository-relative prefix. Used by
 * both consumption and drift observation so neither ever touches an unsafe root.
 */
export function authorizePackRoot(
    context: PackConsumerContext, fs: PackFileSystem
): PackRootBinding | PackRejection {
    const prefix = packRootPrefix(context);
    if (prefix === null) return packRejection('PACK_PATH_INVALID', context.packRoot, 'pack root escapes its repository');
    if (fs.authorizeContained(context.packRepositoryRoot, '.', 'directory') !== 'ok') {
        return packRejection('PACK_PATH_INVALID', context.packRepositoryRoot, 'pack repository root is not a canonical directory');
    }
    if (prefix !== '' && fs.authorizeContained(context.packRepositoryRoot, prefix, 'directory') !== 'ok') {
        return packRejection('PACK_PATH_INVALID', context.packRoot, 'pack root is not a canonical directory in the repository');
    }
    return {prefix};
}
