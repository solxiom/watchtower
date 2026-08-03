import Ajv from 'ajv';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import RuntimeSmokeTaskHandler from '../../runtime-nvb/handlers/RuntimeSmokeTaskHandler.js';
import {runRuntimeSmokeTask, type RuntimeSmokeArgMap} from '../../runtime-nvb/handlers/smoke/runtimeSmokeTask.js';
import runtimeNvbModule, * as runtimeNvbExports from '../../runtime-nvb/runtime-nvb.js';

interface HandlerProbe {
    readonly results: unknown[];
    readonly errors: (Error | undefined)[];
}

function handlerProbe(inputs: readonly unknown[] = []): HandlerProbe & {readonly handler: RuntimeSmokeTaskHandler} {
    const handler = new RuntimeSmokeTaskHandler({taskName: 'wt:runtime:smoke', requestArgMap: requestArgMap(inputs)});
    const results: unknown[] = [];
    const errors: (Error | undefined)[] = [];
    handler.setOnResultCallback((result: unknown) => results.push(result));
    handler.setDoneSignalImplementor((error?: Error) => errors.push(error));
    return {handler, results, errors};
}

function runtimeSchemaAjv(): Ajv {
    const ajv = new Ajv({strict: false});
    ajv.addSchema(JSON.parse(readFileSync(join(
        'runtime-nvb', 'schemas', 'runtimeSmokeResult.schema.json'
    ), 'utf8')));
    return ajv;
}

function invalidSmokeInputs(): readonly unknown[] {
    return [undefined, null, [], '', 1, {}, {schemaVersion: 1},
        {schemaVersion: 1, operation: 'runtime-smoke', extra: true},
        {schemaVersion: 2, operation: 'runtime-smoke'}];
}

function requestArgMap(inputs: readonly unknown[]): RuntimeSmokeArgMap {
    return {
        get: () => inputs.at(-1),
        getOriginalIndexes: () => inputs.map((_, index) => index)
    };
}

function encodedRequest(input: unknown): string {
    return Buffer.from(JSON.stringify(input), 'utf8').toString('base64url');
}

describe('RuntimeSmokeTaskHandler', function () {
    it('keeps the packaged NVB module free of task-like named exports', function () {
        expect(Object.keys(runtimeNvbExports)).toEqual(['default']);
        expect(runtimeNvbModule).toEqual({});
    });

    it('uses the public TaskHandler API to publish a schema-valid smoke result', async function () {
        const probe = handlerProbe([encodedRequest({schemaVersion: 1, operation: 'runtime-smoke'})]);
        await probe.handler.handleAsync();
        const ajv = runtimeSchemaAjv();
        expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, ok: true, operation: 'runtime-smoke'}}]);
        expect(ajv.validate(
            'watchtower://runtime/schemas/runtime-smoke-result/v1',
            (probe.results[0] as {readonly structuredOutput: unknown}).structuredOutput
        )).toBeTrue();
        expect(probe.errors).toEqual([undefined]);
    });

    it('rejects omitted, malformed, extra, and unsupported smoke inputs without effects', async function () {
        for (const input of invalidSmokeInputs()) {
            const probe = handlerProbe(input === undefined ? [] : [encodedRequest(input)]);
            await probe.handler.handleAsync();
            expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, ok: false,
                failure: {code: 'RUNTIME_SMOKE_INPUT_INVALID'}}}]);
            expect(runtimeSchemaAjv().validate(
                'watchtower://runtime/schemas/runtime-smoke-result/v1',
                (probe.results[0] as {readonly structuredOutput: unknown}).structuredOutput
            )).toBeTrue();
            expect(probe.errors[0]?.message).toBe('RUNTIME_SMOKE_INPUT_INVALID');
        }
    });

    it('rejects conflicting duplicate typed requests before decoding either value', async function () {
        const probe = handlerProbe([
            encodedRequest({schemaVersion: 2, operation: 'runtime-smoke'}),
            encodedRequest({schemaVersion: 1, operation: 'runtime-smoke'})
        ]);
        await probe.handler.handleAsync();
        expect(probe.results).toEqual([{structuredOutput: {schemaVersion: 1, ok: false,
            failure: {code: 'RUNTIME_SMOKE_INPUT_INVALID'}}}]);
        expect(runtimeSchemaAjv().validate(
            'watchtower://runtime/schemas/runtime-smoke-result/v1',
            (probe.results[0] as {readonly structuredOutput: unknown}).structuredOutput
        )).toBeTrue();
        expect(probe.errors[0]?.message).toBe('RUNTIME_SMOKE_INPUT_INVALID');
    });

    it('is deterministic and owns no filesystem, process, or product-policy effect', function () {
        const input = {schemaVersion: 1, operation: 'runtime-smoke'};
        expect(runRuntimeSmokeTask(input)).toEqual(runRuntimeSmokeTask(input));
        expect(runRuntimeSmokeTask(input)).toEqual({schemaVersion: 1, ok: true, operation: 'runtime-smoke'});
    });
});
