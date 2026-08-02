import type {RepositoryBinding} from '../contracts/types.js';

export type CapabilityClass = 'C2' | 'C3' | 'C5';
export type DecisionClass = 'D1' | 'D2' | 'D3';

export interface RoutingEndpoint {
    readonly endpointId: string;
    readonly hostId: string;
    readonly osUser: string;
    readonly adapterId: string;
    readonly provider: string;
    readonly accountId: string;
    readonly model: string;
    readonly effort: string;
    readonly capabilityClass: CapabilityClass;
}

export interface AutomatedRoute {
    readonly minimumCapability: CapabilityClass;
    readonly primary: string;
    readonly fallbacks: readonly string[];
}

export interface SessionRoute {
    readonly primary: string;
    readonly fallbacks: readonly string[];
}

export interface CoordinatorRoutingPolicy {
    readonly schemaVersion: 1;
    readonly endpoints: readonly RoutingEndpoint[];
    readonly classes: Readonly<Record<DecisionClass, AutomatedRoute>>;
    readonly operatorSessionClasses: Readonly<Record<DecisionClass, SessionRoute>>;
    readonly operatorSessionBudgetPolicyRef: string;
}

export interface InitRequest {
    readonly slug: string;
    readonly tmuxPrefix: string;
    readonly implPackPath: string;
    readonly coordinatorRoutingPath: string;
    readonly scopePath?: string;
    readonly runtimeVersion?: string;
    readonly workspacePath?: string;
    readonly updateGitignore: boolean;
    readonly dryRun: boolean;
    readonly cwd: string;
}

export interface InitWarning {readonly code: 'SCOPE_UNKNOWN_FIELD' | 'GITIGNORE_UPDATE_PENDING'; readonly message: string;}
export interface InitConflict {readonly kind: string; readonly laneId: string; readonly detail: string;}
export interface ManagedLink {readonly path: string; readonly target: string;}
export interface DeferredInitArtifact {readonly owner: 'LC-02' | 'LC-03' | 'LC-05' | 'LC-09'; readonly artifact: string; readonly reason: string;}

export interface InitPlan {
    readonly schemaVersion: 1;
    readonly applied: false;
    readonly lane: {readonly id: string; readonly slug: string; readonly kind: 'implementation'};
    readonly controlHome: string;
    readonly laneDir: string;
    readonly repositories: readonly RepositoryBinding[];
    readonly implementationPack: {readonly repository: string; readonly path: string; readonly absolutePath: string};
    readonly routing: CoordinatorRoutingPolicy;
    readonly routingProvenance: {readonly policyVersion: 'shipping-v1'; readonly adapters: readonly string[]; readonly reserves: readonly string[]};
    readonly conflictCheck: {readonly complete: true; readonly conflicts: readonly []};
    readonly runtime: {readonly version: string | null; readonly root: string | null};
    readonly directories: readonly string[];
    readonly links: readonly ManagedLink[];
    readonly config: Readonly<Record<string, string>>;
    readonly indexEntries: readonly {readonly repository: string; readonly worktreePath: string}[];
    readonly deferred: readonly DeferredInitArtifact[];
    readonly warnings: readonly InitWarning[];
}
