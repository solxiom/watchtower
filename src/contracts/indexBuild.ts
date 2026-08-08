import type {JsonValue} from './types.js';
import type {LaneRuntimeContext} from './taskRuntime.js';
import type {ValidationContext} from '../foundation/proposal/proposalValidatorContracts.js';

export const INDEX_BUILD_REASONS = [
    'INDEX_BUILD_INPUT_INVALID',
    'INDEX_BUILD_CURRENT_STATE_STALE',
    'INDEX_BUILD_PREDECESSOR_UNAVAILABLE',
    'INDEX_BUILD_TASK_FAILED',
    'INDEX_BUILD_TASK_UNAVAILABLE',
    'INDEX_BUILD_RESULT_INVALID',
    'INDEX_BUILD_EFFECT_FAILED',
    'INDEX_BUILD_EFFECT_AUTHORITY_UNAVAILABLE'
] as const;

export type IndexBuildReason = typeof INDEX_BUILD_REASONS[number];

export interface IndexBuildRequest {
    readonly context: LaneRuntimeContext;
    /** Complete accepted-predecessor task input, validated by the task schema. */
    readonly taskInput: JsonValue;
    /** Typed proposal authorization supplied by the coordinator boundary for mutation. */
    readonly authorization?: IndexBuildAuthorization;
}

export interface IndexBuildAuthorization {
    readonly proposal: unknown;
    readonly currentState: ValidationContext;
    readonly revalidate: () => {readonly proposal: unknown; readonly state: ValidationContext};
}

export interface IndexBuildResultData extends Record<string, JsonValue> {
    readonly schemaVersion: 1;
    readonly runtime: boolean;
    readonly dryRun: boolean;
    readonly changed: boolean;
    readonly indexId: string | null;
    readonly reused: boolean;
    readonly runtimeIndexes: number;
}

export interface IndexBuildSuccess {
    readonly ok: true;
    readonly data: IndexBuildResultData;
}

export interface IndexBuildFailure {
    readonly ok: false;
    readonly reason: IndexBuildReason;
    readonly target: string;
    readonly detail: string;
}

export type IndexBuildResult = IndexBuildSuccess | IndexBuildFailure;
