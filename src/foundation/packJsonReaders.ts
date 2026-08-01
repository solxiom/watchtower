import type {JsonValue} from './schemaComposition/schemaCompositionContracts.js';
import type {
    ConsumedPack,
    PackAcceptedInput,
    PackClaimPath,
    PackSourceBaseline,
    SealedFile,
    Sha256Digest
} from '../contracts/pack.js';

const BACKSLASH = 0x5c;
const DEL = 0x7f;
const FIRST_PRINTABLE = 0x20;

export function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null && !Array.isArray(value);
}

export function asString(value: unknown): string | null {
    return typeof value === 'string' ? value : null;
}

export function asArray(value: unknown): readonly unknown[] {
    return Array.isArray(value) ? value : [];
}

export function asDigest(value: unknown): Sha256Digest {
    return (asString(value) ?? '') as Sha256Digest;
}

/** Coerces a value to a JSON object for canonicalization; non-objects become `{}`. */
export function asJson(value: unknown): JsonValue {
    return (isRecord(value) ? value : {}) as JsonValue;
}

/** Segment-safe pack-relative path: no empty, dot, dot-dot, backslash, or control segment. */
export function isSafeRelativePath(path: string): boolean {
    const segments = path.split('/');
    return segments.length > 0 && segments.every(isSafeSegment);
}

function isSafeSegment(segment: string): boolean {
    if (segment === '' || segment === '.' || segment === '..') return false;
    for (const character of segment) {
        const code = character.codePointAt(0) ?? 0;
        if (code < FIRST_PRINTABLE || code === DEL || code === BACKSLASH) return false;
    }
    return true;
}

export function readSealedFiles(value: unknown): readonly SealedFile[] {
    return asArray(value).flatMap((file) => {
        if (!isRecord(file)) return [];
        const path = asString(file.path);
        const sha256 = asString(file.sha256);
        return path !== null && sha256 !== null && typeof file.bytes === 'number'
            ? [{path, sha256: sha256 as Sha256Digest, bytes: file.bytes}] : [];
    });
}

export function readRepositoryIds(manifest: Record<string, unknown>): string[] {
    return asArray(manifest.repositories).flatMap((repository) => {
        const id = isRecord(repository) ? asString(repository.id) : null;
        return id === null ? [] : [id];
    });
}

export function readAcceptedInputs(manifest: Record<string, unknown>): PackAcceptedInput[] {
    return asArray(manifest.acceptedInputs).flatMap((input) => {
        if (!isRecord(input)) return [];
        const repository = asString(input.repository);
        const path = asString(input.path);
        const sha256 = asString(input.sha256);
        const acceptanceRef = asString(input.acceptanceRef);
        return repository !== null && path !== null && sha256 !== null && acceptanceRef !== null
            ? [{repository, path, sha256: sha256 as Sha256Digest, acceptanceRef}] : [];
    });
}

export function readSourceBaselines(manifest: Record<string, unknown>): PackSourceBaseline[] {
    const baselines = manifest.sourceBaselines;
    if (!isRecord(baselines)) return [];
    return Object.entries(baselines).flatMap(([repository, value]) => {
        if (!isRecord(value)) return [];
        const revision = asString(value.revision);
        return revision === null ? [] : [{repository, revision, dirty: value.dirty === true}];
    });
}

export function readClaimPaths(manifest: Record<string, unknown>): PackClaimPath[] {
    return asArray(manifest.batches).flatMap((batch) => (isRecord(batch) ? asArray(batch.repositories) : []))
        .flatMap((repository) => {
            if (!isRecord(repository)) return [];
            const id = asString(repository.id);
            const writable = repository.access === 'write' || repository.claimMode === 'shared-write' ||
                repository.claimMode === 'exclusive-write';
            return id === null ? [] : asArray(repository.paths).flatMap((path) =>
                (asString(path) === null ? [] : [{repository: id, path: asString(path) as string, writable}]));
        });
}

/** Builds the frozen sealed pack view from validated documents and the sealed file set. */
export function buildConsumedPack(
    manifest: Record<string, unknown>,
    lock: Record<string, unknown>,
    acceptance: Record<string, unknown>,
    sealedFiles: readonly SealedFile[]
): ConsumedPack {
    return Object.freeze({
        packId: asString(manifest.packId) ?? '',
        initiativeId: asString(manifest.initiativeId) ?? '',
        packRepository: asString(manifest.packRepository) ?? '',
        manifestDigest: asDigest(lock.manifestDigest),
        acceptanceDigest: asDigest(lock.acceptanceDigest),
        sealId: asDigest(lock.sealId),
        reviewedCommit: asString(acceptance.reviewedCommit) ?? '',
        repositories: Object.freeze(readRepositoryIds(manifest)),
        sealedFiles: Object.freeze([...sealedFiles]),
        acceptedInputs: Object.freeze(readAcceptedInputs(manifest)),
        sourceBaselines: Object.freeze(readSourceBaselines(manifest)),
        claimPaths: Object.freeze(readClaimPaths(manifest))
    });
}
