/**
 * Re-reads `implementation-pack.json` and its lock file fresh from disk at
 * compile time and proves them unchanged since LC-02 sealed the pack, before
 * any owned output is produced. `ConsumedPack` (LC-02's output) carries only
 * digests and derived identity, not the manifest's batch/requirement/repository
 * entities the compiler needs, so this is the compiler's own read of external
 * bytes: `unknown` in, a closed rejection or a validated document out.
 */
import {join} from 'node:path';
import {computeDocumentDigest, fileDigest} from '../index.js';
import {hasDuplicateJsonObjectKey} from '../../schemaComposition/jsonDuplicateKeyDetector.js';
import {isRecord, readManifestDocument, type PackIndexManifestDocument} from './packIndexJsonReaders.js';
import {packIndexRejection, type PackIndexRejection} from '../../../contracts/packIndex.js';
import type {PackFileSystem, PackSchemaValidators} from '../index.js';
import type {ConsumedPack} from '../../../contracts/pack.js';

const MANIFEST_FILE = 'implementation-pack.json';
const LOCK_FILE = 'implementation-pack.lock.json';

export interface PackIndexSource {
    readonly document: PackIndexManifestDocument;
    readonly manifestDigest: string;
    readonly lockDigest: string;
}

function readJson(packRoot: string, relativePath: string, fs: PackFileSystem): {value: Record<string, unknown>} | PackIndexRejection {
    let bytes: Uint8Array;
    try {
        bytes = fs.readFile(join(packRoot, relativePath));
    } catch {
        return packIndexRejection('PACK_INDEX_SOURCE_UNREADABLE', relativePath, 'source document is unreadable');
    }
    let text: string;
    try {
        text = new TextDecoder('utf-8', {fatal: true}).decode(bytes);
    } catch {
        return packIndexRejection('PACK_INDEX_SOURCE_INVALID', relativePath, 'document is not valid UTF-8');
    }
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        return packIndexRejection('PACK_INDEX_SOURCE_INVALID', relativePath, 'malformed JSON');
    }
    if (hasDuplicateJsonObjectKey(text)) return packIndexRejection('PACK_INDEX_SOURCE_INVALID', relativePath, 'duplicate object key');
    return isRecord(value) ? {value} : packIndexRejection('PACK_INDEX_SOURCE_INVALID', relativePath, 'root is not an object');
}

function sealedDigestFor(pack: ConsumedPack, path: string): string | null {
    return pack.sealedFiles.find((file) => file.path === path)?.sha256 ?? null;
}

/**
 * Reads, digest-checks, schema-validates, and entity-parses the pack manifest.
 * The lock file is read only for its raw-byte digest (it is excluded from
 * `ConsumedPack.sealedFiles` by design, per LC-02) and its recorded seal
 * identity is cross-checked against the already-accepted `ConsumedPack`.
 */
export function readPackIndexSource(
    packRoot: string, pack: ConsumedPack, fs: PackFileSystem, validators: PackSchemaValidators
): PackIndexSource | PackIndexRejection {
    const sealedManifestDigest = sealedDigestFor(pack, MANIFEST_FILE);
    if (sealedManifestDigest === null) return packIndexRejection('PACK_INDEX_SOURCE_MISSING', MANIFEST_FILE, 'not present in the sealed file ledger');
    let manifestBytes: Uint8Array;
    try {
        manifestBytes = fs.readFile(join(packRoot, MANIFEST_FILE));
    } catch {
        return packIndexRejection('PACK_INDEX_SOURCE_UNREADABLE', MANIFEST_FILE, 'source document is unreadable');
    }
    if (fileDigest(manifestBytes) !== sealedManifestDigest) {
        return packIndexRejection('PACK_INDEX_DIGEST_MISMATCH', MANIFEST_FILE, 'current bytes differ from the sealed ledger digest');
    }
    const manifest = readJson(packRoot, MANIFEST_FILE, fs);
    if ('reason' in manifest) return manifest;
    if (!validators.manifest(manifest.value)) return packIndexRejection('PACK_INDEX_SCHEMA_INVALID', MANIFEST_FILE, 'manifest schema');
    const manifestDigest = computeDocumentDigest(manifest.value);
    if (manifestDigest !== pack.manifestDigest) {
        return packIndexRejection('PACK_INDEX_DIGEST_MISMATCH', MANIFEST_FILE, 'reproduced document digest differs from the accepted pack');
    }
    const document = readManifestDocument(manifest.value);
    if (document === null) return packIndexRejection('PACK_INDEX_ENTITY_INVALID', MANIFEST_FILE, 'a batch, requirement, or repository entity is malformed');
    if (document.packId !== pack.packId || document.packRepository !== pack.packRepository) {
        return packIndexRejection('PACK_INDEX_SOURCE_INVALID', MANIFEST_FILE, 'packId or packRepository differs from the accepted pack');
    }
    const lock = readLock(packRoot, pack, fs);
    if ('reason' in lock) return lock;
    return {document, manifestDigest, lockDigest: lock.lockDigest};
}

function readLock(packRoot: string, pack: ConsumedPack, fs: PackFileSystem): {lockDigest: string} | PackIndexRejection {
    let lockBytes: Uint8Array;
    try {
        lockBytes = fs.readFile(join(packRoot, LOCK_FILE));
    } catch {
        return packIndexRejection('PACK_INDEX_SOURCE_UNREADABLE', LOCK_FILE, 'lock document is unreadable');
    }
    const lockDigest = fileDigest(lockBytes);
    const lock = readJson(packRoot, LOCK_FILE, fs);
    if ('reason' in lock) return lock;
    const sealId = typeof lock.value.sealId === 'string' ? lock.value.sealId : null;
    if (sealId !== pack.sealId) {
        return packIndexRejection('PACK_INDEX_DIGEST_MISMATCH', LOCK_FILE, 'lock sealId differs from the accepted pack');
    }
    return {lockDigest};
}
