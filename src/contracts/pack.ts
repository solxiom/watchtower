/**
 * Closed contracts for the v1 implementation-pack consumer (v1-contracts.md §3):
 * acceptance/schema validation, RFC 8785 seal reproduction, and init-time drift.
 * External bytes enter as `unknown` and validate into these types; no broad any.
 */

export type Sha256Digest = `sha256:${string}`;

/** Stable reason codes for a pre-consume rejection. Every code fails closed. */
export const PACK_REJECTION_REASONS = [
    'PACK_FILE_MISSING',
    'PACK_DOCUMENT_INVALID',
    'PACK_SCHEMA_INVALID',
    'PACK_PATH_INVALID',
    'PACK_FILESET_INVALID',
    'PACK_IDENTITY_MISMATCH',
    'PACK_SEAL_MISMATCH',
    'PACK_ACCEPTANCE_INVALID',
    'PACK_IO_FAILED'
] as const;

export type PackRejectionReason = typeof PACK_REJECTION_REASONS[number];

/** The closed drift vocabulary of v1-contracts.md §3.5. No model classifies drift. */
export const PACK_DRIFT_CODES = [
    'PACK_BYTES_CHANGED',
    'PACK_FILESET_CHANGED',
    'ACCEPTED_INPUT_CHANGED',
    'SOURCE_BASELINE_CRITICAL',
    'SOURCE_BASELINE_UNRELATED',
    'SOURCE_BASELINE_UNAVAILABLE'
] as const;

export type PackDriftCode = typeof PACK_DRIFT_CODES[number];

export type PackDriftSeverity = 'fail' | 'warn';

/** One sealed-file record from the lock: raw-byte digest and size. */
export interface SealedFile {
    readonly path: string;
    readonly sha256: Sha256Digest;
    readonly bytes: number;
}

/** A declared accepted-input proof reference from the manifest. */
export interface PackAcceptedInput {
    readonly repository: string;
    readonly path: string;
    readonly sha256: Sha256Digest;
    readonly acceptanceRef: string;
}

/** A per-repository committed source baseline recorded by the pack. */
export interface PackSourceBaseline {
    readonly repository: string;
    readonly revision: string;
    readonly dirty: boolean;
}

/** A batch-declared path in a source repository: a writable claim or a proof input. */
export interface PackClaimPath {
    readonly repository: string;
    readonly path: string;
    readonly writable: boolean;
}

/** The validated, sealed pack view handed to init planning. */
export interface ConsumedPack {
    readonly packId: string;
    readonly initiativeId: string;
    readonly packRepository: string;
    readonly manifestDigest: Sha256Digest;
    readonly acceptanceDigest: Sha256Digest;
    readonly sealId: Sha256Digest;
    readonly reviewedCommit: string;
    readonly repositories: readonly string[];
    readonly sealedFiles: readonly SealedFile[];
    readonly acceptedInputs: readonly PackAcceptedInput[];
    readonly sourceBaselines: readonly PackSourceBaseline[];
    readonly claimPaths: readonly PackClaimPath[];
}

export interface PackConsumerAccepted {
    readonly ok: true;
    readonly pack: ConsumedPack;
}

export interface PackConsumerRejection {
    readonly ok: false;
    readonly reason: PackRejectionReason;
    readonly target: string;
    readonly detail: string;
}

export type PackConsumerResult = PackConsumerAccepted | PackConsumerRejection;

/** How a sealed file currently presents in the working tree and Git index. */
export type SealedFilePresence = 'tracked' | 'untracked' | 'ignored' | 'symlink' | 'absent';

/** A single sealed file observed against the current working tree (drift input). */
export interface SealedFileObservation {
    readonly file: SealedFile;
    readonly presence: SealedFilePresence;
    readonly currentSha256: Sha256Digest | null;
    readonly committedMatches: boolean;
}

/** A regular entry present under the pack root that is not in the sealed set. */
export interface ExtraPackEntryObservation {
    readonly path: string;
}

/** An accepted input observed against its current bytes (drift input). */
export interface AcceptedInputObservation {
    readonly input: PackAcceptedInput;
    readonly currentSha256: Sha256Digest | null;
}

/** A source repository observed against its recorded baseline (drift input). */
export interface SourceBaselineObservation {
    readonly repository: string;
    readonly available: boolean;
    readonly readOnly: boolean;
    readonly proofOptional: boolean;
    readonly changedPaths: readonly string[];
}

/** The complete, side-effect-free evidence a drift classification consumes. */
export interface DriftObservations {
    readonly packRepository: string;
    readonly enumerationFailed: boolean;
    readonly gitUnavailable: boolean;
    readonly sealedFiles: readonly SealedFileObservation[];
    readonly extraEntries: readonly ExtraPackEntryObservation[];
    readonly acceptedInputs: readonly AcceptedInputObservation[];
    readonly claimPaths: readonly PackClaimPath[];
    readonly baselines: readonly SourceBaselineObservation[];
}

/** One mechanical drift finding tied to a closed code and a repository path. */
export interface PackDriftFinding {
    readonly code: PackDriftCode;
    readonly severity: PackDriftSeverity;
    readonly repository: string;
    readonly path: string;
}

/** The drift matrix result: `ok` is false when any `fail` finding is present. */
export interface PackDriftResult {
    readonly ok: boolean;
    readonly findings: readonly PackDriftFinding[];
}
