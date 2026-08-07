/**
 * Reconstructs this process's own `LaneRuntimeContext` from the exact `WT_*`
 * allowlisted environment `laneTaskEnvironment.ts` built for it — the same
 * values, read back, never a second source of lane identity.
 */
import type {LaneRuntimeContext} from '../../contracts/taskRuntime.js';

function required(name: string): string {
    const value = process.env[name];
    if (typeof value !== 'string' || value.length === 0) {
        throw new Error(`Leaf authority requires the packaged ${name} environment value.`);
    }
    return value;
}

export function runtimeContextFromEnvironment(): LaneRuntimeContext {
    return {
        workspace: required('WT_WORKSPACE'), laneId: required('WT_LANE_ID'), initiativeId: required('WT_INITIATIVE_ID'),
        laneSlug: required('WT_LANE_SLUG'), laneDir: required('WT_LANE_DIR'), homeRepositoryId: required('WT_HOME_REPOSITORY_ID'),
        repositoriesFile: required('WT_REPOSITORIES_FILE'), runtimeRoot: required('WT_RUNTIME_ROOT'),
        runtimeVersion: required('WT_RUNTIME_VERSION'), knowledgeRoot: required('WT_KNOWLEDGE_ROOT'),
        activeRepositoryId: process.env.WT_ACTIVE_REPOSITORY_ID, coordinatorCycleId: process.env.WT_COORDINATOR_CYCLE_ID,
        decisionClass: process.env.WT_DECISION_CLASS,
        baseEnvironment: {path: required('PATH'), home: required('HOME')}
    };
}
