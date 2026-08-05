/**
 * Shared repair primitive behind both `UpgradeApply`'s same-call
 * rollback-on-failure and `UpgradeRecovery`'s crash recovery: whichever
 * `install.json` is currently authoritative on disk — the old one, because
 * the pointer commit never happened, or the new one, because it did —
 * every live managed `bin/` link must match its declared target before
 * authority is exposed again (`docs/spec/v1-contracts.md` §11: "Upgrade
 * stages all links … then switches one atomic install pointer. Old runtime
 * binding … remains until the new pointer is verified."). A live link that
 * has drifted from the authoritative declaration is atomically repaired —
 * temp-adjacent write, fsync, atomic rename, fsync — the exact same
 * technique staging itself uses, never a plain overwrite.
 */
import {dirname} from 'node:path';
import type {InstallManifestV1} from '../../contracts/manifests.js';
import {nodeUpgradeApplyFileSystem, stagingTempPath, type UpgradeApplyFileSystem} from './upgradeApplyFileSystem.js';
import {alreadyLinked, resolveManagedLinkSourcePath} from './upgradeApplyValidation.js';

/**
 * Restores every live link declared in `install.managedAssets` to match its
 * declaration, skipping any entry already correct. An entry whose declared
 * target no longer checksums is left alone (never repaired to a target that
 * is not provably intact) — its absence from the returned list, combined
 * with a failed checksum re-verification elsewhere, is the caller's signal.
 * Returns the asset paths actually repaired.
 */
export function reconcileManagedLinks(
    laneDir: string,
    install: InstallManifestV1,
    fileSystem: UpgradeApplyFileSystem = nodeUpgradeApplyFileSystem
): readonly string[] {
    const restored: string[] = [];
    for (const assetPath of Object.keys(install.managedAssets).sort()) {
        if (reconcileOne(laneDir, assetPath, install.managedAssets[assetPath], fileSystem)) restored.push(assetPath);
    }
    return restored;
}

function reconcileOne(
    laneDir: string, assetPath: string, declaration: InstallManifestV1['managedAssets'][string], fileSystem: UpgradeApplyFileSystem
): boolean {
    const sourcePath = resolveManagedLinkSourcePath(laneDir, assetPath);
    const observation = fileSystem.inspectLink(sourcePath);
    if (alreadyLinked(observation, declaration.target)) return false;
    if (fileSystem.digestFile(declaration.target) !== declaration.sha256) return false;
    const directory = dirname(sourcePath);
    const tempPath = stagingTempPath(sourcePath);
    try {
        fileSystem.ensureDirectory(directory);
        fileSystem.removeIfExists(tempPath);
        fileSystem.createSymlinkAt(declaration.target, tempPath);
        fileSystem.fsyncDirectory(directory);
        fileSystem.renameAtomic(tempPath, sourcePath);
    } catch {
        fileSystem.removeIfExists(tempPath);
        return false;
    }
    fileSystem.fsyncDirectory(directory);
    return true;
}
