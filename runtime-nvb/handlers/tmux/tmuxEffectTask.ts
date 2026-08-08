import {Buffer} from 'node:buffer';

import {grantExecutingTaskLeafCapability} from '../../../src/foundation/runtime/leaf/taskLeafCapability.js';
import {nodeRuntimeFileSystem} from '../../../src/foundation/task/runtime/runtimeFileSystem.js';
import {LaneTaskCatalog} from '../../../src/foundation/task/runtime/LaneTaskCatalog.js';
import {LaneInstallTaskRuntimePinSource} from '../../../src/foundation/task/runtime/laneTaskRuntimePinSource.js';
import {readTaskRuntimePin} from '../../../src/foundation/task/runtime/taskRuntimePin.js';
import {validateTmuxCommand, validateTmuxEnvironment, type TmuxEffectCommand} from '../../../src/foundation/runtime/leaf/TmuxAdapter.js';
import type {LaneRuntimeContext} from '../../../src/contracts/taskRuntime.js';

export const TASK_REQUEST_FLAG = '--wt-task-request';

export interface TmuxTaskArgMap {
    get(key: string): unknown;
    getOriginalIndexes(key: string): readonly number[];
}

export interface TmuxTaskRequest extends TmuxEffectCommand {
    readonly schemaVersion: 1;
    readonly operation: 'tmux-effect';
    readonly environment: Readonly<Record<string, string>>;
}

export interface TmuxTaskResult {
    readonly schemaVersion: 1;
    readonly ok: boolean;
    readonly exitCode: number | null;
    readonly stdout: string;
    readonly stderr: string;
    readonly wallTimeMs: number;
}

export function readTmuxTaskRequest(argMap: TmuxTaskArgMap): unknown {
    if (argMap.getOriginalIndexes(TASK_REQUEST_FLAG).length !== 1) return undefined;
    const value = argMap.get(TASK_REQUEST_FLAG);
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(value)) return undefined;
    try { return JSON.parse(Buffer.from(value, 'base64url').toString('utf8')); } catch { return undefined; }
}

export async function runTmuxTask(input: unknown): Promise<TmuxTaskResult> {
    if (!isRequest(input)) return failure(null, 'TMUX_TASK_INPUT_INVALID');
    const command: TmuxEffectCommand = input;
    const reason = validateTmuxCommand(command);
    if (reason !== null) return failure(null, reason);
    try {
        const context = runtimeContext();
        const runtimeRoot = required('WT_RUNTIME_ROOT');
        const pin = readTaskRuntimePin(new LaneInstallTaskRuntimePinSource().readTaskRuntime(context.laneDir), runtimeRoot, nodeRuntimeFileSystem);
        const catalog = LaneTaskCatalog.open(pin, runtimeRoot, nodeRuntimeFileSystem);
        const leaf = grantExecutingTaskLeafCapability({catalog, files: nodeRuntimeFileSystem});
        const started = Date.now();
        const result = await leaf.invoke({leafId: 'tmux.command', args: [command.command, ...command.argv], context});
        const wallTimeMs = Date.now() - started;
        return result.outcome === 'completed'
            ? {schemaVersion: 1, ok: true, exitCode: 0, stdout: result.stdout, stderr: result.stderr, wallTimeMs}
            : {schemaVersion: 1, ok: false, exitCode: result.outcome === 'failed' ? result.exitCode : null,
                stdout: result.stdout, stderr: result.outcome === 'failed' ? result.stderr : result.stderr, wallTimeMs};
    } catch (error) {
        return failure(null, error instanceof Error ? error.message : 'TMUX_TASK_FAILED');
    }
}

function isRequest(value: unknown): value is TmuxTaskRequest {
    if (typeof value !== 'object' || value === null || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    return record.schemaVersion === 1 && record.operation === 'tmux-effect' && typeof record.command === 'string'
        && Array.isArray(record.argv) && record.argv.every((arg) => typeof arg === 'string')
        && typeof record.environment === 'object' && record.environment !== null
        && validateTmuxCommand(record as unknown as TmuxEffectCommand) === null
        && validateTmuxEnvironment(record.environment as TmuxTaskRequest['environment']) === null;
}

function runtimeContext(): LaneRuntimeContext {
    return {
        workspace: required('WT_WORKSPACE'), laneId: required('WT_LANE_ID'), initiativeId: required('WT_INITIATIVE_ID'),
        laneSlug: required('WT_LANE_SLUG'), laneDir: required('WT_LANE_DIR'), homeRepositoryId: required('WT_HOME_REPOSITORY_ID'),
        repositoriesFile: required('WT_REPOSITORIES_FILE'), runtimeRoot: required('WT_RUNTIME_ROOT'), runtimeVersion: required('WT_RUNTIME_VERSION'),
        knowledgeRoot: required('WT_KNOWLEDGE_ROOT'), baseEnvironment: {path: required('PATH'), home: required('HOME')}
    };
}

function required(name: string): string {
    const value = process.env[name];
    if (typeof value !== 'string' || value.length === 0) throw new Error(`missing ${name}`);
    return value;
}

function failure(exitCode: number | null, stderr: string): TmuxTaskResult {
    return {schemaVersion: 1, ok: false, exitCode, stdout: '', stderr, wallTimeMs: 0};
}
