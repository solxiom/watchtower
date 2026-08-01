import type {JsonObject, MembershipWarningReason, WorkspaceResolution} from './types.js';

export type LaneConflictState = 'none' | 'detected';
export type LaneSelectionSource = 'explicit' | 'selection-precedence';

export interface RepositoryBindingView extends JsonObject {
    readonly id: string;
    readonly role: string;
    readonly access: 'read' | 'write';
    readonly path: string;
    readonly branch: string;
    readonly worktreeMode: 'dedicated' | 'shared';
}

export interface LaneListItem extends JsonObject {
    readonly laneId: string;
    readonly slug: string;
    readonly initiativeId: string;
    readonly kind: 'implementation';
    readonly controlHome: string;
    readonly repositoryCount: number;
    readonly lifecycle: 'bootstrap' | 'active' | 'paused' | 'complete' | 'unknown';
    readonly activeBatch: string | null;
    readonly runtimeVersion: string;
    readonly conflictState: LaneConflictState;
    readonly conflicts: readonly string[];
}

export interface LaneListWarning extends JsonObject {
    readonly laneId: string;
    readonly reason: MembershipWarningReason;
}

export interface LaneListDiagnostics extends JsonObject {
    readonly workspaceResolution: WorkspaceResolution;
    readonly relevantLaneCount: number;
    readonly matchedLaneCount: number;
    readonly pageItemCount: number;
    readonly warningCount: number;
    readonly conflictCount: number;
}

export interface LaneListPage extends JsonObject {
    readonly items: readonly LaneListItem[];
    readonly limit: number;
    readonly nextCursor: string | null;
    readonly revision: string;
    readonly warnings: readonly LaneListWarning[];
    readonly diagnostics: LaneListDiagnostics | null;
}

export interface ConfigResolutionSources extends JsonObject {
    readonly workspace: 'explicit' | 'git' | 'ancestor' | 'current-directory';
    readonly lane: LaneSelectionSource;
    readonly dataHome: 'WATCHTOWER_DATA_HOME' | 'XDG_DATA_HOME' | 'default';
}

export interface ResolvedConfigPaths extends JsonObject {
    readonly config: string;
    readonly install: string;
    readonly repositories: string;
}

export interface ResolvedConfigDiagnostics extends JsonObject {
    readonly workspaceResolution: WorkspaceResolution;
    readonly relevantLaneCount: number;
    readonly membershipWarningCount: number;
    readonly logicalRepositoryCount: number;
    readonly localRepositoryCount: number;
    readonly configKeyCount: number;
    readonly redactedKeyCount: number;
}

export interface ResolvedConfigV1 extends JsonObject {
    readonly laneId: string;
    readonly slug: string;
    readonly initiativeId: string;
    readonly kind: 'implementation';
    readonly controlHome: string;
    readonly logicalRepositories: readonly JsonObject[];
    readonly repositories: readonly RepositoryBindingView[];
    readonly laneDir: string;
    readonly runtimeRoot: string;
    readonly knowledgeRoot: string;
    readonly runtimeVersion: string;
    readonly knowledgeVersion: string;
    readonly config: Readonly<Record<string, string>>;
    readonly redactedKeys: readonly string[];
    readonly sources: ConfigResolutionSources;
    readonly paths: ResolvedConfigPaths;
    readonly diagnostics: ResolvedConfigDiagnostics | null;
}
