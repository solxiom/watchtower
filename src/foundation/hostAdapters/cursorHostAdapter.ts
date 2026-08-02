import {readVersionCommentHeader, writeCursorRuleFile} from './cursorRuleFile.js';
import {classifyCursorRuleDestination} from './cursorDestination.js';
import {resolveKnownDestination} from './hostAdapterInstaller.js';
import {confirmationRequiredError, readVerifiedScopedAssets, selectScopedAssets} from './knowledgePackSource.js';
import type {
    HostAdapter, InstallOptions, InstallResult, InstallScope, PreviewResult, ResolvedKnowledgePack
} from './hostAdapterTypes.js';

const CURSOR_RULE_FILE = '.cursorrules';

/** Default destination: `<projectRoot>/.cursorrules`, a single concatenated rule file. */
export function createCursorHostAdapter(projectRoot: string = process.cwd()): HostAdapter {
    return new CursorHostAdapter(resolveKnownDestination(projectRoot, CURSOR_RULE_FILE));
}

class CursorHostAdapter implements HostAdapter {
    readonly host = 'cursor' as const;
    constructor(private readonly destination: string) {}

    preview(pack: ResolvedKnowledgePack, scope: InstallScope): PreviewResult {
        const relativePaths = selectScopedAssets(pack.manifest, scope).map((asset) => asset.path);
        const destinationExists = classifyCursorRuleDestination(this.destination);
        return {
            host: this.host, knowledgeVersion: pack.version, destination: this.destination, scope,
            files: relativePaths.map((sourcePath) => ({sourcePath, destinationPath: this.destination})),
            destinationExists,
            filesToOverwrite: destinationExists ? [this.destination] : []
        };
    }

    install(pack: ResolvedKnowledgePack, scope: InstallScope, options: InstallOptions): InstallResult {
        if (classifyCursorRuleDestination(this.destination) && !options.replace) {
            throw confirmationRequiredError(this.destination);
        }
        const assets = selectScopedAssets(pack.manifest, scope);
        const bytes = readVerifiedScopedAssets(pack, assets);
        writeCursorRuleFile(this.destination, pack.version, bytes);
        return {
            host: this.host, knowledgeVersion: pack.version, destination: this.destination, scope,
            filesWritten: [this.destination], versionRecorded: true, hostNotification: 'unverified'
        };
    }

    getInstalledVersion(): string | null {
        if (!classifyCursorRuleDestination(this.destination)) return null;
        return readVersionCommentHeader(this.destination);
    }
}
