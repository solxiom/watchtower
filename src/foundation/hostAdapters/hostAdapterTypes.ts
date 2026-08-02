import type {KnowledgeManifestV1} from '../../contracts/index.js';

export type HostName = 'codex' | 'cursor' | 'claude';
export const HOST_NAMES: readonly HostName[] = ['codex', 'cursor', 'claude'];

export type InstallScope = 'skill-only' | 'guides-only' | 'full';
export const INSTALL_SCOPES: readonly InstallScope[] = ['skill-only', 'guides-only', 'full'];

/** Watchtower places files; it never claims a host notification is configured or active. */
export type HostNotificationStatus = 'unverified';

export interface ResolvedKnowledgePack {
    readonly root: string;
    readonly version: string;
    readonly manifest: KnowledgeManifestV1;
}

export interface PreviewFile {
    readonly sourcePath: string;
    readonly destinationPath: string;
}

export interface PreviewResult {
    readonly host: HostName;
    readonly knowledgeVersion: string;
    readonly destination: string;
    readonly scope: InstallScope;
    readonly files: readonly PreviewFile[];
    /** True whenever `destination` already exists, regardless of whether any selected file collides. */
    readonly destinationExists: boolean;
    /** The specific selected files that already exist at `destination`; informational, not the replace gate. */
    readonly filesToOverwrite: readonly string[];
}

export interface InstallOptions {
    readonly replace: boolean;
}

export interface InstallResult {
    readonly host: HostName;
    readonly knowledgeVersion: string;
    readonly destination: string;
    readonly scope: InstallScope;
    readonly filesWritten: readonly string[];
    readonly versionRecorded: boolean;
    readonly hostNotification: HostNotificationStatus;
}

export interface HostAdapter {
    readonly host: HostName;
    preview(pack: ResolvedKnowledgePack, scope: InstallScope): PreviewResult;
    install(pack: ResolvedKnowledgePack, scope: InstallScope, options: InstallOptions): InstallResult;
    getInstalledVersion(): string | null;
}
