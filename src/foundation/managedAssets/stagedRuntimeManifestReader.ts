/**
 * The one owner that binds a managed-link target to the packaged runtime
 * manifest (Correction 01, finding 3). Reuses the exact accepted parser
 * (`parseRuntimeManifest`, RT-02) rather than re-deriving manifest shape —
 * this module only locates and reads `manifest.json` beside a staged runtime
 * root and hands its bytes to that parser.
 */
import {join} from 'node:path';
import {parseRuntimeManifest} from '../runtimeKnowledgeManifest/manifestDocumentParser.js';
import type {RuntimeManifestV1} from '../../contracts/runtimeKnowledgeManifests.js';
import {ManagedAssetsError} from '../../contracts/manifests.js';
import type {RuntimeFileSystem} from '../taskRuntime/runtimeFileSystem.js';

const MANIFEST_FILE = 'manifest.json';
const MAX_MANIFEST_BYTES = 4 * 1024 * 1024;

/** Read and schema-validate the staged runtime manifest at `runtimeRoot`. */
export function readStagedRuntimeManifest(runtimeRoot: string, files: RuntimeFileSystem): RuntimeManifestV1 {
    const path = join(runtimeRoot, MANIFEST_FILE);
    const text = files.readText(path, MAX_MANIFEST_BYTES);
    if (text === null) {
        throw new ManagedAssetsError('LINK_IO_UNAVAILABLE', MANIFEST_FILE,
            'The staged runtime manifest is missing, unreadable, or oversized.');
    }
    let value: unknown;
    try {
        value = JSON.parse(text);
    } catch {
        throw new ManagedAssetsError('LINK_IO_UNAVAILABLE', MANIFEST_FILE,
            'The staged runtime manifest is not well-formed JSON.');
    }
    try {
        return parseRuntimeManifest(value);
    } catch {
        throw new ManagedAssetsError('LINK_IO_UNAVAILABLE', MANIFEST_FILE,
            'The staged runtime manifest failed schema validation.');
    }
}
