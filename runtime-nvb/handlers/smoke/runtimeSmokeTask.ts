import {Buffer} from 'node:buffer';

export type RuntimeSmokeFailureCode = 'RUNTIME_SMOKE_INPUT_INVALID';

export const runtimeSmokeRequestFlag = '--wt-task-request';

export interface RuntimeSmokeSuccess {
    readonly schemaVersion: 1;
    readonly ok: true;
    readonly operation: 'runtime-smoke';
}

export interface RuntimeSmokeRejected {
    readonly schemaVersion: 1;
    readonly ok: false;
    readonly failure: {readonly code: RuntimeSmokeFailureCode};
}

export type RuntimeSmokeTaskResult = RuntimeSmokeSuccess | RuntimeSmokeRejected;

export interface RuntimeSmokeArgMap {
    get(key: string): unknown;
    getOriginalIndexes(key: string): readonly number[];
}

function isRuntimeSmokeInput(input: unknown): boolean {
    if (typeof input !== 'object' || input === null || Array.isArray(input)) return false;
    const entries = Object.entries(input);
    return entries.length === 2 && entries.some(([key, value]) => key === 'schemaVersion' && value === 1) &&
        entries.some(([key, value]) => key === 'operation' && value === 'runtime-smoke');
}

export function runRuntimeSmokeTask(input: unknown): RuntimeSmokeTaskResult {
    return isRuntimeSmokeInput(input) ? {schemaVersion: 1, ok: true, operation: 'runtime-smoke'} :
        {schemaVersion: 1, ok: false, failure: {code: 'RUNTIME_SMOKE_INPUT_INVALID'}};
}

export function readRuntimeSmokeTaskRequest(argMap: RuntimeSmokeArgMap): unknown {
    if (argMap.getOriginalIndexes(runtimeSmokeRequestFlag).length !== 1) return undefined;
    const token = argMap.get(runtimeSmokeRequestFlag);
    if (typeof token !== 'string' || !/^[A-Za-z0-9_-]+$/u.test(token)) return undefined;
    try {
        return JSON.parse(Buffer.from(token, 'base64url').toString('utf8'));
    } catch {
        return undefined;
    }
}
