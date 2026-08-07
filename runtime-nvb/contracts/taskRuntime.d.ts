/** CA-12: minimal packaged-compile type stub mirroring `src/contracts/taskRuntime.ts`'s public surface. */
export interface LaneRuntimeContext {
    readonly workspace: string;
    readonly laneId: string;
    readonly initiativeId: string;
    readonly laneSlug: string;
    readonly laneDir: string;
    readonly homeRepositoryId: string;
    readonly repositoriesFile: string;
    readonly runtimeRoot: string;
    readonly runtimeVersion: string;
    readonly knowledgeRoot: string;
    readonly activeRepositoryId?: string;
    readonly coordinatorCycleId?: string;
    readonly decisionClass?: string;
    readonly baseEnvironment: {readonly path: string; readonly home: string};
}

export interface PinnedTaskRuntimeTarget {
    readonly catalogId: string;
    readonly catalogSha256: string;
    readonly profile: string;
    readonly configTarget: string;
    readonly moduleTarget: string;
}
