import type {RepositoryBinding} from '../contracts/types.js';
import type {CoordinatorRoutingPolicy, InitConflict, InitWarning} from './InitContracts.js';

export interface ScopeReadResult {
    readonly bindings: readonly RepositoryBinding[];
    readonly warnings: readonly InitWarning[];
}

export interface InitPreflightPort {
    resolveWorkspace(explicit: string | undefined, cwd: string): string;
    resolvePack(path: string, controlHome: string): string;
    readScope(path: string | undefined, controlHome: string): ScopeReadResult;
    readRouting(path: string, controlHome: string): CoordinatorRoutingPolicy;
    destinationExists(controlHome: string, slug: string): boolean;
    gitIgnored(controlHome: string): boolean;
    runtimeRoot(version: string): string;
    laneId(): string;
    inspectConflicts(controlHome: string, bindings: readonly RepositoryBinding[], tmuxPrefix: string):
        {readonly complete: boolean; readonly conflicts: readonly InitConflict[]};
    qualifyRouting(policy: CoordinatorRoutingPolicy):
        {readonly policyVersion: 'shipping-v1'; readonly adapters: readonly string[]; readonly reserves: readonly string[]};
}
