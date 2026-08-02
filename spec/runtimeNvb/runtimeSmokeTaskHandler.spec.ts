import Ajv from 'ajv';
import {readFileSync} from 'node:fs';
import {join} from 'node:path';

import RuntimeSmokeTaskHandler from '../../runtime-nvb/handlers/RuntimeSmokeTaskHandler.js';
import {runRuntimeSmokeTask} from '../../runtime-nvb/handlers/smoke/runtimeSmokeTask.js';

interface HandlerProbe {
    readonly results: unknown[];
    readonly errors: (Error | undefined)[];
}

function handlerProbe(): HandlerProbe & {readonly handler: RuntimeSmokeTaskHandler} {
    const handler = new RuntimeSmokeTaskHandler({taskName: 'wt:runtime:smoke'});
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

describe('RuntimeSmokeTaskHandler', function () {
    it('uses the public TaskHandler API to publish a schema-valid smoke result', async function () {
        const probe = handlerProbe();
        await probe.handler.handleAsync({schemaVersion: 1, operation: 'runtime-smoke'});
        const ajv = runtimeSchemaAjv();
        expect(ajv.validate('watchtower://runtime/schemas/runtime-smoke-result/v1', probe.results[0])).toBeTrue();
        expect(probe.errors).toEqual([undefined]);
    });

    it('rejects omitted, malformed, extra, and unsupported smoke inputs without effects', async function () {
        for (const input of invalidSmokeInputs()) {
            const probe = handlerProbe();
            if (input === undefined) await probe.handler.handleAsync();
            else await probe.handler.handleAsync(input);
            expect(probe.results).toEqual([{schemaVersion: 1, ok: false,
                failure: {code: 'RUNTIME_SMOKE_INPUT_INVALID'}}]);
            expect(runtimeSchemaAjv().validate(
                'watchtower://runtime/schemas/runtime-smoke-result/v1', probe.results[0]
            )).toBeTrue();
            expect(probe.errors[0]?.message).toBe('RUNTIME_SMOKE_INPUT_INVALID');
        }
    });

    it('is deterministic and owns no filesystem, process, or product-policy effect', function () {
        const input = {schemaVersion: 1, operation: 'runtime-smoke'};
        expect(runRuntimeSmokeTask(input)).toEqual(runRuntimeSmokeTask(input));
        expect(runRuntimeSmokeTask(input)).toEqual({schemaVersion: 1, ok: true, operation: 'runtime-smoke'});
    });
});
