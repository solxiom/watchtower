import {createHash} from 'node:crypto';
import {lstatSync, readdirSync, readFileSync} from 'node:fs';
import {join} from 'node:path';
import {
    createWatchtowerError, type KnowledgeManifestV1, type ManifestAsset, type ManifestAssetObservation
} from '../../contracts/index.js';
import {RuntimeKnowledgeManifestValidator} from '../runtimeKnowledgeManifest/RuntimeKnowledgeManifestValidator.js';
import {authorizePath, canonicalizePath} from '../canonicalPaths.js';
import type {InstallScope, ResolvedKnowledgePack} from './hostAdapterTypes.js';

const LANE_STATE_MARKERS = ['.watchtower/lanes/', 'LANE_ID=', 'TMUX_PREFIX=', 'INITIATIVE_ID=', 'HOME_REPOSITORY_ID='];

/**
 * Resolves the newest valid `WATCHTOWER_DATA_HOME/knowledge/<version>/` pack.
 * RT-04 (immutable data-root staging) has not landed, so this reads whatever
 * version directories already exist rather than staging them itself.
 */
export function resolveKnowledgeRoot(dataHome: string): ResolvedKnowledgePack {
    const knowledgeParent = join(dataHome, 'knowledge');
    const candidates = listVersionDirectories(knowledgeParent)
        .map((name) => readCandidate(knowledgeParent, name))
        .filter((candidate): candidate is ResolvedKnowledgePack => candidate !== null)
        .sort((a, b) => b.version.localeCompare(a.version));
    if (candidates.length === 0) {
        throw createWatchtowerError('ERR_MISSING_DEPENDENCY', {
            operation: 'resolve knowledge root', target: knowledgeParent,
            remediation: 'Install a versioned knowledge pack under WATCHTOWER_DATA_HOME/knowledge/<version>/.'
        });
    }
    return candidates[0];
}

export function selectScopedAssets(manifest: KnowledgeManifestV1, scope: InstallScope): readonly ManifestAsset[] {
    if (scope === 'full') return manifest.assets;
    const prefix = scope === 'skill-only' ? 'skill/' : 'guides/';
    return manifest.assets.filter((asset) => asset.path.startsWith(prefix));
}

/** Reads and verifies scoped asset bytes against the accepted RT-02 manifest contract. Fails closed. */
export function readVerifiedScopedAssets(pack: ResolvedKnowledgePack, assets: readonly ManifestAsset[]): ReadonlyMap<string, Buffer> {
    const bytes = new Map<string, Buffer>();
    const observed: ManifestAssetObservation[] = [];
    for (const asset of assets) {
        const content = readRegularFile(pack.root, asset.path);
        if (content === null) continue;
        bytes.set(asset.path, content);
        observed.push({
            path: asset.path,
            sha256: `sha256:${createHash('sha256').update(content).digest('hex')}`,
            mode: modeOf(pack.root, asset.path)
        });
    }
    const verification = new RuntimeKnowledgeManifestValidator().verifyAssets({...pack.manifest, assets}, observed);
    if (verification.ok === false) {
        throw createWatchtowerError('ERR_INTEGRITY_FAILURE', {
            operation: 'verify knowledge pack assets', target: verification.subject,
            remediation: 'Reinstall an uncorrupted, version-matched knowledge pack.'
        });
    }
    return bytes;
}

/** Returns the first lane-state marker found in installable content, or `null` when clean. */
export function findLaneStateMarker(content: string): string | null {
    return LANE_STATE_MARKERS.find((marker) => content.includes(marker)) ?? null;
}

export function laneStateError(subject: string, marker: string) {
    return createWatchtowerError('ERR_UNSAFE_MUTATION', {
        operation: 'install knowledge asset', target: `${subject} (marker: ${marker})`,
        remediation: 'Remove lane-specific state from the knowledge pack before installing a personal skill.'
    });
}

export function confirmationRequiredError(destination: string) {
    return createWatchtowerError('ERR_CONFIRMATION_REQUIRED', {
        operation: 'install knowledge pack', target: destination,
        remediation: 'Re-run with --replace to overwrite the existing installation.'
    });
}

function listVersionDirectories(knowledgeParent: string): readonly string[] {
    try {
        return readdirSync(knowledgeParent, {withFileTypes: true})
            .filter((entry) => entry.isDirectory())
            .map((entry) => entry.name);
    } catch {
        return [];
    }
}

function readCandidate(knowledgeParent: string, name: string): ResolvedKnowledgePack | null {
    try {
        const root = canonicalizePath(join(knowledgeParent, name));
        const manifestPath = authorizePath(root, 'manifest.json');
        const manifest = new RuntimeKnowledgeManifestValidator().validateKnowledge(JSON.parse(readFileSync(manifestPath, 'utf8')));
        return manifest.knowledgeVersion === name ? {root, version: name, manifest} : null;
    } catch {
        return null;
    }
}

function readRegularFile(root: string, assetPath: string): Buffer | null {
    try {
        const resolved = authorizePath(root, assetPath);
        if (!lstatSync(resolved).isFile()) return null;
        return readFileSync(resolved);
    } catch {
        return null;
    }
}

function modeOf(root: string, assetPath: string): '0644' | '0755' {
    const stat = lstatSync(authorizePath(root, assetPath));
    return (stat.mode & 0o111) !== 0 ? '0755' : '0644';
}
