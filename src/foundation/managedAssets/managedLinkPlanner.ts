/**
 * Side-effect-free planning for one managed lane link: resolves the lane
 * source path and the runtime-store target path and proves both containment
 * and runtime-manifest-backed authority before any mutation is authorized.
 *
 * Correction 01, finding 1: source containment previously canonicalized only
 * `laneDir` and lexically joined the rest, so a symlinked `bin/` (or any
 * nested parent) resolved outside the lane without detection — the mutator's
 * directory-create and link-create calls then silently followed it. This
 * module now walks up from the
 * candidate to the nearest *existing* ancestor and proves that ancestor's
 * full realpath resolves inside the lane before authorizing anything below
 * it, the same "nearest existing ancestor" technique `canonicalPaths.ts` uses
 * for lane-owned files — `realpathSync` resolves every intermediate symlink
 * in the chain, so checking one ancestor catches an escape at any depth.
 *
 * Correction 01, finding 2: the source must be a normalized descendant of
 * `bin/` specifically — never `lane.json`, `install.json`, `coordinator/**`,
 * an absolute path, a `..`/`.` segment, a backslash variant, or `bin` itself.
 *
 * Correction 01, finding 3: a target is authorized only when it is an exact,
 * mode-eligible `RuntimeManifestV1.assets` entry and the install-declared,
 * runtime-manifest-declared, and observed digests all agree — a caller-
 * supplied digest matching live bytes is no longer sufficient by itself.
 *
 * Correction 01, finding 7: a missing target and an escaped target are no
 * longer the same reason, and an unexpected filesystem failure (permission,
 * `ELOOP`, etc.) is its own stable `LINK_IO_UNAVAILABLE` reason rather than
 * silently becoming a different refusal.
 */
import {lstatSync, realpathSync} from 'node:fs';
import {dirname, isAbsolute, relative, resolve, sep} from 'node:path';
import {ManagedAssetsError, type ManagedAssetDeclaration} from '../../contracts/manifests.js';
import {containedInRoot} from '../taskRuntime/taskRuntimePin.js';
import type {RuntimeFileSystem} from '../taskRuntime/runtimeFileSystem.js';
import {isMissingPath} from './managedLinkFileSystem.js';
import {readStagedRuntimeManifest} from './stagedRuntimeManifestReader.js';

const BIN_SEGMENT = 'bin';
const ELIGIBLE_MODE = '0755';

export interface ManagedLinkPlan {
    readonly assetPath: string;
    readonly sourcePath: string;
    readonly targetPath: string;
}

/** Resolve, contain, and runtime-manifest-verify one declared managed asset. */
export function planLink(
    laneDir: string,
    runtimeRoot: string,
    assetPath: string,
    declaration: ManagedAssetDeclaration,
    runtimeFiles: RuntimeFileSystem
): ManagedLinkPlan {
    const sourcePath = resolveSource(laneDir, assetPath);
    const targetPath = resolveTarget(runtimeRoot, assetPath, declaration, runtimeFiles);
    return {assetPath, sourcePath, targetPath};
}

/**
 * Removal takes no runtime catalog, so it never re-derives runtime-root
 * containment: it only proves the lane source resolves inside the lane, then
 * compares the manifest-declared target verbatim (`removeLinks` refuses
 * whenever the live symlink no longer matches this declaration).
 */
export function planRemoval(laneDir: string, assetPath: string, declaration: ManagedAssetDeclaration): ManagedLinkPlan {
    return {assetPath, sourcePath: resolveSource(laneDir, assetPath), targetPath: resolve(declaration.target)};
}

function resolveSource(laneDir: string, assetPath: string): string {
    assertBinDescendant(assetPath);
    const canonicalLaneDir = canonicalizeLaneDir(laneDir, assetPath);
    const candidate = resolve(canonicalLaneDir, assetPath);
    authorizeExistingAncestor(canonicalLaneDir, candidate, assetPath);
    return candidate;
}

/** Only a normalized, lane-relative descendant of `bin/` — never `bin` itself. */
function assertBinDescendant(assetPath: string): void {
    if (!isManagedBinPath(assetPath)) throw sourceEscape(assetPath);
}

/**
 * The pure shape check behind `assertBinDescendant`, exported so the
 * install-manifest reader (Correction 01, finding 7) rejects an out-of-`bin/`
 * managed-asset key at parse time using the exact same rule, rather than a
 * second, possibly divergent copy of it.
 */
export function isManagedBinPath(assetPath: unknown): assetPath is string {
    if (typeof assetPath !== 'string' || assetPath.length === 0 || assetPath.includes('\\') || isAbsolute(assetPath)) {
        return false;
    }
    const segments = assetPath.split('/');
    if (segments.length < 2 || segments[0] !== BIN_SEGMENT) return false;
    return segments.every((segment) => segment.length > 0 && segment !== '.' && segment !== '..');
}

function canonicalizeLaneDir(laneDir: string, assetPath: string): string {
    try {
        return realpathSync(laneDir);
    } catch (error) {
        throw ioUnavailable(assetPath, error);
    }
}

/**
 * Walk from the candidate's parent up to the first existing entry and prove
 * its full realpath resolves inside `canonicalLaneDir`. A missing ancestor is
 * safe (it will be created fresh, inside the lane, by `mkdirSync`); an
 * existing one whose realpath escapes — because it or any ancestor of it is a
 * symlink — is refused before anything is read or written through it.
 */
function authorizeExistingAncestor(canonicalLaneDir: string, candidate: string, assetPath: string): void {
    let current = dirname(candidate);
    while (current !== canonicalLaneDir) {
        const parent = dirname(current);
        if (parent === current) throw sourceEscape(assetPath);
        let stat;
        try {
            stat = lstatSync(current);
        } catch (error) {
            if (isMissingPath(error)) {
                current = parent;
                continue;
            }
            throw ioUnavailable(assetPath, error);
        }
        let canonicalAncestor: string;
        try {
            canonicalAncestor = realpathSync(current);
        } catch (error) {
            throw ioUnavailable(assetPath, error);
        }
        if (!containedInRoot(canonicalLaneDir, canonicalAncestor)) throw sourceEscape(assetPath);
        if (!stat.isDirectory() && !stat.isSymbolicLink()) throw sourceEscape(assetPath);
        return;
    }
}

function resolveTarget(
    runtimeRoot: string,
    assetPath: string,
    declaration: ManagedAssetDeclaration,
    runtimeFiles: RuntimeFileSystem
): string {
    if (typeof declaration.target !== 'string' || !isAbsolute(declaration.target)) throw targetEscape(assetPath);
    const lexicalTarget = resolve(declaration.target);
    if (!containedInRoot(runtimeRoot, lexicalTarget)) throw targetEscape(assetPath);

    const observation = runtimeFiles.observe(lexicalTarget);
    if (observation.kind !== 'file') {
        throw runtimeFiles.isTraversable(dirname(lexicalTarget)) ? targetMissing(assetPath) : ioUnavailable(assetPath);
    }
    if (!containedInRoot(runtimeRoot, observation.canonicalPath)) throw targetEscape(assetPath);

    const manifest = readStagedRuntimeManifest(runtimeRoot, runtimeFiles);
    const relativePath = relative(runtimeRoot, observation.canonicalPath).split(sep).join('/');
    const asset = manifest.assets.find((entry) => entry.path === relativePath);
    if (asset === undefined) throw targetMissing(assetPath);
    if (asset.mode !== ELIGIBLE_MODE) throw targetMissing(assetPath);

    const liveDigest = runtimeFiles.digest(observation.canonicalPath);
    if (liveDigest === null) throw ioUnavailable(assetPath);
    if (asset.sha256 !== liveDigest || declaration.sha256 !== liveDigest || asset.sha256 !== declaration.sha256) {
        throw checksumMismatch(assetPath);
    }
    return observation.canonicalPath;
}

function sourceEscape(assetPath: string): ManagedAssetsError {
    return new ManagedAssetsError('LINK_SOURCE_ESCAPE', assetPath,
        'The managed link source is not a normalized lane-relative bin/ descendant.');
}

function targetEscape(assetPath: string): ManagedAssetsError {
    return new ManagedAssetsError('LINK_TARGET_ESCAPE', assetPath,
        'The managed link target resolves outside the immutable runtime root.');
}

function targetMissing(assetPath: string): ManagedAssetsError {
    return new ManagedAssetsError('LINK_TARGET_MISSING', assetPath,
        'The managed link target is not an exact, mode-eligible packaged runtime-manifest asset.');
}

function checksumMismatch(assetPath: string): ManagedAssetsError {
    return new ManagedAssetsError('LINK_TARGET_CHECKSUM_MISMATCH', assetPath,
        'The install-declared, runtime-manifest-declared, and observed target digests do not all agree.');
}

function ioUnavailable(assetPath: string, error?: unknown): ManagedAssetsError {
    const detail = error instanceof Error ? error.message : 'unavailable';
    return new ManagedAssetsError('LINK_IO_UNAVAILABLE', assetPath, `Unexpected filesystem failure: ${detail}`);
}
