export type RuntimeSmokeFailureCode = 'RUNTIME_SMOKE_INPUT_INVALID';

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
