/**
 * Sole owner of `WT_*` environment construction and allowlisting for every
 * runtime invocation (`docs/spec/v1.md` §12).
 *
 * The exported map is built from validated lane context only. This process's
 * environment is never read here and never forwarded: the caller supplies the
 * two base values a child may see, and every other key is one of the exact
 * names §12 declares. Coordinator-only names appear only for a bounded decision
 * invocation. Values are never logged; `redactedEnvironmentKeys` exists so a
 * diagnostic can name the keys that were exported without their contents.
 */
import {LaneTaskRuntimeError, type LaneRuntimeContext} from '../../contracts/taskRuntime.js';

const MAX_VALUE_LENGTH = 4096;
const UNSAFE_VALUE = /[\u0000-\u001f\u007f]/u;

/** Every `WT_*` name §12 declares, in specification order. */
export const RUNTIME_ENVIRONMENT_KEYS = [
    'WT_WORKSPACE', 'WT_LANE_ID', 'WT_INITIATIVE_ID', 'WT_LANE_SLUG', 'WT_LANE_DIR',
    'WT_HOME_REPOSITORY_ID', 'WT_REPOSITORIES_FILE', 'WT_ACTIVE_REPOSITORY_ID',
    'WT_RUNTIME_ROOT', 'WT_RUNTIME_VERSION', 'WT_KNOWLEDGE_ROOT',
    'WT_COORDINATOR_CYCLE_ID', 'WT_DECISION_CLASS'
] as const;

/** The only names outside the `WT_` set that a child process may receive. */
export const BASE_ENVIRONMENT_KEYS = ['PATH', 'HOME'] as const;

/**
 * Build the complete child environment for one invocation. Every value is
 * validated; a missing required value or an unsafe value is a refusal, never a
 * silently dropped key.
 */
export function buildRuntimeEnvironment(context: LaneRuntimeContext): Readonly<Record<string, string>> {
    const environment: Record<string, string> = {
        PATH: requiredValue(context.baseEnvironment?.path, 'PATH'),
        HOME: requiredValue(context.baseEnvironment?.home, 'HOME'),
        WT_WORKSPACE: requiredValue(context.workspace, 'WT_WORKSPACE'),
        WT_LANE_ID: requiredValue(context.laneId, 'WT_LANE_ID'),
        WT_INITIATIVE_ID: requiredValue(context.initiativeId, 'WT_INITIATIVE_ID'),
        WT_LANE_SLUG: requiredValue(context.laneSlug, 'WT_LANE_SLUG'),
        WT_LANE_DIR: requiredValue(context.laneDir, 'WT_LANE_DIR'),
        WT_HOME_REPOSITORY_ID: requiredValue(context.homeRepositoryId, 'WT_HOME_REPOSITORY_ID'),
        WT_REPOSITORIES_FILE: requiredValue(context.repositoriesFile, 'WT_REPOSITORIES_FILE'),
        WT_RUNTIME_ROOT: requiredValue(context.runtimeRoot, 'WT_RUNTIME_ROOT'),
        WT_RUNTIME_VERSION: requiredValue(context.runtimeVersion, 'WT_RUNTIME_VERSION'),
        WT_KNOWLEDGE_ROOT: requiredValue(context.knowledgeRoot, 'WT_KNOWLEDGE_ROOT')
    };
    optional(environment, 'WT_ACTIVE_REPOSITORY_ID', context.activeRepositoryId);
    optional(environment, 'WT_COORDINATOR_CYCLE_ID', context.coordinatorCycleId);
    optional(environment, 'WT_DECISION_CLASS', context.decisionClass);
    return Object.freeze(environment);
}

/** The exported key names, sorted, for diagnostics that must not carry values. */
export function redactedEnvironmentKeys(environment: Readonly<Record<string, string>>): readonly string[] {
    return Object.keys(environment).sort();
}

function requiredValue(value: unknown, key: string): string {
    if (!isSafeValue(value)) {
        throw new LaneTaskRuntimeError('TASK_RUNTIME_ENVIRONMENT_INVALID', key,
            `The runtime invocation context does not supply a usable ${key} value.`);
    }
    return value;
}

function optional(environment: Record<string, string>, key: string, value: unknown): void {
    if (value === undefined) return;
    environment[key] = requiredValue(value, key);
}

function isSafeValue(value: unknown): value is string {
    return typeof value === 'string' && value.length > 0 && value.length <= MAX_VALUE_LENGTH
        && !UNSAFE_VALUE.test(value);
}
