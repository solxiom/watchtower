import {classifyManagedDestination, assertNoPendingRecoveryMutation, recoverInterruptedInstall, stageAndCommitDirectoryInstall} from './directoryInstallTransaction.js';
import {acquireDirectoryInstallLock, releaseDirectoryInstallLock} from './directoryInstallLock.js';
import {confirmationRequiredError, readVerifiedScopedAssets, selectScopedAssets} from './knowledgePackSource.js';
import {assertNoLaneState, detectExistingFiles, previewDestinationFiles, readVersionRecord} from './hostAdapterInstaller.js';
import type {
    HostAdapter, HostName, InstallOptions, InstallResult, InstallScope, PreviewResult, ResolvedKnowledgePack
} from './hostAdapterTypes.js';

/**
 * Shared shape for Codex and Claude: a directory of copied knowledge-pack
 * files plus a sibling `.watchtower-version` JSON record. Cursor installs a
 * single concatenated rule file and does not reuse this class.
 */
export class DirectoryHostAdapter implements HostAdapter {
    constructor(readonly host: HostName, private readonly destination: string) {}

    preview(pack: ResolvedKnowledgePack, scope: InstallScope): PreviewResult {
        classifyManagedDestination(this.destination);
        assertNoPendingRecoveryMutation(this.destination);
        const destinationExists = classifyManagedDestination(this.destination);
        const relativePaths = selectScopedAssets(pack.manifest, scope).map((asset) => asset.path);
        return {
            host: this.host, knowledgeVersion: pack.version, destination: this.destination, scope,
            files: previewDestinationFiles(this.destination, relativePaths),
            destinationExists,
            filesToOverwrite: detectExistingFiles(this.destination, relativePaths)
        };
    }

    install(pack: ResolvedKnowledgePack, scope: InstallScope, options: InstallOptions): InstallResult {
        classifyManagedDestination(this.destination);
        const assets = selectScopedAssets(pack.manifest, scope);
        const bytes = readVerifiedScopedAssets(pack, assets);
        assertNoLaneState(bytes);
        const lock = acquireDirectoryInstallLock(this.destination);
        try {
            recoverInterruptedInstall(this.destination);
            // Fail closed on ANY pre-existing destination, not merely a selected-file name collision:
            // an unrelated file already there is still an existing installation the operator must confirm.
            if (classifyManagedDestination(this.destination) && !options.replace) {
                throw confirmationRequiredError(this.destination);
            }
            const filesWritten = stageAndCommitDirectoryInstall(this.destination, bytes, pack.version);
            return {
                host: this.host, knowledgeVersion: pack.version, destination: this.destination, scope,
                filesWritten, versionRecorded: true, hostNotification: 'unverified'
            };
        } finally {
            releaseDirectoryInstallLock(lock);
        }
    }

    getInstalledVersion(): string | null {
        classifyManagedDestination(this.destination);
        assertNoPendingRecoveryMutation(this.destination);
        if (!classifyManagedDestination(this.destination)) return null;
        return readVersionRecord(this.destination);
    }
}
