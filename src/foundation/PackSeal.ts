import {createHash} from 'node:crypto';
import {isJsonValue, semanticDigest} from './schemaComposition/jsonCanonicalizer.js';
import {resourcePathsOverlap} from './bindings/index.js';
import type {JsonValue} from './schemaComposition/schemaCompositionContracts.js';
import type {
    DriftObservations,
    PackClaimPath,
    PackDriftFinding,
    PackDriftResult,
    SealedFile,
    Sha256Digest
} from '../contracts/pack.js';

/** The exact, informational-metadata-free inputs of the RFC 8785 seal (§3.4). */
export interface SealInput {
    readonly packId: string;
    readonly manifestDigest: Sha256Digest;
    readonly acceptanceDigest: Sha256Digest;
    readonly sourceBaselines: JsonValue;
    readonly files: readonly SealedFile[];
}

/**
 * Reproduces `sealId` as the SHA-256 of the RFC 8785 canonical seal payload.
 * `generatedAt`, the lock file, and working-directory metadata are excluded, so
 * equal input bytes always produce the same digest.
 */
export function computeSealId(input: SealInput): Sha256Digest {
    return semanticDigest({
        schemaVersion: 1,
        packId: input.packId,
        manifestDigest: input.manifestDigest,
        acceptanceDigest: input.acceptanceDigest,
        sourceBaselines: input.sourceBaselines,
        files: sortSealedFiles(input.files).map((file) => ({
            path: file.path, sha256: file.sha256, bytes: file.bytes
        }))
    });
}

/** Raw-byte SHA-256 file digest as used by the sealed file set (§3.4). */
export function fileDigest(bytes: Uint8Array): Sha256Digest {
    return `sha256:${createHash('sha256').update(bytes).digest('hex')}`;
}

/** Structured semantic digest of a parsed pack document (manifest or acceptance). */
export function computeDocumentDigest(document: unknown): Sha256Digest {
    if (!isJsonValue(document)) {
        throw new TypeError('Pack document digest requires a well-formed JSON value.');
    }
    return semanticDigest(document);
}

/** Sorts the sealed file set by path using stable UTF-16 code-unit ordering. */
export function sortSealedFiles(files: readonly SealedFile[]): readonly SealedFile[] {
    return [...files].sort((left, right) => (left.path < right.path ? -1 : left.path > right.path ? 1 : 0));
}

/**
 * Mechanically classifies init-time drift into the closed §3.5 codes. This is a
 * pure function over observed evidence; no model and no I/O participate.
 */
export function classifyDrift(observations: DriftObservations): PackDriftResult {
    const findings: PackDriftFinding[] = [
        ...(observations.enumerationFailed
            ? [fail('PACK_FILESET_CHANGED', observations.packRepository, '<pack-root-enumeration-failed>')] : []),
        ...(observations.gitUnavailable
            ? [fail('PACK_FILESET_CHANGED', observations.packRepository, '<git-query-unavailable>')] : []),
        ...classifySealedFiles(observations),
        ...observations.extraEntries.map((entry) => fail('PACK_FILESET_CHANGED', observations.packRepository, entry.path)),
        ...classifyAcceptedInputs(observations),
        ...classifyBaselines(observations)
    ];
    return {ok: findings.every((finding) => finding.severity !== 'fail'), findings: Object.freeze(findings)};
}

function classifySealedFiles(observations: DriftObservations): PackDriftFinding[] {
    const findings: PackDriftFinding[] = [];
    for (const observation of observations.sealedFiles) {
        if (observation.presence !== 'tracked') {
            findings.push(fail('PACK_FILESET_CHANGED', observations.packRepository, observation.file.path));
        } else if (observation.currentSha256 !== observation.file.sha256 || !observation.committedMatches) {
            findings.push(fail('PACK_BYTES_CHANGED', observations.packRepository, observation.file.path));
        }
    }
    return findings;
}

function classifyAcceptedInputs(observations: DriftObservations): PackDriftFinding[] {
    const findings: PackDriftFinding[] = [];
    for (const observation of observations.acceptedInputs) {
        if (observation.currentSha256 !== observation.input.sha256) {
            findings.push(fail('ACCEPTED_INPUT_CHANGED', observation.input.repository, observation.input.path));
        }
    }
    return findings;
}

function classifyBaselines(observations: DriftObservations): PackDriftFinding[] {
    const findings: PackDriftFinding[] = [];
    for (const baseline of observations.baselines) {
        if (!baseline.available) {
            const severity: PackDriftFinding['severity'] = baseline.readOnly && baseline.proofOptional ? 'warn' : 'fail';
            findings.push({code: 'SOURCE_BASELINE_UNAVAILABLE', severity, repository: baseline.repository, path: ''});
            continue;
        }
        for (const path of baseline.changedPaths) {
            const finding = classifyChangedPath(baseline.repository, path, observations);
            if (finding !== null) findings.push(finding);
        }
    }
    return findings;
}

function classifyChangedPath(repository: string, path: string, observations: DriftObservations): PackDriftFinding | null {
    if (intersectsAny(repository, path, observations.claimPaths)) {
        return fail('SOURCE_BASELINE_CRITICAL', repository, path);
    }
    if (observations.acceptedInputs.some((input) =>
        input.input.repository === repository && resourcePathsOverlap(input.input.path, path))) {
        return null;
    }
    return {code: 'SOURCE_BASELINE_UNRELATED', severity: 'warn', repository, path};
}

function intersectsAny(repository: string, path: string, claims: readonly PackClaimPath[]): boolean {
    return claims.some((claim) => claim.repository === repository && resourcePathsOverlap(claim.path, path));
}

function fail(code: PackDriftFinding['code'], repository: string, path: string): PackDriftFinding {
    return {code, severity: 'fail', repository, path};
}
